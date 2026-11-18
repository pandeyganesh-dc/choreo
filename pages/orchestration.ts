// Selectors for Orchestrations: the list, the editor (Add), and one orchestration's page.
// Getting there is pages/screens.ts (goTo).
import { Page } from '@playwright/test';

import { expect } from '@playwright/test';

export const orchestration = (page: Page) => ({
  // List (with orchestrations: "Create New"; with none: "Add orchestrations")
  createNew: page.getByRole('button', { name: 'Create New' }).or(page.getByRole('button', { name: 'Add orchestrations' })),
  listLink: (name: string) => page.getByRole('link', { name, exact: true }),

  // Editor: the Start node comes with a "Select A Node" panel; picking a type opens a drawer on the right
  nodePicker: page.getByText('Select A Node', { exact: true }),
  nodeType: (type: string) => page.getByText(type, { exact: true }),
  // "Configure Datasource" drawer: 1 data source card → 2 pipeline (by name) → 3 options + Finish
  drawerTitle: (title: string) => page.getByText(title, { exact: true }),
  drawerItem: (name: string) => page.getByText(name, { exact: true }).last(),
  finishBtn: page.getByRole('button', { name: 'Finish' }),
  scheduleSaveBtn: page.getByRole('button', { name: 'Schedule & Save' }),
  nameInput: page.getByPlaceholder('Orchestration Name').or(page.getByLabel('Orchestration Name')).first(),
  manualOnly: page.getByText('Manual Run Only', { exact: true }),
  submitBtn: page.getByRole('button', { name: 'Submit' }),
  // The app's own spelling
  added: page.getByText(/Orc\w+ added successfully/),

  // One orchestration's page
  runBtn: page.getByRole('button', { name: 'Run Orchestration' }),
  historyTab: page.getByRole('tab', { name: 'Execution History' }),
  setupTab: page.getByRole('tab', { name: 'Setup' }),
  // Execution History: runs list (Execution Time, Run Type, Status, View Tasks) and its pager
  runsTable: page.getByRole('tabpanel').getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'View Tasks' }) }),
  runsPager: page.getByRole('tabpanel').getByText(/^Showing .* of \d+ records$/).first(),
  // View Tasks → "Task Runs:" (Name, Start Time, End Time, Rows Moved, Data Moved, Status, Logs)
  tasksTable: page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'Logs' }) }),
  // The run's overall status, shown above its task graph
  tasksTitle: page.getByText(/^Tasks execution for .* orchestration:$/),
  // The tasks popup's close icon (MUI icons carry data-testid)
  closePopup: page.getByTestId('CloseIcon').last(),
});

// The newest run's tasks popup ("Tasks execution for <name> orchestration:" + status chip + Task Runs table).
// The app opens it by itself right after "Run Orchestration" (and keeps it open while the run is live);
// otherwise open it like a user: Execution History → the newest run's View Tasks.
export async function newestRunTasks(page: Page) {
  const o = orchestration(page);
  if (!(await o.tasksTitle.isVisible())) {
    await o.historyTab.click();
    await expect(o.runsTable).toBeVisible();
    await o.runsTable.getByRole('button', { name: 'View Tasks' }).first().click();
  }
  await expect(o.tasksTitle).toBeVisible();
  // The run's status chip sits next to the title
  const status = async () =>
    (await o.tasksTitle.locator('xpath=..').innerText()).replace(/^Tasks execution for .* orchestration:/, '').trim();
  return { status, table: o.tasksTable };
}
