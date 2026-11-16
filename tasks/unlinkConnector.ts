// Unlink a connector from its warehouse. Strict: fails if not linked or if it still has pipelines.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount, connectorLinked } from '../pages/datasource';

export default defineTask({
  description: 'Unlink a connector from its warehouse. Fails if it is not linked or still has pipelines.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
  },
  screen: i => ({ screen: 'connector', connector: i.connector, tab: 'SetUp', fresh: true }), // the pipeline count is stale right after deletes,
  async run(page, { connector }) {
    const d = datasource(page);
    if (!(await connectorLinked(page, connector))) throw new Error(`"${connector}" is not linked to any warehouse`);

    const left = await configuredPipelineCount(page);
    if (left > 0) throw new Error(`"${connector}" still has ${left} pipeline(s). Delete them first.`);

    const warehouse = await d.linkedWarehouse.inputValue();
    await expect(d.unlinkBtn).toBeEnabled();
    await d.unlinkBtn.click();

    // Confirm on screen: the app asks for a warehouse again
    await expect(d.linkPrompt).toBeVisible();
    return { connector, warehouse };
  },
});
