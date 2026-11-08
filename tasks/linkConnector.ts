// Link a connector to a warehouse. Strict: fails if the connector is already linked.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, goToConnector } from '../pages/datasource';

export default defineTask({
  description: 'Link a connector to a warehouse. Fails if the connector is already linked.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    warehouse: { required: true, description: 'Warehouse name as shown in the dropdown' },
  },
  async run(page, { connector, warehouse }) {
    const d = datasource(page);
    if (await goToConnector(page, connector)) {
      const current = await d.linkedWarehouse.inputValue().catch(() => '?');
      throw new Error(`"${connector}" is already linked to "${current}". Unlink it first.`);
    }

    // In the app's "Link a Data Warehouse" modal
    await d.warehouseSelect.click();
    await d.warehouseOption(warehouse).click();
    await expect(d.saveBtn).toBeEnabled();
    await d.saveBtn.click();

    // Confirm on screen: the page switches to the linked view, showing this warehouse
    await expect(d.unlinkBtn).toBeVisible();
    await expect(d.linkedWarehouse).toHaveValue(warehouse);
    return { connector, warehouse };
  },
});
