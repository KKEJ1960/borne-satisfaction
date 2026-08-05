import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import os from "os";
import pino from "pino";
import pinoHttp from "pino-http";
import db from "./db.js";
import { requireAdmin } from "./middleware/auth.js";
import superadminRoutes from "./routes/superadmin.js";
import clientsRoutes from "./routes/clients.js";
import { logActivity, clientIp } from "./utils/activityLog.js";
import {
  fetchAvisRows,
  countAvisToArchive,
  archiveAvisBefore,
  buildAvisFilters,
} from "./utils/avisQuery.js";
import {
  generateCSV,
  generateExcel,
  generatePDF,
  csvFilename,
} from "./utils/exportHelpers.js";
import { requireHotelId } from "./utils/hotel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

// ── Sécurité processus : capturer les rejets non gérés ───────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("❌ Promesse rejetée non gérée :", reason);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Exception non capturée :", err);
});

// ── P1.2 — Validation critique du JWT_SECRET au démarrage ────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const KNOWN_WEAK_SECRETS = [
  "borne-president-jwt-secret-change-in-production",
  "changez-moi-en-production-32-caracteres-min",
];

if (!JWT_SECRET || KNOWN_WEAK_SECRETS.includes(JWT_SECRET.trim())) {
  console.error("❌ ERREUR CRITIQUE : JWT_SECRET absent ou valeur par défaut détectée.");
  console.error("   Le serveur refuse de démarrer pour protéger les sessions admin.");
  console.error("");
  console.error("   Générez un secret sécurisé avec la commande suivante :");
  console.error('   node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  console.error("");
  console.error("   Puis renseignez JWT_SECRET=<votre_secret> dans backend/.env");
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error("❌ ERREUR CRITIQUE : JWT_SECRET trop court (minimum 32 caractères).");
  process.exit(1);
}

// ── Logger structuré (pino) ──────────────────────────────────────────────────
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
});

// ── Constantes métier ─────────────────────────────────────────────────────────
const CATEGORIES = ["Accueil", "Chambres", "Le Bandama Petit Déjeuner", "Le Panoramique", "L'Alocodrome", "Loisirs et Divertissements", "Cadre Général", "Tourisme Affaires", "Commercial", "Restaurants", "Saveurs du Monde", "4 Épices", "Poulet Chaud", "Loisirs", "Cadre"];
const VALID_DEPARTEMENTS = [...CATEGORIES, "Global"];

// ── P3.2 / P3.3 — Validation helpers ─────────────────────────────────────────
const NOM_REGEX = /^[a-zA-ZÀ-ÿ\s\-']+$/;
const TEL_REGEX = /^(?:0[1-9]\d{8}|\+\d{1,3}[\s\-()]?(?:\d[\s\-()]?){5,13}\d)$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHANUM_REGEX = /^[a-zA-Z0-9]{1,10}$/;

function validateClient(body) {
  const nom = (body.nom || "").trim();
  const prenom = (body.prenom || "").trim();
  const telephone = (body.telephone || "").trim();
  const email = (body.email || "").trim();
  const numero_chambre = (body.numero_chambre || "").trim();
  const type_sejour = (body.type_sejour || "loisirs").trim();

  if (!nom || !prenom || !telephone) return null;
  if (nom.length > 100 || !NOM_REGEX.test(nom)) return null;
  if (prenom.length > 100 || !NOM_REGEX.test(prenom)) return null;
  if (!TEL_REGEX.test(telephone)) return null;
  if (email && (email.length > 255 || !EMAIL_REGEX.test(email))) return null;
  if (numero_chambre && !ALPHANUM_REGEX.test(numero_chambre)) return null;
  if (!["loisirs", "affaires"].includes(type_sejour)) return null;

  return {
    nom,
    prenom,
    telephone,
    email: email || null,
    numero_chambre: numero_chambre || "",
    type_sejour,
  };
}

function validateAvis(body) {
  const client_id = parseInt(body.client_id, 10);
  const departement = body.departement;
  const note = parseInt(body.note, 10);
  const commentaire = (body.commentaire || "").toString().trim();

  if (!Number.isInteger(client_id) || client_id <= 0) return null;
  if (!VALID_DEPARTEMENTS.includes(departement)) return null;
  if (!Number.isInteger(note) || note < 0 || note > 4) return null;
  if (commentaire.length > 5000) return null;

  return {
    client_id,
    departement,
    note,
    commentaire: commentaire || null,
  };
}

// ── P2.1 — CORS dynamique réseau local ───────────────────────────────────────
// Origines fixes autorisées (depuis .env ou fallback localhost)
const staticAllowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://localhost:5174",
    ...(process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  ]
);

// Vérifie si une origin est autorisée :
// 1. Origin connue dans la liste statique, OU
// 2. Port 5173/5174 sur n'importe quelle IP (frontend Vite, IP DHCP variable)
// Cela évite de redémarrer le backend quand le WiFi change d'IP.
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (staticAllowedOrigins.has(origin)) return true;
  try {
    const { protocol, port } = new URL(origin);
    return protocol === "http:" && (port === "5173" || port === "5174");
  } catch {
    return false;
  }
}

// ── P3.1 — Rate limiters ──────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, "Rate limit login dépassé");
    res.status(429).json({ error: "Trop de tentatives. Réessayez dans 15 minutes." });
  },
});

const clientLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Trop de requêtes. Réessayez dans quelques minutes." });
  },
});

const avisLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Trop de requêtes. Réessayez dans quelques minutes." });
  },
});

// ── Application Express ───────────────────────────────────────────────────────
const app = express();

// P2.2 — Helmet : headers de sécurité HTTP
app.use(
  helmet({
    contentSecurityPolicy: false,     // API pure, pas de HTML servi
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },   // X-Frame-Options: DENY
    noSniff: true,                    // X-Content-Type-Options: nosniff
    referrerPolicy: { policy: "no-referrer" }, // Referrer-Policy: no-referrer
  })
);

// P2.1 — CORS restrictif avec credentials (requis pour les cookies HttpOnly)
app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        cb(null, true);
      } else {
        logger.warn({ origin }, "Requête CORS bloquée");
        cb(new Error("CORS bloqué"));
      }
    },
    credentials: true, // Indispensable pour transmettre les cookies HttpOnly
    exposedHeaders: ["Content-Disposition"], // Permet au client de lire le nom de fichier pour le téléchargement
  })
);

// Renvoie 403 au lieu de 500 pour les origines CORS bloquées
app.use((err, req, res, next) => {
  if (err.message === "CORS bloqué") return res.status(403).json({ error: "Origine non autorisée" });
  next(err);
});

app.use(cookieParser());
app.use(express.json());

// P5.3 — Logger de requêtes structuré (remplace le console.log custom)
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res) => (res.statusCode >= 500 ? "error" : "info"),
  })
);

// ── Helpers internes ──────────────────────────────────────────────────────────
async function fetchQuestionsGrouped({ activeOnly = true, hotelId }) {
  const sql = activeOnly
    ? "SELECT id, categorie, texte, ordre FROM questions WHERE actif = true AND hotel_id = ? ORDER BY categorie, ordre, id"
    : "SELECT id, categorie, texte, ordre, actif FROM questions WHERE hotel_id = ? ORDER BY categorie, ordre, id";
  const [rows] = await db.query(sql, [hotelId]);
  const grouped = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const row of rows) {
    if (!grouped[row.categorie]) continue;
    const item = { id: row.id, texte: row.texte, ordre: row.ordre };
    if (!activeOnly) item.actif = !!row.actif;
    grouped[row.categorie].push(item);
  }
  return grouped;
}

async function getHotelNom(hotelId) {
  const [[row]] = await db.query("SELECT nom FROM hotels WHERE id = ?", [hotelId]);
  return row?.nom || "";
}

// ── Routes publiques ──────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/superadmin", superadminRoutes);
app.use("/admin/clients", clientsRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// ── Multi-hôtel — liste des établissements actifs ────────────────────────────
app.get("/hotels", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, nom, slug FROM hotels WHERE actif = 1 ORDER BY id"
    );
    res.json(rows);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET /hotels");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// P3.2 — POST /client avec rate limit + validation stricte
app.post("/client", clientLimiter, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const data = validateClient(req.body);
    if (!data) {
      return res.status(400).json({ error: "Données d'identification invalides." });
    }
    const [result] = await db.query(
      "INSERT INTO clients (nom, prenom, telephone, email, numero_chambre, type_sejour, hotel_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [data.nom, data.prenom, data.telephone, data.email, data.numero_chambre, data.type_sejour, hotelId]
    );
    res.status(201).json({ id: result.insertId, type_sejour: data.type_sejour, hotel_id: hotelId, message: "Client enregistré" });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur création client");
    res.status(500).json({ error: "Erreur serveur lors de la création du client" });
  }
});

// P3.3 — POST /avis avec rate limit + validation stricte
app.post("/avis", avisLimiter, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const data = validateAvis(req.body);
    if (!data) {
      return res.status(400).json({ error: "Données invalides." });
    }
    const [clientRows] = await db.query("SELECT id FROM clients WHERE id = ? AND hotel_id = ?", [data.client_id, hotelId]);
    if (clientRows.length === 0) {
      return res.status(400).json({ error: "Client invalide" });
    }

    // ── C1/C2/C3 — Validation structure JSON + recalcul note ─────────────────
    // Si le commentaire est du JSON structuré {reponses, detail}, on valide la
    // structure, on limite le nombre de réponses (C2), et on recalcule la note
    // côté backend pour ne pas faire confiance au frontend (C3).
    let noteFinale = data.note;

    if (data.commentaire) {
      let parsed = null;
      try { parsed = JSON.parse(data.commentaire); } catch { /* texte brut — déjà validé 5000 chars */ }

      if (parsed !== null) {
        // C1 — Structure attendue : { reponses: Array, detail: string }
        if (
          typeof parsed !== "object" ||
          Array.isArray(parsed) ||
          !Array.isArray(parsed.reponses) ||
          typeof parsed.detail !== "string" ||
          parsed.detail.length > 2000
        ) {
          return res.status(400).json({ error: "Données invalides." });
        }
        for (const r of parsed.reponses) {
          if (
            typeof r.question !== "string" ||
            r.question.length > 500 ||
            typeof r.note !== "number" ||
            r.note < 1 || r.note > 4
          ) {
            return res.status(400).json({ error: "Données invalides." });
          }
        }

        // C2 — Nombre de réponses limité au nb de questions actives (Tourisme Affaires)
        if (data.departement === "Tourisme Affaires") {
          const [qRows] = await db.query(
            "SELECT COUNT(*) AS cnt FROM questions WHERE categorie = 'Tourisme Affaires' AND actif = true AND hotel_id = ?",
            [hotelId]
          );
          const maxQ = qRows[0].cnt;
          if (parsed.reponses.length > maxQ) {
            return res.status(400).json({ error: "Données invalides." });
          }
        }

        // C3 — Recalcul de la note : ignore la valeur envoyée par le frontend
        if (parsed.reponses.length > 0) {
          const standard = parsed.reponses.filter((r) => !r.type);
          const toAvg = standard.length ? standard : parsed.reponses;
          const avg = toAvg.reduce((s, r) => s + r.note, 0) / toAvg.length;
          noteFinale = Math.max(1, Math.min(4, Math.round(avg)));
        } else if (data.note > 0) {
          // reponses vides mais note > 0 : incohérent
          return res.status(400).json({ error: "Données invalides." });
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    const [result] = await db.query(
      "INSERT INTO avis (client_id, departement, note, commentaire, hotel_id) VALUES (?, ?, ?, ?, ?)",
      [data.client_id, data.departement, noteFinale, data.commentaire, hotelId]
    );
    res.status(201).json({ id: result.insertId, message: "Avis enregistré" });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur enregistrement avis");
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement de l'avis" });
  }
});

// ── Authentification ──────────────────────────────────────────────────────────
app.post("/admin/login", loginLimiter, async (req, res) => {
  const { login, password } = req.body;
  const ip = clientIp(req);

  logger.info({ login: login || "(vide)", ip }, "Tentative connexion admin");

  if (!login || !password) {
    await logActivity(db, {
      action: "LOGIN_FAILED",
      details: JSON.stringify({ login: login || null, reason: "missing_fields" }),
      ip,
    });
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM admins WHERE login = ?", [login]);
    if (!rows.length) {
      await logActivity(db, {
        action: "LOGIN_FAILED",
        details: JSON.stringify({ login }),
        ip,
      });
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const admin = rows[0];
    if (!admin.actif) {
      await logActivity(db, {
        adminId: admin.id,
        action: "LOGIN_FAILED",
        details: "compte_desactive",
        ip,
      });
      return res.status(403).json({ error: "Compte désactivé" });
    }

    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) {
      await logActivity(db, { adminId: admin.id, action: "LOGIN_FAILED", ip });
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    await db.query("UPDATE admins SET derniere_connexion = NOW() WHERE id = ?", [admin.id]);

    // P4.1 + P4.3 — Token 4h, livré en cookie HttpOnly (jamais dans le body)
    const token = jwt.sign(
      { role: admin.role, adminId: admin.id, sub: admin.login },
      JWT_SECRET,
      { expiresIn: "4h" }
    );

    await logActivity(db, { adminId: admin.id, action: "LOGIN_SUCCESS", ip });
    logger.info({ role: admin.role, adminId: admin.id }, "Connexion admin réussie");

    res.json({
      success: true,
      token,
      role: admin.role,
      adminId: admin.id,
    });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur login admin");
    if (error.message?.includes("admins")) {
      return res.status(500).json({
        error: "Table admins manquante. Exécutez : npm run migrate",
      });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Déconnexion : log LOGOUT — le token est purgé côté client (mémoire React)
app.post("/admin/logout", requireAdmin, async (req, res) => {
  await logActivity(db, {
    adminId: req.admin?.adminId,
    action: "LOGOUT",
    ip: clientIp(req),
  });
  logger.info({ adminId: req.admin?.adminId }, "Déconnexion admin");
  res.json({ success: true });
});

// ── Routes questions ──────────────────────────────────────────────────────────
app.get("/questions", async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const grouped = await fetchQuestionsGrouped({ activeOnly: true, hotelId });
    res.json(grouped);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET /questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/admin/questions", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const grouped = await fetchQuestionsGrouped({ activeOnly: false, hotelId });
    res.json(grouped);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET /admin/questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/admin/questions", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const { categorie, texte, ordre } = req.body;
    if (!categorie || !texte?.trim() || !CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: "categorie et texte requis" });
    }
    const order = ordre ?? 0;
    const [result] = await db.query(
      "INSERT INTO questions (categorie, texte, ordre, actif, hotel_id) VALUES (?, ?, ?, true, ?)",
      [categorie, texte.trim(), order, hotelId]
    );
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_CREATED",
      details: JSON.stringify({ id: result.insertId, categorie, texte: texte.trim() }),
      ip: clientIp(req),
      hotelId,
    });
    res.status(201).json({
      id: result.insertId,
      categorie,
      texte: texte.trim(),
      ordre: order,
      actif: true,
      hotel_id: hotelId,
    });
  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, "Erreur POST /admin/questions");
    res.status(500).json({ error: process.env.NODE_ENV !== "production" ? (error.message || "Erreur serveur") : "Erreur serveur" });
  }
});

app.put("/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const { id } = req.params;
    const { texte, ordre, actif } = req.body;
    const updates = [];
    const params = [];

    if (texte !== undefined) {
      updates.push("texte = ?");
      params.push(texte.trim());
    }
    if (ordre !== undefined) {
      updates.push("ordre = ?");
      params.push(ordre);
    }
    if (actif !== undefined) {
      updates.push("actif = ?");
      params.push(actif ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune modification fournie" });
    }

    params.push(id, hotelId);
    const [updateResult] = await db.query(
      `UPDATE questions SET ${updates.join(", ")} WHERE id = ? AND hotel_id = ?`,
      params
    );
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ error: "Question introuvable" });
    }

    const [rows] = await db.query(
      "SELECT id, categorie, texte, ordre, actif FROM questions WHERE id = ? AND hotel_id = ?",
      [id, hotelId]
    );
    const q = rows[0];
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_UPDATED",
      details: JSON.stringify({ id: q.id, categorie: q.categorie }),
      ip: clientIp(req),
      hotelId,
    });
    res.json({ id: q.id, categorie: q.categorie, texte: q.texte, ordre: q.ordre, actif: !!q.actif });
  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, "Erreur PUT /admin/questions");
    res.status(500).json({ error: process.env.NODE_ENV !== "production" ? (error.message || "Erreur serveur") : "Erreur serveur" });
  }
});

app.delete("/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const { id } = req.params;
    const [result] = await db.query("DELETE FROM questions WHERE id = ? AND hotel_id = ?", [id, hotelId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Question introuvable" });
    }
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_DELETED",
      details: JSON.stringify({ id: Number(id) }),
      ip: clientIp(req),
      hotelId,
    });
    res.json({ success: true, id: Number(id) });
  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, "Erreur DELETE /admin/questions");
    res.status(500).json({ error: process.env.NODE_ENV !== "production" ? (error.message || "Erreur serveur") : "Erreur serveur" });
  }
});

// ── Routes avis ───────────────────────────────────────────────────────────────
async function handleGetAvis(req, res) {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const rows = await fetchAvisRows(db, { ...req.query, hotel_id: hotelId });
    res.json(rows);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET avis");
    if (error.message?.includes("archived")) {
      return res.status(500).json({
        error: "Colonne archived manquante. Exécutez migrations/add_archived_column.sql",
      });
    }
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// P1.1 — Route /avis désormais protégée (requireAdmin)
app.get("/avis", requireAdmin, handleGetAvis);
app.get("/admin/avis", requireAdmin, handleGetAvis);

app.get("/admin/avis/archive/preview", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const { avant_date: avantDate } = req.query;
    if (!avantDate || !/^\d{4}-\d{2}-\d{2}$/.test(avantDate)) {
      return res.status(400).json({ error: "avant_date requis (YYYY-MM-DD)" });
    }
    const count = await countAvisToArchive(db, avantDate, hotelId);
    res.json({ count, avant_date: avantDate, hotel_id: hotelId });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur preview archive");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/admin/avis/archive", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const { avant_date: avantDate } = req.body;
    if (!avantDate || !/^\d{4}-\d{2}-\d{2}$/.test(avantDate)) {
      return res.status(400).json({ error: "avant_date requis (YYYY-MM-DD)" });
    }
    const archived = await archiveAvisBefore(db, avantDate, hotelId);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "AVIS_ARCHIVED",
      hotelId,
      details: JSON.stringify({ avant_date: avantDate, count: archived }),
      ip: clientIp(req),
    });
    res.json({ success: true, archived, avant_date: avantDate });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur POST archive");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Routes export ─────────────────────────────────────────────────────────────
app.get("/admin/export/csv", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const rows = await fetchAvisRows(db, { ...req.query, hotel_id: hotelId });
    const hotelNom = await getHotelNom(hotelId);
    const csv = generateCSV(rows, { hotelNom });
    const filename = csvFilename();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_CSV",
      details: JSON.stringify({ nb_lignes: rows.length, filtres: req.query }),
      ip: clientIp(req),
      hotelId,
    });
    res.send(csv);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export CSV");
    res.status(500).json({ error: "Erreur export CSV" });
  }
});

app.get("/admin/export/excel", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const rows = await fetchAvisRows(db, { ...req.query, hotel_id: hotelId });
    const { meta } = buildAvisFilters({ ...req.query, hotel_id: hotelId });
    const hotelNom = await getHotelNom(hotelId);
    const { buffer, filename } = await generateExcel(rows, { ...meta, hotelNom });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_EXCEL",
      details: JSON.stringify({ nb_lignes: rows.length, filtres: req.query }),
      ip: clientIp(req),
      hotelId,
    });
    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export Excel");
    res.status(500).json({ error: "Erreur export Excel" });
  }
});

app.get("/admin/export/pdf", requireAdmin, async (req, res) => {
  try {
    const hotelId = requireHotelId(req, res);
    if (hotelId == null) return;

    const rows = await fetchAvisRows(db, { ...req.query, hotel_id: hotelId });
    const { meta } = buildAvisFilters({ ...req.query, hotel_id: hotelId });
    const hotelNom = await getHotelNom(hotelId);
    const { buffer, filename } = await generatePDF(rows, { ...meta, hotelNom });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_PDF",
      details: JSON.stringify({ nb_lignes: rows.length, filtres: req.query }),
      ip: clientIp(req),
      hotelId,
    });
    res.send(buffer);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export PDF");
    res.status(500).json({ error: "Erreur export PDF" });
  }
});

// ── Error handler global Express ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error({ err: err.message, stack: err.stack, url: req.url }, "Erreur Express non gérée");
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Erreur serveur interne" });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || "development" }, "Serveur backend démarré");
});
