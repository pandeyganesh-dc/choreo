// Selectors for the Dashboard (sidebar → Dashboard). Getting there is pages/screens.ts (goTo).
// The Forward Stats part has a "Data Sources" table: one row per connector, totals over the picked date range
// (default: last 7 days). Clicking a connector's name drills into its "Data Pipelines" table.
import { Page, expect } from '@playwright/test';
import { errorToast } from './toast';

export const dashboard = (page: Page) => ({
  forwardStats: page.getByText('Forward Stats', { exact: true }),
  dataSourcesTitle: page.getByRole('heading', { name: 'Data Sources', exact: true }),
  // The table with a "Reports Configured" column (other tables on the page don't have it)
  dataSourcesTable: page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Reports Configured' }) }),
  // Clicking a connector's name in Data Sources drills into its "Data Pipelines" table (back arrow returns)
  connectorLink: (connector: string) =>
    page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Reports Configured' }) }).getByText(connector, { exact: true }),
  pipelinesTitle: page.getByRole('heading', { name: 'Data Pipelines', exact: true }),
  pipelinesTable: page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Data Pipeline Name' }) }),
  // Error Details: failed / errored / partial runs of the date range, one card per pipeline (and error kind),
  // each with "ID- <id>", the pipeline name, View Logs, Status label and "Error Time"
  errorSearch: page.getByRole('textbox', { name: 'Search for Pipeline or Datasource' }),
  errorCard: (pipeline: string) =>
    page.locator('div').filter({ has: page.getByText(pipeline, { exact: true }) }).filter({ has: page.getByText('Error Time', { exact: true }) }).last(),
  // The app's error toasts, shown when one of the dashboard's API calls fails
  errorToast: errorToast(page),
});

// Wait until the Data Sources table has rows, or fail at once if the dashboard shows its error toast.
export async function dataSourcesLoaded(page: Page) {
  const d = dashboard(page);
  await expect
    .poll(
      async () => {
        if (await d.errorToast.first().isVisible()) return 'error';
        return (await d.dataSourcesTable.getByRole('row').count()) > 1 ? 'rows' : 'loading';
      },
      { timeout: 60_000, message: 'Dashboard Data Sources table never loaded' },
    )
    .not.toBe('loading');
  if (await d.errorToast.first().isVisible())
    throw new Error(`Dashboard shows "${(await d.errorToast.first().innerText()).trim()}" (an API call behind it failed)`);
}
