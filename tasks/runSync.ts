// Run one configured reverse sync, from its destination's page. Does not wait for the run to finish.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { destination as dest } from '../pages/reverse';

export default defineTask({
  description:
    'On the open destination page: Configured Syncs → search the sync → open it → Run Sync. ' +
    'Confirms the run was triggered; does not wait for it to finish.',
  inputs: {
    destination: { required: true, description: 'Destination whose page must be open, e.g. GoogleSheets Export' },
    sync: { required: true, description: 'Sync name, e.g. choreo_sync_20261110_083622' },
  },
  async run(page, { destination, sync }) {
    const d = dest(page);
    if (!(await d.title(destination).isVisible())) {
      throw new Error(`Not on the "${destination}" destination page. Run goToDestination first.`);
    }
    await d.configuredTab.click();
    await d.syncSearch.fill(sync);
    await d.syncLink(sync).click({ timeout: 15_000 }).catch(() => {
      throw new Error(`"${destination}" has no configured sync named "${sync}"`);
    });
    await expect(d.syncTitle(sync)).toBeVisible();

    await d.runSyncBtn.click();
    // Confirm on screen: the app says the run was triggered
    await expect(d.runStarted).toBeVisible();
    return { destination, sync };
  },
});
