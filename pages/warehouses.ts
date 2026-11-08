// Selectors for the Warehouses list (sidebar → Warehouses), and how a user gets there.
import { Page, expect } from '@playwright/test';
import { readySidebar } from './sidebar';

export const warehouses = (page: Page) => ({
  search: page.getByRole('textbox', { name: 'Search warehouses...' }),
  addNewBtn: page.getByRole('button', { name: '+ Add New' }),
  item: (name: string) => page.getByText(name, { exact: true }),
});

export async function goToWarehouses(page: Page) {
  await (await readySidebar(page)).warehouses.click();
  await expect(warehouses(page).addNewBtn).toBeVisible();
}
