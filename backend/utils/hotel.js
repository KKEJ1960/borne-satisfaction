/** Validation du paramètre hotel_id (multi-hôtel : 1 = Président, 2 = HP Resort). */

const VALID_HOTEL_IDS = [1, 2];

export function parseHotelId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || !VALID_HOTEL_IDS.includes(n)) return null;
  return n;
}

/** hotel_id obligatoire (body ou query). Envoie une 400 et retourne null si absent/invalide. */
export function requireHotelId(req, res) {
  const raw = req.body?.hotel_id ?? req.query?.hotel_id;
  const hotelId = parseHotelId(raw);
  if (hotelId == null) {
    res.status(400).json({ error: "hotel_id requis (1 ou 2)." });
    return null;
  }
  return hotelId;
}

/**
 * hotel_id optionnel (body ou query) — pour les routes superadmin qui
 * acceptent une vue "tous hôtels confondus" quand il est absent.
 * Retourne { hotelId } (hotelId = null si absent) ou null si une valeur
 * invalide a été fournie (auquel cas une 400 a déjà été envoyée).
 */
export function optionalHotelId(req, res) {
  const raw = req.body?.hotel_id ?? req.query?.hotel_id;
  if (raw === undefined || raw === null || raw === "") return { hotelId: null };
  const hotelId = parseHotelId(raw);
  if (hotelId == null) {
    res.status(400).json({ error: "hotel_id invalide (1 ou 2 attendu)." });
    return null;
  }
  return { hotelId };
}
