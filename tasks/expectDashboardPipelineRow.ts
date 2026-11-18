// Check: Dashboard → Forward Stats → Data Sources → click the connector → "Data Pipelines": our pipeline's row agrees
// with its own runs tab (read beforehand with readLatestRun). The table covers the dashboard's date range (7 days), so
// counts are bounded, not exact: 1 ≤ Number of Runs ≤ the pipeline's total runs, Rows Moved ≥ its latest run's rows.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { same, atLeast, atMost } from '../core/errors';
import { log } from '../core/log';
import { dashboard, dataSourcesLoaded } from '../pages/dashboard';
import { expectNoErrorToast } from '../pages/toast';
import { readRow, uiNumber } from '../pages/table';

export default defineTask({
  description:
    "Dashboard → Data Sources → click the connector → Data Pipelines: expect our pipeline's row (status, runs, rows) to agree with its latest run.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    status: { required: true, description: "Latest run's status, from readLatestRun (status)" },
    rows: { required: true, description: "Latest run's Rows Moved, from readLatestRun (rows)" },
    runs: { required: true, description: 'How many runs the pipeline has, from readLatestRun (runs)' },
  },
  screen: () => ({ screen: 'dashboard', fresh: true }),
  async run(page, { connector, pipeline, status, rows, runs }) {
    const d = dashboard(page);
    await d.forwardStats.click();
    await dataSourcesLoaded(page);
    await d.connectorLink(connector).click();
    await expect(d.pipelinesTitle).toBeVisible();
    await expectNoErrorToast(page, `Dashboard → ${connector} → Data Pipelines`);
    const row = d.pipelinesTable.getByRole('row').filter({ has: page.getByText(pipeline, { exact: true }) }).first();
    await expect(row, `Dashboard Data Pipelines row for "${pipeline}"`).toBeVisible({ timeout: 30_000 });
    const col = await readRow(d.pipelinesTable, row);
    const seen = { status: col('Last run status'), runs: col('Number of Runs'), rows: col('Rows Moved') };
    log(`    dashboard pipeline row "${pipeline}": ${JSON.stringify(seen)}; runs tab: ${status}, rows ${rows}, ${runs} runs`);
    const what = `Dashboard Data Pipelines "${pipeline}"`;
    same(seen.status.toUpperCase(), String(status).toUpperCase(), `The Dashboard shows "${pipeline}" last run as ${seen.status}, but its runs tab says ${status}`);
    const n = uiNumber(seen.runs, `${what} Number of Runs`);
    atLeast(n, 1, `The Dashboard shows no runs for "${pipeline}"`);
    atMost(n, Number(runs), `The Dashboard shows more runs for "${pipeline}" than the pipeline has`);
    atLeast(uiNumber(seen.rows, `${what} Rows Moved`), uiNumber(String(rows), 'runs tab Rows Moved'), `The Dashboard's Rows Moved for "${pipeline}" is lower than its latest run alone`);
    return { pipeline, ...seen };
  },
});
