// List the pipeline names a user can SEE on a connector's Configured Data Pipelines tab.
// UI only: if the list has more pages, names on other pages are not returned (a user wouldn't see them either).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount, goToConnector } from '../pages/datasource';

export default defineTask({
  description:
    'List the pipeline names visible on a connector\'s Configured Data Pipelines tab (first page only). Returns { names, total }.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
  },
  async run(page, { connector }) {
    const d = datasource(page);
    await goToConnector(page, connector);
    await expect(d.configuredCount).toBeVisible();
    // "N Configured Data Pipelines": the total, including any not on the visible page
    const total = await configuredPipelineCount(page);
    // With 0 pipelines the tab shows no table at all
    if (total === 0) return { connector, names: [], total };

    await d.configuredTab.click();
    await expect(d.pipelineRows.first()).toBeVisible();
    const names: string[] = [];
    for (const row of await d.pipelineRows.all()) names.push((await d.pipelineName(row).innerText()).trim());
    return { connector, names, total };
  },
});
