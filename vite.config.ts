import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0, sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
