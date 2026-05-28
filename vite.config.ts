import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { analyzer } from 'vite-bundle-analyzer'
import glsl from 'vite-plugin-glsl'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    globals: true,
  },
  assetsInclude: ['**/*.hdr'],
  plugins: [
    react(),
    svelte(),
    tailwindcss(),
    glsl(),
    analyzer({
      analyzerMode: process.env.ANALYZE_BUNDLE ? 'server' : 'json',
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.glsl': 'text',
        // 'file' needs an output path that doesn't exist during the dev
        // server's dependency pre-scan, so inline as a data URL outside prod.
        '.hdr': mode === 'production' ? 'file' : 'dataurl',
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  base: './',
  build: {
    outDir: 'dist',
  },
}))
