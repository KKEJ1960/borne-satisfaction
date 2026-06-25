/**
 * Script de setup complet pour la production (Railway / tout hébergeur MySQL).
 *
 * Fait tout en une seule passe, dans l'ordre correct, de façon idempotente :
 *   1. Connexion MySQL (supporte DB_HOST/DB_* et MYSQLHOST/MYSQL* Railway)
 *   2. Création des 5 tables si absentes
 *   3. Ajout des colonnes manquantes (numero_chambre, type_sejour, archived…)
 *   4. Mise à jour de l'ENUM questions.categorie vers la v2
 *   5. Insertion des questions par défaut par catégorie (si absentes)
 *   6. Création / mise à jour des comptes admin depuis les variables d'env
 *   7. Résumé
 *
 * Usage :
 *   node run_prod_setup.js        (lit backend/.env)
 *   npm run prod-setup
 */

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

// ── Connexion : supporte les deux conventions de nommage ─────────────────────
// Local / générique : DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
// Railway MySQL     : MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
function buildConfig() {
  const host = (process.env.DB_HOST || process.env.MYSQLHOST || "localhost").replace(/^@+/, "");
  const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
  const user = process.env.DB_USER || process.env.MYSQLUSER || "root";
  const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "";
  const database = process.env.DB_NAME || process.env.MYSQLDATABASE || "railway";
  // Railway exige SSL ; en local on le désactive
  const ssl = process.env.DB_SSL === "true" || process.env.MYSQLHOST
    ? { rejectUnauthorized: false }
    : undefined;
  return { host, port, user, password, database, ssl, charset: "utf8mb4" };
}

// ── Helpers information_schema ────────────────────────────────────────────────
// On utilise DATABASE() plutôt qu'une variable env pour éviter toute
// divergence entre le nom réel de la base et ce qu'on a dans .env.

async function getDbName(conn) {
  const [[row]] = await conn.query("SELECT DATABASE() AS db");
  return row.db;
}

async function tableExists(conn, dbName, table) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
    [dbName, table]
  );
  return row.n > 0;
}

async function columnExists(conn, dbName, table, column) {
  const [[row]] = await conn.query(
    "SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [dbName, table, column]
  );
  return row.n > 0;
}

async function getEnumType(conn, dbName, table, column) {
  const [[row]] = await conn.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [dbName, table, column]
  );
  return row?.COLUMN_TYPE || "";
}

// ── Questions par défaut (v2) ─────────────────────────────────────────────────
const DEFAULT_QUESTIONS = {
  "Accueil": [
    { texte: "Avez-vous été bien accueilli(e) dans notre hôtel ?",         ordre: 0 },
    { texte: "Le personnel a-t-il été aimable et poli ?",                  ordre: 1 },
    { texte: "Votre réservation était-elle bien prise en compte ?",        ordre: 2 },
    { texte: "Votre temps d'attente lors de votre check-in était-il acceptable ?", ordre: 3 },
  ],
  "Chambres": [
    { texte: "Votre chambre était-elle propre et agréable ?",              ordre: 0 },
    { texte: "Votre literie correspondait-elle à votre confort ?",         ordre: 1 },
    { texte: "Votre salle de bain était-elle équipée et propre ?",         ordre: 2 },
    { texte: "La température de l'air conditionné était-elle adaptée ?",   ordre: 3 },
  ],
  "Le Bandama Petit Déjeuner": [
    { texte: "Avez-vous été bien accueilli(e) au petit déjeuner ?",        ordre: 0 },
    { texte: "Le buffet était-il achalandé et attrayant ?",                ordre: 1 },
    { texte: "Les choix de repas proposés a-t-il répondu à vos attentes ?", ordre: 2 },
    { texte: "Le service en salle était-il rapide et efficace ?",          ordre: 3 },
    { texte: "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?", ordre: 4 },
  ],
  "Le Panoramique": [
    { texte: "Avez-vous été bien accueilli(e) au restaurant ?",            ordre: 0 },
    { texte: "Notre menu disponible était-il attrayant ?",                 ordre: 1 },
    { texte: "Votre repas était-il à votre goût ?",                       ordre: 2 },
    { texte: "Le service en salle était-il rapide et efficace ?",          ordre: 3 },
    { texte: "Les prix des menus étaient-ils satisfaisants ?",             ordre: 4 },
    { texte: "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?", ordre: 5 },
  ],
  "L'Alocodrome": [
    { texte: "Avez-vous été bien accueilli(e) au restaurant ?",            ordre: 0 },
    { texte: "Notre menu disponible était-il attrayant ?",                 ordre: 1 },
    { texte: "Votre repas était-il à votre goût ?",                       ordre: 2 },
    { texte: "Le service était-il rapide et efficace ?",                   ordre: 3 },
    { texte: "Les prix des menus étaient-ils satisfaisants ?",             ordre: 4 },
    { texte: "Le sens du service du personnel (amabilité, disponibilité, courtoisie, politesse) vous a-t-il satisfait ?", ordre: 5 },
  ],
  "Loisirs et Divertissements": [
    { texte: "Les activités disponibles étaient-elles variées ?",          ordre: 0 },
    { texte: "Le personnel d'animation était-il dynamique ?",              ordre: 1 },
    { texte: "Les installations étaient-elles bien entretenues ?",         ordre: 2 },
  ],
  "Cadre Général": [
    { texte: "Comment évaluez-vous la propreté générale de l'hôtel ?",    ordre: 0 },
    { texte: "Les espaces communs étaient-ils bien entretenus ?",          ordre: 1 },
    { texte: "Les toilettes communes étaient-elles propres et bien odorantes ?", ordre: 2 },
    { texte: "Votre expérience dans notre hôtel a-t-elle été satisfaisante ?", ordre: 3 },
    { texte: "L'expérience de vos enfants a-t-elle été satisfaisante ?",  ordre: 4 },
  ],
  "Tourisme Affaires": [
    { texte: "Le personnel commercial était-il chaleureux, aimable, courtois et disponible ?", ordre: 0 },
    { texte: "Le personnel commercial était-il à l'écoute et efficace ?", ordre: 1 },
    { texte: "Le bureau et l'éclairage de l'espace de travail en chambre étaient-ils adaptés ?", ordre: 2 },
    { texte: "Le Wi-Fi vous permettait-il de travailler aisément ?",       ordre: 3 },
    { texte: "Le cadre a-t-il été propice pour vos besoins professionnels ?", ordre: 4 },
    { texte: "La qualité des repas était-elle satisfaisante ?",            ordre: 5 },
    { texte: "L'offre a-t-elle globalement répondu à vos attentes ?",     ordre: 6 },
  ],
};

// ENUM complet v2 — valeur littérale pour le SQL
const ENUM_V2 = `ENUM(
  'Accueil',
  'Chambres',
  'Le Bandama Petit Déjeuner',
  'Le Panoramique',
  'L''Alocodrome',
  'Loisirs et Divertissements',
  'Cadre Général',
  'Tourisme Affaires'
) NOT NULL`;

// ── Résumé des actions ────────────────────────────────────────────────────────
const done  = [];
const skipped = [];
const warn  = [];

function ok(msg)   { done.push(msg);    console.log("  ✅", msg); }
function skip(msg) { skipped.push(msg); console.log("  ℹ️ ", msg); }
function bad(msg)  { warn.push(msg);    console.warn("  ⚠️ ", msg); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const config = buildConfig();
  console.log(`\n🔌 Connexion à ${config.host}:${config.port} → base "${config.database}"…`);

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (e) {
    console.error("❌ Connexion MySQL échouée :", e.message);
    console.error("   Vérifiez DB_HOST / DB_USER / DB_PASSWORD / DB_NAME dans vos variables d'env.");
    process.exit(1);
  }

  const dbName = await getDbName(conn);
  console.log(`   Base active : ${dbName}\n`);

  // ── Étape 1 : Tables ────────────────────────────────────────────────────────
  console.log("📋 Étape 1 — Vérification / création des tables");

  // clients
  if (!(await tableExists(conn, dbName, "clients"))) {
    await conn.query(`
      CREATE TABLE clients (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        nom            VARCHAR(255) NOT NULL,
        prenom         VARCHAR(255) NOT NULL,
        telephone      VARCHAR(50)  NOT NULL,
        email          VARCHAR(255) NULL,
        numero_chambre VARCHAR(10)  NOT NULL DEFAULT '',
        type_sejour    ENUM('loisirs','affaires') NOT NULL DEFAULT 'loisirs'
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    ok("Table clients créée");
  } else {
    skip("Table clients déjà présente");
  }

  // admins (doit exister avant logs_activite pour la FK)
  if (!(await tableExists(conn, dbName, "admins"))) {
    await conn.query(`
      CREATE TABLE admins (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        login               VARCHAR(100) NOT NULL UNIQUE,
        password_hash       VARCHAR(255) NOT NULL,
        role                ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
        actif               BOOLEAN NOT NULL DEFAULT true,
        date_creation       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        derniere_connexion  TIMESTAMP NULL,
        created_by          INT NULL,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    ok("Table admins créée");
  } else {
    skip("Table admins déjà présente");
  }

  // avis
  if (!(await tableExists(conn, dbName, "avis"))) {
    await conn.query(`
      CREATE TABLE avis (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        client_id   INT NOT NULL,
        departement VARCHAR(100) NOT NULL,
        note        INT NOT NULL,
        commentaire TEXT NULL,
        date        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived    BOOLEAN NOT NULL DEFAULT false,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    await conn.query("CREATE INDEX idx_avis_date        ON avis(date)");
    await conn.query("CREATE INDEX idx_avis_archived    ON avis(archived)");
    await conn.query("CREATE INDEX idx_avis_departement ON avis(departement)");
    await conn.query("CREATE INDEX idx_avis_client_id   ON avis(client_id)");
    ok("Table avis créée (+ indexes)");
  } else {
    skip("Table avis déjà présente");
  }

  // questions
  if (!(await tableExists(conn, dbName, "questions"))) {
    await conn.query(`
      CREATE TABLE questions (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        categorie      ${ENUM_V2},
        texte          VARCHAR(500) NOT NULL,
        ordre          INT NOT NULL DEFAULT 0,
        actif          BOOLEAN NOT NULL DEFAULT true,
        date_creation  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    ok("Table questions créée (ENUM v2)");
  } else {
    skip("Table questions déjà présente");
  }

  // logs_activite
  if (!(await tableExists(conn, dbName, "logs_activite"))) {
    await conn.query(`
      CREATE TABLE logs_activite (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        admin_id   INT NULL,
        action     VARCHAR(100) NOT NULL,
        details    TEXT NULL,
        ip_address VARCHAR(45) NULL,
        date       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    ok("Table logs_activite créée");
  } else {
    skip("Table logs_activite déjà présente");
  }

  // ── Étape 2 : Colonnes manquantes ───────────────────────────────────────────
  console.log("\n📋 Étape 2 — Colonnes manquantes");

  if (!(await columnExists(conn, dbName, "clients", "numero_chambre"))) {
    await conn.query("ALTER TABLE clients ADD COLUMN numero_chambre VARCHAR(10) NOT NULL DEFAULT ''");
    ok("clients.numero_chambre ajoutée");
  } else {
    skip("clients.numero_chambre déjà présente");
  }

  if (!(await columnExists(conn, dbName, "clients", "type_sejour"))) {
    await conn.query(
      "ALTER TABLE clients ADD COLUMN type_sejour ENUM('loisirs','affaires') NOT NULL DEFAULT 'loisirs'"
    );
    ok("clients.type_sejour ajoutée");
  } else {
    skip("clients.type_sejour déjà présente");
  }

  if (!(await columnExists(conn, dbName, "avis", "archived"))) {
    await conn.query("ALTER TABLE avis ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false");
    ok("avis.archived ajoutée");
  } else {
    skip("avis.archived déjà présente");
  }

  if (!(await columnExists(conn, dbName, "admins", "derniere_connexion"))) {
    await conn.query("ALTER TABLE admins ADD COLUMN derniere_connexion TIMESTAMP NULL");
    ok("admins.derniere_connexion ajoutée");
  } else {
    skip("admins.derniere_connexion déjà présente");
  }

  if (!(await columnExists(conn, dbName, "admins", "created_by"))) {
    await conn.query(
      "ALTER TABLE admins ADD COLUMN created_by INT NULL, ADD FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL"
    );
    ok("admins.created_by ajoutée");
  } else {
    skip("admins.created_by déjà présente");
  }

  // ── Étape 3 : ENUM questions.categorie ────────────────────────────────────
  console.log("\n📋 Étape 3 — ENUM questions.categorie");

  const currentEnum = await getEnumType(conn, dbName, "questions", "categorie");
  const needsEnum = !currentEnum.includes("Tourisme Affaires") || !currentEnum.includes("Le Bandama");

  if (needsEnum) {
    await conn.query(`ALTER TABLE questions MODIFY categorie ${ENUM_V2}`);
    ok("ENUM questions.categorie mis à jour (v2 complète)");
  } else {
    skip("ENUM questions.categorie déjà à jour");
  }

  // ── Étape 4 : Questions par défaut ─────────────────────────────────────────
  console.log("\n📋 Étape 4 — Questions par défaut");

  for (const [categorie, questions] of Object.entries(DEFAULT_QUESTIONS)) {
    const [[{ cnt }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM questions WHERE categorie = ?",
      [categorie]
    );
    if (cnt === 0) {
      for (const q of questions) {
        await conn.query(
          "INSERT INTO questions (categorie, texte, ordre, actif) VALUES (?, ?, ?, true)",
          [categorie, q.texte, q.ordre]
        );
      }
      ok(`${questions.length} question(s) insérée(s) pour "${categorie}"`);
    } else {
      skip(`"${categorie}" : ${cnt} question(s) déjà présente(s)`);
    }
  }

  // ── Étape 5 : Comptes administrateurs ──────────────────────────────────────
  console.log("\n📋 Étape 5 — Comptes administrateurs");

  const DEFAULT_PASSWORDS = ["admin123", "password", "admin", "superadmin", "123456", "changeme"];

  async function upsertAdmin(login, rawPwd, hashEnv, role) {
    if (!login) { bad(`LOGIN manquant pour le rôle ${role}`); return; }

    let hash = hashEnv?.trim() || null;

    if (!hash) {
      if (!rawPwd) { bad(`Ni PASSWORD ni PASSWORD_HASH défini pour "${login}" — compte ignoré`); return; }
      if (DEFAULT_PASSWORDS.includes(rawPwd)) {
        console.error(`❌ Le mot de passe de "${login}" est trop simple. Changez ${role.toUpperCase()}_PASSWORD dans vos variables d'env.`);
        process.exit(1);
      }
      if (rawPwd.length < 12) {
        console.error(`❌ Le mot de passe de "${login}" est trop court (minimum 12 caractères).`);
        process.exit(1);
      }
      hash = await bcrypt.hash(rawPwd, 12);
    }

    const [[existing]] = await conn.query("SELECT id FROM admins WHERE login = ?", [login]);
    if (existing) {
      await conn.query(
        "UPDATE admins SET password_hash = ?, role = ?, actif = 1 WHERE login = ?",
        [hash, role, login]
      );
      ok(`Admin "${login}" (${role}) mis à jour`);
    } else {
      await conn.query(
        "INSERT INTO admins (login, password_hash, role, actif) VALUES (?, ?, ?, true)",
        [login, hash, role]
      );
      ok(`Admin "${login}" (${role}) créé`);
    }
  }

  await upsertAdmin(
    process.env.SUPERADMIN_LOGIN    || "superadmin",
    process.env.SUPERADMIN_PASSWORD || null,
    process.env.SUPERADMIN_PASSWORD_HASH || null,
    "superadmin"
  );

  await upsertAdmin(
    process.env.ADMIN_LOGIN    || process.env.ADMIN_USERNAME || "admin",
    process.env.ADMIN_PASSWORD || null,
    process.env.ADMIN_PASSWORD_HASH || null,
    "admin"
  );

  // ── Résumé ──────────────────────────────────────────────────────────────────
  await conn.end();

  console.log("\n─────────────────────────────────────────────");
  console.log(`✅ Setup terminé — base "${dbName}"`);
  console.log(`   ${done.length} action(s) appliquée(s), ${skipped.length} ignorée(s) (déjà OK)`);
  if (warn.length) console.warn(`   ⚠️  ${warn.length} avertissement(s) — voir ci-dessus`);
  console.log("─────────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error("\n❌ Erreur fatale :", err.message);
  if (err.code) console.error("   Code :", err.code);
  process.exit(1);
});
