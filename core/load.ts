// Finds every task (tasks/*.ts) and flow (flows/**/*.yaml) and checks flows before anything runs.
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { Task } from './task';

const ROOT = path.resolve(__dirname, '..');
const files = (dir: string, ext: RegExp) =>
  fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter(f => ext.test(f)).sort() : [];

// A step calls a task (camelCase) or another flow (kebab-case) the same way: `- name: { input: value, as: label }`
export type CallStep = { call: string; as?: string; input: Record<string, any> };
// Repeats `steps` once per item of a list (e.g. $list.names); `as` names the current item (default "item")
export type ForEachStep = { forEach: any; as: string; steps: Step[] };
export type Step = CallStep | ForEachStep;
export const isForEach = (s: Step): s is ForEachStep => 'forEach' in s;

export type Flow = {
  name: string;
  description?: string;
  params: Record<string, string | null>; // inputs; an empty value means required
  outputs: Record<string, string>; // what callers get back, e.g. { pipeline: $p.name }
  steps: Step[];
};
export const isRequired = (v: unknown) => v === null || v === undefined || v === '';
export type Lib = { tasks: Record<string, Task>; flows: Record<string, Flow> };

export function loadTasks(): Record<string, Task> {
  const tasks: Record<string, Task> = {};
  for (const f of files('tasks', /\.ts$/)) {
    tasks[path.basename(f, '.ts')] = require(path.join(ROOT, 'tasks', f)).default;
  }
  return tasks;
}

// Flows may sit in subfolders (e.g. flows/create_pipeline/); the file name alone is the flow's name, so it must be unique.
const flowFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? flowFiles(path.join(dir, e.name)) : /\.ya?ml$/.test(e.name) ? [path.join(dir, e.name)] : []))
    .sort();

export function loadFlows(): Record<string, Flow> {
  const flows: Record<string, Flow> = {};
  const where: Record<string, string> = {};
  const dir = path.join(ROOT, 'flows');
  for (const file of fs.existsSync(dir) ? flowFiles(dir) : []) {
    const name = path.basename(file).replace(/\.ya?ml$/, '');
    const rel = path.relative(ROOT, file);
    if (where[name]) throw new Error(`Two flows named "${name}": ${where[name]} and ${rel}`);
    where[name] = rel;
    const doc = YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
    flows[name] = {
      name,
      description: doc.description,
      params: doc.params ?? {},
      outputs: doc.outputs ?? {},
      steps: parseSteps(doc.steps),
    };
  }
  return flows;
}

function parseSteps(raw: any): Step[] {
  return (raw ?? []).map((s: any): Step => {
    if (s && 'forEach' in s) return { forEach: s.forEach, as: s.as ?? 'item', steps: parseSteps(s.steps) };
    const [call, body] = Object.entries(s ?? {})[0] ?? [];
    const { as, ...input } = (body ?? {}) as Record<string, any>;
    return { call, as, input };
  });
}

// ---------- checking (no browser) ----------

// What a step may refer to: name → fields it is known to have (null = unknown, e.g. a task's result)
type Known = Map<string, Set<string> | null>;

// Every problem in a flow (and in every flow it calls), found without opening a browser.
export function checkFlow(flow: Flow, lib: Lib, given: Record<string, string> = {}): string[] {
  const errors: string[] = [];
  for (const [k, v] of Object.entries(flow.params))
    if (isRequired(v) && !(k in given)) errors.push(`missing param "${k}" (pass it as ${k}=...)`);
  for (const k of Object.keys(given))
    if (!(k in flow.params)) errors.push(`unknown param "${k}" (flow params: ${Object.keys(flow.params).join(', ') || 'none'})`);
  checkBody(flow, lib, [], new Set(), errors);
  return errors;
}

// Checks one flow's own steps and outputs, then (once each) every flow it calls.
function checkBody(flow: Flow, lib: Lib, stack: string[], done: Set<string>, errors: string[]) {
  const chain = [...stack, flow.name];
  const where = stack.length ? `in flow "${flow.name}" (via ${chain.join(' → ')}): ` : '';
  const known: Known = new Map(Object.keys(flow.params).map(k => [k, null]));
  const calls = new Set<string>();
  checkSteps(flow.steps, lib, known, '', where, calls, errors);
  for (const [k, v] of Object.entries(flow.outputs)) {
    const bad = badRef(v, known);
    if (bad) errors.push(`${where}output "${k}": ${bad}`);
  }
  done.add(flow.name);
  for (const name of calls) {
    if (chain.includes(name)) errors.push(`flow "${name}" calls itself: ${[...chain, name].join(' → ')}`);
    else if (!done.has(name)) checkBody(lib.flows[name], lib, chain, done, errors);
  }
}

// Why a "$x.y" reference is bad, or undefined if it's fine (or not a reference at all).
function badRef(v: any, known: Known): string | undefined {
  if (typeof v !== 'string' || !v.startsWith('$')) return;
  const [head, field] = v.slice(1).split('.');
  if (!known.has(head)) return `"${v}" refers to nothing defined before this step`;
  const fields = known.get(head);
  if (field && fields && !fields.has(field))
    return `"${v}": "${head}" has no output "${field}" (outputs: ${[...fields].join(', ') || 'none'})`;
}

function checkSteps(steps: Step[], lib: Lib, known: Known, prefix: string, where: string, calls: Set<string>, errors: string[]) {
  steps.forEach((s, i) => {
    if (isForEach(s)) {
      const at = `${where}step ${prefix}${i + 1} (forEach)`;
      if (typeof s.forEach !== 'string' || !s.forEach.startsWith('$'))
        errors.push(`${at}: forEach needs a list like $list.names, got ${JSON.stringify(s.forEach)}`);
      else {
        const bad = badRef(s.forEach, known);
        if (bad) errors.push(`${at}: ${bad}`);
      }
      if (!s.steps.length) errors.push(`${at}: has no steps`);
      // The item name exists only inside the block
      checkSteps(s.steps, lib, new Map([...known, [s.as, null]]), `${prefix}${i + 1}.`, where, calls, errors);
      return;
    }

    const at = `${where}step ${prefix}${i + 1} (${s.call})`;
    const task = lib.tasks[s.call];
    const flow = lib.flows[s.call];
    if (task && flow) return errors.push(`${at}: "${s.call}" is both a task and a flow; rename one`);
    if (!task && !flow)
      return errors.push(
        `${at}: no task or flow named "${s.call}". Tasks: ${Object.keys(lib.tasks).join(', ')}. Flows: ${Object.keys(lib.flows).join(', ')}`,
      );

    // A task's inputs, or a flow's params, in one shape
    const inputs: Record<string, { required: boolean }> = task
      ? Object.fromEntries(Object.entries(task.inputs).map(([k, spec]) => [k, { required: !!spec.required }]))
      : Object.fromEntries(Object.entries(flow.params).map(([k, v]) => [k, { required: isRequired(v) }]));

    for (const [k, v] of Object.entries(s.input)) {
      if (!inputs[k]) errors.push(`${at}: unknown input "${k}" (inputs: ${Object.keys(inputs).join(', ') || 'none'})`);
      const bad = badRef(v, known);
      if (bad) errors.push(`${at}: ${bad}`);
    }
    for (const [k, spec] of Object.entries(inputs))
      if (spec.required && !(k in s.input)) errors.push(`${at}: missing required input "${k}"`);

    if (flow) calls.add(s.call);
    // A flow's result has exactly its outputs; a task's result fields aren't declared
    if (s.as) known.set(s.as, flow ? new Set(Object.keys(flow.outputs)) : null);
  });
}
