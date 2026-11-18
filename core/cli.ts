// npm run flow <name> [key=value ...] [--watch | --headed ...]   run one flow
// npm run list                                                    show all tasks and flows
// There is deliberately no "run all": flows change shared d-l state and can conflict.
// To run several things in order, write a flow that lists them.
// --watch = the live choreo window (core/browser.ts): stays open between runs, each run continues from the
//           screen it shows; slowed down (SLOW=ms, default 500) so each step can be followed
import { spawnSync } from 'child_process';
import { loadTasks, loadFlows, checkFlow, isRequired } from './load';

const [cmd, ...args] = process.argv.slice(2);
const tasks = loadTasks();
const flows = loadFlows();

if (cmd === 'list') {
  console.log('\nTASKS (tasks/*.ts)');
  for (const [name, t] of Object.entries(tasks)) {
    const ins = Object.entries(t.inputs)
      .map(([k, s]) => (s.required ? k : `${k}?`) + (s.default !== undefined ? `=${s.default}` : ''))
      .join(', ');
    console.log(`  ${name}(${ins})\n      ${t.description}`);
  }
  console.log('\nFLOWS (flows/*.yaml): called from other flows just like tasks; → shows outputs');
  for (const f of Object.values(flows)) {
    const ps = Object.entries(f.params).map(([k, v]) => (isRequired(v) ? `${k}=<required>` : `${k}=${v}`)).join(' ');
    const outs = Object.keys(f.outputs);
    console.log(`  ${f.name}${ps ? `  [${ps}]` : ''}${outs.length ? `  → ${outs.join(', ')}` : ''}\n      ${f.description ?? ''}`);
  }
  console.log('');
  process.exit(0);
}

// Turns --watch into Playwright's --headed plus a slowdown; other flags pass through.
function playwright(pass: string[], env: Record<string, string>) {
  const watch = pass.includes('--watch');
  const pwArgs = pass.filter(a => a !== '--watch');
  if (watch && !pwArgs.includes('--headed')) pwArgs.push('--headed');
  const r = spawnSync('npx', ['playwright', 'test', ...pwArgs], {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...env,
      ...(watch ? { SLOW: process.env.SLOW || '500' } : {}),
      ...(pwArgs.includes('--headed') ? { CHOREO_HEADED: '1' } : {}), // page fills the visible window
      ...(watch ? { CHOREO_LIVE: '1' } : {}), // work in the live choreo window, left open after the run
    },
  });
  process.exit(r.status ?? 1);
}

if (cmd === 'flow') {
  const name = args.find(a => !a.includes('=') && !a.startsWith('-'));
  if (!name || !flows[name]) {
    console.error(`${name ? `No flow named "${name}". ` : ''}Flows: ${Object.keys(flows).join(', ')}`);
    process.exit(1);
  }
  const params = Object.fromEntries(args.filter(a => a.includes('=') && !a.startsWith('-')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(0, i), a.slice(i + 1)];
  }));
  const errors = checkFlow(flows[name], { tasks, flows }, params);
  if (errors.length) {
    console.error(`Flow "${name}" is invalid:\n  - ${errors.join('\n  - ')}`);
    process.exit(1);
  }
  // Only --flags pass through here (use --flag=value form), since bare words are the name and key=value params
  playwright(args.filter(a => a.startsWith('-')), { FLOW: name, FLOW_PARAMS: JSON.stringify(params) });
}

console.error('Usage: npm run flow <name> [key=value ...] [--watch]   |   npm run list');
process.exit(1);
