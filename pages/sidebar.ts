// The app's left sidebar: how a user moves between screens. Tasks navigate through here, never by URL.
import { Page, expect } from '@playwright/test';

export const sidebar = (page: Page) => ({
  // "ETL" opens a flyout with My Connectors / All Connectors / Data Explorer
  etl: page.getByRole('listitem').filter({ hasText: /^ETL$/ }),
  allConnectors: page.getByRole('link', { name: /^All Connectors/ }),
  // "Reverse ETL" opens a flyout with My Destinations / All Destinations / Data Models / Segments
  reverseEtl: page.getByRole('listitem').filter({ hasText: /^Reverse ETL$/ }),
  allDestinations: page.getByRole('link', { name: /^All Destinations/ }),
  warehouses: page.getByRole('link', { name: 'Datawarehouse Warehouses' }),
  dashboard: page.getByRole('link', { name: 'Dashboard Dashboard' }),
  orchestrations: page.getByRole('link', { name: 'Orchestrations Orchestration' }),
  // Some screens (the orchestration editor) collapse the sidebar: links lose their labels. "Collapse Side Bar"
  // shows only when expanded; the toggle (the app's own class) expands it again.
  collapseBtn: page.getByRole('button', { name: 'Collapse Side Bar' }),
  toggle: page.locator('.index-toggleButton button'),
  // "Settings" opens a flyout of links (Profile, Users, ..., Data Usage → Summary, Workspace → ...)
  settings: page.getByRole('listitem').filter({ hasText: /^Settings$/ }),
  settingsSection: (name: string) => page.getByRole('button', { name, exact: true }).first(),
  settingsLink: (href: string) => page.locator(`a[href="${href}"]`).first(),
});

// Before using the sidebar: close any popup the app left open (e.g. the "Link a Data Warehouse" modal
// that appears after unlinking), the way a user would press Escape. While it's open the sidebar is aria-hidden.
export async function readySidebar(page: Page) {
  const s = sidebar(page);
  if (!(await s.warehouses.isVisible())) await page.keyboard.press('Escape');
  // Collapsed (no labels): expand it like a user would
  if (!(await s.collapseBtn.isVisible()) && (await s.toggle.isVisible())) await s.toggle.click();
  await expect(s.warehouses).toBeVisible();
  return s;
}
