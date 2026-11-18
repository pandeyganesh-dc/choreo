// Check: a connector's Configured Data Pipelines row for our pipeline agrees with the pipeline's own runs tab
// (read beforehand with readLatestRun): Last Run Status = latest status, Last Run Time = its start (± a few s),
// Rows Moved = total over all its runs (exact when it has one run, at least the latest's rows otherwise).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { same, near, atLeast } from '../core/errors';
import { log } from '../core/log';
import { datasource } from '../pages/datasource';
import { readRow, uiNumber, uiTime } from '../pages/table';

const SKEW_MS = 10_000;

export default defineTask({
  description:
    "On the connector's Configured Data Pipelines tab, expect our pipeline's row (Last Run Status, Last Run Time, Rows Moved) to agree with its latest run.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    status: { required: true, description: "Latest run's status, from readLatestRun (status)" },
    runAt: { required: true, description: "Latest run's Start Time, from readLatestRun (startTime)" },
    rows: { required: true, description: "Latest run's Rows Moved, from readLatestRun (rows)" },
    runs: { required: true, description: 'How many runs the pipeline has, from readLatestRun (runs)' },
  },
  // Fresh: the list is read when the tab opens
  screen: i => ({ screen: 'connector', connector: i.connector, tab: 'Configured Data Pipelines', fresh: true }),
  async run(page, { pipeline, status, runAt, rows, runs }) {
    const d = datasource(page);
    const panel = page.getByRole('tabpanel', { name: 'Configured Data Pipelines' });
    await d.pipelineSearch.fill(pipeline);
    const row = d.pipelineRow(pipeline);
    await expect(row, `"${pipeline}" row`).toBeVisible();
    const col = await readRow(panel.getByRole('table'), row);
    const seen = { status: col('Last Run Status'), lastRunAt: col('Last Run Time'), rows: col('Rows Moved') };
    log(`    connector row "${pipeline}": ${JSON.stringify(seen)}; runs tab: ${status}, ${runAt}, rows ${rows}, ${runs} runs`);
    const what = `Connector page row "${pipeline}"`;
    same(seen.status, status, `The connector page shows "${pipeline}" last run as ${seen.status}, but its runs tab says ${status}`);
    near(uiTime(seen.lastRunAt, `${what} Last Run Time`), uiTime(String(runAt), 'runs tab Start Time'), SKEW_MS, seen.lastRunAt, String(runAt),
      `The connector page shows a different Last Run Time for "${pipeline}" than its runs tab`);
    const total = uiNumber(seen.rows, `${what} Rows Moved`);
    if (Number(runs) === 1) same(total, uiNumber(String(rows), 'runs tab Rows Moved'), `The connector page's Rows Moved for "${pipeline}" differs from its only run`);
    else atLeast(total, uiNumber(String(rows), 'runs tab Rows Moved'), `The connector page's Rows Moved for "${pipeline}" is lower than its latest run alone`);
    return { pipeline, ...seen };
  },
});
