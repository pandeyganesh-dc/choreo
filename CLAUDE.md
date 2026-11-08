# choreo — rules for Claude

Playwright (TypeScript) UI automation against a local d-l (frontend `localhost:3000`).

## Concepts
- **Task** (`tasks/<camelName>.ts`): one atomic UI operation, written carefully in code. The file name is the task name.
  It exports `defineTask({ description, inputs, run })`. `run(page, input)` returns values for later steps (e.g. `{ name }`).
- **Flow** (`flows/<kebab-name>.yaml`): `description`, `params` (with defaults) and `steps`. Each step is `- taskName: { input: value, as: label }`.
  `$param` or `$label.field` refers to a param or to an earlier step's result.
  `- forEach: $list.names` with `steps:` (and optional `as:`, default `item`) repeats steps per item.
  A step can call another flow exactly like a task. A flow returns its `outputs:` and sees only the params passed in.
- Devs write tasks (code). Anyone writes flows (no code). Prefer reusing flows over repeating their steps.
- **Page** (`pages/<screen>.ts`): the only place selectors live. Tasks use pages; they never use raw selectors.
- `core/`: loader, checker, runner and CLI. Keep it small; features are added incrementally.

## When asked for a flow
Use existing flows and tasks (`npm run list`). Only add a task if an operation is missing.
Give a flow `outputs:` when callers may need what it created (e.g. `warehouse`, `pipeline`).
Flows named `testing-*` are scratch flows; never commit them.
Pipeline creation is per connector + report: `flows/create_pipeline/create_pipeline_<connector>_<report>.yaml`. It fixes the
connector and report, takes only that report's "Report Details" values as params, and outputs `pipeline`.
Explore the report's step 2 first; if it has inputs beyond Fields, the wizard tasks need extending.

## Task rules
- Atomic: one operation on ONE thing (deletePipeline, not "delete all"). Repetition belongs in flows (`forEach`).
- Anything that would repeat inside tasks becomes its own task (per Ganesh). Navigation is the main case: going to a
  screen is one task (`goToConfiguredPipelines`), acting on it is another (`deletePipeline`, `listPipelines`), and a flow
  joins them (`delete-pipeline`). Tasks that act on the current screen check they're on the right one
  (`expectOnConfiguredPipelines`) and fail if not; they never navigate there themselves.
- UI only: a task knows only what a user can see on screen (no DB/API). listPipelines returns only the visible page.
  If a user couldn't figure something out from the UI, that's a product gap to fix, not something to work around.
- Strict: do exactly what the name says, or throw a clear error. Never silently "fix" state.
  (e.g. linkConnector throws if the connector is already linked)
- Navigate like a user: sidebar → lists → search → click (`goToConnector`, `goToWarehouses`). Never `page.goto` a URL
  (only login opens the app at `/`), never `page.reload`. Refresh only with the app's own buttons (e.g. runs tab "Refresh Page").
- Confirm the result at the end from what's on screen (row gone, count changed, linked view shown), so a passing task means it really happened.
- Connectors are named as the UI shows them (`Regression`, not the URL slug `regress`).
- No cleanup inside tasks or flows. Cleanup is its own flow.
- Never default WHICH thing to act on (connector, warehouse, pipeline), in tasks or flows. The person must name it,
  especially for deletes. Defaults are only for HOW to create something (host, port, pipeline type).
- Defaults come from `config.ts` (d-l values), so any d-l works. Never hard-code URLs or creds elsewhere.
- Unique names for created things: `choreo_<thing>_${stamp()}`.
- No `waitForTimeout`. Wait on conditions (`expect(...).toBeVisible/Enabled`).

## Selectors
- Order of preference: `getByRole` / `getByLabel` → `input[name=…]` (forms are schema-driven, names match the API) → visible text.
- Never use `css-xxxx` classes, `#mui-N` / `:rN:` ids, or `Mui*` layout classes.
- Some frontend-v2 popups sit inside an `aria-hidden` container, so `getByRole` finds nothing there. Use `locator('button', { hasText })`.
- Explore the real UI before writing (Playwright MCP, `npx playwright codegen localhost:3000`, or a throwaway script).

## Known UI facts
- Opening an unlinked connector pops up a "Link a Data Warehouse to this Datasource" modal at once; the page behind it is
  aria-hidden, so role selectors only see the modal. Linking happens in that modal.
- "Is this connector linked?": read "+ Data Pipelines" (enabled iff linked, from the first frame). The modal and the
  unlink button only appear after loading; `goToConnector` does this and returns `linked`.
- After a delete, the "N Configured Data Pipelines" header sometimes stays stale until you navigate away. Don't assert on it right after.
- Any popup left open (e.g. the link modal after unlinking) hides the sidebar from roles; `readySidebar` presses Escape first.
- ETL in the sidebar opens a flyout (My Connectors = linked ones only; All Connectors = every connector, with search).
  That search filters in the browser (no server call), so results are final the moment the name is typed: check once,
  never wait for a card. It ignores case and matches parts of names; choreo requires the exact name (`.Connector-title1`
  on each card, the app's own class) and otherwise fails at once, listing what the search found.
- A connector's warehouse can be unlinked only after all its pipelines are deleted and the page is refreshed.
  The unlink button holds a `LinkOffIcon` and stays disabled while pipelines exist.
- MUI icons are aria-hidden but carry `data-testid="<IconName>"` (e.g. `DeleteOutlineOutlinedIcon`). Use `getByTestId` for icon-only buttons.
- Pipeline delete uses a browser `confirm()`: register `page.once('dialog', d => d.accept())` before clicking.
- With 0 pipelines the Configured Data Pipelines tab renders no table and no search box. Read the "N Configured Data Pipelines" header first.
- Create-pipeline wizard: the "Add All" fields button is named `move all right` (its aria-label). "Run after save" is ticked by default.
  Only step 2 ("Report Details") differs per report. Its Fields picker has two lists (available, selected); clicking an
  available field moves it over. Each list also has an empty `<li>`, so count only items with a heading.
- A pipeline's page header shows "(Last Run - STATUS)". It reads QUEUED/RUNNING while a run is in progress and "No Run Initiated" before any run.
- Actions and checks are separate tasks. Checks are named `expect…` and only look at the UI (no DB or API).

## Done means
`npm run flow <a flow using the new task>` passes 3 times in a row (add `-- --repeat-each=3`).
