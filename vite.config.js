import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    port: 6910,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
