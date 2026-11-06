// Selectors for /datawarehouse/add. The only place that knows how this screen is built.
import { Page } from '@playwright/test';

export const warehouseAdd = (page: Page) => ({
  open: () => page.goto('/datawarehouse/add', { waitUntil: 'networkidle' }),
  // Warehouse cards are identified by their visible name, e.g. 'PostgreSQL', 'MySQL'
  card: (name: string) => page.getByText(name, { exact: true }),
  addDetailsBtn: page.getByRole('button', { name: 'Add Warehouse Details' }),
  // Form fields are generated from the warehouse schema; `name` matches the API field
  field: (name: string) => page.locator(`input[name="${name}"]`),
  authSection: page.getByRole('button', { name: 'Authentication' }),
  validateBtn: page.getByRole('button', { name: 'Validate', exact: true }),
  // The validation popup sits inside an aria-hidden container in frontend-v2,
  // so getByRole can't see it. Match the button by its text instead.
  saveBtn: page.locator('button', { hasText: 'Save Warehouse' }),
});
