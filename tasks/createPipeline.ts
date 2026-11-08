// Create a manual-run pipeline on a connector. It does NOT run it (that's runPipeline).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { stamp } from '../config';
import { pipelineNew } from '../pages/pipelineNew';
import { datasource, goToConnector } from '../pages/datasource';
import { openPipeline, lastRunStatus } from '../pages/pipeline';

export default defineTask({
  description: 'Create a manual-run pipeline on a linked connector, with all or chosen fields. Does not run it.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    type: { default: 'Regular', description: 'Pipeline type, as titled on its card in step 1' },
    name: { description: 'Dataset name (default choreo_pipeline_<timestamp>)' },
    fields: { default: 'all', description: 'Fields to select in step 2: "all", or a list / comma-separated names as shown in the picker' },
  },
  async run(page, { connector, type, name, fields }) {
    name = name || `choreo_pipeline_${stamp()}`;
    const w = pipelineNew(page);

    const d = datasource(page);
    if (!(await goToConnector(page, connector))) throw new Error(`"${connector}" is not linked to a warehouse. Link it first.`);
    await d.addPipelinesBtn.click();
    await w.typeCard(type).click().catch(() => {
      throw new Error(`"${connector}" has no pipeline type "${type}"`);
    });
    await w.nextBtn.click();

    // Step 2: fields
    if (fields === 'all') {
      await w.addAllFields.click();
    } else {
      const wanted: string[] = (Array.isArray(fields) ? fields : String(fields).split(',')).map(f => String(f).trim()).filter(Boolean);
      if (!wanted.length) throw new Error('fields is empty: give "all" or at least one field name');
      for (const f of wanted) {
        await w.availableField(f).click({ timeout: 10_000 }).catch(() => {
          throw new Error(`"${connector}" → "${type}" has no field "${f}" to select`);
        });
        await expect(w.selectedField(f)).toBeVisible();
      }
      await expect(w.selectedFields).toHaveCount(wanted.length); // nothing else got selected
    }
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
