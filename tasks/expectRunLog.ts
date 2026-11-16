// Check: the latest run's logs (View Logs) contain a text, e.g. an error a QA person would look for.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { runLogs, latestRun } from '../pages/pipeline';
import { log } from '../core/log';

export default defineTask({
  description: "On a pipeline's Number Of Runs tab: View Logs of the latest run → search `text` → expect at least one match. Closes the logs after.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    text: { required: true, description: 'Text to find in the logs, e.g. SCHEMA_DRIFT' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Number Of Runs' }),
  async run(page, { pipeline, text }) {
    const run = await latestRun(page);
    if (!run) throw new Error(`"${pipeline}" has no runs`);
    const l = runLogs(page);
    await l.openLatest().click();
    await expect(l.title).toBeVisible();

    // The viewer's search reacts to key presses (not a pasted value), and the log may still be loading:
    // type it like a person, and retype while it finds nothing
    let found = 0;
    await expect
      .poll(
        async () => {
          await l.search.fill('');
          await l.search.pressSequentially(text, { delay: 20 });
          await expect(l.matches).toBeVisible();
          found = parseInt(await l.matches.innerText(), 10);
          return found;
        },
        { message: `"${text}" in the logs of ${run.id}`, intervals: [1_000, 2_000] },
      )
      .toBeGreaterThan(0);
    log(`  logs of ${run.id}: "${text}" → ${found} matches`);

    await l.close.click();
    await expect(l.title).toBeHidden();
    return { pipeline, run: run.id, text, matches: found };
  },
});
