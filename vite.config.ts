import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Su GitHub Pages l'app vive in /<nome-repository>/: il workflow passa BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'worklets/*.js'],
      manifest: {
        name: 'Violino a orecchio',
        short_name: 'Violino',
        description: 'Esercizi di violino a orecchio con giudizio su note, intonazione e ritmo.',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#121d28',
        theme_color: '#f2b33d',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // codice, estratti (inclusi nel JS), worklet, font e campioni: tutto offline
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,json,mp3,ogg,wav,m4a}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
      },
    }),
  ],
});
