import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // PWA: Copier fichiers publics dans dist
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // Optimisations PWA
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database', 'firebase/storage']
        }
      }
    }
  }
})
