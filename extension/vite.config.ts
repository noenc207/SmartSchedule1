import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        if (!existsSync('dist')) {
          mkdirSync('dist', { recursive: true });
        }
        if (existsSync('manifest.json')) {
          copyFileSync('manifest.json', 'dist/manifest.json');
        }
        if (existsSync('public')) {
          const files = ['icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png'];
          for (const file of files) {
            const src = resolve('public', file);
            const dest = resolve('dist', file);
            if (existsSync(src)) {
              mkdirSync(resolve('dist', 'icons'), { recursive: true });
              copyFileSync(src, dest);
            }
          }
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        contentScript: resolve(__dirname, 'src/content/contentScript.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'contentScript') return 'contentScript.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
