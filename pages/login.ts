// Selectors for /login, plus one thing that's only on screen when logged in.
import { Page } from '@playwright/test';

export const login = (page: Page) => ({
  email: page.getByLabel('Email'),
  password: page.getByLabel('Password'),
  continueBtn: page.getByRole('button', { name: 'Continue' }),
  // Sidebar link present on every page once logged in
  loggedInMarker: page.getByRole('link', { name: 'Datawarehouse Warehouses' }),
});
