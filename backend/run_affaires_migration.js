/**
 * Migration : fonctionnalité Tourisme d'affaires / Professionnel.
 * - Ajoute la colonne type_sejour ENUM('loisirs','affaires') à clients
 * - Ajoute 'Tourisme Affaires' à l'ENUM de questions.categorie
 * - Insère les 7 questions du questionnaire professionnel
 *
 * Usage :
 *   node run_affaires_migration.js              (root sans mot de passe, WAMP par défaut)
 *   node run_affaires_migration.js monMotDePasse
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const DB_NAME   = process.env.DB_NAME     || "hotel_satisfaction";
const DB_HOST   = (process.env.DB_HOST   || "localhost").replace(/^@+/, "");
const APP_USER  = process.env.DB_USER    || "hotel_app";
const APP_PASS  = process.env.DB_PASSWORD ?? "";
const ROOT_PASS = process.argv[2] ?? "";

async function connectAs(user, password) {
  return mysql.createConnection({
    host: DB_HOST, user, password, database: DB_NAME,
    multipleStatements: false, charset: "utf8mb4",
  });
}

async function main() {
  // ── 1. Vérifications idempotentes via hotel_app ───────────────────────────
  const app = await connectAs(APP_USER, APP_PASS);
  console.log(`🔌 Connecté en tant que ${APP_USER}@${DB_HOST}`);

  const [cols] = await app.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'type_sejour'
  `, [DB_NAME]);
  const typeSejeurExists = cols.length > 0;

  const [enumRows] = await app.query(`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'categorie'
  `, [DB_NAME]);
  const enumType = enumRows[0]?.COLUMN_TYPE || "";
  const affairesInEnum = enumType.includes("Tourisme Affaires");

  const [qCount] = await app.query(
    "SELECT COUNT(*) AS cnt FROM questions WHERE categorie = 'Tourisme Affaires'"
  );
  const questionsExist = qCount[0].cnt > 0;

  await app.end();

  if (typeSejeurExists && affairesInEnum && questionsExist) {
    console.log("ℹ️  Migration déjà appliquée, rien à faire.");
    return;
  }

  // ── 2. ALTER TABLE (nécessite root) ──────────────────────────────────────
  console.log("🔑 Connexion root pour ALTER TABLE…");
  let root;
  try {
    root = await connectAs("root", ROOT_PASS);
  } catch (e) {
    console.error("❌ Connexion root échouée :", e.message);
    console.error("\n👉 Relance avec ton mot de passe root :");
    console.error("   node run_affaires_migration.js TON_MOT_DE_PASSE_ROOT");
    process.exit(1);
  }

  if (!typeSejeurExists) {
    await root.query(`
      ALTER TABLE clients
        ADD COLUMN type_sejour ENUM('loisirs', 'affaires') NOT NULL DEFAULT 'loisirs'
    `);
    console.log("✅ Colonne type_sejour ajoutée à clients");
  } else {
    console.log("ℹ️  type_sejour existe déjà dans clients");
  }

  if (!affairesInEnum) {
    await root.query(`
      ALTER TABLE questions MODIFY categorie ENUM(
        'Accueil',
        'Chambres',
        'Le Bandama Petit Déjeuner',
        'Le Panoramique',
        'L''Alocodrome',
        'Loisirs et Divertissements',
        'Cadre Général',
        'Tourisme Affaires'
      ) NOT NULL
    `);
    console.log("✅ ENUM questions.categorie étendu avec 'Tourisme Affaires'");
  } else {
    console.log("ℹ️  'Tourisme Affaires' déjà dans l'ENUM");
  }

  await root.end();

  // ── 3. INSERT questions via hotel_app ────────────────────────────────────
  if (!questionsExist) {
    const app2 = await connectAs(APP_USER, APP_PASS);
    await app2.query(`
      INSERT INTO questions (categorie, texte, ordre, actif) VALUES
      ('Tourisme Affaires', 'Le personnel commercial était-il chaleureux, aimable, courtois et disponible ?', 0, true),
      ('Tourisme Affaires', 'Le personnel commercial était-il à l\\'écoute et efficace ?', 1, true),
      ('Tourisme Affaires', 'Le bureau et l\\'éclairage de l\\'espace de travail en chambre étaient-ils adaptés ?', 2, true),
      ('Tourisme Affaires', 'Le Wi-Fi vous permettait-il de travailler aisément ?', 3, true),
      ('Tourisme Affaires', 'Le cadre a-t-il été propice pour vos besoins professionnels ?', 4, true),
      ('Tourisme Affaires', 'La qualité des repas était-elle satisfaisante ?', 5, true),
      ('Tourisme Affaires', 'L\\'offre a-t-elle globalement répondu à vos attentes ?', 6, true)
    `);
    console.log("✅ 7 questions Tourisme Affaires insérées");
    await app2.end();
  } else {
    console.log(`ℹ️  Questions Tourisme Affaires existent déjà (${qCount[0].cnt})`);
  }

  console.log("\n🎉 Migration terminée. Redémarre le backend.");
}

main().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
