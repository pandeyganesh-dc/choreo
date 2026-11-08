// Selectors for the "Create Data Pipeline" wizard: /datasource/<connector>/report/new
// Steps: 1 pick a pipeline type → 2 report details (fields) → 3 scheduling → 4 dataset name.
import { Page } from '@playwright/test';

export const pipelineNew = (page: Page) => ({
  open: (connector: string) => page.goto(`/datasource/${connector}/report/new`, { waitUntil: 'networkidle' }),

  // Step 1: each pipeline type is a card whose title is a level-3 heading (e.g. "Regular")
  typeCard: (type: string) => page.getByRole('heading', { name: type, exact: true, level: 3 }),
  // Step 1 has a Next button above and below the cards; later steps have one
  nextBtn: page.getByRole('button', { name: 'Next', exact: true }).first(),

  // Step 2: the "Add All" button's accessible name is its aria-label
  addAllFields: page.getByRole('button', { name: 'move all right' }),

  // Step 3
  manualRunOnly: page.getByRole('switch', { name: 'Manual Run Only' }),

  // Step 4
  datasetName: page.getByRole('textbox', { name: 'Dataset Name' }),
  runAfterSave: page.getByRole('checkbox', { name: 'Run after save' }),
  submitBtn: page.getByRole('button', { name: 'Submit', exact: true }),
  added: page.getByRole('alert').filter({ hasText: 'Configured Data Pipeline added successfully' }),
});
