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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

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
const CATEGORIES = ["Accueil", "Chambres", "Restaurants", "Loisirs", "Propreté"];
const VALID_DEPARTEMENTS = [...CATEGORIES, "Global"];

// ── P3.2 / P3.3 — Validation helpers ─────────────────────────────────────────
const NOM_REGEX = /^[a-zA-ZÀ-ÿ\s\-']+$/;
const TEL_REGEX = /^[\d\s+\-()]{1,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHANUM_REGEX = /^[a-zA-Z0-9]{1,10}$/;

function validateClient(body) {
  const nom = (body.nom || "").trim();
  const prenom = (body.prenom || "").trim();
  const telephone = (body.telephone || "").trim();
  const email = (body.email || "").trim();
  const numero_chambre = (body.numero_chambre || "").trim();

  if (!nom || !prenom || !telephone) return null;
  if (nom.length > 100 || !NOM_REGEX.test(nom)) return null;
  if (prenom.length > 100 || !NOM_REGEX.test(prenom)) return null;
  if (!TEL_REGEX.test(telephone)) return null;
  if (email && (email.length > 255 || !EMAIL_REGEX.test(email))) return null;
  if (numero_chambre && !ALPHANUM_REGEX.test(numero_chambre)) return null;

  return {
    nom,
    prenom,
    telephone,
    email: email || null,
    numero_chambre: numero_chambre || "",
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

// ── P2.1 — CORS avec liste blanche dynamique ─────────────────────────────────
// Combine les origines du .env ET toutes les IPs locales de la machine.
// Ainsi l'IP peut changer (DHCP) sans nécessiter de redémarrage ou de mise à jour du .env.
function buildAllowedOrigins() {
  const fromEnv = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const localOrigins = ["http://localhost:5173", "http://localhost:5174"];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === "IPv4" && !iface.internal) {
        localOrigins.push(`http://${iface.address}:5173`);
        localOrigins.push(`http://${iface.address}:5174`);
      }
    }
  }

  const all = [...new Set([...fromEnv, ...localOrigins])];
  return all;
}

const allowedOrigins = buildAllowedOrigins();

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
      // Autorise les requêtes sans origin (même hôte, curl, mobile natif)
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        logger.warn({ origin }, "Requête CORS bloquée");
        cb(new Error("CORS bloqué"));
      }
    },
    credentials: true, // Indispensable pour transmettre les cookies HttpOnly
  })
);

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
async function fetchQuestionsGrouped({ activeOnly = true } = {}) {
  const sql = activeOnly
    ? "SELECT id, categorie, texte, ordre FROM questions WHERE actif = true ORDER BY categorie, ordre, id"
    : "SELECT id, categorie, texte, ordre, actif FROM questions ORDER BY categorie, ordre, id";
  const [rows] = await db.query(sql);
  const grouped = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  for (const row of rows) {
    if (!grouped[row.categorie]) continue;
    const item = { id: row.id, texte: row.texte, ordre: row.ordre };
    if (!activeOnly) item.actif = !!row.actif;
    grouped[row.categorie].push(item);
  }
  return grouped;
}

// ── Routes publiques ──────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/superadmin", superadminRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// P3.2 — POST /client avec rate limit + validation stricte
app.post("/client", clientLimiter, async (req, res) => {
  try {
    const data = validateClient(req.body);
    if (!data) {
      return res.status(400).json({ error: "Données d'identification invalides." });
    }
    const [result] = await db.query(
      "INSERT INTO clients (nom, prenom, telephone, email, numero_chambre) VALUES (?, ?, ?, ?, ?)",
      [data.nom, data.prenom, data.telephone, data.email, data.numero_chambre]
    );
    res.status(201).json({ id: result.insertId, message: "Client enregistré" });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur création client");
    res.status(500).json({ error: "Erreur serveur lors de la création du client" });
  }
});

// P3.3 — POST /avis avec rate limit + validation stricte
app.post("/avis", avisLimiter, async (req, res) => {
  try {
    const data = validateAvis(req.body);
    if (!data) {
      return res.status(400).json({ error: "Données invalides." });
    }
    const [clientRows] = await db.query("SELECT id FROM clients WHERE id = ?", [data.client_id]);
    if (clientRows.length === 0) {
      return res.status(400).json({ error: "Client invalide" });
    }
    const [result] = await db.query(
      "INSERT INTO avis (client_id, departement, note, commentaire) VALUES (?, ?, ?, ?)",
      [data.client_id, data.departement, data.note, data.commentaire]
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

    res.cookie("borne_admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 4 * 60 * 60 * 1000, // 4h en ms
    });

    await logActivity(db, { adminId: admin.id, action: "LOGIN_SUCCESS", ip });
    logger.info({ role: admin.role, adminId: admin.id }, "Connexion admin réussie");

    // Token absent du body — inaccessible via JS côté navigateur
    res.json({
      success: true,
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

// P4.2 — Déconnexion propre : clear cookie + log LOGOUT
app.post("/admin/logout", requireAdmin, async (req, res) => {
  res.clearCookie("borne_admin_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  await logActivity(db, {
    adminId: req.admin?.adminId,
    action: "LOGOUT",
    ip: clientIp(req),
  });
  logger.info({ adminId: req.admin?.adminId }, "Déconnexion admin");
  res.json({ success: true });
});

// ── Routes questions ──────────────────────────────────────────────────────────
app.get("/questions", async (_req, res) => {
  try {
    const grouped = await fetchQuestionsGrouped({ activeOnly: true });
    res.json(grouped);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET /questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.get("/admin/questions", requireAdmin, async (_req, res) => {
  try {
    const grouped = await fetchQuestionsGrouped({ activeOnly: false });
    res.json(grouped);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur GET /admin/questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/admin/questions", requireAdmin, async (req, res) => {
  try {
    const { categorie, texte, ordre } = req.body;
    if (!categorie || !texte?.trim() || !CATEGORIES.includes(categorie)) {
      return res.status(400).json({ error: "categorie et texte requis" });
    }
    const order = ordre ?? 0;
    const [result] = await db.query(
      "INSERT INTO questions (categorie, texte, ordre, actif) VALUES (?, ?, ?, true)",
      [categorie, texte.trim(), order]
    );
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_CREATED",
      details: JSON.stringify({ id: result.insertId, categorie, texte: texte.trim() }),
      ip: clientIp(req),
    });
    res.status(201).json({
      id: result.insertId,
      categorie,
      texte: texte.trim(),
      ordre: order,
      actif: true,
    });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur POST /admin/questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.put("/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
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

    params.push(id);
    await db.query(`UPDATE questions SET ${updates.join(", ")} WHERE id = ?`, params);

    const [rows] = await db.query(
      "SELECT id, categorie, texte, ordre, actif FROM questions WHERE id = ?",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Question introuvable" });
    const q = rows[0];
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_UPDATED",
      details: JSON.stringify({ id: q.id, categorie: q.categorie }),
      ip: clientIp(req),
    });
    res.json({ id: q.id, categorie: q.categorie, texte: q.texte, ordre: q.ordre, actif: !!q.actif });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur PUT /admin/questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.delete("/admin/questions/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query("UPDATE questions SET actif = false WHERE id = ?", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Question introuvable" });
    }
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "QUESTION_DELETED",
      details: JSON.stringify({ id: Number(id) }),
      ip: clientIp(req),
    });
    res.json({ success: true, id: Number(id), actif: false });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur DELETE /admin/questions");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── Routes avis ───────────────────────────────────────────────────────────────
async function handleGetAvis(req, res) {
  try {
    const rows = await fetchAvisRows(db, req.query);
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
    const { avant_date: avantDate } = req.query;
    if (!avantDate || !/^\d{4}-\d{2}-\d{2}$/.test(avantDate)) {
      return res.status(400).json({ error: "avant_date requis (YYYY-MM-DD)" });
    }
    const count = await countAvisToArchive(db, avantDate);
    res.json({ count, avant_date: avantDate });
  } catch (error) {
    logger.error({ err: error.message }, "Erreur preview archive");
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/admin/avis/archive", requireAdmin, async (req, res) => {
  try {
    const { avant_date: avantDate } = req.body;
    if (!avantDate || !/^\d{4}-\d{2}-\d{2}$/.test(avantDate)) {
      return res.status(400).json({ error: "avant_date requis (YYYY-MM-DD)" });
    }
    const archived = await archiveAvisBefore(db, avantDate);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "AVIS_ARCHIVED",
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
    const rows = await fetchAvisRows(db, req.query);
    const csv = generateCSV(rows);
    const filename = csvFilename();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_CSV",
      details: JSON.stringify({ rows: rows.length, filters: req.query }),
      ip: clientIp(req),
    });
    res.send(csv);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export CSV");
    res.status(500).json({ error: "Erreur export CSV" });
  }
});

app.get("/admin/export/excel", requireAdmin, async (req, res) => {
  try {
    const rows = await fetchAvisRows(db, req.query);
    const { meta } = buildAvisFilters(req.query);
    const { buffer, filename } = await generateExcel(rows, meta);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_EXCEL",
      details: JSON.stringify({ rows: rows.length }),
      ip: clientIp(req),
    });
    res.send(Buffer.from(buffer));
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export Excel");
    res.status(500).json({ error: "Erreur export Excel" });
  }
});

app.get("/admin/export/pdf", requireAdmin, async (req, res) => {
  try {
    const rows = await fetchAvisRows(db, req.query);
    const { meta } = buildAvisFilters(req.query);
    const { buffer, filename } = await generatePDF(rows, meta);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await logActivity(db, {
      adminId: req.admin?.adminId,
      action: "EXPORT_PDF",
      details: JSON.stringify({ rows: rows.length }),
      ip: clientIp(req),
    });
    res.send(buffer);
  } catch (error) {
    logger.error({ err: error.message }, "Erreur export PDF");
    res.status(500).json({ error: "Erreur export PDF" });
  }
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || "development", allowedOrigins }, "Serveur backend démarré");
});
