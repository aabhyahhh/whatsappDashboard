import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'htaccess-copy',
      closeBundle() {
        // Copy .htaccess to dist as htaccess.txt for easy renaming
        try {
          copyFileSync('public/.htaccess', 'dist/htaccess.txt')
          console.log('✓ Created htaccess.txt in dist folder for easy renaming')
        } catch (error) {
          console.log('⚠ .htaccess file not found in public folder')
        }
      }
    }
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
