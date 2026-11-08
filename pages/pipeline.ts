// Selectors for one configured pipeline's page: /datasource/<connector>/detail/editreport/<id>
import { Page, expect } from '@playwright/test';
import { datasource, configuredPipelineCount } from './datasource';

export const pipeline = (page: Page) => ({
  title: (name: string) => page.getByRole('heading', { name: `(${name})`, exact: true }),
  runBtn: page.getByRole('button', { name: 'Run Pipeline', exact: true }),
  // Header text "(Last Run - SUCCESS)", "(Last Run - QUEUED)", "(Last Run - No Run Initiated)" ...
  lastRun: page.getByText(/^\(Last Run - .*\)$/),
  runStarted: page.getByRole('alert').filter({ hasText: 'Configured data pipeline run was successful' }),
});

// Reads the status from "(Last Run - X)", e.g. "SUCCESS".
export async function lastRunStatus(page: Page) {
  const text = await pipeline(page).lastRun.innerText();
  return text.replace(/^\(Last Run - /, '').replace(/\)$/, '').trim();
}

// Opens a pipeline the way a user would: connector → Configured Data Pipelines → search → click it.
export async function openPipeline(page: Page, connector: string, name: string) {
  const d = datasource(page);
  const missing = () => new Error(`"${connector}" has no pipeline named "${name}"`);
  await d.open(connector);
  await expect(d.configuredCount).toBeVisible();
  // With 0 pipelines the tab shows no table (and no search box) at all
  if ((await configuredPipelineCount(page)) === 0) throw missing();
  await d.configuredTab.click();
  await d.pipelineSearch.fill(name);
  const link = d.pipelineRow(name).getByRole('link', { name, exact: true });
  await link.waitFor({ timeout: 15_000 }).catch(() => {
    throw missing();
  });
  await link.click();
  await expect(pipeline(page).title(name)).toBeVisible();
}
