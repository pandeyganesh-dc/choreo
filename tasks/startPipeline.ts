// On a connector's page, open "+ Data Pipelines" and pick a pipeline type, up to "Report Details", the step that
// differs per report. Fill that with selectFields / selectOption / fillText, then savePipeline.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, connectorLinked } from '../pages/datasource';
import { pipelineNew } from '../pages/pipelineNew';

export default defineTask({
  description: "On a connector's page: + Data Pipelines → pick a pipeline type → stop at Report Details.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    type: { required: true, description: 'Pipeline type, as titled on its card, e.g. Regular' },
  },
  screen: i => ({ screen: 'connector', connector: i.connector }),
  async run(page, { connector, type }) {
    const d = datasource(page);
    const w = pipelineNew(page);
    if (!(await connectorLinked(page, connector))) throw new Error(`"${connector}" is not linked to a warehouse. Link it first.`);
    await d.addPipelinesBtn.click();

    // Step 1: pipeline type
    await w.typeCard(type).click({ timeout: 15_000 }).catch(() => {
      throw new Error(`"${connector}" has no pipeline type "${type}"`);
    });
    await w.nextBtn.click();

    // Confirm on screen: the Report Details step is open
    await expect(w.reportDetailsHeading).toBeVisible();
    return { connector, type };
  },
});
