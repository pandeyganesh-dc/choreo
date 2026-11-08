// Finds every task (tasks/*.ts) and flow (flows/*.yaml) and checks flows before anything runs.
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { Task } from './task';

const ROOT = path.resolve(__dirname, '..');
const files = (dir: string, ext: RegExp) =>
  fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter(f => ext.test(f)).sort() : [];

export type Step = { task: string; as?: string; input: Record<string, any> };
export type Flow = { name: string; description?: string; params: Record<string, string | null>; steps: Step[] };

export function loadTasks(): Record<string, Task> {
  const tasks: Record<string, Task> = {};
  for (const f of files('tasks', /\.ts$/)) {
    tasks[path.basename(f, '.ts')] = require(path.join(ROOT, 'tasks', f)).default;
  }
  return tasks;
}

export function loadFlows(): Record<string, Flow> {
  const flows: Record<string, Flow> = {};
  for (const f of files('flows', /\.ya?ml$/)) {
    const name = path.basename(f).replace(/\.ya?ml$/, '');
    const doc = YAML.parse(fs.readFileSync(path.join(ROOT, 'flows', f), 'utf8')) ?? {};
    const steps: Step[] = (doc.steps ?? []).map((s: any) => {
      const [task, raw] = Object.entries(s ?? {})[0] ?? [];
      const { as, ...input } = (raw ?? {}) as Record<string, any>;
      return { task, as, input };
    });
    flows[name] = { name, description: doc.description, params: doc.params ?? {}, steps };
  }
  return flows;
}

// Every problem in a flow, found without opening a browser.
export function checkFlow(flow: Flow, tasks: Record<string, Task>, given: Record<string, string> = {}): string[] {
  const errors: string[] = [];
  const known = new Set(Object.keys(flow.params));
  for (const [k, v] of Object.entries(flow.params))
    if ((v === null || v === '') && !(k in given)) errors.push(`missing param "${k}" (pass it as ${k}=...)`);
  for (const k of Object.keys(given)) if (!known.has(k)) errors.push(`unknown param "${k}" (flow params: ${[...known].join(', ') || 'none'})`);

  flow.steps.forEach((s, i) => {
    const at = `step ${i + 1} (${s.task})`;
    const task = tasks[s.task];
    if (!task) return errors.push(`${at}: no task named "${s.task}". Available: ${Object.keys(tasks).join(', ')}`);
    for (const [k, v] of Object.entries(s.input)) {
      if (!task.inputs[k]) errors.push(`${at}: unknown input "${k}" (inputs: ${Object.keys(task.inputs).join(', ')})`);
      if (typeof v === 'string' && v.startsWith('$') && !known.has(v.slice(1).split('.')[0]))
        errors.push(`${at}: "${v}" refers to nothing defined before this step`);
    }
    for (const [k, spec] of Object.entries(task.inputs))
      if (spec.required && !(k in s.input)) errors.push(`${at}: missing required input "${k}"`);
    if (s.as) known.add(s.as);
  });
  return errors;
}
