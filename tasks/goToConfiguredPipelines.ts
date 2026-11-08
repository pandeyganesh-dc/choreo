// Go to a connector's Configured Data Pipelines tab, the way a user does. Only navigates; changes nothing.
import { expect } from '@playwright/test';
import { defineTask } from '../core/task';
import { datasource, configuredPipelineCount, goToConnector } from '../pages/datasource';

export default defineTask({
  description: "Open a connector's Configured Data Pipelines tab (ETL → All Connectors → search → card → tab). Returns { total }.",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
  },
  async run(page, { connector }) {
    const d = datasource(page);
    await goToConnector(page, connector);
    await expect(d.configuredCount).toBeVisible();
    const total = await configuredPipelineCount(page);
    if (await d.linkPrompt.isVisible()) await page.keyboard.press('Escape'); // unlinked: close the link popup to see the page
    await d.configuredTab.click();
    // Confirm on screen: the tab is open
    await expect(d.configuredTab).toHaveAttribute('aria-selected', 'true');
    return { connector, total };
  },
});
