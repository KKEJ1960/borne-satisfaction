import jwt from "jsonwebtoken";

function extractToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return null;
}

function verifyToken(req, res) {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ error: "Authentification requise" });
    return null;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("❌ JWT_SECRET manquant dans .env");
    res.status(500).json({ error: "Configuration serveur incomplète" });
    return null;
  }

  try {
    return jwt.verify(token, secret);
  } catch (err) {
    // P4.3 — Distingue session expirée (TOKEN_EXPIRED) des tokens invalides
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "Session expirée", code: "TOKEN_EXPIRED" });
    } else {
      res.status(401).json({ error: "Session expirée ou invalide" });
    }
    return null;
  }
}

/** Admin hôtel ou superadmin (accès dashboard avis / questions) */
export function requireAdmin(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;

  if (payload.role !== "admin" && payload.role !== "superadmin") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  req.admin = payload;
  next();
}

/** Superadmin uniquement */
export function requireSuperAdmin(req, res, next) {
  const payload = verifyToken(req, res);
  if (!payload) return;

  if (payload.role !== "superadmin") {
    return res.status(403).json({ error: "Accès réservé au super administrateur" });
  }

  req.admin = payload;
  next();
}
