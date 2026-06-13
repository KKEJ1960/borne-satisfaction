/** Journalise une action dans logs_activite */
export async function logActivity(db, { adminId = null, action, details = null, ip = null }) {
  try {
    await db.query(
      `INSERT INTO logs_activite (admin_id, action, details, ip_address) VALUES (?, ?, ?, ?)`,
      [adminId, action, details, ip]
    );
  } catch (err) {
    console.error("❌ logActivity:", err.message);
  }
}

export function clientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
}
