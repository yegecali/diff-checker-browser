import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        popup:      'src/popup.js',
        sidepanel:  'src/sidepanel.js',
        background: 'src/background.js',
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        format: 'es',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
