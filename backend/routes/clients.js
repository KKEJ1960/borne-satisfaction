import { Router } from "express";
import rateLimit from "express-rate-limit";
import db from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { logActivity, clientIp } from "../utils/activityLog.js";
import { sendEmail, sendSms } from "../utils/brevoClient.js";

const router = Router();

router.use(requireAdmin);

const MAX_MESSAGE_LEN = 1500;
const MAX_SUBJECT_LEN = 150;
const MAX_RECIPIENTS = 300;

// Limite l'endpoint d'envoi pour éviter un usage abusif du quota Brevo.
const sendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Trop d'envois. Réessayez dans quelques minutes." });
  },
});

/**
 * Normalise un numéro ivoirien vers le format international E.164 (+225…).
 * Depuis la réforme de 2021, les numéros ivoiriens ont 10 chiffres et le
 * premier chiffre fait partie intégrante du numéro (ce n'est PAS un préfixe
 * de tronc à retirer comme en France) : 01 02 03 04 05 → +225 01 02 03 04 05.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("225")) return `+${cleaned}`;
  if (!cleaned) return null;
  return `+225${cleaned}`;
}

function applyPlaceholders(template, client) {
  return template
    .replace(/\{prenom\}/gi, client.prenom || "")
    .replace(/\{nom\}/gi, client.nom || "");
}

// ── GET /admin/clients — liste + recherche + pagination ─────────────────────
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const offset = (page - 1) * pageSize;
    const search = (req.query.q || "").trim();

    const whereClause = search ? `WHERE c.nom LIKE ? OR c.prenom LIKE ? OR c.email LIKE ? OR c.telephone LIKE ?` : "";
    const searchParams = search ? Array(4).fill(`%${search}%`) : [];

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM clients c ${whereClause}`,
      searchParams
    );

    const [rows] = await db.query(
      `SELECT c.id, c.nom, c.prenom, c.telephone, c.email, c.numero_chambre, c.type_sejour,
              COUNT(a.id) AS nb_avis,
              MAX(a.date) AS derniere_visite
       FROM clients c
       LEFT JOIN avis a ON a.client_id = c.id
       ${whereClause}
       GROUP BY c.id
       ORDER BY derniere_visite DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, pageSize, offset]
    );

    res.json({ clients: rows, total, page, pageSize });
  } catch (error) {
    console.error("❌ GET /admin/clients:", error.message);
    res.status(500).json({ error: "Erreur serveur lors de la récupération des clients" });
  }
});

// ── GET /admin/clients/messages/historique — derniers messages envoyés ──────
router.get("/messages/historique", async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const [rows] = await db.query(
      `SELECT m.id, m.client_id, m.type, m.destinataire, m.sujet, m.statut, m.erreur, m.date_envoi,
              c.nom, c.prenom
       FROM messages_clients m
       JOIN clients c ON c.id = m.client_id
       ORDER BY m.date_envoi DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ GET /admin/clients/messages/historique:", error.message);
    res.status(500).json({ error: "Erreur serveur lors de la récupération de l'historique" });
  }
});

// ── POST /admin/clients/message — envoi email ou SMS (1 ou plusieurs clients) ─
router.post("/message", sendLimiter, async (req, res) => {
  try {
    const { client_ids, type, subject, message } = req.body || {};

    if (!Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(400).json({ error: "Aucun client sélectionné." });
    }
    if (client_ids.length > MAX_RECIPIENTS) {
      return res.status(400).json({ error: `Maximum ${MAX_RECIPIENTS} destinataires par envoi.` });
    }
    if (!["email", "sms"].includes(type)) {
      return res.status(400).json({ error: "Type de message invalide (email ou sms)." });
    }
    if (!message?.trim() || message.length > MAX_MESSAGE_LEN) {
      return res.status(400).json({ error: `Message requis (max ${MAX_MESSAGE_LEN} caractères).` });
    }
    if (type === "email" && (!subject?.trim() || subject.length > MAX_SUBJECT_LEN)) {
      return res.status(400).json({ error: `Sujet requis pour un email (max ${MAX_SUBJECT_LEN} caractères).` });
    }

    const ids = [...new Set(client_ids.map(Number))].filter(Number.isInteger);
    const [clientRows] = await db.query(
      `SELECT id, nom, prenom, email, telephone FROM clients WHERE id IN (?)`,
      [ids]
    );

    const foundIds = new Set(clientRows.map((c) => c.id));
    const results = [];

    for (const client of clientRows) {
      const personalized = applyPlaceholders(message, client);
      let destinataire = null;
      let statut = "echec";
      let erreur = null;

      try {
        if (type === "email") {
          destinataire = client.email;
          if (!destinataire) throw new Error("Ce client n'a pas d'email enregistré.");
          const html = personalized.replace(/\n/g, "<br>");
          await sendEmail({
            to: destinataire,
            toName: `${client.prenom} ${client.nom}`.trim(),
            subject: applyPlaceholders(subject, client),
            html,
          });
        } else {
          destinataire = normalizePhone(client.telephone);
          if (!destinataire) throw new Error("Ce client n'a pas de numéro de téléphone valide.");
          await sendSms({ to: destinataire, content: personalized });
        }
        statut = "envoye";
      } catch (err) {
        erreur = err.message;
      }

      results.push({ client_id: client.id, nom: client.nom, prenom: client.prenom, statut, erreur });

      await db.query(
        `INSERT INTO messages_clients (client_id, admin_id, type, destinataire, sujet, contenu, statut, erreur)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          req.admin.adminId,
          type,
          destinataire || "—",
          type === "email" ? applyPlaceholders(subject, client) : null,
          personalized,
          statut,
          erreur,
        ]
      );
    }

    const missingIds = ids.filter((id) => !foundIds.has(id));
    for (const id of missingIds) {
      results.push({ client_id: id, statut: "echec", erreur: "Client introuvable" });
    }

    await logActivity(db, {
      adminId: req.admin.adminId,
      action: "CLIENT_MESSAGE_SENT",
      details: JSON.stringify({
        type,
        total: results.length,
        succes: results.filter((r) => r.statut === "envoye").length,
      }),
      ip: clientIp(req),
    });

    res.json({ results });
  } catch (error) {
    console.error("❌ POST /admin/clients/message:", error.message);
    res.status(500).json({ error: "Erreur serveur lors de l'envoi des messages" });
  }
});

export default router;
