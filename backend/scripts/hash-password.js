/**
 * Génère un hash bcrypt à partir de ADMIN_PASSWORD dans backend/.env
 * Usage : node scripts/hash-password.js
 */
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("❌ Définissez ADMIN_PASSWORD dans backend/.env");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
console.log("\n✅ Hash bcrypt généré — copiez dans backend/.env :\n");
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
