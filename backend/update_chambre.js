import db from "./db.js";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

async function updateChambreColumn() {
  try {
    console.log("🔧 Mise à jour de la base de données pour ajouter la colonne numero_chambre...");
    
    // Vérifier si la colonne existe déjà
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'clients' 
      AND COLUMN_NAME = 'numero_chambre'
      AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'hotel_satisfaction']);
    
    if (columns.length === 0) {
      // Ajouter la colonne si elle n'existe pas
      await db.query(`
        ALTER TABLE clients 
        ADD COLUMN numero_chambre VARCHAR(10) NOT NULL DEFAULT '' AFTER email
      `);
      console.log("✅ Colonne numero_chambre ajoutée avec succès");
    } else {
      console.log("ℹ️ La colonne numero_chambre existe déjà");
    }
    
    // Vérifier la structure finale
    const [structure] = await db.query("DESCRIBE clients");
    console.log("📋 Structure actuelle de la table clients:");
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour:", error);
    process.exit(1);
  }
}

updateChambreColumn();
