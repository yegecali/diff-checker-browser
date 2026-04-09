import { defineConfig } from 'vite';

// Must stay in sync with the outDir used by the main vite.config.js.
const browser = process.env.BROWSER;
const outDir = browser ? `dist/${browser}` : 'dist';

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
    outDir,
    emptyOutDir: false, // don't wipe the main build output
  },
});
