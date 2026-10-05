import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    watch: {
      ignored: ['**/server/**', '**/*.tmp', '**/data/**', '**/*.json'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5181',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

