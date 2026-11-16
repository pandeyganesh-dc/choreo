// Type a value into a text box on the current screen, found by its label.
// Generic: works for any form (e.g. a pipeline's "Run" in Report Details).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { textbox } from '../pages/form';

export default defineTask({
  description: 'Replace the value of the text box labelled `field` on the current screen with `value`. Fails if there is no such box.',
  inputs: {
    field: { required: true, description: 'Text box label as shown, e.g. Run' },
    value: { required: true, description: 'Value to type' },
  },
  async run(page, { field, value }) {
    const box = textbox(page, field);
    await box.waitFor({ timeout: 15_000 }).catch(() => {
      throw new Error(`No text box "${field}" on this screen`);
    });
    await box.fill(String(value));
    // Confirm on screen
    await expect(box).toHaveValue(String(value));
    return { field, value: String(value) };
  },
});
