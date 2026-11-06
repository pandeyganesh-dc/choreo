// Logs in once through the real login page and saves the session for every flow.
import { test as setup, expect } from '@playwright/test';
import { config } from './config';

setup('log in', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(config.email);
  await page.getByLabel('Password').fill(config.password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 60_000 });
  // Firebase keeps its session in IndexedDB, the app keeps tokens in cookies: save both.
  await page.context().storageState({ path: '.auth/state.json', indexedDB: true });
});
