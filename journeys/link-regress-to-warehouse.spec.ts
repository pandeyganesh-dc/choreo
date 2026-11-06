import { test, expect } from '@playwright/test';
import { linkConnectorToWarehouse } from '../flows/linkConnectorToWarehouse';
import { datasource } from '../pages/datasource';

test('link regress connector to a warehouse', async ({ page }) => {
  await linkConnectorToWarehouse(page, { connector: 'regress' });

  // After a reload the connector page shows as linked
  const d = datasource(page);
  await d.open('regress');
  await expect(d.addPipelinesBtn).toBeVisible();
  await expect(d.linkPrompt).toBeHidden();
});
