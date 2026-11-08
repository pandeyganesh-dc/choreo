// Delete every configured pipeline of a connector.
// (Stopgap until flows get loops: then this becomes listPipelines + forEach deletePipeline.)
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount } from '../pages/datasource';

export default defineTask({
  description: 'Delete all pipelines of a connector. Returns { deleted }.',
  inputs: {
    connector: { required: true, description: 'Connector slug, e.g. regress' },
  },
  async run(page, { connector }) {
    const d = datasource(page);
    await d.open(connector);
    const total = await configuredPipelineCount(page);

    let deleted = 0;
    while (deleted < total) {
      await d.open(connector); // fresh list each time (it's paginated)
      await d.configuredTab.click();
      const row = d.pipelineRows.first();
      await row.waitFor();
      page.once('dialog', dlg => dlg.accept());
      const before = await d.pipelineRows.count();
      await d.deleteIcon(row).click();
      await expect(d.pipelineRows).toHaveCount(before - 1);
      deleted++;
    }

    // Confirm after a reload
    await d.open(connector);
    expect(await configuredPipelineCount(page), 'pipelines left after deleting all').toBe(0);
    return { connector, deleted };
  },
});
