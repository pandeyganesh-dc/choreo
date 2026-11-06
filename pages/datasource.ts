// Selectors for /datasource/<connector> (a connector's landing page).
import { Page } from '@playwright/test';

export const datasource = (page: Page) => ({
  open: (connector: string) => page.goto(`/datasource/${connector}`, { waitUntil: 'networkidle' }),
  // Not linked yet: the page only asks for a warehouse (the link is permanent)
  linkPrompt: page.getByRole('heading', { name: 'Link a Data Warehouse to this Datasource' }),
  warehouseSelect: page.getByRole('combobox'),
  warehouseOption: (name: string) => page.getByRole('option', { name, exact: true }),
  saveBtn: page.getByRole('button', { name: 'Save', exact: true }),
  // Linked: the normal connector page with its pipelines button
  addPipelinesBtn: page.getByRole('button', { name: '+ Data Pipelines' }),
});
