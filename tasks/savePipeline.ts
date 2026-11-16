// Finish the "Create Data Pipeline" wizard from Report Details: manual-run schedule, name, submit. Does not run it.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { stamp } from '../config';
import { pipelineNew } from '../pages/pipelineNew';
import { lastRunStatus } from '../pages/pipeline';
import { whereAmI, describe } from '../pages/screens';

export default defineTask({
  description: 'From the filled Report Details step: Next → Manual Run Only → dataset name → Submit (without running), then View Run Status: check it opens and never ran. Returns { name }.',
  inputs: {
    connector: { required: true, description: 'Connector the wizard belongs to, e.g. Regression' },
    name: { description: 'Dataset name (default choreo_pipeline_<timestamp>)' },
  },
  async run(page, { connector, name }) {
    name = name || `choreo_pipeline_${stamp()}`;
    const w = pipelineNew(page);
    if (!(await w.reportDetailsHeading.isVisible())) throw new Error('Not on a pipeline wizard\'s Report Details step. Run startPipeline first.');

    await w.nextBtn.click();
    // Step 3: scheduling
    await w.manualRunOnly.check();
    await w.nextBtn.click();
    // Step 4: name
    await w.datasetName.fill(name);
    await w.runAfterSave.uncheck(); // creating and running are separate tasks
    await w.submitBtn.click();
    await expect(w.added).toBeVisible();

    // Confirm on screen, using the app's own next step: "View Run Status" opens the new pipeline, never run
    await w.viewRunStatus.click();
    await expect
      .poll(async () => describe(await whereAmI(page)), { timeout: 30_000 })
      .toBe(describe({ screen: 'pipeline', connector, pipeline: name, tab: 'Number Of Runs' }));
    expect(await lastRunStatus(page)).toBe('No Run Initiated');
    return { connector, name };
  },
});
