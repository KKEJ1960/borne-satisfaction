import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'url'

const r = (p) => fileURLToPath(new URL(p, import.meta.url))

// Sert hpresort.html / admin.html pour les URLs propres correspondantes en dev,
// pour matcher le comportement de production (vercel.json rewrites + cleanUrls).
function multiPageDevFallback() {
  return {
    name: 'multi-page-dev-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0];
        if (path === '/hpresort' || path.startsWith('/hpresort/')) req.url = '/hpresort.html';
        else if (path === '/admin' || path.startsWith('/admin/')) req.url = '/admin.html';
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    multiPageDevFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      // 3 identités PWA distinctes (Président / HP Resort / Admin) : chacune a son
      // propre fichier HTML (index/hpresort/admin.html) avec son manifest, ses icônes
      // et son titre déjà corrects dans le HTML statique servi — pas de bascule en JS,
      // pour que iOS "Ajouter à l'écran d'accueil" (qui lit le HTML brut, pas le DOM
      // après exécution du script) affiche toujours la bonne icône et le bon nom.
      // On désactive donc la génération/injection automatique du manifest par le plugin.
      manifest: false,
      includeAssets: ['logo-pwa.png', 'fond-hotel.jpg', 'manifests/*.webmanifest', 'icons/**/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/borne-satisfaction-backend\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: r('./index.html'),
        hpresort: r('./hpresort.html'),
        admin: r('./admin.html'),
      }
    }
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
