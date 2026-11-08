// Start one run of a pipeline. It does not wait for the run to finish (that's expectRunStatus).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipeline, openPipeline, lastRunStatus } from '../pages/pipeline';

export default defineTask({
  description: 'Click "Run Pipeline" on a pipeline. Does not wait for the run to finish.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  async run(page, { connector, pipeline: name }) {
    const p = pipeline(page);
    await openPipeline(page, connector, name);
    await p.runBtn.click();
    // The app confirms the run was started (not finished)
    await expect(p.runStarted).toBeVisible();
    return { connector, pipeline: name, statusAfterStart: await lastRunStatus(page) };
  },
});
