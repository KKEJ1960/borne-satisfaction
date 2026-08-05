import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 3 identités distinctes (Président / HP Resort / Admin) partagent la même
      // build : chacune a son propre manifest.webmanifest statique dans public/manifests/,
      // sélectionné dynamiquement selon la route par le script inline dans index.html.
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
