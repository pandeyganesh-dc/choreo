// choreo's terminal output: a live list of steps (✓ / ✗ with durations), then either "passed" or the readable error
// report (core/errors.ts) once. Playwright's own HTML report is still written (npm run report).
import type { Reporter, TestCase, TestResult, TestStep, FullResult } from '@playwright/test/reporter';
import path from 'path';

const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const took = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

// Depth of a flow step: only our own steps count ("1. x", "1.2. y"), not Playwright's internal ones
const depth = (step: TestStep) => {
  let d = 0;
  for (let s = step.parent; s; s = s.parent) if (s.category === 'test.step') d++;
  return d;
};

export default class ChoreoReporter implements Reporter {
  onTestBegin(test: TestCase) {
    console.log(`\n${bold('▶')} ${bold(test.title)}\n`);
  }

  onStdOut(chunk: string | Buffer) {
    // dim each line on its own, so the colour never leaks onto the next line
    process.stdout.write(String(chunk).replace(/[^\n]+/g, l => dim(l)));
  }

  onStdErr(chunk: string | Buffer) {
    process.stderr.write(String(chunk));
  }

  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category !== 'test.step') return;
    const pad = '  '.repeat(depth(step) + 1);
    const mark = step.error ? red('✗') : green('✓');
    console.log(`${pad}${mark} ${step.title} ${dim(took(step.duration))}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'passed') {
      console.log(`\n${green('✔ passed')} ${bold(test.title)} ${dim(`in ${took(result.duration)}`)}\n`);
      return;
    }
    // Our report is the error's message (core/flows.spec.ts); anything else is shown as is
    const msg = String(result.error?.message ?? result.error?.value ?? result.status).replace(/^Error:\s*/, '');
    console.log(`\n${msg}\n`);
    const trace = result.attachments.find(a => a.name === 'trace')?.path;
    if (trace) console.log(dim(`   for devs: npx playwright show-trace ${path.relative(process.cwd(), trace)}\n`));
  }

  onEnd(result: FullResult) {
    if (result.status === 'timedout') console.log(red('✗ the flow ran out of time (timeout in playwright.config.ts)'));
  }

  printsToStdio() {
    return true;
  }
}
