/**
 * Migration Affaires v2 — idempotent
 *
 * 1. Ajoute 'Commercial' à l'ENUM questions.categorie
 * 2. Renomme les questions "Tourisme Affaires" → "Commercial"
 *
 * Note: avis.departement est VARCHAR(100), pas d'ENUM à modifier.
 * Sûr à relancer plusieurs fois.
 */
import db from "./db.js";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const ok   = (msg) => console.log("  ✅", msg);
const skip = (msg) => console.log("  ℹ️ ", msg);
const fail = (msg) => console.error("  ❌", msg);

async function getColumnType(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0]?.COLUMN_TYPE || "";
}

async function run() {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // ── 1. questions.categorie ENUM — ajout de 'Commercial' ──────────────────
    console.log("\n📋 Étape 1 — ENUM questions.categorie");
    const qEnum = await getColumnType(conn, "questions", "categorie");

    if (!qEnum.includes("'Commercial'")) {
      await conn.query(`
        ALTER TABLE questions
        MODIFY COLUMN categorie ENUM(
          'Accueil','Chambres','Le Bandama Petit Déjeuner','Le Panoramique',
          'L''Alocodrome','Loisirs et Divertissements','Cadre Général',
          'Tourisme Affaires','Commercial'
        ) NOT NULL
      `);
      ok("'Commercial' ajouté à questions.categorie ENUM");
    } else {
      skip("'Commercial' déjà dans questions.categorie ENUM");
    }

    // ── 2. Renommer les questions Tourisme Affaires → Commercial ──────────────
    console.log("\n📋 Étape 2 — Renommage questions 'Tourisme Affaires' → 'Commercial'");
    const [result] = await conn.query(
      `UPDATE questions SET categorie = 'Commercial' WHERE categorie = 'Tourisme Affaires'`
    );
    if (result.affectedRows > 0) {
      ok(`${result.affectedRows} question(s) renommée(s) : 'Tourisme Affaires' → 'Commercial'`);
    } else {
      skip("Aucune question à renommer (déjà migré ou catégorie vide)");
    }

    await conn.commit();
    console.log("\n✅ Migration Affaires v2 terminée.\n");
  } catch (err) {
    if (conn) await conn.rollback();
    fail(`Migration échouée : ${err.message}`);
    process.exit(1);
  } finally {
    if (conn) conn.release();
    await db.end();
  }
}

run();
