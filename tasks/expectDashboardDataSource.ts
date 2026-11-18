// Check: the Dashboard's Forward Stats → "Data Sources" row for a connector agrees with one of its pipelines' latest run.
// Noise-proof: other people's runs only ADD to a connector's totals, so every check is a lower bound taken from
// our own run (read beforehand with readLatestRun). It passes on a busy STAGING as well as on a quiet d-l.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { atLeast, fail } from '../core/errors';
import { log } from '../core/log';
import { dashboard, dataSourcesLoaded } from '../pages/dashboard';
import { readRow, uiNumber, uiTime } from '../pages/table';

// How far apart two screens' times of the same run can be
const SKEW_MS = 10_000;

export default defineTask({
  description:
    "On the Dashboard (Forward Stats → Data Sources), expect the connector's row to include our pipeline's latest run: Last Run at no earlier than it, Rows Moved at least its rows, at least 1 run. Fails at once if the dashboard shows an error toast.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    runAt: { required: true, description: "Our run's Start Time, from readLatestRun (startTime)" },
    rows: { required: true, description: "Our run's Rows Moved, from readLatestRun (rows)" },
  },
  // Fresh: the dashboard only fetches its numbers when opened
  screen: () => ({ screen: 'dashboard', fresh: true }),
  async run(page, { connector, runAt, rows }) {
    const d = dashboard(page);
    await d.forwardStats.click();
    await expect(d.dataSourcesTitle).toBeVisible();
    await dataSourcesLoaded(page);

    const row = d.dataSourcesTable.getByRole('row').filter({ has: page.getByText(connector, { exact: true }) });
    const shown = await row.count();
    if (shown === 0) throw new Error(`Dashboard Data Sources has no row for "${connector}"`);
    const col = await readRow(d.dataSourcesTable, row.first());
    const seen = { runs: col('Number of Runs'), rows: col('Rows Moved'), lastRunAt: col('Last Run at'), data: col('Data Moved') };
    log(`    dashboard row "${connector}": ${JSON.stringify(seen)}; our run at ${runAt}, rows ${rows}`);

    const what = `Dashboard Data Sources "${connector}"`;
    atLeast(uiNumber(seen.runs, `${what} Number of Runs`), 1, `The Dashboard shows no runs for "${connector}", though we have one`);
    atLeast(uiNumber(seen.rows, `${what} Rows Moved`), uiNumber(String(rows), "our run's Rows Moved"), `The Dashboard's Rows Moved for "${connector}" is lower than our own run moved`);
    // Screens read different timestamps of the same run (created vs started): the runs tab can be a second or two later
    if (uiTime(seen.lastRunAt, `${what} Last Run at`) < uiTime(String(runAt), "our run's Start Time") - SKEW_MS)
      throw fail({ title: `The Dashboard's "Last Run at" for "${connector}" is older than our run`, expected: `${runAt} or later`, found: seen.lastRunAt });
    return { connector, ...seen };
  },
});
