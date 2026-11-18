// Action: run an orchestration now ("Run Orchestration"). The app answers by opening a live "Tasks execution for
// <name> orchestration:" popup: that is the proof it started. The popup stays open (the checks read it).
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { log } from '../core/log';
import { orchestration } from '../pages/orchestration';

export default defineTask({
  description: 'On an orchestration\'s page, press "Run Orchestration" and expect its live tasks popup.',
  inputs: {
    orchestration: { required: true, description: 'Orchestration name' },
  },
  screen: i => ({ screen: 'orchestration', orchestration: i.orchestration }),
  async run(page, { orchestration: name }) {
    const o = orchestration(page);
    await o.runBtn.click();
    await expect(page.getByText(`Tasks execution for ${name} orchestration:`, { exact: true })).toBeVisible({ timeout: 30_000 });
    log(`    "${name}" started: tasks popup shown`);
    return { orchestration: name };
  },
});
