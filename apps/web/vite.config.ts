import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Heavy vendors chunk separately so the Atlas first-paint stays lean.
        manualChunks: {
          d3: ['d3'],
          motion: ['motion'],
          aria: ['react-aria-components'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
