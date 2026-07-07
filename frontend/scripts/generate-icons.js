import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../public/logo-pwa.png');
const outDir = join(__dirname, '../public/icons');

mkdirSync(outDir, { recursive: true });

const icons = [
  { file: 'icon-192x192.png', size: 192 },
  { file: 'icon-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of icons) {
  await sharp(src)
    .resize(size, size)
    .png()
    .toFile(join(outDir, file));
  console.log(`✓ icons/${file} (${size}x${size})`);
}

console.log('Done — icons generated in public/icons/');
