// The one Playwright test file: runs exactly one flow (FLOW), each step a report step.
// The CLI (core/cli.ts) sets FLOW / FLOW_PARAMS. Without FLOW nothing runs, on purpose:
// flows change shared d-l state, so they must never all run together.
import { test, Page } from '@playwright/test';
import { loadTasks, loadFlows, checkFlow, isForEach, isRequired, Step, Flow } from './load';
import { ensureLoggedIn } from './login';
import { goTo } from '../pages/screens';

const lib = { tasks: loadTasks(), flows: loadFlows() };
const only = process.env.FLOW;
const given: Record<string, string> = JSON.parse(process.env.FLOW_PARAMS || '{}');

const resolve = (v: any, vars: Record<string, any>) => {
  if (typeof v !== 'string' || !v.startsWith('$')) return v;
  const [head, ...path] = v.slice(1).split('.');
  return path.reduce((o, k) => o?.[k], vars[head]);
};

const show = (input: Record<string, any>) => {
  const s = Object.entries(input)
    .filter(([k]) => !/password/i.test(k))
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  return s ? ` (${s})` : '';
};

// Runs a flow with the given inputs and returns its outputs.
// It sees only its own params (defaults + what was passed in), never the caller's variables.
async function runFlow(page: Page, flow: Flow, input: Record<string, any>, prefix: string) {
  const vars: Record<string, any> = {};
  for (const [k, v] of Object.entries(flow.params)) if (!isRequired(v)) vars[k] = v;
  Object.assign(vars, input);
  await runSteps(page, flow.steps, vars, prefix);
  return Object.fromEntries(Object.entries(flow.outputs).map(([k, v]) => [k, resolve(v, vars)]));
}

// Runs steps in order, numbered 1, 2, … A called flow's steps nest under it (3.1, 3.2, …);
// inside a forEach at step 2 they are 2.<item>.<step>, e.g. 2.3.1
async function runSteps(page: Page, steps: Step[], vars: Record<string, any>, prefix: string) {
  let n = 0;
  for (const s of steps) {
    const at = `${prefix}${++n}`;

    if (isForEach(s)) {
      const list = resolve(s.forEach, vars);
      if (!Array.isArray(list)) throw new Error(`forEach: "${s.forEach}" is not a list (got ${JSON.stringify(list)})`);
      await test.step(`${at}. forEach ${s.forEach} (${list.length} items)`, async () => {
        for (const [i, item] of list.entries()) await runSteps(page, s.steps, { ...vars, [s.as]: item }, `${at}.${i + 1}.`);
      });
      continue;
    }

    const input: Record<string, any> = {};
    for (const [k, v] of Object.entries(s.input)) input[k] = resolve(v, vars);

    let result: Record<string, any> | void;
    const flow = lib.flows[s.call];
    if (flow) {
      result = await test.step(`${at}. ${s.call} [flow]${show(input)}`, () => runFlow(page, flow, input, `${at}.`));
    } else {
      const task = lib.tasks[s.call];
      const full: Record<string, any> = {};
      for (const [k, spec] of Object.entries(task.inputs)) if (spec.default !== undefined) full[k] = spec.default;
      Object.assign(full, input);
      result = await test.step(`${at}. ${s.call}${show(full)}`, async () => {
        if (task.screen) await goTo(page, task.screen(full), line => console.log(`${at}. ${s.call}${line}`));
        return task.run(page, full);
      });
    }
    if (s.as) vars[s.as] = result ?? {};
  }
}

const flow = only ? lib.flows[only] : undefined;

if (flow) {
  test(flow.name, async ({ page }) => {
    const errors = checkFlow(flow, lib, given);
    if (errors.length) throw new Error(`Flow "${flow.name}" is invalid:\n  - ${errors.join('\n  - ')}`);

    // Everything below happens in this one window, login included, through every called flow
    await test.step('0. login (skipped if the saved session is valid)', () => ensureLoggedIn(page));

    await runFlow(page, flow, given, '');
  });
}
