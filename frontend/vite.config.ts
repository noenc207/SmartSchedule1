import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITEAPIURL || env.VITE_API_URL || 'http://localhost:8080';

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'VITE'],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
      },
    },
    // @ts-expect-error vitest options
    test: {
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    },
  };
});

