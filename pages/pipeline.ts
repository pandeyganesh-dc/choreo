// Selectors for one configured pipeline's page. Getting there is pages/screens.ts (goTo).
import { Page, expect } from '@playwright/test';

export const pipeline = (page: Page) => ({
  title: (name: string) => page.getByRole('heading', { name: `(${name})`, exact: true }),
  runBtn: page.getByRole('button', { name: 'Run Pipeline', exact: true }),
  // Header text "(Last Run - SUCCESS)", "(Last Run - QUEUED)", "(Last Run - No Run Initiated)" ...
  lastRun: page.getByText(/^\(Last Run - .*\)$/),
  runStarted: page.getByRole('alert').filter({ hasText: 'Configured data pipeline run was successful' }),
  // "Number Of Runs" tab has the app's own refresh button (no browser reload needed)
  runsTab: page.getByRole('tab', { name: 'Number Of Runs' }),
  refreshBtn: page.getByRole('button', { name: 'Refresh Page' }),
  // SetUp tab: saved settings are read-only until you click the field's pencil icon ("Edit Field" tooltip).
  // Editing shows a ✓ (CheckIcon, saves) and ✗ (ClearIcon) above the box.
  setupTab: page.getByRole('tab', { name: 'SetUp', exact: true }),
  textField: (label: string) => page.getByRole('textbox', { name: label, exact: true }),
  // One field's block: its heading ("Run*- tooltip") plus its box
  fieldBlock: (label: string) =>
    page.locator('div')
      .filter({ has: page.getByRole('heading', { name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?-`) }) })
      .filter({ has: page.getByRole('textbox', { name: label, exact: true }) })
      .last(),
  editFieldIcon: page.getByLabel('Edit Field'),
  saveFieldIcon: page.getByTestId('CheckIcon'),
  edited: page.getByRole('alert').filter({ hasText: 'Report edited successfully.' }),
});

// Reads the status from "(Last Run - X)", e.g. "SUCCESS".
export async function lastRunStatus(page: Page) {
  const text = await pipeline(page).lastRun.innerText();
  return text.replace(/^\(Last Run - /, '').replace(/\)$/, '').trim();
}

// "Number Of Runs" tab: the runs list (the tab also draws its graph as a table; the list is the one with "Rows Moved")
export const runsTable = (page: Page) => page.getByRole('tabpanel').getByRole('table').filter({ hasText: 'Rows Moved' });

// The latest run's row, read like a person reads the table: columns found by their headers.
// Returns undefined when the table shows no runs.
export async function latestRun(page: Page) {
  const table = runsTable(page);
  // The pager says how many runs there are ("Showing 0-1 of 1 records"). With none, the list has no columns at all.
  // Loaded when its spinners are gone (before that the pager says 0 even when there are runs)
  await expect(page.getByRole('tabpanel').getByRole('progressbar')).toHaveCount(0, { timeout: 30_000 });
  const pager = page.getByRole('tabpanel').getByText(/^Showing .* of \d+ records$/);
  await pager.waitFor();
  const total = Number((await pager.innerText()).match(/of (\d+) records/)![1]);
  if (total === 0) return undefined;
  await table.waitFor();
  const headers = (await table.getByRole('columnheader').allInnerTexts()).map(h => h.trim());
  const rows = table.getByRole('row');
  if ((await rows.count()) < 2) return undefined;
  const cells = (await rows.nth(1).getByRole('cell').allInnerTexts()).map(c => c.trim());
  const col = (name: string) => {
    const i = headers.indexOf(name);
    if (i < 0) throw new Error(`Runs table has no "${name}" column: ${headers.join(', ')}`);
    return cells[i];
  };
  return {
    // Start Time identifies a run on screen
    id: `${col('Start Time')} ${col('Run Type')}`,
    status: col('Status'),
    rowsMoved: col('Rows Moved'),
    dataMoved: col('Data Moved'),
  };
}

// "View Logs" on a run opens an "ETL Run Logs" popup: a log viewer with its own Search box and "N matches".
// The viewer only renders visible lines, so search it (like a user would) instead of reading its text.
export const runLogs = (page: Page) => ({
  openLatest: () => runsTable(page).getByRole('row').nth(1).getByRole('button', { name: 'View Logs' }),
  title: page.getByText('ETL Run Logs:', { exact: true }),
  search: page.getByRole('textbox', { name: 'Search', exact: true }),
  matches: page.getByText(/^\d+ match(es)?$/),
  close: page.getByTestId('CloseIcon'),
});
