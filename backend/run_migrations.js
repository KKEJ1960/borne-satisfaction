/**
 * Applique les migrations manquantes (archived + questions).
 * Usage : node run_migrations.js   ou   npm run migrate
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [process.env.DB_NAME || "hotel_satisfaction", table, column]
  );
  return rows[0].n > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME || "hotel_satisfaction", table]
  );
  return rows[0].n > 0;
}

async function main() {
  const DB_NAME = process.env.DB_NAME || "hotel_satisfaction";
  const conn = await mysql.createConnection({
    host: (process.env.DB_HOST || "localhost").replace(/^@+/, ""),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: DB_NAME,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  console.log("🔌 Connecté à", DB_NAME);

  if (!(await columnExists(conn, "avis", "archived"))) {
    await conn.query(
      "ALTER TABLE avis ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false"
    );
    console.log("✅ Colonne avis.archived ajoutée");
  } else {
    console.log("ℹ️  Colonne avis.archived déjà présente");
  }

  if (!(await tableExists(conn, "questions"))) {
    await conn.query(`
      CREATE TABLE questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        categorie ENUM('Accueil','Chambres','Restaurants','Loisirs','Propreté') NOT NULL,
        texte VARCHAR(500) NOT NULL,
        ordre INT NOT NULL DEFAULT 0,
        actif BOOLEAN NOT NULL DEFAULT true,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Table questions créée");
  } else {
    console.log("ℹ️  Table questions déjà présente");
  }

  const [countRows] = await conn.query("SELECT COUNT(*) AS n FROM questions");
  if (countRows[0].n === 0) {
    await conn.query(`
      INSERT INTO questions (categorie, texte, ordre, actif) VALUES
      ('Accueil', 'Comment évaluez-vous la qualité de votre accueil ?', 0, true),
      ('Accueil', 'Le personnel était-il aimable et serviable ?', 1, true),
      ('Accueil', 'L''enregistrement s''est-il déroulé rapidement ?', 2, true),
      ('Chambres', 'Comment évaluez-vous la propreté de votre chambre ?', 0, true),
      ('Chambres', 'Le confort de la literie était-il satisfaisant ?', 1, true),
      ('Chambres', 'La température de la chambre était-elle agréable ?', 2, true),
      ('Restaurants', 'Comment évaluez-vous la qualité des plats ?', 0, true),
      ('Restaurants', 'Le service était-il rapide et efficace ?', 1, true),
      ('Restaurants', 'L''ambiance du restaurant était-elle agréable ?', 2, true),
      ('Loisirs', 'Comment évaluez-vous la variété des activités ?', 0, true),
      ('Loisirs', 'Les installations étaient-elles bien entretenues ?', 1, true),
      ('Loisirs', 'Le personnel d''animation était-il dynamique ?', 2, true),
      ('Propreté', 'Comment évaluez-vous la propreté générale de l''hôtel ?', 0, true),
      ('Propreté', 'Les espaces communs étaient-ils bien entretenus ?', 1, true),
      ('Propreté', 'Les sanitaires étaient-ils propres ?', 2, true)
    `);
    console.log("✅ Questions initiales insérées");
  } else {
    console.log(`ℹ️  Table questions contient déjà ${countRows[0].n} entrée(s)`);
  }

  if (!(await tableExists(conn, "admins"))) {
    await conn.query(`
      CREATE TABLE admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        login VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
        actif BOOLEAN NOT NULL DEFAULT true,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        derniere_connexion TIMESTAMP NULL,
        created_by INT NULL,
        FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Table admins créée");
  } else {
    console.log("ℹ️  Table admins déjà présente");
  }

  if (!(await tableExists(conn, "logs_activite"))) {
    await conn.query(`
      CREATE TABLE logs_activite (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT NULL,
        ip_address VARCHAR(45) NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
      )
    `);
    console.log("✅ Table logs_activite créée");
  } else {
    console.log("ℹ️  Table logs_activite déjà présente");
  }

  async function upsertAdmin(login, passwordHash, role) {
    const [existing] = await conn.query("SELECT id FROM admins WHERE login = ?", [login]);
    if (existing.length) {
      await conn.query("UPDATE admins SET password_hash = ?, role = ?, actif = 1 WHERE login = ?", [
        passwordHash,
        role,
        login,
      ]);
      console.log(`ℹ️  Admin "${login}" mis à jour`);
    } else {
      await conn.query(
        "INSERT INTO admins (login, password_hash, role, actif) VALUES (?, ?, ?, true)",
        [login, passwordHash, role]
      );
      console.log(`✅ Admin "${login}" créé (${role})`);
    }
  }

  // P1.4 — Refus des mots de passe par défaut
  const DEFAULT_PASSWORDS = ["admin123", "password", "admin", "superadmin", "123456"];
  const rawSuperPwd = process.env.SUPERADMIN_PASSWORD;
  const rawAdminPwd = process.env.ADMIN_PASSWORD;

  if (rawSuperPwd && DEFAULT_PASSWORDS.includes(rawSuperPwd)) {
    console.error("❌ ERREUR : SUPERADMIN_PASSWORD utilise un mot de passe par défaut interdit.");
    console.error("   Changez SUPERADMIN_PASSWORD dans backend/.env avant de continuer.");
    await conn.end();
    process.exit(1);
  }
  if (rawAdminPwd && DEFAULT_PASSWORDS.includes(rawAdminPwd)) {
    console.error("❌ ERREUR : ADMIN_PASSWORD utilise un mot de passe par défaut interdit.");
    console.error("   Changez ADMIN_PASSWORD dans backend/.env avant de continuer.");
    await conn.end();
    process.exit(1);
  }

  const superLogin = process.env.SUPERADMIN_LOGIN || "superadmin";
  let superHash = process.env.SUPERADMIN_PASSWORD_HASH?.trim();
  if (!superHash && rawSuperPwd) {
    superHash = await bcrypt.hash(rawSuperPwd, 12);
  }
  if (superHash) {
    await upsertAdmin(superLogin, superHash, "superadmin");
  } else {
    console.warn("⚠️  SUPERADMIN_PASSWORD_HASH / SUPERADMIN_PASSWORD manquant — superadmin non créé");
  }

  const adminLogin = process.env.ADMIN_LOGIN || process.env.ADMIN_USERNAME || "admin";
  let adminHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!adminHash && rawAdminPwd) {
    adminHash = await bcrypt.hash(rawAdminPwd, 12);
  }
  if (adminHash) {
    await upsertAdmin(adminLogin, adminHash, "admin");
  } else {
    console.warn("⚠️  ADMIN_PASSWORD_HASH / ADMIN_PASSWORD manquant — admin non créé");
  }

  // ── Migration charset utf8mb4 (fix UPDATE sur caractères non-latin1) ──────
  // Si la DB ou les tables sont en latin1 (défaut WampServer), les UPDATE
  // avec apostrophes typographiques / caractères non-latin1 renvoient 500.
  const ALL_TABLES = ["clients", "avis", "questions", "admins", "logs_activite"];

  // Charset utf8mb4 — nécessite le privilège ALTER (root ou GRANT ALTER)
  // Si refus, exécute le SQL manuellement dans phpMyAdmin.
  let charsetOk = true;
  try {
    const [dbCharsetRows] = await conn.query(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS cs
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [DB_NAME]
    );
    if (dbCharsetRows[0]?.cs !== "utf8mb4") {
      await conn.query(`ALTER DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log("✅ Base de données convertie en utf8mb4");
    } else {
      console.log("ℹ️  Base de données déjà en utf8mb4");
    }

    for (const tbl of ALL_TABLES) {
      if (!(await tableExists(conn, tbl))) continue;
      const [tblCharsetRows] = await conn.query(
        `SELECT CCSA.CHARACTER_SET_NAME AS cs
         FROM information_schema.TABLES T
         JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY CCSA
           ON CCSA.COLLATION_NAME = T.TABLE_COLLATION
         WHERE T.TABLE_SCHEMA = ? AND T.TABLE_NAME = ?`,
        [DB_NAME, tbl]
      );
      if (tblCharsetRows[0]?.cs !== "utf8mb4") {
        await conn.query(
          `ALTER TABLE \`${tbl}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`✅ Table ${tbl} convertie en utf8mb4`);
      } else {
        console.log(`ℹ️  Table ${tbl} déjà en utf8mb4`);
      }
    }
  } catch (charsetErr) {
    charsetOk = false;
    console.warn("\n⚠️  Conversion charset échouée (privilège ALTER manquant) :");
    console.warn("   Exécute ce SQL dans phpMyAdmin (http://localhost/phpmyadmin) :");
    console.warn(`
    ALTER DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ALTER TABLE \`clients\`       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ALTER TABLE \`avis\`          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ALTER TABLE \`questions\`     CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ALTER TABLE \`admins\`        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    ALTER TABLE \`logs_activite\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
  }
  if (charsetOk) {
    console.log("✅ Charset utf8mb4 appliqué.");
  }

  await conn.end();
  console.log("\n✅ Migrations terminées. Redémarrez le backend si besoin.");
}

main().catch((err) => {
  console.error("❌ Erreur migration:", err.message);
  process.exit(1);
});
