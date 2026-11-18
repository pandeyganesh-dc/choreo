// The app's screen map: where am I (read from the screen), and the shortest way from here to there.
//
// A Spot is a screen plus what it's showing, e.g. { screen: 'pipeline', connector: 'Regression', pipeline: 'x', tab: 'SetUp' }.
// Moves are single user actions (a sidebar click, search + click, a breadcrumb, a tab). goTo() reads where it is,
// finds the fewest moves to the target, makes them one by one and checks each screen it lands on.
// Never trust memory for "where am I": always read the screen (breadcrumb, headings, selected tab).
import { Page, expect } from '@playwright/test';
import { readySidebar } from './sidebar';
import { log as fileLog } from '../core/log';

export type Screen =
  | 'unknown'
  | 'home' // after login: "Welcome to DataChannel"
  | 'dashboard' // sidebar → Dashboard
  | 'orchestrations' // sidebar → Orchestration: the list
  | 'orchestration' // one orchestration's page (tabs: Setup, Execution History)
  | 'settings' // sidebar → Settings → a link; tabs: Account Settings, Data Usage, Workspaces, API Management
  | 'connectors' // ETL → All Connectors
  | 'connector' // one connector's page (tabs: SetUp, Configured Data Pipelines, ...)
  | 'pipeline' // one configured pipeline's page (tabs: SetUp, Number Of Runs, ...)
  | 'warehouses' // sidebar → Warehouses
  | 'destinations' // Reverse ETL → All Destinations
  | 'destination' // one destination's page (tabs: SetUp, Syncs, Configured Syncs)
  | 'sync'; // one configured sync's page

export type Spot = {
  screen: Screen;
  connector?: string;
  pipeline?: string;
  destination?: string;
  sync?: string;
  orchestration?: string;
  tab?: string; // selected top-level tab; leave out in a target to accept any tab
  // Target only: arrive by loading the screen anew (via the sidebar), even if already there. For screens that
  // show stale data until you navigate away (e.g. a connector's pipeline count after deletes).
  fresh?: boolean;
  seen?: string; // read only: what an unrecognised screen showed
};

type Move = { label: string; to: Spot; go: (page: Page) => Promise<void> };

// ---------- reading the screen ----------

// Read with CSS, not roles: a popup (e.g. "Link a Data Warehouse") makes the page behind it aria-hidden.
const crumbs = async (page: Page) =>
  (await page.locator('nav[aria-label="breadcrumb"] li:not([aria-hidden="true"])').allInnerTexts()).map(t => t.trim()).filter(Boolean);
// The first tablist on the page is the screen's own tabs (nested ones, e.g. inside SetUp, come later)
const selectedTab = async (page: Page) => {
  const tab = page.locator('[role="tablist"]').first().locator('[role="tab"][aria-selected="true"]');
  return (await tab.count()) ? (await tab.first().innerText()).trim().split('\n')[0] : undefined;
};
// "(choreo_pipeline_...)": a pipeline's / sync's own page heading
const bracketTitle = async (page: Page) => {
  for (const t of await page.getByRole('heading', { name: /^\(.*\)$/, level: 6 }).allInnerTexts()) {
    const m = t.trim().match(/^\((.*)\)$/);
    if (m) return m[1];
  }
  return undefined;
};

// A pipeline page's header holds its name and the "Run Pipeline" button. Its status text varies
// ("(Last Run - SUCCESS)", or just "RUNNING" while a run is going), and the "(<name>)" heading above it only shows
// when opened from the list, so neither is used to find the name.
const pipelineName = async (page: Page) => {
  const header = page.getByRole('heading', { level: 3 }).filter({ has: page.getByRole('button', { name: 'Run Pipeline', exact: true }) });
  if (!(await header.count())) return undefined;
  const first = header.first().getByRole('paragraph').first();
  return (await first.count()) ? (await first.innerText()).trim() : undefined;
};

// Where am I? Only from what's on screen. Doesn't wait: if a screen is still loading it may say 'unknown',
// which only makes the path longer (start from the sidebar), never wrong.
export async function whereAmI(page: Page): Promise<Spot> {
  const c = await crumbs(page);
  if (c[0] === 'Connectors' && c.length === 3 && c[2] === 'Edit Data Pipeline') {
    const pipeline = await pipelineName(page);
    if (pipeline) return { screen: 'pipeline', connector: c[1], pipeline, tab: await selectedTab(page) };
  }
  if (c[0] === 'Connectors' && c.length === 2) return { screen: 'connector', connector: c[1], tab: await selectedTab(page) };
  // "Orchestrations / Edit (<name>)"
  if (c[0] === 'Orchestrations' && c.length === 2) {
    const m = c[1].match(/^Edit \((.*)\)$/);
    if (m) return { screen: 'orchestration', orchestration: m[1], tab: await selectedTab(page) };
  }
  if (c[0] === 'Destinations' && c.length === 3) {
    const sync = await bracketTitle(page);
    if (sync) return { screen: 'sync', destination: c[1], sync, tab: await selectedTab(page) };
  }
  if (c[0] === 'Destinations' && c.length === 2) return { screen: 'destination', destination: c[1], tab: await selectedTab(page) };
  if (await page.getByText('Welcome to DataChannel, Let’s get started!', { exact: true }).isVisible()) return { screen: 'home' };
  if (await page.getByRole('banner').getByRole('heading', { name: 'Dashboard', exact: true, level: 6 }).isVisible())
    return { screen: 'dashboard' };
  if (!c.length && (await page.getByRole('banner').getByRole('heading', { name: 'Orchestrations', exact: true, level: 6 }).isVisible()))
    return { screen: 'orchestrations' };
  if (await page.getByRole('banner').getByRole('heading', { name: 'Settings', exact: true, level: 6 }).isVisible())
    return { screen: 'settings', tab: await selectedTab(page) };
  if (await page.getByRole('tabpanel', { name: 'Explore Connectors' }).locator('.Connector-title1').first().isVisible())
    return { screen: 'connectors' };
  if (await page.getByRole('tabpanel', { name: 'Explore Destinations' }).locator('.Connector-title1').first().isVisible())
    return { screen: 'destinations' };
  if (
    (await page.getByRole('banner').getByRole('heading', { name: 'Data Warehouses', exact: true }).isVisible()) &&
    (await page.getByRole('button', { name: '+ Add New' }).isVisible())
  )
    return { screen: 'warehouses' };
  return { screen: 'unknown' };
}

// The screen as a person names it, like the app's breadcrumbs: "Regression › my_pipeline › Number Of Runs"
export function screenName(s: Spot): string {
  const tab = s.tab ? ` › ${s.tab}` : '';
  switch (s.screen) {
    case 'home': return 'Home';
    case 'dashboard': return 'Dashboard';
    case 'connectors': return 'ETL › All Connectors';
    case 'connector': return `${s.connector}${tab}`;
    case 'pipeline': return `${s.connector} › ${s.pipeline}${tab}`;
    case 'warehouses': return 'Warehouses';
    case 'destinations': return 'Reverse ETL › All Destinations';
    case 'destination': return `${s.destination}${tab}`;
    case 'sync': return `${s.destination} › ${s.sync}`;
    case 'orchestrations': return 'Orchestrations';
    case 'orchestration': return `Orchestrations › ${s.orchestration}${tab}`;
    case 'settings': return `Settings${tab}`;
    default: return `a screen choreo doesn't know${s.seen ? ` (${s.seen})` : ''}`;
  }
}

export const describe = (s: Spot) =>
  [s.screen, s.seen && `(${s.seen})`, s.connector ?? s.destination, s.pipeline ?? s.sync ?? s.orchestration, s.tab && `[${s.tab}]`].filter(Boolean).join(' ');

// Does `here` satisfy `target`? Every field the target names must match; fields it leaves out don't matter.
const matches = (here: Spot, target: Spot) =>
  (Object.keys(target) as (keyof Spot)[]).every(k => k === 'fresh' || k === 'seen' || target[k] === undefined || here[k] === target[k]);
const key = (s: Spot) => JSON.stringify([s.screen, s.connector, s.pipeline, s.destination, s.sync, s.orchestration, s.tab]);

// ---------- moves (one user action each) ----------

const clickTab = (name: string) => async (page: Page) => {
  // A popup (e.g. the unlinked connector's "Link a Data Warehouse") hides the page: close it like a user would
  const tab = page.getByRole('tab', { name, exact: true });
  if (!(await tab.isVisible())) await page.keyboard.press('Escape');
  await tab.click();
};

// Search a card list (All Connectors / All Destinations) and click the card with exactly this name.
// The search filters in the browser, so results are final once typed: check once, no waiting.
const searchAndClickCard = (panel: string, what: string, name: string) => async (page: Page) => {
  const p = page.getByRole('tabpanel', { name: panel });
  const names = p.locator('.Connector-title1');
  await expect(names.first()).toBeVisible(); // full list shown before typing
  await p.getByRole('textbox', { name: 'search' }).fill(name);
  const shown = (await names.allInnerTexts()).map(t => t.trim());
  if (!shown.includes(name))
    throw new Error(
      `No ${what} named "${name}" (names are case-sensitive). ` + (shown.length ? `Search shows: ${shown.join(', ')}` : 'Search found nothing.'),
    );
  await p.getByText(name, { exact: true }).click();
};

// Search a configured list (pipelines / syncs) and click the one with exactly this name
const searchAndClickLink = (panel: string, what: string, owner: string, name: string) => async (page: Page) => {
  const p = page.getByRole('tabpanel', { name: panel });
  const missing = () => new Error(`"${owner}" has no ${what} named "${name}"`);
  // With nothing configured the tab shows no table and no search box
  await p.getByRole('textbox', { name: 'Search Data Source or Records' }).fill(name, { timeout: 15_000 }).catch(() => {
    throw missing();
  });
  const link = p.getByRole('link', { name, exact: true });
  await link.waitFor({ timeout: 15_000 }).catch(() => {
    throw missing();
  });
  await link.click();
};

const crumb = (name: string) => async (page: Page) => {
  await page.locator('nav[aria-label="breadcrumb"]').getByRole('link', { name, exact: true }).click();
};

// Every move a user can make from `here`. Moves that need a name (which connector, which pipeline) take it
// from the target, so the search stays small.
function movesFrom(here: Spot, t: Spot): Move[] {
  const m: Move[] = [];
  const sidebar = (label: string, to: Spot, click: (s: Awaited<ReturnType<typeof readySidebar>>) => Promise<void>) =>
    m.push({ label, to, go: async page => click(await readySidebar(page)) });

  // The sidebar works from anywhere
  if (here.screen !== 'connectors')
    sidebar('sidebar → ETL → All Connectors', { screen: 'connectors' }, async s => {
      await s.etl.click();
      await s.allConnectors.click();
    });
  if (here.screen !== 'destinations')
    sidebar('sidebar → Reverse ETL → All Destinations', { screen: 'destinations' }, async s => {
      await s.reverseEtl.click();
      await s.allDestinations.click();
    });
  if (here.screen !== 'warehouses') sidebar('sidebar → Warehouses', { screen: 'warehouses' }, s => s.warehouses.click());
  if (here.screen !== 'dashboard') sidebar('sidebar → Dashboard', { screen: 'dashboard' }, s => s.dashboard.click());
  if (here.screen !== 'orchestrations') sidebar('sidebar → Orchestration', { screen: 'orchestrations' }, s => s.orchestrations.click());
  // Settings opens a flyout of links; Data Usage → Summary is one of them (the page then has its own tabs)
  if (here.screen !== 'settings')
    sidebar('sidebar → Settings → Data Usage Summary', { screen: 'settings', tab: 'Data Usage' }, async s => {
      await s.settings.click();
      // The flyout's sections are collapsed: open "Data Usage", then its "Summary" link
      await s.settingsSection('Data Usage').click();
      await s.settingsLink('/settings?tab=data_usage').click();
    });
  // Workspaces has its own link, so its check never sees toasts left over from another tab
  if (here.screen !== 'settings')
    sidebar('sidebar → Settings → Workspace', { screen: 'settings', tab: 'Workspaces' }, async s => {
      await s.settings.click();
      await s.settingsSection('Workspace').click();
      await s.settingsLink('/settings?tab=workspaces').click();
    });

  switch (here.screen) {
    case 'connectors':
      if (t.connector)
        m.push({
          label: `search "${t.connector}" → open it`,
          to: { screen: 'connector', connector: t.connector, tab: 'SetUp' },
          go: searchAndClickCard('Explore Connectors', 'connector under ETL → All Connectors', t.connector),
        });
      break;
    case 'connector':
      for (const tab of ['SetUp', 'Configured Data Pipelines'])
        if (here.tab !== tab) m.push({ label: `tab "${tab}"`, to: { ...here, tab }, go: clickTab(tab) });
      if (here.tab === 'Configured Data Pipelines' && t.pipeline && t.connector === here.connector)
        m.push({
          label: `search "${t.pipeline}" → open it`,
          to: { screen: 'pipeline', connector: here.connector, pipeline: t.pipeline, tab: 'SetUp' },
          go: searchAndClickLink('Configured Data Pipelines', 'pipeline', here.connector!, t.pipeline),
        });
      break;
    case 'pipeline':
      for (const tab of ['SetUp', 'Number Of Runs', 'Back Fill'])
        if (here.tab !== tab) m.push({ label: `tab "${tab}"`, to: { ...here, tab }, go: clickTab(tab) });
      m.push({
        label: `breadcrumb "${here.connector}"`,
        to: { screen: 'connector', connector: here.connector, tab: 'SetUp' },
        go: crumb(here.connector!),
      });
      break;
    case 'orchestrations':
      if (t.orchestration)
        m.push({
          label: `search "${t.orchestration}" → open it`,
          to: { screen: 'orchestration', orchestration: t.orchestration, tab: 'Setup' },
          go: async page => {
            await page.getByRole('textbox', { name: 'Search Data Source or Records' }).fill(t.orchestration!);
            const link = page.getByRole('link', { name: t.orchestration, exact: true });
            await link.waitFor({ timeout: 15_000 }).catch(() => {
              throw new Error(`No orchestration named "${t.orchestration}"`);
            });
            await link.click();
          },
        });
      break;
    case 'orchestration':
      for (const tab of ['Setup', 'Execution History'])
        if (here.tab !== tab) m.push({ label: `tab "${tab}"`, to: { ...here, tab }, go: clickTab(tab) });
      m.push({ label: 'breadcrumb "Orchestrations"', to: { screen: 'orchestrations' }, go: crumb('Orchestrations') });
      break;
    case 'settings':
      for (const tab of ['Account Settings', 'Data Usage', 'Workspaces', 'API Management'])
        if (here.tab !== tab) m.push({ label: `tab "${tab}"`, to: { ...here, tab }, go: clickTab(tab) });
      break;
    case 'destinations':
      if (t.destination)
        m.push({
          label: `search "${t.destination}" → open it`,
          to: { screen: 'destination', destination: t.destination, tab: 'SetUp' },
          go: searchAndClickCard('Explore Destinations', 'destination under Reverse ETL → All Destinations', t.destination),
        });
      break;
    case 'destination':
      for (const tab of ['SetUp', 'Configured Syncs'])
        if (here.tab !== tab) m.push({ label: `tab "${tab}"`, to: { ...here, tab }, go: clickTab(tab) });
      if (here.tab === 'Configured Syncs' && t.sync && t.destination === here.destination)
        m.push({
          // A sync page has no tabs we rely on yet, so its tab is left open
          label: `search "${t.sync}" → open it`,
          to: { screen: 'sync', destination: here.destination, sync: t.sync },
          go: searchAndClickLink('Configured Syncs', 'configured sync', here.destination!, t.sync),
        });
      break;
    case 'sync':
      m.push({
        label: `breadcrumb "${here.destination}"`,
        to: { screen: 'destination', destination: here.destination, tab: 'SetUp' },
        go: crumb(here.destination!),
      });
      break;
  }
  return m;
}

// Fewest moves from `from` to a spot matching `target` (breadth-first; the map is small)
function plan(from: Spot, target: Spot): Move[] | undefined {
  const seen = new Set([key(from)]);
  let frontier: { at: Spot; path: Move[] }[] = [{ at: from, path: [] }];
  for (let depth = 0; depth < 8 && frontier.length; depth++) {
    const next: typeof frontier = [];
    for (const { at, path } of frontier) {
      for (const mv of movesFrom(at, target)) {
        if (seen.has(key(mv.to))) continue;
        seen.add(key(mv.to));
        const p = [...path, mv];
        if (matches(mv.to, target)) return p;
        next.push({ at: mv.to, path: p });
      }
    }
    frontier = next;
  }
  return undefined;
}

// Wait until the screen shows `want` (screens load asynchronously). Returns what it finally read.
async function arrive(page: Page, want: Spot, timeout = 60_000) {
  let now: Spot = { screen: 'unknown' };
  await expect
    .poll(async () => matches((now = await whereAmI(page)), want), {
      timeout,
      message: `expected to land on ${describe(want)}`,
    })
    .toBe(true)
    .catch(() => {
      throw new Error(`Expected to land on ${describe(want)}, but the screen shows ${describe(now)}`);
    });
  return now;
}

// What an unrecognised screen showed, for the log: why whereAmI couldn't place it
async function seen(page: Page) {
  const c = await crumbs(page);
  const headers = (await page.getByRole('heading', { level: 3 }).allInnerTexts()).map(t => t.trim().replace(/\s+/g, ' ').slice(0, 80));
  return `breadcrumb [${c.join(' / ')}], level-3 headings [${headers.join(' | ')}], spinners ${await page.getByRole('progressbar').count()}`;
}

// Where am I, plus, when the screen isn't in the map, what it showed (for the log)
async function locate(page: Page) {
  const here = await whereAmI(page);
  if (here.screen === 'unknown') here.seen = await seen(page);
  return here;
}

// Go to `target` by the fewest user moves from wherever the screen is now. Logs each move.
// If the first read of the screen was wrong (it was still loading), it re-reads and re-plans once.
export async function goTo(page: Page, target: Spot, show: (line: string) => void = console.log) {
  // Shown in the terminal and kept in the run log
  const log = (line: string) => {
    show(line);
    fileLog(`  goTo${line}`);
  };
  fileLog(`  goTo target ${describe(target)}`);
  for (let attempt = 1; ; attempt++) {
    const here = await locate(page);
    fileLog(`  goTo read screen: ${describe(here)}`);
    if (matches(here, target) && !target.fresh) {
      fileLog('  goTo already there: no moves');
      return here;
    }
    // Fresh: plan as if lost, so the path starts at the sidebar and the screen loads anew
    const path = plan(target.fresh && attempt === 1 ? { screen: 'unknown' } : here, target);
    if (!path) throw new Error(`No way known from ${describe(here)} to ${describe(target)}`);
    log(` ↳ at ${describe(here)} → ${describe(target)}: ${path.map(p => p.label).join(', ')}`);
    try {
      for (const mv of path) {
        const t0 = Date.now();
        await mv.go(page);
        const now = await arrive(page, mv.to);
        fileLog(`  goTo move "${mv.label}" landed on ${describe(now)} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      }
      return await whereAmI(page);
    } catch (e) {
      // Only retry from a clean start (sidebar); a real problem (no such pipeline, ...) fails again the same way
      if (attempt > 1 || /has no|No connector|No destination|No orchestration/.test(String(e))) throw e;
      log(` ↳ move failed (${String(e).split('\n')[0]}); re-reading the screen`);
    }
  }
}
