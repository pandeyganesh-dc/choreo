import { defineConfig } from '@playwright/test';
import { config } from './config';

export default defineConfig({
  testDir: '.',
  testMatch: ['journeys/**/*.spec.ts', 'auth.setup.ts'],
  timeout: 3 * 60_000,              // d-l's Vite dev server is slow on first load
  expect: { timeout: 30_000 },
  workers: 1,                        // flows share one d-l; keep them sequential
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: config.baseURL,
    viewport: { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'login', testMatch: 'auth.setup.ts' },
    {
      name: 'flows',
      testMatch: 'journeys/**/*.spec.ts',
      dependencies: ['login'],
      use: { storageState: '.auth/state.json' },
    },
  ],
});
