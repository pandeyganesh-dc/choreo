// In a pipeline wizard's Report Details step, pick fields in the Fields picker.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { pipelineNew } from '../pages/pipelineNew';

export default defineTask({
  description: 'In the open Report Details step, select all fields or the named ones. Fails if the report has no Fields picker.',
  inputs: {
    fields: { default: 'all', description: '"all", or a list / comma-separated names as shown in the picker' },
  },
  async run(page, { fields }) {
    const w = pipelineNew(page);
    if (!(await w.reportDetailsHeading.isVisible())) throw new Error('Not on a pipeline wizard\'s Report Details step. Run startPipeline first.');
    await w.addAllFields.waitFor({ timeout: 10_000 }).catch(() => {
      throw new Error('This report has no Fields picker');
    });

    if (fields === 'all') {
      await w.addAllFields.click();
      await expect(w.availableFields).toHaveCount(0);
      return { fields: await w.selectedFields.allInnerTexts() };
    }
    const wanted: string[] = (Array.isArray(fields) ? fields : String(fields).split(',')).map(f => String(f).trim()).filter(Boolean);
    if (!wanted.length) throw new Error('fields is empty: give "all" or at least one field name');
    for (const f of wanted) {
      await w.availableField(f).click({ timeout: 10_000 }).catch(() => {
        throw new Error(`No field "${f}" to select`);
      });
      await expect(w.selectedField(f)).toBeVisible();
    }
    await expect(w.selectedFields).toHaveCount(wanted.length); // nothing else got selected
    return { fields: wanted };
  },
});
