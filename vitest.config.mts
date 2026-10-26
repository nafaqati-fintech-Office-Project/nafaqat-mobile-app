import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __DEV__: false },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
