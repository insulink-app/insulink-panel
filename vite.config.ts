import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // The demo is served from the repo's GitHub Pages path.
  base: mode === "demo" ? "/insulink-panel/" : "/",
  plugins: [
    react(),
    tailwindcss(),
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
