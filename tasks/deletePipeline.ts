// Delete one configured pipeline of a connector, by its name.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount } from '../pages/datasource';

export default defineTask({
  description: 'Delete one pipeline of a connector by name. Fails if no pipeline has that name.',
  inputs: {
    connector: { required: true, description: 'Connector slug, e.g. regress' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  async run(page, { connector, pipeline }) {
    const d = datasource(page);
    const find = async () => {
      await d.open(connector);
      await d.configuredTab.click();
      await d.pipelineSearch.fill(pipeline);
    };

    const missing = () => new Error(`"${connector}" has no pipeline named "${pipeline}"`);
    await d.open(connector);
    await expect(d.configuredCount).toBeVisible();
    // With 0 pipelines the tab shows no table (and no search box) at all
    if ((await configuredPipelineCount(page)) === 0) throw missing();

    await find();
    const row = d.pipelineRow(pipeline);
    await row.waitFor({ timeout: 15_000 }).catch(() => {
      throw missing();
    });

    page.once('dialog', dlg => dlg.accept()); // "Are you sure you wanna delete this report?"
    await d.deleteIcon(row).click();
    await expect(row).toHaveCount(0);

    // Confirm after a reload (if it was the last pipeline, there's no list to search)
    await d.open(connector);
    await expect(d.configuredCount).toBeVisible();
    if ((await configuredPipelineCount(page)) > 0) {
      await find();
      await expect(d.pipelineRow(pipeline)).toHaveCount(0);
    }
    return { connector, pipeline };
  },
});
