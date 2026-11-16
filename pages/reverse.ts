// Reverse ETL: destinations (e.g. "GoogleSheets Export") and the "Create Data Sync" wizard.
// Wizard steps: 1 Credentials → 2 Syncs (type, e.g. "Export") → 3 Sync Details (differs per destination + sync)
//               → 4 Scheduling → 5 Sync Name.
import { Page } from '@playwright/test';

// A destination's own page, and the sync wizard opened from it
export const destination = (page: Page) => ({
  title: (name: string) => page.getByRole('heading', { name, exact: true, level: 2 }),
  addSyncBtn: page.getByRole('button', { name: '+ Data Sync' }),

  // Step 1: credentials are cards; the name is a paragraph on the card
  credential: (name: string) => page.getByRole('paragraph').filter({ hasText: new RegExp(`^${esc(name)}$`) }),
  // Step 2: each sync type is a card titled with a level-3 heading
  syncType: (name: string) => page.getByRole('heading', { name, exact: true, level: 3 }),
  nextBtn: page.getByRole('button', { name: 'Next', exact: true }),
  // Step 3
  syncConfigHeading: page.getByRole('heading', { name: 'Enter Sync Configuration' }),
  // Step 4
  manualRunOnly: page.getByRole('switch', { name: 'Manual Run Only' }),
  // Step 5
  syncName: page.getByRole('textbox', { name: 'Dataset Name' }),
  runAfterSave: page.getByRole('checkbox', { name: 'Run after save' }),
  submitBtn: page.getByRole('button', { name: 'Submit', exact: true }),
  added: page.getByRole('alert').filter({ hasText: 'Configured Sync Added Successfully' }),

  // Configured Syncs tab
  configuredTab: page.getByRole('tab', { name: 'Configured Syncs' }),
  syncSearch: page.getByRole('tabpanel', { name: 'Configured Syncs' }).getByRole('textbox', { name: 'Search Data Source or Records' }),
  syncLink: (name: string) => page.getByRole('tabpanel', { name: 'Configured Syncs' }).getByRole('link', { name, exact: true }),

  // A configured sync's own page (opened from Configured Syncs)
  syncTitle: (name: string) => page.getByRole('heading', { name: `(${name})`, exact: true }),
  runSyncBtn: page.getByRole('button', { name: 'Run Sync', exact: true }),
  lastRun: page.getByText(/^\(Last Run - .*\)$/),
  // Shown once the run is triggered (not when it finishes)
  runStarted: page.getByRole('alert').filter({ hasText: 'Configured sync run was successful.' }),
});

export const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

