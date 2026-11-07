import { defineConfig } from 'vitest/config';

const define = { __APP_VERSION__: JSON.stringify('test') };

export default defineConfig({
  define,
  test: {
    projects: [
      {
        define,
        test: { name: 'unit', include: ['tests/unit/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup-dom.ts'] },
      },
      {
        define,
        test: { name: 'integration', include: ['tests/integration/**/*.test.{ts,tsx}'], setupFiles: ['fake-indexeddb/auto'] },
      },
    ],
  },
});
