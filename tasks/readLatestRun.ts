// Read: a pipeline's latest run, as its "Number Of Runs" tab shows it. For checks on other screens
// (connector page, dashboard) that must agree with what the pipeline itself says.
import { defineTask } from '../core/task';
import { latestRun } from '../pages/pipeline';

export default defineTask({
  description:
    "On a pipeline's Number Of Runs tab, read the latest run. Returns { startTime, status, rows, data, runs } as shown (runs = how many runs it has).",
  inputs: {
    connector: { required: true, description: 'Connector name as shown in the UI, e.g. Regression' },
    pipeline: { required: true, description: 'Pipeline (dataset) name' },
  },
  screen: i => ({ screen: 'pipeline', connector: i.connector, pipeline: i.pipeline, tab: 'Number Of Runs' }),
  async run(page, { pipeline }) {
    const run = await latestRun(page);
    if (!run) throw new Error(`"${pipeline}" has no runs`);
    return { pipeline, startTime: run.startTime, status: run.status, rows: run.rowsMoved, data: run.dataMoved, runs: run.total };
  },
});
