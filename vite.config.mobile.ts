import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Mobile/web build config - no Electron plugins
export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: process.env.VITE_HOST || '0.0.0.0',
    port: parseInt(process.env.VITE_PORT || '5173'),
    strictPort: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}']
  }
})
