// Check: on a pipeline's "Number Of Runs" tab, expect what its latest run moved.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { latestRun } from '../pages/pipeline';

// "1,234" -> 1234. A cell without a number (e.g. "-" when the run saved no result) is an error, not 0.
const toNumber = (text: string, what: string) => {
  const digits = text.replace(/[^\d.]/g, '');
  if (!digits) throw new Error(`${what} shows "${text.trim()}", not a number`);
  return Number(digits);
};

export default defineTask({
  description:
    "On a pipeline's Number Of Runs tab, expect the latest run's Rows Moved (exact) and Data Moved (more than 0). Returns { rows, data }.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    rows: { required: true, description: 'Expected Rows Moved of the latest run as the UI shows it, e.g. 1, or "-" (shown for 0)' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Number Of Runs' }),
  async run(page, { pipeline, rows }) {
    const run = await latestRun(page);
    if (!run) throw new Error(`"${pipeline}" has no runs`);
    const what = `"${pipeline}" latest run`;

    // The runs tab shows "-" instead of 0 (as on develop), so "-" is a valid expectation
    if (String(rows) === '-') expect(run.rowsMoved, `${what} Rows Moved`).toBe('-');
    else expect(toNumber(run.rowsMoved, `${what} Rows Moved`), `${what} Rows Moved`).toBe(Number(rows));

    const data = toNumber(run.dataMoved, `${what} Data Moved`);
    expect(data, `${what} Data Moved`).toBeGreaterThan(0);
    return { pipeline, rows: run.rowsMoved, data };
  },
});
