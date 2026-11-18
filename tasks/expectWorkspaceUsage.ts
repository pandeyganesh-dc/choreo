// Check: Settings → Workspaces → select a workspace → its usage cards load (Successful Runs, reports, errors,
// data/rows moved), with no error toast. Lower bounds only (other people's runs add to them): at least `minSuccess`
// successful runs and at least 1 configured report in the shown date range (last 7 days).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { atLeast } from '../core/errors';
import { log } from '../core/log';
import { expectNoErrorToast } from '../pages/toast';

export default defineTask({
  description:
    'On Settings → Workspaces, select a workspace and expect its usage cards to load (no error toast), with Successful Runs ≥ minSuccess and reports configured ≥ 1.',
  inputs: {
    workspace: { required: true, description: 'Workspace name as shown, e.g. Default' },
    minSuccess: { default: '1', description: 'At least this many successful runs in the last 7 days' },
  },
  screen: () => ({ screen: 'settings', tab: 'Workspaces', fresh: true }),
  async run(page, { workspace, minSuccess }) {
    const panel = page.getByRole('tabpanel', { name: 'Workspaces' });
    await panel.getByText(workspace, { exact: true }).first().click();
    const card = (msg: string) => panel.getByText(msg, { exact: true });
    // The cards appear only when both stats calls behind them answered
    const shown = await card('Successful Runs')
      .waitFor({ timeout: 30_000 })
      .then(() => true, () => false);
    await expectNoErrorToast(page, `Settings → Workspaces → ${workspace}`);
    if (!shown) throw new Error(`Settings → Workspaces → ${workspace}: usage cards never appeared (still "${(await panel.innerText()).match(/Select a workspace[^\n]*/)?.[0] ?? 'no cards'}")`);

    // Each card: its number is the text just before its message
    const value = async (msg: string) => {
      const box = panel.locator('div').filter({ has: card(msg) }).last();
      return (await box.innerText()).replace(msg, '').trim();
    };
    const seen = { success: await value('Successful Runs'), reports: await value('Total reports configured'), errors: await value('Runs with errors + Partial Success Runs') };
    log(`    workspace "${workspace}" cards: ${JSON.stringify(seen)}`);
    atLeast(Number(seen.success), Number(minSuccess), `Workspace "${workspace}" shows fewer Successful Runs than we just made`);
    atLeast(Number(seen.reports), 1, `Workspace "${workspace}" shows no configured reports`);
    return { workspace, ...seen };
  },
});
