// Action: start a backfill run of a pipeline (Back Fill tab → Custom Run: Start Date, End Date → Run).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { log } from '../core/log';
import { pipeline as pipelinePage } from '../pages/pipeline';

// "today" / "today-1" / "2026-11-17" -> "2026-11-17" (the date inputs take YYYY-MM-DD)
const day = (v: string) => {
  const m = String(v).match(/^today(?:-(\d+))?$/);
  if (!m) return String(v);
  const d = new Date(Date.now() - Number(m[1] ?? 0) * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default defineTask({
  description:
    "On a pipeline's Back Fill tab, run a backfill for a date range and expect the app to accept it. Returns { from, to, before } (before = Backfill Runs count before).",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
    from: { default: 'today-1', description: 'Start date: YYYY-MM-DD, "today" or "today-N"' },
    to: { default: 'today', description: 'End date: YYYY-MM-DD, "today" or "today-N"' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Back Fill' }),
  async run(page, { pipeline, from, to }) {
    const p = pipelinePage(page);
    await expect(p.backfillPager).toBeVisible();
    const before = Number((await p.backfillPager.innerText()).match(/of (\d+) records/)![1]);
    const range = { from: day(from), to: day(to) };
    await p.backfillStart.fill(range.from);
    await p.backfillEnd.fill(range.to);
    await p.backfillRunBtn.click();
    // The app answers with a toast either way
    await expect(p.backfillStarted.or(p.backfillRejected)).toBeVisible();
    if (await p.backfillRejected.isVisible()) throw new Error(`Backfill of "${pipeline}" ${range.from}..${range.to} was rejected by the app`);
    log(`    backfill ${range.from}..${range.to} accepted; Backfill Runs had ${before}`);
    return { pipeline, ...range, before };
  },
});
