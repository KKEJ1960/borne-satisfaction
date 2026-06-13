import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function runSetup() {
  try {
    // Connect without specifying a database first to ensure we can create it
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });
    
    console.log("Connecté à MySQL. Exécution du script setup.sql...");
    const sql = fs.readFileSync('setup.sql', 'utf8');
    
    await connection.query(sql);
    console.log("Base de données et tables créées avec succès !");
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("Erreur lors de l'exécution du script :", error);
    process.exit(1);
  }
}

runSetup();
