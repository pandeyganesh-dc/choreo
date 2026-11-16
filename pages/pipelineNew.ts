// Selectors for the "Create Data Pipeline" wizard (connector page → + Data Pipelines)
// Steps: 1 pick a pipeline type → 2 report details (fields and/or parameters) → 3 scheduling → 4 dataset name.
import { Page } from '@playwright/test';

// Step 2's Fields picker: the innermost block holding both lists and the Add All button
const fieldPicker = (page: Page) =>
  page.locator('div')
    .filter({ has: page.getByRole('button', { name: 'move all right' }) })
    .filter({ has: page.getByRole('list') })
    .last();
// Each list also holds an empty <li> placeholder; real fields are items with a heading (the field name)
const fieldList = (page: Page, i: 0 | 1) =>
  fieldPicker(page).getByRole('list').nth(i).getByRole('listitem').filter({ has: page.getByRole('heading') });

export const pipelineNew = (page: Page) => ({
  // Step 1: each pipeline type is a card whose title is a level-3 heading (e.g. "Regular")
  typeCard: (type: string) => page.getByRole('heading', { name: type, exact: true, level: 3 }),
  // Step 1 has a Next button above and below the cards; later steps have one
  nextBtn: page.getByRole('button', { name: 'Next', exact: true }).first(),

  // Step 2 "Report Details": the part that differs per report. Most reports have a Fields picker:
  // two lists, available (left) and selected (right). Clicking an available field moves it right.
  // The "Add All" button's accessible name is its aria-label. Others have only parameters (dropdowns, text boxes).
  reportDetailsHeading: page.getByRole('heading', { name: 'Enter Report Configuration', exact: true }),
  addAllFields: page.getByRole('button', { name: 'move all right' }),
  availableField: (name: string) => fieldList(page, 0).filter({ has: page.getByText(name, { exact: true }) }),
  selectedField: (name: string) => fieldList(page, 1).filter({ has: page.getByText(name, { exact: true }) }),
  availableFields: fieldList(page, 0),
  selectedFields: fieldList(page, 1),

  // Step 3
  manualRunOnly: page.getByRole('switch', { name: 'Manual Run Only' }),

  // Step 4
  datasetName: page.getByRole('textbox', { name: 'Dataset Name' }),
  runAfterSave: page.getByRole('checkbox', { name: 'Run after save' }),
  submitBtn: page.getByRole('button', { name: 'Submit', exact: true }),
  added: page.getByRole('alert').filter({ hasText: 'Configured Data Pipeline added successfully' }),
  // After Submit: "Congratulations!" with next steps (text only, no button role). "View Run Status" opens the new
  // pipeline on its Number Of Runs tab.
  viewRunStatus: page.getByText('View Run Status', { exact: true }),
});
