import fs from 'fs';
import { defineConfig } from '@playwright/test';
import { config } from './config';
import { STATE_FILE } from './core/login';

// Visible browser (--watch/--headed): the page fills whatever size the window is (a tiling WM like Hyprland
// sizes it; elsewhere it starts maximized).
// Headless: fixed size, so screenshots and videos are always the same.
const headed = process.env.CHOREO_HEADED === '1';

export default defineConfig({
  testDir: 'core',
  testMatch: 'flows.spec.ts',
  timeout: 30 * 60_000,             // a whole flow (incl. waiting for pipeline runs) must fit in this
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: config.baseURL,
    viewport: headed ? null : { width: 1440, height: 900 },
    navigationTimeout: 90_000,
    actionTimeout: 30_000,            // a click/fill that can't happen fails fast instead of hanging the whole flow
    // One window per flow: reuse the saved login if there is one (core/login.ts refreshes it)
    storageState: fs.existsSync(STATE_FILE) ? STATE_FILE : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: {
      slowMo: Number(process.env.SLOW || 0), // set by --watch
      args: headed ? ['--start-maximized'] : [],
    },
  },
});
