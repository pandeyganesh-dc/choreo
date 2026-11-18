// Find: a connector's pipeline whose last run has a given status, as its Configured Data Pipelines tab shows it.
// For flows that only NEED such a pipeline to exist: use one that's there, and make one only if none is
// (pair with `orElse` in the flow). Returns { found: false } when none fits; never creates anything itself.
import { defineTask } from '../core/task';
import { log } from '../core/log';
import { datasource, configuredPipelineCount } from '../pages/datasource';
import { readRow, uiTime } from '../pages/table';

export default defineTask({
  description:
    "On a connector's Configured Data Pipelines tab, find a pipeline whose Last Run Status is `status` (newest first, first page only), optionally run within the last `withinDays`. Returns { found, pipeline, lastRunAt }.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    status: { default: 'SUCCESS', description: 'Last Run Status to look for, e.g. SUCCESS, ERROR' },
    withinDays: { description: 'Only a pipeline whose last run is at most this many days old (leave out: any age)' },
  },
  screen: i => ({ screen: 'connector', connector: i.connector, tab: 'Configured Data Pipelines' }),
  async run(page, { connector, status, withinDays }) {
    const d = datasource(page);
    // With 0 pipelines the tab shows no table at all
    if ((await configuredPipelineCount(page)) === 0) return { found: false, connector };
    await d.pipelineRows.first().waitFor();
    const table = page.getByRole('tabpanel', { name: 'Configured Data Pipelines' }).getByRole('table');
    const rows = [];
    for (const row of await d.pipelineRows.all()) {
      const col = await readRow(table, row);
      rows.push({ pipeline: (await d.pipelineName(row).innerText()).trim(), status: col('Last Run Status'), lastRunAt: col('Last Run Time') });
    }
    const timed = rows.filter(r => r.lastRunAt && r.lastRunAt !== '-');
    // The screen shows the account's time zone, which may differ from this machine's by up to a day:
    // callers leave a day of margin (e.g. withinDays 6 for a 7-day window)
    const recent = (r: (typeof rows)[number]) =>
      withinDays === undefined || Date.now() - uiTime(r.lastRunAt, 'Last Run Time') < Number(withinDays) * 86_400_000;
    const hit = timed.find(r => r.status === status && recent(r));
    log(`    ${rows.length} pipelines on screen; ${hit ? `using "${hit.pipeline}" (${hit.status}, ${hit.lastRunAt})` : `none with ${status}${withinDays ? ` in ${withinDays} days` : ''}`}`);
    return hit ? { found: true, connector, ...hit } : { found: false, connector };
  },
});
