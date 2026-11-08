// Create a manual-run pipeline on a connector. It does NOT run it (that's runPipeline).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { stamp } from '../config';
import { pipelineNew } from '../pages/pipelineNew';
import { openPipeline, lastRunStatus } from '../pages/pipeline';

export default defineTask({
  description: 'Create a manual-run pipeline (all fields selected) on a linked connector. Does not run it.',
  inputs: {
    connector: { required: true, description: 'Connector slug, e.g. regress' },
    type: { default: 'Regular', description: 'Pipeline type, as titled on its card in step 1' },
    name: { description: 'Dataset name (default choreo_pipeline_<timestamp>)' },
  },
  async run(page, { connector, type, name }) {
    name = name || `choreo_pipeline_${stamp()}`;
    const w = pipelineNew(page);

    await w.open(connector);
    await w.typeCard(type).click().catch(() => {
      throw new Error(`"${connector}" has no pipeline type "${type}"`);
    });
    await w.nextBtn.click();

    await w.addAllFields.click();
    await w.nextBtn.click();

    await w.manualRunOnly.check();
    await w.nextBtn.click();

    await w.datasetName.fill(name);
    await w.runAfterSave.uncheck(); // creating and running are separate tasks
    await w.submitBtn.click();
    await expect(w.added).toBeVisible();

    // Confirm: it is listed under the connector and has never run
    await openPipeline(page, connector, name);
    expect(await lastRunStatus(page)).toBe('No Run Initiated');
    return { connector, name };
  },
});
