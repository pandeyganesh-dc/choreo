// Delete one pipeline on the Configured Data Pipelines tab that's already open. Doesn't navigate
// (that's goToConfiguredPipelines), so a flow can delete many without going back and forth.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, expectOnConfiguredPipelines } from '../pages/datasource';

export default defineTask({
  description: 'On the open Configured Data Pipelines tab, delete one pipeline by name. Fails if it is not there.',
  inputs: {
    connector: { required: true, description: 'Connector whose tab must be open, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  async run(page, { connector, pipeline }) {
    const d = datasource(page);
    const missing = () => new Error(`"${connector}" has no pipeline named "${pipeline}"`);
    await expectOnConfiguredPipelines(page, connector);

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
