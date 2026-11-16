// Delete one pipeline from its connector's Configured Data Pipelines tab. When deleting many, the runner
// stays on that tab between them (shortest path = no moves).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource } from '../pages/datasource';

export default defineTask({
  description: "On a connector's Configured Data Pipelines tab, delete one pipeline by name. Fails if it is not there.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  screen: i => ({ screen: 'connector', connector: i.connector, tab: 'Configured Data Pipelines' }),
  async run(page, { connector, pipeline }) {
    const d = datasource(page);
    const missing = () => new Error(`"${connector}" has no pipeline named "${pipeline}"`);

    // With 0 pipelines the tab shows no table and no search box at all
    await d.pipelineSearch.fill(pipeline, { timeout: 10_000 }).catch(() => {
      throw missing();
    });
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
