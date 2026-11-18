// The one Playwright test file: runs exactly one flow (FLOW), each step a report step.
// The CLI (core/cli.ts) sets FLOW / FLOW_PARAMS. Without FLOW nothing runs, on purpose:
// flows change shared d-l state, so they must never all run together.
import { test as base, Page } from '@playwright/test';
import { attachLive, detachLive } from './browser';
import { loadTasks, loadFlows, checkFlow, isForEach, isRequired, Step, Flow } from './load';
import { ensureLoggedIn } from './login';
import { goTo, whereAmI, describe, screenName } from '../pages/screens';
import { startRunLog, log, brief, runDir } from './log';
import { explain, render, Trail } from './errors';
import fs from 'fs';
import path from 'path';

// --watch: work in the live choreo window (core/browser.ts), which stays open after the run.
// Headless: a fresh browser per run, as Playwright gives it.
const live = process.env.CHOREO_LIVE === '1';
const test = live
  ? base.extend<{ page: Page }>({
      page: async ({}, use) => {
        const { browser, page, how } = await attachLive();
        console.log(`choreo window: ${how}`);
        log(`choreo window: ${how}`);
        await use(page);
        await detachLive(browser);
      },
    })
  : base;

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
async function runFlow(page: Page, flow: Flow, input: Record<string, any>, prefix: string, chain: string[]) {
  const vars: Record<string, any> = {};
  for (const [k, v] of Object.entries(flow.params)) if (!isRequired(v)) vars[k] = v;
  Object.assign(vars, input);
  await runSteps(page, flow.steps, vars, prefix, chain);
  return Object.fromEntries(Object.entries(flow.outputs).map(([k, v]) => [k, resolve(v, vars)]));
}

// Runs one task or flow with its inputs ($refs resolved) and returns its result
async function runCall(page: Page, at: string, call: string, raw: Record<string, any>, vars: Record<string, any>, chain: string[]) {
  const input: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) input[k] = resolve(v, vars);

  let result: Record<string, any> | void;
  const flow = lib.flows[call];
  const t0 = Date.now();
  const here = [...chain, `step ${at} · ${call}`];
  // The innermost step that fails records where it was (outer steps leave it alone)
  const mark = (e: any, input: Record<string, any>) => {
    if (e && typeof e === 'object' && !e.trail)
      e.trail = { flow: only, chain: here, step: at, call, description: flow?.description ?? lib.tasks[call]?.description, input } as Trail;
    return e;
  };
  if (flow) {
    log(`step ${at} ${call} [flow] start ${brief(input)}`);
    result = await test.step(`${at}. ${call} [flow]${show(input)}`, () =>
      runFlow(page, flow, input, `${at}.`, here).catch(e => {
        throw mark(e, input);
      }),
    );
  } else {
    const task = lib.tasks[call];
    const full: Record<string, any> = {};
    for (const [k, spec] of Object.entries(task.inputs)) if (spec.default !== undefined) full[k] = spec.default;
    Object.assign(full, input);
    log(`step ${at} ${call} start ${brief(full)}`);
    result = await test.step(`${at}. ${call}${show(full)}`, async () => {
      try {
        if (task.screen) await goTo(page, task.screen(full), line => console.log(`${at}. ${call}${line}`));
        return await task.run(page, full);
      } catch (e) {
        log(`step ${at} ${call} FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${(e as Error)?.stack ?? e}`);
        throw mark(e, full);
      }
    });
  }
  log(`step ${at} ${call} done in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${brief(result ?? {})}`);
  return result ?? {};
}

// Runs steps in order, numbered 1, 2, … A called flow's steps nest under it (3.1, 3.2, …);
// inside a forEach at step 2 they are 2.<item>.<step>, e.g. 2.3.1
async function runSteps(page: Page, steps: Step[], vars: Record<string, any>, prefix: string, chain: string[]) {
  let n = 0;
  for (const s of steps) {
    const at = `${prefix}${++n}`;

    if (isForEach(s)) {
      const list = resolve(s.forEach, vars);
      if (!Array.isArray(list)) throw new Error(`forEach: "${s.forEach}" is not a list (got ${JSON.stringify(list)})`);
      log(`step ${at} forEach ${s.forEach}: ${list.length} items ${brief(list)}`);
      await test.step(`${at}. forEach ${s.forEach} (${list.length} items)`, async () => {
        for (const [i, item] of list.entries()) await runSteps(page, s.steps, { ...vars, [s.as]: item }, `${at}.${i + 1}.`, [...chain, `step ${at} · item ${i + 1}`]);
      });
      continue;
    }

    let result = await runCall(page, at, s.call, s.input, vars, chain);
    // Found nothing: make it instead (orElse), and use that under the same name
    if (s.orElse && result?.found === false) {
      log(`step ${at} ${s.call} found nothing → orElse ${s.orElse.call}`);
      result = await runCall(page, `${at}e`, s.orElse.call, s.orElse.input, vars, chain);
    }
    if (s.as) vars[s.as] = result ?? {};
  }
}

const flow = only ? lib.flows[only] : undefined;

if (flow) {
  test(flow.name, async ({ page }) => {
    const dir = startRunLog(flow.name, { params: given, baseURL: test.info().project.use.baseURL, headed: process.env.CHOREO_HEADED === '1' });
    console.log(`log: ${path.relative(process.cwd(), dir)}/run.log`);
    page.on('pageerror', e => log(`browser error: ${e.message}`));
    page.on('dialog', d => log(`browser dialog (${d.type()}): ${d.message()}`));
    page.on('response', r => {
      if (r.status() >= 400) log(`http ${r.status()} ${r.request().method()} ${r.url()}`);
    });

    const errors = checkFlow(flow, lib, given);
    if (errors.length) throw new Error(`Flow "${flow.name}" is invalid:\n  - ${errors.join('\n  - ')}`);

    // Everything below happens in this one window, login included, through every called flow
    await test.step('0. login (skipped if already logged in)', () => ensureLoggedIn(page));

    try {
      const out = await runFlow(page, flow, given, '', [flow.name]);
      log(`run PASSED → ${brief(out)}`);
    } catch (e) {
      // What the screen looked like when it failed: where choreo thinks it is, a screenshot, and the page as text
      log(`run FAILED: ${(e as Error)?.message ?? e}`);
      let screen: string | undefined;
      await whereAmI(page)
        .then(w => {
          screen = screenName(w);
          log(`at failure: ${describe(w)}`);
        })
        .catch(() => {});
      const d = runDir()!;
      await page.screenshot({ path: path.join(d, 'failure.png') }).catch(() => {});
      await page
        .locator('body')
        .ariaSnapshot()
        .then(snap => fs.writeFileSync(path.join(d, 'failure-page.yaml'), snap))
        .catch(() => {});
      log(`saved failure.png and failure-page.yaml in ${d}`);
      // The readable report: printed, kept in the run log, and handed to Playwright instead of a stack trace
      const rel = (f: string) => path.relative(process.cwd(), path.join(d, f));
      const report = render(explain(e), (e as any)?.trail, screen, [rel('failure.png'), rel('run.log')]);
      log(`report:\n${report}`);
      const pretty = new Error(report);
      pretty.stack = report;
      throw pretty;
    }
  });
}
