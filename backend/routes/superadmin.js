import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireSuperAdmin } from "../middleware/auth.js";
import { logActivity, clientIp } from "../utils/activityLog.js";
import { fetchAvisRows } from "../utils/avisQuery.js";

const router = Router();

router.use(requireSuperAdmin);

router.get("/admins", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, login, role, actif, date_creation, derniere_connexion, created_by
       FROM admins ORDER BY role DESC, login ASC`
    );
    res.json(rows.map((r) => ({ ...r, actif: !!r.actif })));
  } catch (error) {
    console.error("❌ GET /superadmin/admins:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/admins", async (req, res) => {
  try {
    const { login, password, role = "admin" } = req.body;
    if (!login?.trim() || !password || password.length < 12) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 12 caractères" });
    }
    if (!["admin", "superadmin"].includes(role)) {
      return res.status(400).json({ error: "role invalide" });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO admins (login, password_hash, role, actif, created_by) VALUES (?, ?, ?, true, ?)`,
      [login.trim(), hash, role, req.admin.adminId]
    );

    await logActivity(db, {
      adminId: req.admin.adminId,
      action: "ADMIN_CREATED",
      details: JSON.stringify({ login: login.trim(), role, newId: result.insertId }),
      ip: clientIp(req),
    });

    res.status(201).json({ id: result.insertId, login: login.trim(), role, actif: true });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ce login existe déjà" });
    }
    console.error("❌ POST /superadmin/admins:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/admins/:id/toggle", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id === req.admin.adminId) {
      return res.status(400).json({ error: "Vous ne pouvez pas bloquer votre propre compte" });
    }

    const [rows] = await db.query("SELECT id, login, actif FROM admins WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Admin introuvable" });

    const newActif = rows[0].actif ? 0 : 1;
    await db.query("UPDATE admins SET actif = ? WHERE id = ?", [newActif, id]);

    await logActivity(db, {
      adminId: req.admin.adminId,
      action: newActif ? "ADMIN_UNBLOCKED" : "ADMIN_BLOCKED",
      details: JSON.stringify({ targetId: id, login: rows[0].login }),
      ip: clientIp(req),
    });

    res.json({ id, actif: !!newActif });
  } catch (error) {
    console.error("❌ PUT toggle:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.put("/admins/:id/password", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { new_password: newPassword } = req.body;
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 12 caractères" });
    }

    const [rows] = await db.query("SELECT login FROM admins WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ error: "Admin introuvable" });

    const hash = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE admins SET password_hash = ? WHERE id = ?", [hash, id]);

    await logActivity(db, {
      adminId: req.admin.adminId,
      action: "PASSWORD_RESET",
      details: JSON.stringify({ targetId: id, login: rows[0].login }),
      ip: clientIp(req),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ PUT password:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/logs", async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const page = Math.max(1, Number(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (req.query.adminId) {
      conditions.push("l.admin_id = ?");
      params.push(Number(req.query.adminId));
    }
    if (req.query.action) {
      conditions.push("l.action = ?");
      params.push(req.query.action);
    }
    if (req.query.dateDebut) {
      conditions.push("DATE(l.date) >= ?");
      params.push(req.query.dateDebut);
    }
    if (req.query.dateFin) {
      conditions.push("DATE(l.date) <= ?");
      params.push(req.query.dateFin);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM logs_activite l ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const [rows] = await db.query(
      `SELECT l.*, a.login AS admin_login
       FROM logs_activite l
       LEFT JOIN admins a ON l.admin_id = a.id
       ${where}
       ORDER BY l.date DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ items: rows, total, page, limit, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    console.error("❌ GET /superadmin/logs:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const [[avisTotal]] = await db.query(
      "SELECT COUNT(*) AS n FROM avis WHERE archived = 0"
    );
    const [[avisToday]] = await db.query(
      "SELECT COUNT(*) AS n FROM avis WHERE archived = 0 AND DATE(date) = CURDATE()"
    );
    const [[clients]] = await db.query("SELECT COUNT(DISTINCT client_id) AS n FROM avis");
    const [[adminsActifs]] = await db.query(
      "SELECT COUNT(*) AS n FROM admins WHERE actif = 1"
    );
    const [[lastLog]] = await db.query(
      "SELECT MAX(date) AS d FROM logs_activite"
    );

    res.json({
      total_avis: avisTotal?.n ?? 0,
      avis_aujourd_hui: avisToday?.n ?? 0,
      total_clients: clients?.n ?? 0,
      admins_actifs: adminsActifs?.n ?? 0,
      derniere_activite: lastLog?.d || null,
    });
  } catch (error) {
    console.error("❌ GET /superadmin/stats:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/** Stats satisfaction lecture seule (moyennes par catégorie) */
router.get("/satisfaction", async (req, res) => {
  try {
    const rows = await fetchAvisRows(db, { archived: false, ...req.query });
    const notes = rows.filter((a) => a.note > 0);
    const parDept = {};
    for (const a of notes) {
      if (!parDept[a.departement]) parDept[a.departement] = { total: 0, count: 0 };
      parDept[a.departement].total += a.note;
      parDept[a.departement].count += 1;
    }
    const moyennes = {};
    for (const [d, v] of Object.entries(parDept)) {
      moyennes[d] = Number((v.total / v.count).toFixed(2));
    }
    const byMonth = {};
    for (const a of notes) {
      const m = new Date(a.date).toISOString().slice(0, 7);
      if (!byMonth[m]) byMonth[m] = { total: 0, count: 0 };
      byMonth[m].total += a.note;
      byMonth[m].count += 1;
    }
    const evolution = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, moyenne: Number((v.total / v.count).toFixed(2)) }));

    res.json({
      moyennes,
      evolution,
      total_avis: rows.length,
      note_moyenne: notes.length
        ? (notes.reduce((s, a) => s + a.note, 0) / notes.length).toFixed(2)
        : "0.00",
    });
  } catch (error) {
    console.error("❌ GET /superadmin/satisfaction:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
