import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  // Using relative base './' makes the built bundle hostable on ANY static server,
  // including https://<username>.github.io/<repo-name>/ with zero config!
  base: './',
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5173,
    host: '127.0.0.1'
  }
});
