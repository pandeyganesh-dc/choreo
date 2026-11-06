// Flow: add a PostgreSQL warehouse through the UI (validate + save).
import { Page, expect } from '@playwright/test';
import { warehouseAdd } from '../pages/warehouseAdd';
import { config, stamp } from '../config';

export async function addPostgresWarehouse(page: Page, opts: { name?: string } = {}) {
  const pg = config.postgres;
  const name = opts.name ?? `e2e2_pg_${stamp()}`;
  const w = warehouseAdd(page);

  await w.open();
  await w.card('PostgreSQL').click();
  await w.addDetailsBtn.click();

  await w.field('name').fill(name);
  await w.field('host').fill(pg.host);
  await w.field('port').fill(pg.port);
  await w.field('database').fill(pg.database);
  await w.field('schema_name').fill(pg.schema);
  await w.authSection.click();
  await w.field('auth.username').fill(pg.username);
  await w.field('auth.password').fill(pg.password);

  await w.validateBtn.click();
  await expect(w.saveBtn).toBeEnabled({ timeout: 120_000 }); // validation runs 5 checks
  await w.saveBtn.click();

  await expect(page).toHaveURL(/\/datawarehouse/);
  return { name };
}
