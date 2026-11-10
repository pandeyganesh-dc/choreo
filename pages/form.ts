// Generic form controls that look the same on every screen.
import { Page } from '@playwright/test';

// An MUI dropdown (Autocomplete) found by its label, e.g. "Sheet", "Insert Mode"
export const dropdown = (page: Page, label: string) => ({
  input: page.getByRole('combobox', { name: label, exact: true }),
  options: page.getByRole('option'),
  noOptions: page.getByText('No options', { exact: true }),
});
