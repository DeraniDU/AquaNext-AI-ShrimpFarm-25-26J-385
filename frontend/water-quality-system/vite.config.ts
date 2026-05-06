import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5175,
    strictPort: false,
    proxy: {
      // /iot-api/... → http://localhost:8000 (IoT Gateway)
      '/iot-api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/iot-api/, ''),
      },
      // /api/... → http://localhost:5001 (Water Quality Prediction API)
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['chart.js', 'react-chartjs-2'],
  },
})
