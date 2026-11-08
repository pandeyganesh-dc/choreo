// Link a connector to a warehouse. Strict: fails if the connector is already linked.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource } from '../pages/datasource';

export default defineTask({
  description: 'Link a connector to a warehouse. Fails if the connector is already linked.',
  inputs: {
    connector: { required: true, description: 'Connector slug as in the URL, e.g. regress' },
    warehouse: { required: true, description: 'Warehouse name as shown in the dropdown' },
  },
  async run(page, { connector, warehouse }) {
    const d = datasource(page);
    await d.open(connector);
    await expect(d.linkPrompt.or(d.addPipelinesBtn)).toBeVisible();

    if (await d.addPipelinesBtn.isVisible()) {
      const current = await d.linkedWarehouse.inputValue().catch(() => '?');
      throw new Error(`"${connector}" is already linked to "${current}". Unlink it first.`);
    }

    await d.warehouseSelect.click();
    await d.warehouseOption(warehouse).click();
    await expect(d.saveBtn).toBeEnabled();
    await d.saveBtn.click();
    await expect(d.addPipelinesBtn).toBeVisible();

    // Confirm after a reload
    await d.open(connector);
    await expect(d.linkedWarehouse).toHaveValue(warehouse);
    return { connector, warehouse };
  },
});
