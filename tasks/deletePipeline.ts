// Delete one configured pipeline of a connector, by its name.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount, goToConnector } from '../pages/datasource';

export default defineTask({
  description: 'Delete one pipeline of a connector by name. Fails if no pipeline has that name.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  async run(page, { connector, pipeline }) {
    const d = datasource(page);
    const missing = () => new Error(`"${connector}" has no pipeline named "${pipeline}"`);

    await goToConnector(page, connector);
    await expect(d.configuredCount).toBeVisible();
    const before = await configuredPipelineCount(page);
    // With 0 pipelines the tab shows no table (and no search box) at all
    if (before === 0) throw missing();

    await d.configuredTab.click();
    await d.pipelineSearch.fill(pipeline);
    const row = d.pipelineRow(pipeline);
    await row.waitFor({ timeout: 15_000 }).catch(() => {
      throw missing();
    });

    page.once('dialog', dlg => dlg.accept()); // "Are you sure you wanna delete this report?"
    await d.deleteIcon(row).click();

    // Confirm on screen: the row is gone.
    // (Not the "N Configured Data Pipelines" header: it sometimes stays stale after a delete until you navigate away.)
    await expect(row).toHaveCount(0);
    return { connector, pipeline };
  },
});
