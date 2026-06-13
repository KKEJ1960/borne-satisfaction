/**
 * Suppression irréversible de TOUS les avis.
 * Usage : node clear_avis.js --confirm
 * Sans --confirm, deux confirmations interactives successives sont requises.
 */
const mysql = require("mysql2/promise");
const readline = require("readline");
require("dotenv").config({ path: "./backend/.env" });

const hasConfirmFlag = process.argv.includes("--confirm");

function askQuestion(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function clearAvis() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || "hotel_satisfaction",
  });

  const [[{ count }]] = await connection.execute("SELECT COUNT(*) AS count FROM avis");
  console.log(`\n⚠️  ATTENTION : ${count} avis vont être supprimés définitivement.`);
  console.log("   Cette opération est IRRÉVERSIBLE.\n");

  if (!hasConfirmFlag) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const first = await askQuestion(
      rl,
      `Êtes-vous sûr de vouloir supprimer ${count} avis ? Tapez "OUI" pour confirmer : `
    );
    if (first.trim() !== "OUI") {
      console.log("❌ Opération annulée.");
      rl.close();
      await connection.end();
      process.exit(0);
    }

    const second = await askQuestion(rl, `Confirmez une deuxième fois en tapant "SUPPRIMER" : `);
    rl.close();

    if (second.trim() !== "SUPPRIMER") {
      console.log("❌ Opération annulée.");
      await connection.end();
      process.exit(0);
    }
  }

  await connection.execute("TRUNCATE TABLE avis");
  console.log(`✅ ${count} avis supprimés.`);
  await connection.end();
}

clearAvis().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});
