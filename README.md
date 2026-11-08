# choreo — choreograph DataChannel UI flows

UI automation for DataChannel. It runs against whichever d-l is up on `localhost:3000`.

- **Tasks** (`tasks/`): single UI operations, written in code.
- **Flows** (`flows/*.yaml`): tasks put in order, with inputs. This is what you write and run.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm run list                                        # all tasks and flows
npm run flow link-connector                         # run a flow
npm run flow link-connector connector=shopify       # override its params
npm run flow add-postgres-warehouse -- --watch      # watch it, slowed down (SLOW=1000 for slower)
npm run report                                      # last run: steps, screenshots, video, trace
```

## Write a flow

```yaml
# flows/my-flow.yaml
description: New warehouse, then link a connector to it
params:
  connector: regress
steps:
  - addPostgresWarehouse: { as: wh }          # "as" names the result
  - linkConnector: { connector: $connector, warehouse: $wh.name }
```

- `$param` / `$label.field` use a flow param or an earlier step's result.
- A param left empty (`pipeline:`) is required: `npm run flow delete-pipeline pipeline=my_pipe`.
- Mistakes (unknown task, missing input, bad `$ref`) are reported before the browser opens.
- Tasks are strict: they do exactly what they say or fail with a reason (e.g. linking an already-linked connector fails).
- Flows never clean up after themselves. Cleanup is its own flow.
- There's no "run all": flows change d-l state and can conflict. To run several things in order, write a flow for it.
- Not supported yet: loops (`repeat`, `forEach`) and flows calling other flows.

Need an operation that doesn't exist yet? Ask Claude to *"add a task that …"*.

Defaults match d-l. To change them (URL, login, warehouse creds), use `.env`; the keys are in `config.ts`.
