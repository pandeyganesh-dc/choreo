// Go to a Reverse ETL destination's page, the way a user does. Only navigates; changes nothing.
import { defineTask } from '../core/task';
import { goToDestination } from '../pages/reverse';

export default defineTask({
  description: "Open a Reverse ETL destination's page (Reverse ETL → All Destinations → search → card).",
  inputs: {
    destination: { required: true, description: 'Destination name as shown in the UI, e.g. GoogleSheets Export' },
  },
  async run(page, { destination }) {
    await goToDestination(page, destination);
    return { destination };
  },
});
