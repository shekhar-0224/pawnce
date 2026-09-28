import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The app is one small bundle (~160 KB gzipped); only warn if it grows a lot.
    chunkSizeWarningLimit: 700,
  },
})
