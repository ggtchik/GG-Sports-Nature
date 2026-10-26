import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `base: './'` keeps every asset relative so the built index.html also works from file://.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  server: { host: '0.0.0.0', port: 5173, strictPort: true, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: true },
  build: {
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 8000,
  },
});
