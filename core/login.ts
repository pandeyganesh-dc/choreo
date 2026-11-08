// Makes sure the flow's own window is logged in. Reuses the saved session when it's still valid,
// otherwise logs in through the real login page in the same window and saves the session again.
import { Page, expect } from '@playwright/test';
import { login } from '../pages/login';
import { config } from '../config';

export const STATE_FILE = '.auth/state.json';

export async function ensureLoggedIn(page: Page) {
  const l = login(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(l.email.or(l.loggedInMarker)).toBeVisible({ timeout: 60_000 });
  if (await l.loggedInMarker.isVisible()) return false; // saved session still good

  await l.email.fill(config.email);
  await l.password.fill(config.password);
  await l.continueBtn.click();
  await expect(l.loggedInMarker).toBeVisible({ timeout: 60_000 });
  // Firebase keeps its session in IndexedDB, the app keeps tokens in cookies: save both.
  await page.context().storageState({ path: STATE_FILE, indexedDB: true });
  return true;
}
