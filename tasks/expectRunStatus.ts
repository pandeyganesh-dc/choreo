// Check: wait for a pipeline's last run to finish, then expect its status.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipeline as pipelinePage, openPipeline, lastRunStatus } from '../pages/pipeline';

// Statuses that mean "not finished yet"
const IN_PROGRESS = ['QUEUED', 'RUNNING'];

export default defineTask({
  description: "Wait for a pipeline's last run to finish, then expect its status (e.g. SUCCESS, FAILED).",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    status: { default: 'SUCCESS', description: 'Expected final status, as the UI shows it' },
    minutes: { default: '5', description: 'How long to wait for the run to finish' },
  },
  async run(page, { connector, pipeline, status, minutes }) {
    await openPipeline(page, connector, pipeline);
    let current = await lastRunStatus(page);
    if (current === 'No Run Initiated') throw new Error(`"${pipeline}" has never run`);

    // Like a user: open the "Number Of Runs" tab and press the app's own Refresh until the run is done
    const p = pipelinePage(page);
    await p.runsTab.click();
    await expect
      .poll(
        async () => {
          await p.refreshBtn.click();
          current = await lastRunStatus(page);
          return IN_PROGRESS.includes(current.toUpperCase());
        },
        { timeout: Number(minutes) * 60_000, intervals: [5_000], message: `"${pipeline}" run did not finish in ${minutes} min` },
      )
      .toBe(false);

    expect(current, `"${pipeline}" last run`).toBe(status);
    return { connector, pipeline, status: current };
  },
});
