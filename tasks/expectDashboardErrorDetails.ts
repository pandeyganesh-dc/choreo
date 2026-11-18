// Check: Dashboard → Error Details lists our pipeline's failed run (searched by name), at its time.
// Deterministic in a busy environment: we look for OUR pipeline's card only, and compare with its own runs tab.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { near, fail } from '../core/errors';
import { log } from '../core/log';
import { dashboard } from '../pages/dashboard';
import { uiTime } from '../pages/table';

const SKEW_MS = 10_000;

export default defineTask({
  description:
    "On the Dashboard's Error Details, search our pipeline and expect its card, with Error Time at our failed run's start (± a few s).",
  inputs: {
    pipeline: { required: true, description: 'Pipeline whose latest run failed (ERROR / FAILED / PARTIAL SUCCESS)' },
    runAt: { required: true, description: "That run's Start Time, from readLatestRun (startTime)" },
  },
  screen: () => ({ screen: 'dashboard', fresh: true }),
  async run(page, { pipeline, runAt }) {
    const d = dashboard(page);
    // Its search box matches the report type and datasource, not the pipeline name shown on the cards (same on
    // develop), so page through the cards like a user would
    const card = d.errorCard(pipeline);
    await expect(page.getByText('Error Details', { exact: true })).toBeVisible({ timeout: 30_000 });
    const pager = page.getByText('Error Details', { exact: true }).locator('xpath=following::nav[1]');
    for (let p = 1; p <= 20 && !(await card.isVisible()); p++) {
      const next = pager.getByRole('button', { name: 'Go to next page' });
      if (!(await next.isEnabled())) break;
      await next.click();
    }
    if (!(await card.isVisible()))
      throw fail({ title: `Error Details doesn't list the failed run of "${pipeline}"`, expected: `a card for "${pipeline}"`, found: 'no card on any page', hint: 'Only runs that ended ERROR, FAILED or PARTIAL SUCCESS in the last 7 days are listed.' });
    const text = (await card.innerText()).replace(/\s+/g, ' ');
    const time = text.match(/Error Time (\d{4}-\d{2}-\d{2},? \d{1,2}:\d{2}:\d{2} ?[AP]M)/i)?.[1];
    const label = text.match(/Status (.*?) Suggested Action/)?.[1];
    log(`    Error Details "${pipeline}": label "${label}", time ${time}; our run at ${runAt}`);
    if (!time) throw new Error(`Error Details card for "${pipeline}" shows no Error Time: "${text.slice(0, 200)}"`);
    near(uiTime(time, 'Error Time'), uiTime(String(runAt), 'runs tab Start Time'), SKEW_MS, time, String(runAt),
      `Error Details shows "${pipeline}" failing at a different time than its failed run`);
    return { pipeline, label, time };
  },
});
