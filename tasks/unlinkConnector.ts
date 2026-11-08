// Unlink a connector from its warehouse. Strict: fails if not linked or if it still has pipelines.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount } from '../pages/datasource';

export default defineTask({
  description: 'Unlink a connector from its warehouse. Fails if it is not linked or still has pipelines.',
  inputs: {
    connector: { required: true, description: 'Connector slug, e.g. regress' },
  },
  async run(page, { connector }) {
    const d = datasource(page);
    await d.open(connector); // fresh load: the unlink button only enables after a refresh
    await expect(d.linkPrompt.or(d.addPipelinesBtn)).toBeVisible();
    if (await d.linkPrompt.isVisible()) throw new Error(`"${connector}" is not linked to any warehouse`);

    const left = await configuredPipelineCount(page);
    if (left > 0) throw new Error(`"${connector}" still has ${left} pipeline(s). Delete them first.`);

    const warehouse = await d.linkedWarehouse.inputValue();
    await expect(d.unlinkBtn).toBeEnabled();
    await d.unlinkBtn.click();
    await expect(d.linkPrompt).toBeVisible();

    // Confirm after a reload
    await d.open(connector);
    await expect(d.linkPrompt).toBeVisible();
    return { connector, warehouse };
  },
});
