import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/api/chain': {
        target: 'http://127.0.0.1:6000',
        changeOrigin: true,
      },
      '/api/blocks': {
        target: 'http://127.0.0.1:6000',
        changeOrigin: true,
      },
      '/api/mine': {
        target: 'http://127.0.0.1:6000',
        changeOrigin: true,
      }
    }
  }
})
