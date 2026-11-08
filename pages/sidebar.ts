// The app's left sidebar: how a user moves between screens. Tasks navigate through here, never by URL.
import { Page, expect } from '@playwright/test';

export const sidebar = (page: Page) => ({
  // "ETL" opens a flyout with My Connectors / All Connectors / Data Explorer
  etl: page.getByRole('listitem').filter({ hasText: /^ETL$/ }),
  allConnectors: page.getByRole('link', { name: /^All Connectors/ }),
  warehouses: page.getByRole('link', { name: 'Datawarehouse Warehouses' }),
});

// Before using the sidebar: close any popup the app left open (e.g. the "Link a Data Warehouse" modal
// that appears after unlinking), the way a user would press Escape. While it's open the sidebar is aria-hidden.
export async function readySidebar(page: Page) {
  const s = sidebar(page);
  if (!(await s.warehouses.isVisible())) await page.keyboard.press('Escape');
  await expect(s.warehouses).toBeVisible();
  return s;
}
