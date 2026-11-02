import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // The demo is served from the repo's GitHub Pages path.
  base: mode === "demo" ? "/insulink-panel/" : "/",
  plugins: [
    react(),
    tailwindcss(),
    // The share page's offline worker (registered by src/pages/share, scoped
    // to share/). Like Kimbiss: the page comes from the network first and
    // from the cache only offline, so a deploy shows on the next load; the
    // hashed assets it names are cached as they load and never change. A new
    // worker takes over at once (autoUpdate). Nothing is precached, so a
    // follower does not download the whole panel.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: [],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'share-pages' },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: { cacheName: 'share-assets', expiration: { maxEntries: 200 } },
          },
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/v1/share/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'share-glucose' },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://home.lukasbreuer.de',
        headers: { Host: 'api.insulink.de' },
      },
    },
  },
}))
