// On a destination's page, open "+ Data Sync" and go through the generic steps (credentials, sync type)
// up to "Sync Details", the step that differs per destination. Fill that with selectOption, then saveSync.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { destination as dest } from '../pages/reverse';

export default defineTask({
  description: "On a destination's page: + Data Sync → pick credentials → pick sync type → stop at Sync Details.",
  inputs: {
    destination: { required: true, description: 'Destination name as shown in the UI, e.g. GoogleSheets Export' },
    credential: { required: true, description: 'Credential name as shown on its card, e.g. test-choreo' },
    sync: { required: true, description: 'Sync type, as titled on its card in step 2, e.g. Export' },
  },
  screen: i => ({ screen: 'destination', destination: i.destination }),
  async run(page, { destination, credential, sync }) {
    const d = dest(page);
    await d.addSyncBtn.click();

    // Step 1: credentials
    await d.credential(credential).click({ timeout: 15_000 }).catch(() => {
      throw new Error(`"${destination}" has no credential named "${credential}"`);
    });
    await expect(d.nextBtn).toBeEnabled();
    await d.nextBtn.click();

    // Step 2: sync type
    await d.syncType(sync).click({ timeout: 15_000 }).catch(() => {
      throw new Error(`"${destination}" has no sync type "${sync}"`);
    });
    await d.nextBtn.click();

    // Confirm on screen: the Sync Details step is open
    await expect(d.syncConfigHeading).toBeVisible();
    return { destination, credential, sync };
  },
});
