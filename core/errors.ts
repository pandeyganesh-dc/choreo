// Readable failures for people (QA first, devs second), in the spirit of Rust's compiler errors:
// one plain sentence of what went wrong, what was expected vs found, where (flow → step → screen), what to do next,
// and where the evidence is. Tasks can throw fail({...}) with exactly that; any other error (Playwright's expect,
// timeouts, locators) is translated into the same shape by explain().

// ---------- what a task can throw ----------

export type Problem = {
  title: string; // one plain sentence: what went wrong
  expected?: string;
  found?: string;
  hint?: string; // what a person can do next
};

export class Fail extends Error {
  constructor(public problem: Problem) {
    super(problem.title);
  }
}

// throw fail({ title: 'The run ended as ERROR', expected: 'SUCCESS', found: 'ERROR', hint: 'Open View Logs' })
export const fail = (p: Problem) => new Fail(p);

// Where the failure happened, filled in by the runner on the way out
export type Trail = {
  flow: string; // the flow that was run
  chain: string[]; // e.g. ['run_regress_regular', 'step 1 create_pipeline_regress_regular', 'step 1.3 savePipeline']
  step: string; // '1.3'
  call: string; // 'savePipeline'
  description?: string;
  input: Record<string, any>;
};

// ---------- turning Playwright's words into plain ones ----------

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');
const unquote = (s: string) => s.trim().replace(/^"(.*)"$/s, '$1');

// getByRole('button', { name: 'Run', exact: true }) → the "Run" button
export function humanLocator(raw: string): string {
  const s = raw.trim();
  const parts = s.split(/\)\s*\.\s*(?=getBy|locator|filter|first|last|nth)/).map(p => p.trim());
  const last = parts[parts.length - 1];
  const name = last.match(/name:\s*(?:'([^']*)'|"([^"]*)"|\/([^/]*)\/)/);
  const n = name ? name[1] ?? name[2] ?? name[3] : undefined;
  let m;
  if ((m = last.match(/getByRole\('(\w+)'/))) return n ? `the "${n}" ${m[1]}` : `a ${m[1]}`;
  if ((m = last.match(/getByText\((?:'([^']*)'|"([^"]*)"|\/([^/]*)\/)/))) return `the text "${m[1] ?? m[2] ?? m[3]}"`;
  if ((m = last.match(/getByTestId\('([^']*)'/))) return `the ${m[1].replace(/Icon$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()} icon`;
  if ((m = last.match(/getByPlaceholder\('([^']*)'/))) return `the box "${m[1]}"`;
  if ((m = last.match(/getByLabel\('([^']*)'/))) return `the field "${m[1]}"`;
  if ((m = last.match(/locator\('([^']*)'/))) return `the element ${m[1]}`;
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

const secs = (ms: string) => `${Math.round(Number(ms) / 1000)}s`;

// Any error → Problem
export function explain(e: unknown): Problem {
  if (e instanceof Fail) return e.problem;
  const msg = strip(String((e as Error)?.message ?? e));
  const lines = msg.split('\n').map(l => l.trimEnd());
  const first = lines[0].replace(/^Error:\s*/, '').trim();
  const field = (label: string) => {
    const l = lines.find(x => x.trim().startsWith(`${label}:`));
    return l ? l.trim().slice(label.length + 1).trim() : undefined;
  };
  const locator = field('Locator') ?? lines.find(l => /waiting for (getBy|locator)/.test(l))?.replace(/.*waiting for\s*/, '');
  const timeout = msg.match(/Timeout:? (\d+)ms/)?.[1];

  // expect(locator).toBeVisible()/toBeHidden()/toHaveText()/toHaveCount() failed
  let m = msg.match(/expect\(locator\)\.(\w+)\(/);
  if (m) {
    const what = locator ? humanLocator(locator) : 'the element';
    // A custom message given to expect(...) comes first: keep it as the title
    const own = first.startsWith('expect(') ? undefined : first;
    const expected = field('Expected');
    const received = field('Received') ?? (msg.includes('element(s) not found') ? 'not on the screen' : undefined);
    const verb: Record<string, string> = {
      toBeVisible: `Couldn't see ${what} on the screen`,
      toBeHidden: `${what} was still on the screen`,
      toHaveText: `${what} showed different text`,
      toHaveCount: `Found a different number of ${what}`,
      toBeEnabled: `${what} was not clickable`,
    };
    return {
      title: own ?? `${verb[m[1]] ?? `${what} was not as expected`}${timeout ? ` (waited ${secs(timeout)})` : ''}`,
      expected: expected && unquote(expected),
      found: received && unquote(received),
    };
  }

  // expect(value).toBe(...) and friends, with or without our own message
  m = msg.match(/expect\(received\)\.(\w+)\(/);
  if (m) {
    const own = first.startsWith('expect(') ? undefined : first;
    const exp = field('Expected');
    const rec = field('Received');
    const words: Record<string, string> = {
      toBeGreaterThanOrEqual: 'at least ',
      toBeGreaterThan: 'more than ',
      toBeLessThanOrEqual: 'at most ',
      toBeLessThan: 'less than ',
    };
    const expected = exp && (words[m[1]] ?? '') + unquote(exp.replace(/^[<>]=?\s*/, ''));
    return { title: own ?? 'A value on the screen was not what the test expected', expected, found: rec && unquote(rec) };
  }

  // expect.poll(...) gave up: our message says what we waited for
  if (/expect\.poll|Timeout \d+ms exceeded while waiting on the predicate/.test(msg) && !locator)
    return { title: first.replace(/^Timeout.*$/, 'Waited too long for the screen to change') };

  // locator.click / fill / waitFor timed out
  m = msg.match(/locator\.(\w+): Timeout (\d+)ms exceeded/);
  if (m) {
    const what = locator ? humanLocator(locator) : 'the element';
    const verb: Record<string, string> = { click: 'click', fill: 'type into', waitFor: 'find', check: 'tick', selectOption: 'choose in' };
    return {
      title: `Couldn't ${verb[m[1]] ?? m[1]} ${what}: it didn't appear within ${secs(m[2])}`,
      hint: 'The screen may still be loading, show a popup, or the element may be named differently now.',
    };
  }

  if (/net::ERR_CONNECTION_REFUSED|ECONNREFUSED/.test(msg))
    return { title: "The app isn't reachable", hint: 'Is the d-l stack up? (docker compose up)' };

  return { title: first || 'The step failed' };
}

// Generic hints for well-known situations, when a task didn't give one
export function hintFor(p: Problem, t?: Trail): string | undefined {
  if (p.hint) return p.hint;
  if (/error toast/i.test(p.title))
    return 'An API call behind this screen failed. Developers: `docker compose logs frontendapi` shows which one.';
  if (/run|status/i.test(p.title) && /ERROR|FAILED/.test(p.found ?? ''))
    return 'Open "View Logs" on that run to see why it failed.';
  if (/^No \w+ named|has no \w+ named|no pipeline/i.test(p.title))
    return 'Check the name exactly as the app shows it (names are case-sensitive).';
  return undefined;
}

// ---------- the report ----------

const C = {
  red: (s: string) => `\x1b[1;31m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[1;34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

const short = (v: any) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s && s.length > 60 ? `${s.slice(0, 60)}…` : s;
};

// The whole report as text (with colours; core/log.ts strips them for the log file)
export function render(p: Problem, t: Trail | undefined, screen: string | undefined, evidence: string[]): string {
  const bar = C.cyan('│');
  const row = (label: string, value: string, colour = (s: string) => s) =>
    `   ${bar}  ${C.dim(label.padStart(8))}  ${colour(value)}`;
  const out: string[] = [];
  out.push(`${C.red('✗ error')}${C.bold(`: ${p.title}`)}`);
  const where = t ? `${t.chain.join(' › ')}` : 'before the first step';
  out.push(`   ${C.cyan('╭─')} ${where}`);
  if (t?.description) out.push(`   ${bar}  ${C.dim(t.description)}`);
  out.push(`   ${bar}`);
  if (p.expected !== undefined || p.found !== undefined) {
    if (p.expected !== undefined) out.push(row('expected', String(p.expected), C.green));
    if (p.found !== undefined) out.push(row('found', String(p.found), C.yellow));
    out.push(`   ${bar}`);
  }
  if (screen) out.push(row('screen', screen));
  if (t && Object.keys(t.input).length)
    out.push(
      row(
        'input',
        Object.entries(t.input)
          .filter(([k]) => !/password|secret|token/i.test(k))
          .map(([k, v]) => `${k}: ${short(v)}`)
          .join(' · '),
      ),
    );
  const hint = hintFor(p, t);
  if (hint) {
    out.push(`   ${C.cyan('╰─')} ${C.blue('help')}: ${hint}`);
    evidence.forEach((e, i) => out.push(`      ${i ? '      ' : `${C.blue('see')}:  `}${e}`));
  } else evidence.forEach((e, i) => out.push(i ? `            ${e}` : `   ${C.cyan('╰─')} ${C.blue('see')}:  ${e}`));
  return out.join('\n');
}

// ---------- checks that fail with a sentence ----------
// The title is the sentence a person would write when they spot the problem, e.g.
// same(status, 'SUCCESS', `The latest run of "${p}" ended as ${status}`).

export function same(found: unknown, expected: unknown, title: string, hint?: string) {
  if (String(found) !== String(expected)) throw fail({ title, expected: String(expected), found: String(found), hint });
}
export function atLeast(found: number, min: number, title: string, hint?: string) {
  if (!(found >= min)) throw fail({ title, expected: `at least ${min}`, found: String(found), hint });
}
export function atMost(found: number, max: number, title: string, hint?: string) {
  if (!(found <= max)) throw fail({ title, expected: `at most ${max}`, found: String(found), hint });
}
// Two times (ms) at most `tolerance` ms apart; shown as the screen showed them
export function near(a: number, b: number, tolerance: number, shownA: string, shownB: string, title: string, hint?: string) {
  if (!(Math.abs(a - b) <= tolerance)) throw fail({ title, expected: `${shownB} (± ${tolerance / 1000}s)`, found: shownA, hint });
}
