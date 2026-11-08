// Add a PostgreSQL warehouse through the UI (validate + save).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { warehouseAdd } from '../pages/warehouseAdd';
import { config, stamp } from '../config';

export default defineTask({
  description: 'Add a PostgreSQL warehouse (defaults: d-l postgres-warehouse container). Returns { name }.',
  inputs: {
    name: { description: 'Warehouse name. Default: choreo_pg_<timestamp>' },
    host: { default: config.postgres.host },
    port: { default: config.postgres.port },
    database: { default: config.postgres.database },
    schema: { default: config.postgres.schema },
    username: { default: config.postgres.username },
    password: { default: config.postgres.password },
  },
  async run(page, i) {
    const name = i.name ?? `choreo_pg_${stamp()}`;
    const w = warehouseAdd(page);

    await w.open();
    await w.card('PostgreSQL').click();
    await w.addDetailsBtn.click();

    await w.field('name').fill(name);
    await w.field('host').fill(i.host);
    await w.field('port').fill(String(i.port));
    await w.field('database').fill(i.database);
    await w.field('schema_name').fill(i.schema);
    await w.authSection.click();
    await w.field('auth.username').fill(i.username);
    await w.field('auth.password').fill(i.password);

    await w.validateBtn.click();
    await expect(w.saveBtn).toBeEnabled({ timeout: 120_000 }); // validation runs 5 checks
    await w.saveBtn.click();
    await expect(page).toHaveURL(/\/datawarehouse/);

    // Confirm it's really saved
    await page.goto('/datawarehouse', { waitUntil: 'networkidle' });
    await expect(page.getByText(name)).toBeVisible();
    return { name };
  },
});
