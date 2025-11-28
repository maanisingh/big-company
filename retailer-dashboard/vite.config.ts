import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    allowedHosts: ['bigcompany-retailer.alexandratechlab.com', 'localhost'],
    proxy: {
      '/api': {
        target: process.env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
