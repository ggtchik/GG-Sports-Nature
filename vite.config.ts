import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { proxyPlugin } from './server/proxy-plugin.mjs';

// Le proxy local (dev) sert de secours si une API publique est bloquée par la
// politique CORS du navigateur. Il n'est jamais indispensable : l'application
// interroge d'abord les API directement.
export default defineConfig({
  base: './',
  plugins: [react(), proxyPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
  },
});
