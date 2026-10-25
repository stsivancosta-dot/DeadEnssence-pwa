import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualização segura: o novo service worker é baixado em segundo plano e passa a valer
      // na próxima abertura do app. A página aberta não é recarregada no meio de uma edição.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'DeadEssence RPG',
        short_name: 'DeadEssence',
        description: 'Fichas, anotações e rolagens para o DeadEssence RPG.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#070b10',
        theme_color: '#070b10',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Guarda só os arquivos do app (HTML, JS, CSS, ícones). Os dados das fichas ficam no
        // IndexedDB e nunca passam pelo cache do service worker.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});