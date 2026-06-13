/**
 * Démarre backend + frontend sans le paquet "concurrently".
 * Avant le lancement :
 *   1. Détecte l'IP locale via os.networkInterfaces()
 *   2. Met à jour ALLOWED_ORIGINS dans backend/.env
 *   3. Attend 500ms (sécurité flush disque) puis lance les serveurs
 *
 * Le backend lit aussi les IPs locales directement au démarrage via os.networkInterfaces(),
 * donc même si le .env n'est pas à jour l'IP sera autorisée côté CORS.
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const envPath = path.join(root, 'backend', '.env');

// ── Collecte toutes les IPs locales non-loopback ──────────────────────────────
function getLocalIps() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const ifaces of Object.values(interfaces)) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// ── Mise à jour de ALLOWED_ORIGINS dans backend/.env ─────────────────────────
function updateAllowedOrigins() {
  const ips = getLocalIps();

  if (ips.length === 0) {
    console.warn('⚠️  Impossible de détecter l\'IP locale — ALLOWED_ORIGINS non modifié.');
    return;
  }

  const origins = [
    'http://localhost:5173',
    'http://localhost:5174',
    ...ips.flatMap((ip) => [
      `http://${ip}:5173`,
      `http://${ip}:5174`,
    ]),
  ].join(',');

  let envContent;
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch {
    console.warn(`⚠️  Fichier backend/.env introuvable (${envPath}) — ALLOWED_ORIGINS non modifié.`);
    return;
  }

  if (/^ALLOWED_ORIGINS=.*/m.test(envContent)) {
    envContent = envContent.replace(/^ALLOWED_ORIGINS=.*/m, `ALLOWED_ORIGINS=${origins}`);
  } else {
    envContent += `\nALLOWED_ORIGINS=${origins}\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');

  const label = ips.length === 1 ? ips[0] : ips.join(', ');
  console.log(`✅ IP détectée : ${label} — ALLOWED_ORIGINS mis à jour`);
  console.log(`   → ${origins}\n`);
}

// ── Lancement des serveurs ────────────────────────────────────────────────────
function run(name, cwd, script) {
  const child = spawn(isWin ? 'npm.cmd' : 'npm', ['run', script], {
    cwd,
    stdio: 'inherit',
    shell: isWin,
  });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] arrêté avec le code ${code}`);
    }
  });
  return child;
}

// ── Séquence : mise à jour .env → 500ms → lancement ──────────────────────────
updateAllowedOrigins();

// fs.writeFileSync est synchrone mais on laisse 500ms de marge
// pour que l'OS ait terminé le flush disque avant que le backend lise le .env.
setTimeout(() => {
  console.log('Démarrage backend (port 5001) et frontend (port 5173)...\n');

  const backend = run('backend', path.join(root, 'backend'), 'start');
  const frontend = run('frontend', path.join(root, 'frontend'), 'dev');

  function shutdown() {
    backend.kill();
    frontend.kill();
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}, 500);
