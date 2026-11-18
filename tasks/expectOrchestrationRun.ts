// Check: an orchestration's newest run finishes with the expected status (its tasks popup status chip; the popup is
// opened from Execution History → View Tasks if it isn't already open).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { log } from '../core/log';
import { orchestration, newestRunTasks } from '../pages/orchestration';

const IN_PROGRESS = ['QUEUED', 'RUNNING', ''];

export default defineTask({
  description: "Wait for an orchestration's newest run to finish (its tasks popup status), then expect it (e.g. COMPLETED).",
  inputs: {
    orchestration: { required: true, description: 'Orchestration name' },
    status: { default: 'COMPLETED', description: 'Expected final status, as the UI shows it' },
    minutes: { default: '5', description: 'How long to wait' },
  },
  screen: i => ({ screen: 'orchestration', orchestration: i.orchestration }),
  async run(page, { orchestration: name, status, minutes }) {
    const o = orchestration(page);
    let current = '';
    await expect
      .poll(
        async () => {
          // Reopen each time: the popup shows the status as of when it opened
          if (await o.tasksTitle.isVisible()) await o.closePopup.click();
          const run = await newestRunTasks(page);
          current = (await run.status()).toUpperCase();
          log(`    "${name}" newest run: ${current}`);
          return IN_PROGRESS.includes(current);
        },
        { timeout: Number(minutes) * 60_000, intervals: [3_000, 5_000], message: `"${name}" run did not finish in ${minutes} min` },
      )
      .toBe(false);
    expect(current, `"${name}" newest run status`).toBe(status);
    return { orchestration: name, status: current };
  },
});
