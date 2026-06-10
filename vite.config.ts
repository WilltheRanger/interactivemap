import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `base` defaults to '/' for local dev / root deploys; the GitHub Pages workflow sets
// VITE_BASE=/interactivemap/ so assets resolve under the project subpath.
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    // Installable PWA (Phase 10 plumbing): manifest + Workbox service worker precaching the app
    // shell, so a home-screen launch is instant and survives flaky hallway Wi-Fi.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'brahmas-logo.webp'],
      manifest: {
        name: 'DBHS Wayfinder',
        short_name: 'Wayfinder',
        description: 'Find your classrooms and locker at Diamond Bar High School.',
        theme_color: '#582c83',
        background_color: '#eaebef',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff,woff2}'],
      },
    }),
  ],
});
