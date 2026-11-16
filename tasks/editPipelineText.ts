// Change one text setting of a saved pipeline (e.g. "Run") on its SetUp tab, and save it.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipeline as pipelinePage } from '../pages/pipeline';

export default defineTask({
  description: "On a pipeline's SetUp tab: pencil next to the text field → type the value → ✓. Confirms the app saved it.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    field: { required: true, description: 'Text field label as shown in SetUp, e.g. Run' },
    value: { required: true, description: 'New value' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'SetUp' }),
  async run(page, { pipeline, field, value }) {
    const p = pipelinePage(page);
    const box = p.textField(field);
    await box.waitFor({ timeout: 15_000 }).catch(() => {
      throw new Error(`"${pipeline}" has no text setting "${field}"`);
    });
    await expect(box).toBeDisabled(); // saved settings are read-only until edited

    const block = p.fieldBlock(field);
    await block.locator(p.editFieldIcon).click();
    await expect(box).toBeEnabled();
    await box.fill(String(value));
    await block.locator(p.saveFieldIcon).click();

    // Confirm on screen: the app says it saved, and the field is read-only again with the new value
    await expect(p.edited).toBeVisible();
    await expect(box).toBeDisabled();
    await expect(box).toHaveValue(String(value));
    return { pipeline, field, value: String(value) };
  },
});
