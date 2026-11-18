// Check: a Settings tab (Data Usage, Workspaces, ...) loads without an error toast.
// Quick repro for broken APIs behind Settings: needs no pipeline of its own.
import { defineTask } from '../core/task';
import { expectNoErrorToast } from '../pages/toast';

export default defineTask({
  description: 'Open a Settings tab (e.g. Data Usage, Workspaces) and expect it to load with no error toast.',
  inputs: {
    tab: { required: true, description: 'Settings tab as shown: Account Settings, Data Usage, Workspaces, API Management' },
  },
  // Fresh: these tabs fetch their data when opened
  screen: i => ({ screen: 'settings', tab: i.tab, fresh: true }),
  async run(page, { tab }) {
    await expectNoErrorToast(page, `Settings → ${tab}`);
    return { tab };
  },
});
