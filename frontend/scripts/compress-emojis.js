import sharp from "sharp";
import { stat } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const FILES = [
  "émojiscolère.png",
  "satisfait.png",
  "trèssatisfait.png",
  "mentionspécial.png",
];

async function kb(filePath) {
  const { size } = await stat(filePath);
  return (size / 1024).toFixed(1);
}

for (const file of FILES) {
  const filePath = resolve(publicDir, file);

  const before = await kb(filePath);

  const input = await sharp(filePath).toBuffer();

  await sharp(input)
    .resize(256, 256, { fit: "inside", withoutEnlargement: true })
    .png({ quality: 85, compressionLevel: 9, palette: false })
    .toFile(filePath);

  const after = await kb(filePath);

  console.log(`${file}: ${before} Ko → ${after} Ko`);
}

console.log("\nCompression terminée.");
