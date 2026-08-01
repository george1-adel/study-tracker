/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Asset filenames keep Vite's default content hash. Without it every deploy
  // reuses assets/index.js and browsers serve the cached old bundle, so a fix
  // never reaches users. base:'./' is what makes the Pages subpath work.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/test/setup.ts',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
