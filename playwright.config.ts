import fs from 'fs';
import { defineConfig } from '@playwright/test';
import { config } from './config';
import { STATE_FILE } from './core/login';

export default defineConfig({
  testDir: 'core',
  testMatch: 'flows.spec.ts',
  timeout: 3 * 60_000,              // d-l's Vite dev server is slow on first load
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: config.baseURL,
    viewport: { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    // One window per flow: reuse the saved login if there is one (core/login.ts refreshes it)
    storageState: fs.existsSync(STATE_FILE) ? STATE_FILE : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: { slowMo: Number(process.env.SLOW || 0) }, // set by --watch
  },
});
