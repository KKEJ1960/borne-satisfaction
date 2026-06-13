const CATEGORIES = ["Accueil", "Chambres", "Restaurants", "Loisirs", "Propreté", "Global"];

/**
 * Construit WHERE + params pour les requêtes avis (liste, export, preview archive).
 */
export function buildAvisFilters(query = {}) {
  const conditions = [];
  const params = [];

  const archived =
    query.archived === "true" || query.archived === true;
  conditions.push("a.archived = ?");
  params.push(archived ? 1 : 0);

  if (query.dateDebut) {
    conditions.push("DATE(a.date) >= ?");
    params.push(query.dateDebut);
  }
  if (query.dateFin) {
    conditions.push("DATE(a.date) <= ?");
    params.push(query.dateFin);
  }
  if (query.categorie && query.categorie !== "Toutes" && query.categorie !== "") {
    if (CATEGORIES.includes(query.categorie)) {
      conditions.push("a.departement = ?");
      params.push(query.categorie);
    }
  }
  if (query.note != null && query.note !== "" && query.note !== "Toutes") {
    const n = Number(query.note);
    if (!Number.isNaN(n) && n >= 0 && n <= 4) {
      conditions.push("a.note = ?");
      params.push(n);
    }
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return {
    whereClause,
    params,
    archived,
    meta: {
      dateDebut: query.dateDebut || null,
      dateFin: query.dateFin || null,
      categorie: query.categorie || null,
      note: query.note != null && query.note !== "" ? query.note : null,
      archived,
    },
  };
}

export async function fetchAvisRows(db, query = {}) {
  const { whereClause, params } = buildAvisFilters(query);
  const sql = `
    SELECT a.*, c.nom, c.prenom, c.telephone, c.email, c.numero_chambre
    FROM avis a
    JOIN clients c ON a.client_id = c.id
    ${whereClause}
    ORDER BY a.date DESC
  `;
  const [rows] = await db.query(sql, params);
  return rows;
}

/** Nombre d'avis actifs (non archivés) avant une date — preview archivage */
export async function countAvisToArchive(db, avantDate) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS cnt FROM avis WHERE archived = 0 AND DATE(date) < ?`,
    [avantDate]
  );
  return rows[0]?.cnt ?? 0;
}

export async function archiveAvisBefore(db, avantDate) {
  const [result] = await db.query(
    `UPDATE avis SET archived = 1 WHERE archived = 0 AND DATE(date) < ?`,
    [avantDate]
  );
  return result.affectedRows ?? 0;
}
