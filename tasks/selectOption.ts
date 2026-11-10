// Pick one option in a dropdown on the current screen, found by the dropdown's label.
// Generic: works for any form that uses these dropdowns (e.g. a reverse sync's "Sheet", "Insert Mode").
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { dropdown } from '../pages/form';
import { esc } from '../pages/reverse';

export default defineTask({
  description:
    'In the dropdown labelled `field` on the current screen, pick `option`. Matches the option exactly, or an option ' +
    'shown as "<option> - <id>" (e.g. sheets). Fails if the field or the option is not there.',
  inputs: {
    field: { required: true, description: 'Dropdown label as shown, e.g. Sheet, Worksheet Name, Insert Mode' },
    option: { required: true, description: 'Option to pick, as shown (without any " - <id>" suffix)' },
  },
  async run(page, { field, option }) {
    const dd = dropdown(page, field);
    // Some fields only appear after an earlier choice (e.g. the table list after picking a warehouse)
    await dd.input.waitFor({ timeout: 15_000 }).catch(() => {
      throw new Error(`No dropdown "${field}" on this screen`);
    });
    const wanted = new RegExp(`^${esc(option)}( - .*)?$`);

    // Type to filter (long lists like tables), then wait for the list: options may load from the server
    await dd.input.click();
    await dd.input.fill(option);
    await expect(dd.options.first().or(dd.noOptions)).toBeVisible();
    const shown = (await dd.options.allInnerTexts()).map(t => t.trim());
    const match = shown.find(t => wanted.test(t));
    if (!match) {
      throw new Error(
        `"${field}" has no option "${option}". ` + (shown.length ? `Shown: ${shown.join(', ')}` : 'No options match.'),
      );
    }
    await dd.options.filter({ hasText: new RegExp(`^${esc(match)}$`) }).click();

    // Confirm on screen: the dropdown now shows it
    await expect(dd.input).toHaveValue(match);
    return { field, option: match };
  },
});
