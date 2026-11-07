import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps the build working under any GitHub Pages path (user.github.io/repo/)
export default defineConfig({
  base: './',
  plugins: [react()],
  worker: { format: 'es' },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['tests/**/*.test.{js,jsx}'] },
});
