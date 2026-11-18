// Check: in an orchestration's newest run (its tasks popup → Task Runs), the task for a pipeline has the expected
// status, and its Rows Moved agrees with the pipeline's own run (pass rows; leave out to skip).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { same } from '../core/errors';
import { log } from '../core/log';
import { newestRunTasks } from '../pages/orchestration';
import { readRow, uiNumber } from '../pages/table';

export default defineTask({
  description: "In an orchestration's newest run (tasks popup), expect the pipeline task's status (and Rows Moved, if given).",
  inputs: {
    orchestration: { required: true, description: 'Orchestration name' },
    pipeline: { required: true, description: 'The task (pipeline) name' },
    status: { default: 'SUCCESS', description: 'Expected task status, as the UI shows it' },
    rows: { description: 'Expected Rows Moved; leave out to skip' },
  },
  screen: i => ({ screen: 'orchestration', orchestration: i.orchestration }),
  async run(page, { orchestration: name, pipeline, status, rows }) {
    const run = await newestRunTasks(page);
    const row = run.table.getByRole('row').filter({ has: page.getByRole('heading', { name: pipeline, exact: true }) }).first();
    await expect(row, `"${name}" task "${pipeline}"`).toBeVisible();
    const col = await readRow(run.table, row);
    const seen = { run: await run.status(), status: col('Status'), rows: col('Rows Moved'), data: col('Data Moved'), logs: col('Logs') };
    log(`    "${name}" task "${pipeline}": ${JSON.stringify(seen)}`);
    same(seen.status, status, `In orchestration "${name}", the task "${pipeline}" ended as ${seen.status}` + (seen.run && seen.run !== seen.status ? ` (while the run as a whole shows ${seen.run})` : ''),
      'Open the run in Execution History → View Tasks. Developers: the orchestra container log shows the node error.');
    if (rows !== undefined) same(uiNumber(seen.rows, 'task Rows Moved'), uiNumber(String(rows), 'expected rows'), `In orchestration "${name}", the task "${pipeline}" shows a different Rows Moved than its pipeline run`);
    return { orchestration: name, pipeline, ...seen };
  },
});
