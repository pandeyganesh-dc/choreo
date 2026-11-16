// Run one configured reverse sync from its own page. Does not wait for the run to finish.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { destination as dest } from '../pages/reverse';

export default defineTask({
  description:
    "On a sync's page: Run Sync. " +
    'Confirms the run was triggered; does not wait for it to finish.',
  inputs: {
    destination: { required: true, description: 'Destination name as shown in the UI, e.g. GoogleSheets Export' },
    sync: { required: true, description: 'Sync name, e.g. choreo_sync_20261110_083622' },
  },
  screen: i => ({ screen: 'sync', destination: i.destination, sync: i.sync }),
  async run(page, { destination, sync }) {
    const d = dest(page);
    await d.runSyncBtn.click();
    // Confirm on screen: the app says the run was triggered
    await expect(d.runStarted).toBeVisible();
    return { destination, sync };
  },
});
