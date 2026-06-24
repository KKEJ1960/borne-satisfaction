import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, ".env") });

const dbHost = (process.env.DB_HOST || "localhost").replace(/^@+/, "");
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD ?? "";
const dbName = process.env.DB_NAME || "hotel_satisfaction";

if (!dbPassword) {
  console.warn("⚠️  DB_PASSWORD est vide — connexion sans mot de passe (dev uniquement)");
}

// createPool est synchrone dans mysql2 — le pool gère les connexions à la demande.
// On ne remplace JAMAIS le pool par un objet factice, même si le test échoue.
const db = mysql.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 10,
  connectTimeout: 10000,
  charset: "UTF8MB4_UNICODE_CI",
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test de connexion au démarrage — informatif uniquement, ne détruit pas le pool si ça échoue.
db.getConnection()
  .then((conn) => {
    console.log("✅ Connexion à la base de données réussie!");
    console.log(`   Hôte: ${dbHost} | Base: ${dbName} | Utilisateur: ${dbUser}`);
    conn.release();
  })
  .catch((err) => {
    console.error("⚠️  Test de connexion échoué:", err.message);
    console.warn("   Le pool reste actif — vérifiez que MySQL/WampServer est démarré.");
    console.warn("   Les requêtes réussiront automatiquement quand MySQL sera disponible.");
  });

export default db;
