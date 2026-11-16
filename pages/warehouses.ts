// Selectors for the Warehouses list (sidebar → Warehouses), Getting there is pages/screens.ts (goTo).
import { Page } from '@playwright/test';

export const warehouses = (page: Page) => ({
  search: page.getByRole('textbox', { name: 'Search warehouses...' }),
  addNewBtn: page.getByRole('button', { name: '+ Add New' }),
  item: (name: string) => page.getByText(name, { exact: true }),
});

