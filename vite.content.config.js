import { defineConfig } from 'vite';

// Separate build for the content script — must be a self-contained IIFE
// (no ES module imports) because content scripts run as classic scripts.
export default defineConfig({
  publicDir: false,
  build: {
    rollupOptions: {
      input: { content: 'src/content.js' },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: '__HDC',
      },
    },
    outDir: 'dist',
    emptyOutDir: false, // don't wipe the main build output
  },
});
