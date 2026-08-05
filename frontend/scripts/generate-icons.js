import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
const sourcesDir = join(__dirname, '../brand-sources');

const SIZES = [
  { file: 'icon-192x192.png', size: 192 },
  { file: 'icon-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

// Chaque marque a sa propre icône PWA : logo dédié → icônes carrées par taille.
const BRANDS = [
  { slug: 'president', src: join(publicDir, 'logo-pwa.png') },
  { slug: 'hpresort', src: join(publicDir, 'logo-hpresort.png') },
  {
    // Le visuel fourni est une affiche complète (logo + texte + pictos) —
    // seul l'emblème (couronne + H + immeuble) en haut est lisible en icône.
    slug: 'admin',
    src: join(sourcesDir, 'logo-admin-source.png'),
    crop: { left: 350, top: 150, width: 560, height: 560 },
  },
];

for (const { slug, src, crop } of BRANDS) {
  const outDir = join(publicDir, 'icons', slug);
  mkdirSync(outDir, { recursive: true });

  let base = sharp(src);
  if (crop) base = base.extract(crop);
  const baseBuffer = await base.png().toBuffer();

  for (const { file, size } of SIZES) {
    await sharp(baseBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outDir, file));
    console.log(`✓ icons/${slug}/${file} (${size}x${size})`);
  }
}

console.log('Done — icons generated in public/icons/<brand>/');
