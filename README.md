# choreo — choreograph DataChannel UI flows

UI automation for DataChannel. It runs against whichever d-l is up on `localhost:3000`.

- **Tasks** (`tasks/`): single UI operations, written in code by devs.
- **Flows** (`flows/*.yaml`): tasks and other flows put in order, with inputs. No code: anyone can write them.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm run list                                        # all tasks and flows
npm run flow unlink-connector connector=Regression  # run a flow; params with no default must be given
npm run flow add-postgres-warehouse -- --watch      # watch it, slowed down (SLOW=1000 for slower)
npm run report                                      # last run: steps, screenshots, video, trace
```

## Write a flow

```yaml
# flows/my-flow.yaml
description: New warehouse, then link a connector to it
params:
  connector:            # empty = required: you must say which connector
steps:
  - addPostgresWarehouse: { as: wh }          # "as" names the result
  - linkConnector: { connector: $connector, warehouse: $wh.name }
```

- `$param` / `$label.field` use a flow param or an earlier step's result.
- Things are named as the UI shows them: `connector=Regression`, not the slug `regress`.
- A param left empty (`pipeline:`) is required: `npm run flow delete-pipeline connector=Regression pipeline=my_pipe`.
- What a flow acts ON (which connector, warehouse, pipeline) never has a default. Defaults are only for how to create things.
- Mistakes (unknown task or flow, missing input, bad `$ref`, a flow calling itself) are reported before the browser opens.
- Tasks work like a person at the screen: they move through the sidebar and search (never jumping to a URL),
  and check results on what's visible. They know nothing the UI doesn't show (no DB, no API).
- Tasks are strict: they do exactly what they say or fail with a reason (e.g. linking an already-linked connector fails).
- Flows never clean up after themselves. Cleanup is its own flow.
- There's no "run all": flows change d-l state and can conflict. To run several things in order, write a flow for it.
- `forEach` repeats steps once per item of a list (`$item` is the current one; rename it with `as:`):
  ```yaml
  - goToConfiguredPipelines: { connector: Regression }
  - listPipelines: { connector: Regression, as: list }
  - forEach: $list.names
    steps:
      - deletePipeline: { connector: Regression, pipeline: $item }
  ```
- A flow is called exactly like a task (flows are `kebab-case`, tasks `camelCase`).
  A flow returns what it lists under `outputs:`, and sees only the params passed to it:
  ```yaml
  # flows/create-and-run-pipeline.yaml
  params:
    connector:
  outputs:
    pipeline: $p.name
  steps:
    - createPipeline: { connector: $connector, as: p }
    - runPipeline: { connector: $connector, pipeline: $p.name }

  # used in another flow
  - create-and-run-pipeline: { connector: Regression, as: run }
  - expectRunStatus: { connector: Regression, pipeline: $run.pipeline }
  ```
- Flows can live in subfolders of `flows/`; a flow's name is its file name, so names must be unique.
- Creating a pipeline is report-specific: each connector + report gets its own flow in `flows/create_pipeline/`,
  named `create_pipeline_<connector>_<report>`. Its params are exactly what that report asks for in "Report Details":
  ```bash
  npm run flow create_pipeline_regress_regular              # all fields
  npm run flow create_pipeline_regress_regular fields=foo   # chosen fields (comma-separated)
  ```
  From another flow: `- create_pipeline_regress_regular: { as: p }` then use `$p.pipeline`.
- Name test-only flows `testing-*.yaml` and don't commit them.

Need an operation that doesn't exist yet? Ask Claude to *"add a task that …"*.

Defaults match d-l. To change them (URL, login, warehouse creds), use `.env`; the keys are in `config.ts`.
