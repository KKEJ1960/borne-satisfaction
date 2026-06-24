/**
 * Migration : renommage Loisirs → Loisirs et Divertissements
 *                         Propreté → Cadre Général
 * Usage : node run_rename_categories.js [mot_de_passe_root]
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const DB_NAME  = process.env.DB_NAME  || "hotel_satisfaction";
const DB_HOST  = (process.env.DB_HOST || "localhost").replace(/^@+/, "");
const APP_USER = process.env.DB_USER  || "hotel_app";
const APP_PASS = process.env.DB_PASSWORD ?? "";
const ROOT_PASS = process.argv[2] ?? "";

async function connectAs(user, password) {
  return mysql.createConnection({
    host: DB_HOST, user, password, database: DB_NAME,
    multipleStatements: false, charset: "utf8mb4",
  });
}

async function main() {
  // ── 1. Vérifier si déjà migré ────────────────────────────────────────────
  const app = await connectAs(APP_USER, APP_PASS);
  console.log(`🔌 Connecté en tant que ${APP_USER}@${DB_HOST}`);

  const [enumRows] = await app.query(`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'categorie'
  `, [DB_NAME]);

  const enumType = enumRows[0]?.COLUMN_TYPE || "";
  if (enumType.includes("Loisirs et Divertissements")) {
    console.log("ℹ️  Migration déjà appliquée, rien à faire.");
    await app.end();
    return;
  }

  // ── 2. Renommer dans avis (VARCHAR — pas d'ENUM, UPDATE direct) ──────────
  const [r1] = await app.query(
    "UPDATE avis SET departement = 'Loisirs et Divertissements' WHERE departement = 'Loisirs'"
  );
  console.log(`✅ avis : ${r1.affectedRows} ligne(s) Loisirs renommée(s)`);

  const [r2] = await app.query(
    "UPDATE avis SET departement = 'Cadre Général' WHERE departement = 'Propreté'"
  );
  console.log(`✅ avis : ${r2.affectedRows} ligne(s) Propreté renommée(s)`);

  await app.end();

  // ── 3. Opérations sur l'ENUM avec root ───────────────────────────────────
  console.log("🔑 Connexion root pour ALTER TABLE questions…");
  let root;
  try {
    root = await connectAs("root", ROOT_PASS);
  } catch (e) {
    console.error("❌ Connexion root échouée :", e.message);
    console.error("👉 Lance avec ton mot de passe root : node run_rename_categories.js TON_MDP");
    process.exit(1);
  }

  // Étape A : élargir l'ENUM pour inclure TOUTES les valeurs (anciennes + nouvelles)
  await root.query(`
    ALTER TABLE questions MODIFY categorie ENUM(
      'Accueil','Chambres',
      'Le Bandama Petit Déjeuner','Le Panoramique',"L'Alocodrome",
      'Loisirs','Propreté',
      'Loisirs et Divertissements','Cadre Général'
    ) NOT NULL
  `);
  console.log("✅ ENUM élargi (anciennes + nouvelles valeurs)");

  // Étape B : renommer les lignes maintenant que les nouvelles valeurs existent
  await root.query(
    "UPDATE questions SET categorie = 'Loisirs et Divertissements' WHERE categorie = 'Loisirs'"
  );
  console.log("✅ questions : Loisirs → Loisirs et Divertissements");

  await root.query(
    "UPDATE questions SET categorie = 'Cadre Général' WHERE categorie = 'Propreté'"
  );
  console.log("✅ questions : Propreté → Cadre Général");

  // Étape C : réduire l'ENUM pour ne garder que les nouvelles valeurs
  await root.query(`
    ALTER TABLE questions MODIFY categorie ENUM(
      'Accueil','Chambres',
      'Le Bandama Petit Déjeuner','Le Panoramique',"L'Alocodrome",
      'Loisirs et Divertissements','Cadre Général'
    ) NOT NULL
  `);
  console.log("✅ ENUM final mis à jour");

  await root.end();
  console.log("\n🎉 Migration terminée. Redémarre le backend.");
}

main().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
