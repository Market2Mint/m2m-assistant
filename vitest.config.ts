import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts: the pricing tests are pure TypeScript and
// need neither the React nor the Tailwind plugin to run.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
