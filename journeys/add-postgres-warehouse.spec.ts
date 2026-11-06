import { test, expect } from '@playwright/test';
import { addPostgresWarehouse } from '../flows/addPostgresWarehouse';

test('add postgres warehouse', async ({ page }) => {
  const { name } = await addPostgresWarehouse(page);

  await page.goto('/datawarehouse', { waitUntil: 'networkidle' });
  await expect(page.getByText(name)).toBeVisible();
});
