import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo /api se reenvía al backend. Con portal y tienda separados (ADR-003) el portal web
// habla con portal-api: `node start.js --split` fija VITE_PROXY_TARGET.
const apiTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:4000';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  }
});
