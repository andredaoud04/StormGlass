import { defineConfig } from 'vitest/config';

import pkg from './package.json';

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2020', assetsInlineLimit: 0, sourcemap: false },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
