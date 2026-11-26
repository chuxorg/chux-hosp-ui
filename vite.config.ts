import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backend = { target: 'http://127.0.0.1:8000', changeOrigin: false }

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/auth/v1': backend,
      '/pms/v1': backend,
    },
  },
})
