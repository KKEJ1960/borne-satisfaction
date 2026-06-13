import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

let db;

try {
  const dbHost = (process.env.DB_HOST || "localhost").replace(/^@+/, "");
  const dbUser = process.env.DB_USER || "root";
  const dbPassword = process.env.DB_PASSWORD ?? "";
  const dbName = process.env.DB_NAME || "hotel_satisfaction";

  console.log("🔌 Tentative de connexion à la base de données...");
  console.log("📊 Configuration:", {
    host: dbHost,
    user: dbUser,
    database: dbName,
    password: dbPassword ? "***" : "(vide)"
  });
  
  db = await mysql.createPool({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  // Test de connexion
  const connection = await db.getConnection();
  console.log("✅ Connexion à la base de données réussie!");
  connection.release();
  
} catch (error) {
  console.error("❌ Erreur de connexion à la base de données:", error.message);
  console.log("⚠️ Vérifiez:");
  console.log("   1. Que le serveur MySQL est démarré");
  console.log("   2. Que les identifiants dans .env sont corrects");
  console.log("   3. Que la base de données 'hotel_satisfaction' existe");
  
  // Créer un objet db factice pour éviter les erreurs critiques
  db = {
    query: async (sql, params = []) => {
      console.error("❌ Base de données non disponible - requête ignorée:", sql);
      throw new Error("Base de données non disponible");
    },
    execute: async (sql, params = []) => {
      console.error("❌ Base de données non disponible - exécution ignorée:", sql);
      throw new Error("Base de données non disponible");
    }
  };
}

export default db;
