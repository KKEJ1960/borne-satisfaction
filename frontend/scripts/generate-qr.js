/**
 * Génère une image PNG du QR code (porte d'entrée).
 * Usage: node scripts/generate-qr.js [URL]
 * Exemple: node scripts/generate-qr.js http://11.11.9.131:5173
 */
import QRCode from 'qrcode';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const url = process.argv[2] || process.env.PUBLIC_APP_URL || 'http://localhost:5173';

const pngPath = join(publicDir, 'qr-acces-hotel-president.png');

await QRCode.toFile(pngPath, url, {
  type: 'png',
  width: 600,
  margin: 2,
  color: { dark: '#071b36', light: '#ffffff' },
});

console.log('QR code généré :', pngPath);
console.log('URL encodée :', url);
