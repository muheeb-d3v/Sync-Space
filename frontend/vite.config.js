import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow any hostname — required when the dev server is reached through an
    // ngrok tunnel (ngrok proxies to an arbitrary Host header, which Vite 5+
    // otherwise rejects with 403 "Blocked host").
    host: true,
    allowedHosts: 'all',
    // Response headers attached to every dev-server reply. The ngrok-skip
    // header is part of the tunnel workaround below.
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
