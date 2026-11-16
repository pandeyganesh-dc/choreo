// Selectors for a connector's page. Getting there is pages/screens.ts (goTo).
import { Page, Locator, expect } from '@playwright/test';

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

// Reads "N Configured Data Pipelines" from the header.
export async function configuredPipelineCount(page: Page) {
  const text = await datasource(page).configuredCount.innerText();
  return parseInt(text, 10);
}

// Is the open connector linked to a warehouse? Waits for the page to settle first:
// "+ Data Pipelines" is enabled from the first frame iff linked; the unlink button (linked) or the
// "Link a Data Warehouse" popup (not linked) only shows after loading.
export async function connectorLinked(page: Page, connector: string) {
  const d = datasource(page);
  await expect(d.title(connector)).toBeVisible();
  await expect(d.addPipelinesText).toBeVisible();
  const linked = await d.addPipelinesText.isEnabled();
  await expect(linked ? d.unlinkBtn : d.linkPrompt).toBeVisible();
  return linked;
}
