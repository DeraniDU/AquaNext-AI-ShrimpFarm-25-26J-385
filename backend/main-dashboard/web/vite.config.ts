import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173
		// Proxy removed - dashboard now uses mock data and doesn't require API connection
		// proxy: {
		// 	'/api': {
		// 		target: 'http://127.0.0.1:8000',
		// 		changeOrigin: true
		// 	}
		// }
	}
})


