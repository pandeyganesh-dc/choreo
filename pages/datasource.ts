// Selectors for /datasource/<connector> (a connector's landing page).
import { Page, Locator } from '@playwright/test';

export const datasource = (page: Page) => ({
  open: (connector: string) => page.goto(`/datasource/${connector}`, { waitUntil: 'networkidle' }),

  // Not linked yet: the page only asks for a warehouse
  linkPrompt: page.getByRole('heading', { name: 'Link a Data Warehouse to this Datasource' }),
  warehouseSelect: page.getByRole('combobox'),
  warehouseOption: (name: string) => page.getByRole('option', { name, exact: true }),
  saveBtn: page.getByRole('button', { name: 'Save', exact: true }),

  // Linked: the normal connector page
  addPipelinesBtn: page.getByRole('button', { name: '+ Data Pipelines' }),
  // Header text "N Configured Data Pipelines"
  configuredCount: page.getByRole('heading', { name: /^\d+ Configured Data Pipelines$/ }),

  // SetUp tab: the linked warehouse (disabled textbox) and the unlink button.
  // Unlink stays disabled while the connector has any pipeline.
  linkedWarehouse: page.getByRole('tabpanel', { name: 'SetUp' }).getByRole('textbox').first(),
  unlinkBtn: page.getByRole('button').filter({ has: page.getByTestId('LinkOffIcon') }),

  // Configured Data Pipelines tab
  configuredTab: page.getByRole('tab', { name: 'Configured Data Pipelines' }),
  pipelineSearch: page.getByRole('textbox', { name: 'Search Data Source or Records' }),
  pipelineRows: page.getByRole('row').filter({ has: page.getByTestId('DeleteOutlineOutlinedIcon') }),
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
