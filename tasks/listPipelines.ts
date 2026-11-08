// List the pipeline names a user can SEE on the Configured Data Pipelines tab that's already open.
// Doesn't navigate (that's goToConfiguredPipelines).
// UI only: if the list has more pages, names on other pages are not returned (a user wouldn't see them either).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount, expectOnConfiguredPipelines } from '../pages/datasource';

export default defineTask({
  description:
    "On the open Configured Data Pipelines tab, list the visible pipeline names (first page only). Returns { names, total }.",
  inputs: {
    connector: { required: true, description: 'Connector whose tab must be open, e.g. Regression' },
  },
  async run(page, { connector }) {
    const d = datasource(page);
    await expectOnConfiguredPipelines(page, connector);
    // "N Configured Data Pipelines": the total, including any not on the visible page
    const total = await configuredPipelineCount(page);
    // With 0 pipelines the tab shows no table at all
    if (total === 0) return { connector, names: [], total };

    await expect(d.pipelineRows.first()).toBeVisible();
    const names: string[] = [];
    for (const row of await d.pipelineRows.all()) names.push((await d.pipelineName(row).innerText()).trim());
    return { connector, names, total };
  },
});
