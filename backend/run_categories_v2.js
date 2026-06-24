/**
 * Migration : suppression de Restaurants, ajout des 3 nouvelles catégories restaurant.
 * Usage : node run_categories_v2.js [mot_de_passe_root]
 *   - Si le mot de passe root est vide (WAMP par défaut) : node run_categories_v2.js
 *   - Si tu as un mot de passe root                      : node run_categories_v2.js monMotDePasse
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const DB_NAME   = process.env.DB_NAME  || "hotel_satisfaction";
const DB_HOST   = (process.env.DB_HOST || "localhost").replace(/^@+/, "");
const APP_USER  = process.env.DB_USER  || "hotel_app";
const APP_PASS  = process.env.DB_PASSWORD ?? "";
const ROOT_PASS = process.argv[2] ?? "";   // mot de passe root en argument CLI

async function connectAs(user, password) {
  return mysql.createConnection({
    host: DB_HOST,
    user,
    password,
    database: DB_NAME,
    multipleStatements: false,
    charset: "utf8mb4",
  });
}

async function main() {
  // ── 1. Connexion app pour vérifier si déjà migré ─────────────────────────
  const app = await connectAs(APP_USER, APP_PASS);
  console.log(`🔌 Connecté en tant que ${APP_USER}@${DB_HOST}`);

  const [enumRows] = await app.query(`
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'questions' AND COLUMN_NAME = 'categorie'
  `, [DB_NAME]);

  const enumType = enumRows[0]?.COLUMN_TYPE || "";
  if (enumType.includes("Le Bandama")) {
    console.log("ℹ️  Migration déjà appliquée, rien à faire.");
    await app.end();
    return;
  }

  // ── 2. Supprimer les questions Restaurants (hotel_app peut faire DELETE) ──
  const [del] = await app.query("DELETE FROM questions WHERE categorie = 'Restaurants'");
  console.log(`✅ ${del.affectedRows} question(s) Restaurants supprimée(s)`);
  await app.end();

  // ── 3. ALTER TABLE avec root (nécessite le privilège ALTER) ───────────────
  console.log(`🔑 Connexion root pour ALTER TABLE…`);
  let root;
  try {
    root = await connectAs("root", ROOT_PASS);
  } catch (e) {
    console.error("❌ Connexion root échouée :", e.message);
    console.error("\n👉 Lance la commande avec ton mot de passe root :");
    console.error("   node run_categories_v2.js TON_MOT_DE_PASSE_ROOT");
    console.error("\n   Si root n'a pas de mot de passe (WAMP par défaut) :");
    console.error("   node run_categories_v2.js");
    process.exit(1);
  }

  await root.query(`
    ALTER TABLE questions
      MODIFY categorie ENUM(
        'Accueil',
        'Chambres',
        'Le Bandama Petit Déjeuner',
        'Le Panoramique',
        'L''Alocodrome',
        'Loisirs',
        'Propreté'
      ) NOT NULL
  `);
  console.log("✅ ENUM mis à jour");
  await root.end();

  // ── 4. INSERTs avec hotel_app ─────────────────────────────────────────────
  const app2 = await connectAs(APP_USER, APP_PASS);

  await app2.query(`
    INSERT INTO questions (categorie, texte, ordre, actif) VALUES
    ('Le Bandama Petit Déjeuner', 'Avez-vous été bien accueilli(e) au petit déjeuner ?', 0, true),
    ('Le Bandama Petit Déjeuner', 'Le buffet était-il achalandé et attrayant ?', 1, true),
    ('Le Bandama Petit Déjeuner', 'Les choix de repas proposés a-t-il répondu à vos attentes ?', 2, true),
    ('Le Bandama Petit Déjeuner', 'Le service en salle était-il rapide et efficace ?', 3, true),
    ('Le Bandama Petit Déjeuner', 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 4, true)
  `);
  console.log("✅ Questions Le Bandama Petit Déjeuner insérées");

  await app2.query(`
    INSERT INTO questions (categorie, texte, ordre, actif) VALUES
    ('Le Panoramique', 'Avez-vous été bien accueilli(e) au restaurant ?', 0, true),
    ('Le Panoramique', 'Notre menu disponible était-il attrayant ?', 1, true),
    ('Le Panoramique', 'Votre repas étaient-il à votre goût ?', 2, true),
    ('Le Panoramique', 'Le service en salle était-il rapide et efficace ?', 3, true),
    ('Le Panoramique', 'Les prix des menus étaient-ils satisfaisants ?', 4, true),
    ('Le Panoramique', 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 5, true)
  `);
  console.log("✅ Questions Le Panoramique insérées");

  await app2.query(`
    INSERT INTO questions (categorie, texte, ordre, actif) VALUES
    ("L'Alocodrome", 'Avez-vous été bien accueilli(e) au restaurant ?', 0, true),
    ("L'Alocodrome", 'Notre menu disponible était-il attrayant ?', 1, true),
    ("L'Alocodrome", 'Votre repas étaient-il à votre goût ?', 2, true),
    ("L'Alocodrome", 'Le service était-il rapide et efficace ?', 3, true),
    ("L'Alocodrome", 'Les prix des menus étaient-ils satisfaisants ?', 4, true),
    ("L'Alocodrome", 'Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?', 5, true)
  `);
  console.log("✅ Questions L'Alocodrome insérées");

  await app2.end();
  console.log("\n🎉 Migration terminée. Redémarre le backend.");
}

main().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
