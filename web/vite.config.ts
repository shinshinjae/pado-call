import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: the built site goes to ../docs (Settings → Pages → Branch: main, Folder: /docs).
// base './' keeps every asset path relative, so the site works at https://<id>.github.io/<repo>/.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        // the MapLibre worker is an ES-module asset: emit it as .js so every static host serves a JavaScript MIME type
        assetFileNames: (info: { name?: string; names?: string[] }) =>
          (info.names?.[0] ?? info.name ?? '').endsWith('.mjs') ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as any);
