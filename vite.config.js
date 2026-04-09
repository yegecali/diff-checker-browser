import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// When BROWSER=firefox the output goes to dist/firefox/ and the Firefox-specific
// manifest is copied over the generic one.  Omitting BROWSER (or BROWSER=chrome)
// keeps the existing behaviour: output to dist/ with the Chrome/Edge manifest.
const browser = process.env.BROWSER;
const outDir = browser ? `dist/${browser}` : 'dist';

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
    outDir,
    emptyOutDir: true,
  },
  plugins: [
    browser && browser !== 'chrome'
      ? {
          name: 'swap-manifest',
          closeBundle() {
            const src = path.resolve(`public/manifest.${browser}.json`);
            const dst = path.resolve(outDir, 'manifest.json');
            if (fs.existsSync(src)) {
              fs.copyFileSync(src, dst);
            } else {
              console.warn(
                `[swap-manifest] No browser-specific manifest found at ${src}. ` +
                  `Using the default Chrome/Edge manifest.`
              );
            }
          },
        }
      : null,
  ].filter(Boolean),
});
