import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    globals: true,
  },
  plugins: [
    react(),
    svelte(),
    tailwindcss(),
    analyzer({
      analyzerMode: process.env.ANALYZE_BUNDLE ? 'server' : 'json',
    }),
  ],
  server: {
    port: 3000,
    open: false,
  },
  base: './',
  build: {
    outDir: 'dist',
  },
})
