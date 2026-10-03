import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The registration is owned by `src/sw.ts`, which adds the update check the
      // injected snippet lacks. Leaving injection on registers /sw.js twice
      // (`registerSW.js` in the built HTML *and* main.tsx).
      injectRegister: null,
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'TownPulse — Local Services Finder',
        short_name: 'TownPulse',
        description: 'Discover, claim, and verify local services in small towns',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // ── The app shell is deliberately NOT precached ────────────────────────
        // `globPatterns` omits `html`. index.html names the *content-hashed* JS
        // and CSS of one specific build, so precaching it — and letting Workbox
        // answer navigations from that precache — means a visitor keeps
        // replaying the previous deployment's index.html, which then requests
        // asset filenames the new deployment no longer serves. That is exactly
        // how a fixed build stayed invisible in production. Only immutable,
        // hash-named assets are precached; navigations go through the
        // NetworkFirst route below.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // Disables Workbox's NavigationRoute. Otherwise the generated worker
        // registers `createHandlerBoundToURL('index.html')` *before* every
        // runtime route, so it answers all navigations from the precache and the
        // rule below becomes dead code. `null` is a supported value meaning
        // "no app-shell fallback" (workbox-build types: `string | null`).
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // The app shell. Network-first, so the first navigation after a
            // deploy returns the *new* index.html; the cached copy is only used
            // when the network is unreachable. Matches document requests only
            // (`request.mode === 'navigate'`), never the /api or /data fetches.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'townpulse-shell',
              networkTimeoutSeconds: 4,
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Cache categories and listings for offline exploration
            urlPattern: /^https:\/\/.*\/listings|^http:\/\/localhost:8000\/(listings|categories)|\/api\/(listings|categories)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'townpulse-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            // Cache map tiles for offline viewing
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          ui: ['lucide-react', 'clsx', 'tailwind-merge', 'i18next', 'react-i18next'],
        },
      },
    },
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
