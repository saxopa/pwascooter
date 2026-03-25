import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/pwascooter/',
  plugins: [
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('react-leaflet') || id.includes('/leaflet/')) {
            return 'leaflet-vendor'
          }

          if (id.includes('@supabase')) {
            return 'supabase-vendor'
          }

          if (id.includes('lucide-react')) {
            return 'icons-vendor'
          }

          if (id.includes('/react/') || id.includes('react-router-dom')) {
            return 'react-vendor'
          }
        },
      },
    },
  },
})
