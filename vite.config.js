import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/; the deploy workflow sets BASE.
  base: process.env.BASE || '/',
  server: { port: 5173, open: false },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Libraries change far less often than the site: separate, long-cached files.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
