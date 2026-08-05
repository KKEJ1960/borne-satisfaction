/**
 * Migration multi-hôtel — ajoute le support de plusieurs établissements
 * (Hôtel Président Yamoussoukro + HP Resort) sur la même base MySQL.
 * Idempotent — peut être relancé sans risque.
 * Usage : node run_multihotel_migration.js
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const HOTELS = [
  { id: 1, nom: "Hôtel Président Yamoussoukro", slug: "president" },
  { id: 2, nom: "HP Resort", slug: "hpresort" },
];

const HOTEL_ID_TABLES = ["clients", "avis", "questions", "messages_clients", "logs_activite"];

const CATEGORIE_ENUM = `ENUM(
  'Accueil',
  'Chambres',
  'Le Bandama Petit Déjeuner',
  'Le Panoramique',
  'L''Alocodrome',
  'Loisirs et Divertissements',
  'Cadre Général',
  'Tourisme Affaires',
  'Commercial',
  'Saveurs du Monde',
  '4 Épices',
  'Poulet Chaud',
  'Loisirs',
  'Cadre'
) NOT NULL`;

const HP_RESORT_QUESTIONS = {
  "Accueil": [
    "L'accueil à votre arrivée était-il chaleureux ?",
    "Le personnel était-il souriant et disponible ?",
    "Les formalités d'enregistrement ont-elles été rapides ?",
    "Avez-vous reçu les informations nécessaires à votre séjour ?",
  ],
  "Chambres": [
    "La chambre était-elle propre et bien entretenue ?",
    "Le niveau de confort du lit correspond-il à vos attentes ?",
    "La literie et les équipements étaient-ils de qualité ?",
    "La climatisation fonctionnait-elle correctement ?",
    "La salle de bain était-elle propre et bien équipée ?",
  ],
  "Saveurs du Monde": [
    "La qualité des plats servis était-elle satisfaisante ?",
    "La variété du menu correspondait-elle à vos attentes ?",
    "Le service en salle était-il attentif et rapide ?",
    "L'ambiance du restaurant était-elle agréable ?",
  ],
  "4 Épices": [
    "La qualité des plats servis était-elle satisfaisante ?",
    "Les saveurs et épices utilisées étaient-elles au rendez-vous ?",
    "Le service en salle était-il attentif et rapide ?",
    "L'ambiance du restaurant était-elle agréable ?",
  ],
  "Poulet Chaud": [
    "La qualité du poulet et des accompagnements était-elle satisfaisante ?",
    "Le service était-il rapide et courtois ?",
    "Le rapport qualité/prix vous a-t-il satisfait ?",
    "L'ambiance de l'espace était-elle agréable ?",
  ],
  "Loisirs": [
    "Les activités de loisirs proposées étaient-elles variées ?",
    "Les infrastructures sportives et de détente étaient-elles en bon état ?",
    "Le personnel dédié aux loisirs était-il compétent et disponible ?",
    "Les loisirs proposés ont-ils correspondu à vos attentes ?",
  ],
  "Cadre": [
    "Le cadre général de l'hôtel était-il agréable ?",
    "Les espaces communs étaient-ils propres et bien entretenus ?",
    "L'environnement extérieur (jardins, piscine, etc.) était-il soigné ?",
    "L'ambiance générale du resort vous a-t-elle satisfait ?",
  ],
  "Commercial": [
    "L'équipe commerciale a-t-elle bien cerné vos besoins professionnels ?",
    "Les tarifs et offres proposés étaient-ils adaptés à votre budget ?",
    "Les équipements dédiés aux professionnels (salle de réunion, matériel) étaient-ils satisfaisants ?",
    "La réactivité de l'équipe commerciale a-t-elle été à la hauteur ?",
  ],
};

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

async function main() {
  // Supporte DB_* (local/générique) ET MYSQL* (Railway) ET DB_SSL=true (TiDB
  // Cloud et tout hébergeur managé exigeant TLS) — même convention que
  // run_prod_setup.js, pour pouvoir tourner en local comme en production.
  const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || "hotel_satisfaction";
  const conn = await mysql.createConnection({
    host: (process.env.DB_HOST || process.env.MYSQLHOST || "localhost").replace(/^@+/, ""),
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
    database: dbName,
    ssl: process.env.DB_SSL === "true" || process.env.MYSQLHOST ? { minVersion: "TLSv1.2" } : undefined,
    charset: "utf8mb4",
  });

  console.log(`🔌 Connecté à ${dbName}\n`);

  try {
    // ── Étape 1 — Table hotels ─────────────────────────────────────────────
    if (!(await tableExists(conn, dbName, "hotels"))) {
      await conn.query(`
        CREATE TABLE hotels (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          nom            VARCHAR(255) NOT NULL,
          slug           VARCHAR(100) NOT NULL UNIQUE,
          actif          TINYINT(1) NOT NULL DEFAULT 1,
          date_creation  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
      `);
      console.log("✓ Table hotels créée");
    } else {
      console.log("✓ Table hotels déjà présente");
    }

    // ── Étape 2 — Hôtels ─────────────────────────────────────────────────────
    for (const hotel of HOTELS) {
      const [result] = await conn.query(
        "INSERT IGNORE INTO hotels (id, nom, slug) VALUES (?, ?, ?)",
        [hotel.id, hotel.nom, hotel.slug]
      );
      if (result.affectedRows > 0) {
        console.log(`✓ Hôtel "${hotel.nom}" (${hotel.slug}) créé`);
      } else {
        console.log(`✓ Hôtel "${hotel.nom}" (${hotel.slug}) déjà présent`);
      }
    }

    // ── Étape 3 — Colonne hotel_id sur les tables existantes ────────────────
    for (const table of HOTEL_ID_TABLES) {
      if (!(await tableExists(conn, dbName, table))) {
        console.log(`✗ Table ${table} introuvable — colonne hotel_id ignorée`);
        continue;
      }
      if (!(await columnExists(conn, dbName, table, "hotel_id"))) {
        await conn.query(
          `ALTER TABLE \`${table}\` ADD COLUMN hotel_id INT NOT NULL DEFAULT 1`
        );
        console.log(`✓ Colonne ${table}.hotel_id créée`);
      } else {
        console.log(`✓ Colonne ${table}.hotel_id déjà présente`);
      }
    }

    // ── Étape 4 — ENUM questions.categorie ──────────────────────────────────
    const currentEnum = await getEnumType(conn, dbName, "questions", "categorie");
    const needsEnumUpdate = ["Saveurs du Monde", "4 Épices", "Poulet Chaud"].some(
      (cat) => !currentEnum.includes(cat)
    );

    if (needsEnumUpdate) {
      await conn.query(`ALTER TABLE questions MODIFY categorie ${CATEGORIE_ENUM}`);
      console.log("✓ ENUM questions.categorie mis à jour (+ catégories HP Resort)");
    } else {
      console.log("✓ ENUM questions.categorie déjà à jour");
    }

    // ── Étape 5 — Questions HP Resort (hotel_id = 2) ────────────────────────
    const HP_RESORT_HOTEL_ID = 2;

    for (const [categorie, textes] of Object.entries(HP_RESORT_QUESTIONS)) {
      for (let ordre = 0; ordre < textes.length; ordre++) {
        const texte = textes[ordre];
        const [[{ n }]] = await conn.query(
          "SELECT COUNT(*) AS n FROM questions WHERE hotel_id = ? AND categorie = ? AND texte = ?",
          [HP_RESORT_HOTEL_ID, categorie, texte]
        );
        if (n === 0) {
          await conn.query(
            "INSERT INTO questions (hotel_id, categorie, texte, ordre, actif) VALUES (?, ?, ?, ?, true)",
            [HP_RESORT_HOTEL_ID, categorie, texte, ordre]
          );
          console.log(`✓ Question créée [${categorie}] "${texte.slice(0, 50)}${texte.length > 50 ? "…" : ""}"`);
        } else {
          console.log(`✓ Question déjà présente [${categorie}] "${texte.slice(0, 50)}${texte.length > 50 ? "…" : ""}"`);
        }
      }
    }

    console.log("\n✓ Migration multi-hôtel terminée.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("✗ Erreur migration multi-hôtel :", err.message);
  process.exit(1);
});
