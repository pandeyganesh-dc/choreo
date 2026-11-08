// The one Playwright test file: runs exactly one flow (FLOW), each step a report step.
// The CLI (core/cli.ts) sets FLOW / FLOW_PARAMS. Without FLOW nothing runs, on purpose:
// flows change shared d-l state, so they must never all run together.
import { test } from '@playwright/test';
import { loadTasks, loadFlows, checkFlow } from './load';
import { ensureLoggedIn } from './login';

const tasks = loadTasks();
const flows = loadFlows();
const only = process.env.FLOW;
const given: Record<string, string> = JSON.parse(process.env.FLOW_PARAMS || '{}');

const resolve = (v: any, vars: Record<string, any>) => {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  const [head, ...path] = v.slice(1).split('.');
  return path.reduce((o, k) => o?.[k], vars[head]);
};

const flow = only ? flows[only] : undefined;

if (flow) {
  test(flow.name, async ({ page }) => {
    const errors = checkFlow(flow, tasks, given);
    if (errors.length) throw new Error(`Flow "${flow.name}" is invalid:\n  - ${errors.join('\n  - ')}`);

    // Everything below happens in this one window, login included
    await test.step('0. login (skipped if the saved session is valid)', () => ensureLoggedIn(page));

    const vars: Record<string, any> = { ...flow.params, ...given };
    for (const [i, s] of flow.steps.entries()) {
      const task = tasks[s.task];
      const input: Record<string, any> = {};
      for (const [k, spec] of Object.entries(task.inputs)) if (spec.default !== undefined) input[k] = spec.default;
      for (const [k, v] of Object.entries(s.input)) input[k] = resolve(v, vars);

      const shown = Object.entries(input).filter(([k]) => !/password/i.test(k)).map(([k, v]) => `${k}=${v}`).join(', ');
      const result = await test.step(`${i + 1}. ${s.task}${shown ? ` (${shown})` : ''}`, () => task.run(page, input));
      if (s.as) vars[s.as] = result ?? {};
    }
  });
}
