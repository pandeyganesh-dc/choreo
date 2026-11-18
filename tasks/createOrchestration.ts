// Action: create a manual-only orchestration with one Forward (Datasource) node that runs one pipeline.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { stamp } from '../config';
import { orchestration } from '../pages/orchestration';

export default defineTask({
  description:
    'Create a manual-only orchestration: Start → one Datasource (Forward ETL) node running the given pipeline. Returns { orchestration }.',
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline the node runs' },
  },
  screen: () => ({ screen: 'orchestrations' }),
  async run(page, { connector, pipeline }) {
    const o = orchestration(page);
    const name = `choreo_orch_${stamp()}`;
    await o.createNew.click();
    await expect(o.nodePicker).toBeVisible({ timeout: 30_000 });
    await o.nodeType('Datasource').click();
    // Drawer step 1: data source card, step 2: the pipeline, step 3: defaults (run every time) → Finish
    await expect(o.drawerTitle('Configure Datasource')).toBeVisible();
    await o.drawerItem(connector).click();
    await o.drawerItem(pipeline).click({ timeout: 15_000 }).catch(() => {
      throw new Error(`Orchestration editor: "${connector}" lists no pipeline "${pipeline}"`);
    });
    await o.finishBtn.click();
    await o.scheduleSaveBtn.click();
    await o.nameInput.fill(name);
    await o.manualOnly.click();
    await o.submitBtn.click();
    await expect(o.added).toBeVisible();
    // Confirm on screen: it's in the list
    await expect(o.listLink(name)).toBeVisible();
    return { orchestration: name, pipeline };
  },
});
