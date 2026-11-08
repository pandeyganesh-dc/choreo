// Selectors for a connector's page, and how a user gets there (ETL → All Connectors → search → card).
import { Page, Locator, expect } from '@playwright/test';
import { readySidebar } from './sidebar';

export const datasource = (page: Page) => ({
  // The connector's name as the UI shows it, e.g. "Regression" (text, since a modal may hide the page from roles)
  title: (name: string) => page.getByText(name, { exact: true }).first(),

  // Not linked yet: the app opens a "Link a Data Warehouse" modal right away (the page behind is aria-hidden).
  // These match the modal, since it's the only accessible part of the page then.
  linkPrompt: page.getByRole('heading', { name: 'Link a Data Warehouse to this Datasource' }),
  warehouseSelect: page.getByRole('combobox'),
  warehouseOption: (name: string) => page.getByRole('option', { name, exact: true }),
  saveBtn: page.getByRole('button', { name: 'Save', exact: true }),

  // Linked
  addPipelinesBtn: page.getByRole('button', { name: '+ Data Pipelines' }),
  // Same button found by text, so it's seen even behind the link modal. Enabled from the first frame iff linked,
  // which makes it the reliable "is this connector linked?" signal (the modal / unlink button only show after loading).
  addPipelinesText: page.locator('button', { hasText: '+ Data Pipelines' }),
  // Header text "N Configured Data Pipelines" (as text: it's still on screen behind the link modal)
  configuredCount: page.getByText(/^\d+ Configured Data Pipelines$/),

  // SetUp tab when linked: the linked warehouse (disabled textbox) and the unlink button.
  // Unlink stays disabled while the connector has any pipeline.
  linkedWarehouse: page.getByRole('tabpanel', { name: 'SetUp' }).getByRole('textbox').first(),
  unlinkBtn: page.getByRole('button').filter({ has: page.getByTestId('LinkOffIcon') }),

  // Configured Data Pipelines tab
  configuredTab: page.getByRole('tab', { name: 'Configured Data Pipelines' }),
  pipelineSearch: page.getByRole('textbox', { name: 'Search Data Source or Records' }),
  pipelineRows: page.getByRole('row').filter({ has: page.getByTestId('DeleteOutlineOutlinedIcon') }),
  // A row's first link is the pipeline's name (the others are Edit/Copy/Last Run/Change History)
  pipelineName: (row: Locator) => row.getByRole('link').first(),
  pipelineRow: (name: string) =>
    page.getByRole('row').filter({ has: page.getByRole('link', { name, exact: true }) }),
  // MUI icons are aria-hidden, so the delete icon is found by MUI's own data-testid
  deleteIcon: (row: Locator) => row.getByTestId('DeleteOutlineOutlinedIcon'),
});

// ETL → All Connectors page
const allConnectors = (page: Page) => {
  const panel = page.getByRole('tabpanel', { name: 'Explore Connectors' });
  return {
    search: panel.getByRole('textbox', { name: 'search' }),
    card: (name: string) => panel.getByText(name, { exact: true }),
  };
};

// Goes to a connector's page the way a user does: sidebar ETL → All Connectors → search → click its card.
// `name` is the connector's name as shown in the UI, e.g. "Regression". Returns whether it's linked to a warehouse,
// after the page has settled (linked: SetUp shows the warehouse; not linked: the "Link a Data Warehouse" modal).
export async function goToConnector(page: Page, name: string): Promise<boolean> {
  const s = await readySidebar(page);
  const c = allConnectors(page);
  const d = datasource(page);
  await s.etl.click();
  await s.allConnectors.click();
  await c.search.fill(name);
  await c.card(name).click({ timeout: 15_000 }).catch(() => {
    throw new Error(`No connector named "${name}" under ETL → All Connectors`);
  });
  await expect(d.addPipelinesText).toBeVisible();
  await expect(d.title(name)).toBeVisible();
  const linked = await d.addPipelinesText.isEnabled();
  await expect(linked ? d.unlinkBtn : d.linkPrompt).toBeVisible();
  return linked;
}

// Reads "N Configured Data Pipelines" from the header.
export async function configuredPipelineCount(page: Page) {
  const text = await datasource(page).configuredCount.innerText();
  return parseInt(text, 10);
}
