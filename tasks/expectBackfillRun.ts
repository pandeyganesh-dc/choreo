// Check: after backfillPipeline, a new run shows up under the Back Fill tab's "Backfill Runs:" and finishes as expected.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { log } from '../core/log';
import { pipeline as pipelinePage, latestRun } from '../pages/pipeline';
import { readRow } from '../pages/table';

const IN_PROGRESS = ['QUEUED', 'RUNNING', 'RUN INITIATED'];

export default defineTask({
  description:
    'Wait for a new run under Back Fill → "Backfill Runs:" (more than `before`) to finish, then expect its status. If none appears, report what the Number Of Runs tab shows instead.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    before: { required: true, description: 'Backfill Runs count before the backfill (from backfillPipeline)' },
    status: { default: 'SUCCESS', description: 'Expected final status, as the UI shows it' },
    minutes: { default: '3', description: 'How long to wait' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Back Fill' }),
  async run(page, { pipeline, before, status, minutes }) {
    const p = pipelinePage(page);
    const what = `"${pipeline}" Backfill Runs`;
    let total = Number(before);
    let current = '';
    // The list only loads when the tab opens: like a user, switch away and back to see new runs
    const ok = await expect
      .poll(
        async () => {
          await p.runsTab.click();
          await p.backfillTab.click();
          await expect(p.backfillPager).toBeVisible();
          total = Number((await p.backfillPager.innerText()).match(/of (\d+) records/)![1]);
          if (total <= Number(before)) return 'none';
          const table = page.getByRole('tabpanel').getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Status' }) });
          const col = await readRow(table, table.getByRole('row').nth(1));
          current = col('Status');
          log(`    ${what}: ${total} records, newest ${current}`);
          return IN_PROGRESS.includes(current.toUpperCase()) ? 'running' : 'done';
        },
        { timeout: Number(minutes) * 60_000, intervals: [3_000, 5_000] },
      )
      .toBe('done')
      .then(() => true, () => false);

    if (!ok && total <= Number(before)) {
      // Where did the run go? Look at the normal runs list, like a user would
      await p.runsTab.click();
      const latest = await latestRun(page);
      throw new Error(
        `${what}: no new backfill run in ${minutes} min (still ${total}). ` +
          (latest ? `Number Of Runs' newest run: ${latest.runType}, ${latest.status}, started ${latest.startTime}.` : 'Number Of Runs is empty.'),
      );
    }
    if (!ok) throw new Error(`${what}: newest run still ${current} after ${minutes} min`);
    expect(current, `${what} newest status`).toBe(status);
    return { pipeline, status: current, runs: total };
  },
});
