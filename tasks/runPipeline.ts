// Start one run of a pipeline and wait until it shows up in the runs list. Doesn't wait for it to finish
// (that's expectRunStatus).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipeline, latestRun } from '../pages/pipeline';

export default defineTask({
  description: 'Click "Run Pipeline", then wait until the new run is listed under Number Of Runs. Does not wait for it to finish.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  // On the runs tab, so the new run can be seen appearing
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Number Of Runs' }),
  async run(page, { connector, pipeline: name }) {
    const p = pipeline(page);
    const before = (await latestRun(page))?.id;
    await p.runBtn.click();
    // The app confirms the run was started (not finished)
    await expect(p.runStarted).toBeVisible();

    // Like a user: press Refresh until a new run is at the top of the list
    let now: Awaited<ReturnType<typeof latestRun>>;
    await expect
      .poll(
        async () => {
          await p.refreshBtn.click();
          now = await latestRun(page);
          return now !== undefined && now.id !== before;
        },
        { timeout: 60_000, intervals: [1_000, 2_000], message: `The new run of "${name}" never appeared under Number Of Runs` },
      )
      .toBe(true);
    return { connector, pipeline: name, statusAfterStart: now!.status };
  },
});
