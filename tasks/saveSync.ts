// Finish the "Create Data Sync" wizard from Sync Details: manual-run schedule, name, submit. Does not run it.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { stamp } from '../config';
import { destination as dest, goToDestination } from '../pages/reverse';

export default defineTask({
  description: 'From the filled Sync Details step: Next → Manual Run Only → name → Submit (without running), then check it is listed. Returns { name }.',
  inputs: {
    destination: { required: true, description: 'Destination the wizard belongs to, e.g. GoogleSheets Export' },
    name: { description: 'Sync name: letters, digits, underscores (default choreo_sync_<timestamp>)' },
  },
  async run(page, { destination, name }) {
    name = name || `choreo_sync_${stamp()}`;
    const d = dest(page);
    if (!(await d.syncConfigHeading.isVisible())) throw new Error('Not on a sync wizard\'s Sync Details step. Run startSync first.');

    await d.nextBtn.click();
    // Step 4: scheduling
    await d.manualRunOnly.check();
    await d.nextBtn.click();
    // Step 5: name
    await d.syncName.fill(name);
    await d.runAfterSave.uncheck(); // creating and running are separate tasks
    await d.submitBtn.click();

    await expect(d.added).toBeVisible();

    // Confirm on screen: it's listed under the destination's Configured Syncs
    await goToDestination(page, destination);
    await d.configuredTab.click();
    await d.syncSearch.fill(name);
    await expect(d.syncLink(name)).toBeVisible();
    return { destination, name };
  },
});
