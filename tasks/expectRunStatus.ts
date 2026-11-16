// Check: wait for a pipeline's latest run to finish, then expect its status.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipeline as pipelinePage, latestRun } from '../pages/pipeline';
import { log } from '../core/log';

// Statuses that mean "not finished yet"
const IN_PROGRESS = ['QUEUED', 'RUNNING'];

export default defineTask({
  description: "Wait for a pipeline's latest run (top of Number Of Runs) to finish, then expect its status (e.g. SUCCESS, ERROR), in the list and in the header.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    status: { default: 'SUCCESS', description: 'Expected final status, as the UI shows it' },
    minutes: { default: '5', description: 'How long to wait for the run to finish' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Number Of Runs' }),
  async run(page, { connector, pipeline, status, minutes }) {
    const p = pipelinePage(page);
    // Like a user: press the app's own Refresh until the latest run is done
    let current = '';
    await expect
      .poll(
        async () => {
          await p.refreshBtn.click();
          const run = await latestRun(page);
          if (!run) throw new Error(`"${pipeline}" has never run`);
          current = run.status;
          log(`  refresh: latest run ${run.id} ${run.status} rows=${run.rowsMoved} data=${run.dataMoved}`);
          return IN_PROGRESS.includes(current.toUpperCase());
        },
        { timeout: Number(minutes) * 60_000, intervals: [2_000, 5_000], message: `"${pipeline}" run did not finish in ${minutes} min` },
      )
      .toBe(false);
    expect(current, `"${pipeline}" latest run`).toBe(status);

    log(`  header now: ${await p.lastRun.innerText().catch(() => '(not shown)')}`);
    // The header "(Last Run - X)" updates on its own a little later: it must agree
    await expect(p.lastRun, `"${pipeline}" header`).toHaveText(`(Last Run - ${status})`, { timeout: 30_000 });
    return { connector, pipeline, status: current };
  },
});
