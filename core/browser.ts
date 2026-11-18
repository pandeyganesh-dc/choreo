// The live choreo window (--watch): one Chrome window that stays open between runs, so each run starts from
// whatever screen the last one (or you) left it on, and goTo takes it from there.
//   - its own profile in .browser/ (separate from your own Chrome; stays logged in between runs)
//   - Playwright attaches over Chrome's debugging port (CHOREO_PORT, default 9333) and only detaches at the end
//   - if the window isn't open, the run starts it; close it any time and the next run opens a new one
// Chrome tab groups can't be driven from outside the browser (extension-only API), hence a window of its own.
import { chromium, Browser, Page } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

const PORT = Number(process.env.CHOREO_PORT || 9333);
const PROFILE = path.resolve(__dirname, '..', '.browser');
const ENDPOINT = `http://127.0.0.1:${PORT}`;

const isUp = () =>
  fetch(`${ENDPOINT}/json/version`)
    .then(r => r.ok)
    .catch(() => false);

// Start the choreo window, detached so it outlives this run
async function start() {
  fs.mkdirSync(PROFILE, { recursive: true });
  const child = spawn(
    chromium.executablePath(),
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      config.baseURL,
    ],
    { detached: true, stdio: 'ignore' },
  );
  child.unref();
  for (let i = 0; i < 100; i++) {
    if (await isUp()) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`Started the choreo window, but its debugging port ${PORT} never answered`);
}

// Attach to the choreo window (starting it if needed) and pick the tab to work in: the app's tab if one is open,
// otherwise a new tab. Returns how it got there, for the log.
export async function attachLive(): Promise<{ browser: Browser; page: Page; how: string }> {
  const started = !(await isUp());
  if (started) await start();
  const browser = await chromium.connectOverCDP(ENDPOINT, { slowMo: Number(process.env.SLOW || 0) });
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const pages = context.pages();
  const onApp = pages.filter(p => p.url().startsWith(config.baseURL));
  // Several app tabs: the last one is the one opened most recently
  let page = onApp[onApp.length - 1];
  let how = started ? 'started the choreo window' : 'attached to the open choreo window';
  if (page) how += `, app tab at ${page.url().slice(config.baseURL.length) || '/'}`;
  else {
    page = pages.find(p => p.url() === 'about:blank') ?? (await context.newPage());
    how += ', no app tab: opened one';
  }
  await page.bringToFront();
  return { browser, page, how };
}

// End of a run: let go of the window without closing it (the tabs stay as they are)
export async function detachLive(browser: Browser) {
  // On a browser attached over CDP, close() only disconnects; the window and its tabs stay open
  await browser.close();
}
