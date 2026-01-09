import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Forzamos escuchar en todas las interfaces
    port: 5173,
    allowedHosts: true, // Permitir host del túnel
    proxy: {
      '/api': {
        // CAMBIO IMPORTANTE: Usamos 'backend' (nombre del servicio en docker-compose)
        target: 'http://backend:8000', 
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // --- SISTEMA DE RASTREO (DEBUG) ---
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('❌ ERROR DE PROXY:', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('➡️ Enviando petición al Backend:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('⬅️ Respuesta recibida del Backend:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})