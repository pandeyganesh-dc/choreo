// Check: the Dashboard opens and its Forward Stats → Data Sources table loads, with no error toast.
// The quickest way to reproduce a broken dashboard API: needs no pipeline of its own.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { dashboard, dataSourcesLoaded } from '../pages/dashboard';

export default defineTask({
  description: 'Open the Dashboard and expect Forward Stats → Data Sources to load, with no "Something went wrong" toast.',
  inputs: {},
  // Fresh: the dashboard only fetches its numbers when opened
  screen: () => ({ screen: 'dashboard', fresh: true }),
  async run(page) {
    const d = dashboard(page);
    await d.forwardStats.click();
    await expect(d.dataSourcesTitle).toBeVisible();
    await dataSourcesLoaded(page);
    return { rows: (await d.dataSourcesTable.getByRole('row').count()) - 1 };
  },
});
