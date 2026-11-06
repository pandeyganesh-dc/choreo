// Flow: link a connector to a warehouse. Safe to re-run: if already linked, it does nothing.
import { Page, expect } from '@playwright/test';
import { datasource } from '../pages/datasource';
import { config } from '../config';

export async function linkConnectorToWarehouse(
  page: Page,
  opts: { connector?: string; warehouse?: string } = {},
) {
  const connector = opts.connector ?? 'regress';
  const warehouse = opts.warehouse ?? config.linkWarehouse;
  const d = datasource(page);

  await d.open(connector);
  // The page settles into either "needs a warehouse" or "already linked"
  await expect(d.linkPrompt.or(d.addPipelinesBtn)).toBeVisible();
  if (await d.addPipelinesBtn.isVisible()) return { connector, warehouse, alreadyLinked: true };

  await d.warehouseSelect.click();
  await d.warehouseOption(warehouse).click();
  await expect(d.saveBtn).toBeEnabled();
  await d.saveBtn.click();
  await expect(d.addPipelinesBtn).toBeVisible();
  return { connector, warehouse, alreadyLinked: false };
}
