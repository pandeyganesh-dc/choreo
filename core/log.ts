// Run log: one folder per flow run under logs/, for debugging after the fact (mainly by Claude).
//   logs/<YYYYMMDD_HHMMSS>_<flow>/run.log       every step, every move, every reading, errors
//   logs/<...>/failure.png, failure-page.yaml    only when the run fails
// Housekeeping happens at the start of every run: folders older than a day are deleted, and at most
// KEEP folders are kept, so logs/ never grows on its own. logs/ is git-ignored.
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', 'logs');
const KEEP = 20;
const MAX_AGE_MS = 24 * 60 * 60_000;

let dir: string | undefined;
let file: string | undefined;
const started = Date.now();

const time = () => {
  const d = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

// Deletes old run folders: anything older than a day, and everything beyond the newest KEEP
function prune() {
  if (!fs.existsSync(ROOT)) return;
  const runs = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => ({ p: path.join(ROOT, e.name), t: fs.statSync(path.join(ROOT, e.name)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  runs.forEach((r, i) => {
    if (i >= KEEP || Date.now() - r.t > MAX_AGE_MS) fs.rmSync(r.p, { recursive: true, force: true });
  });
}

// Starts this run's log. Call once per run, before anything else logs.
export function startRunLog(flow: string, header: Record<string, unknown>) {
  prune();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  dir = path.join(ROOT, `${stamp}_${flow.replace(/[^\w.-]/g, '_')}`);
  fs.mkdirSync(dir, { recursive: true });
  file = path.join(dir, 'run.log');
  log(`run ${flow} ${JSON.stringify(header)}`);
  return dir;
}

export const runDir = () => dir;

// One line in the run log (no-op before startRunLog, e.g. in throwaway scripts)
export function log(line: string) {
  if (!file) return;
  const secs = ((Date.now() - started) / 1000).toFixed(1).padStart(6);
  fs.appendFileSync(file, `${time()} +${secs}s ${line.replace(/\x1b\[[0-9;]*m/g, '')}\n`); // no terminal colours
}

// Values for the log: passwords hidden, long values cut
export function brief(v: unknown, max = 300): string {
  const s = JSON.stringify(v, (k, x) => (/password|secret|token/i.test(k) ? '***' : x));
  return s === undefined ? String(v) : s.length > max ? `${s.slice(0, max)}…(${s.length} chars)` : s;
}
