# choreo — rules for Claude

Playwright (TypeScript) UI automation against a local d-l (frontend `localhost:3000`).

## Concepts
- **Task** (`tasks/<camelName>.ts`): one atomic UI operation, written carefully in code. The file name is the task name.
  It exports `defineTask({ description, inputs, run })`. `run(page, input)` returns values for later steps (e.g. `{ name }`).
- **Flow** (`flows/<kebab-name>.yaml`): `description`, `params` (with defaults) and `steps`. Each step is `- taskName: { input: value, as: label }`.
  `$param` or `$label.field` refers to a param or to an earlier step's result.
- **Page** (`pages/<screen>.ts`): the only place selectors live. Tasks use pages; they never use raw selectors.
- `core/`: loader, checker, runner and CLI. Keep it small; features are added incrementally.

## When asked for a flow
Use existing tasks (`npm run list`). Only add a task if an operation is missing.

## Task rules
- Strict: do exactly what the name says, or throw a clear error. Never silently "fix" state.
  (e.g. linkConnector throws if the connector is already linked)
- Confirm the result at the end (reload and check), so a passing task means it really happened.
- No cleanup inside tasks or flows. Cleanup is its own flow.
- Defaults come from `config.ts` (d-l values), so any d-l works. Never hard-code URLs or creds elsewhere.
- Unique names for created things: `choreo_<thing>_${stamp()}`.
- No `waitForTimeout`. Wait on conditions (`expect(...).toBeVisible/Enabled`).

## Selectors
- Order of preference: `getByRole` / `getByLabel` → `input[name=…]` (forms are schema-driven, names match the API) → visible text.
- Never use `css-xxxx` classes, `#mui-N` / `:rN:` ids, or `Mui*` layout classes.
- Some frontend-v2 popups sit inside an `aria-hidden` container, so `getByRole` finds nothing there. Use `locator('button', { hasText })`.
- Explore the real UI before writing (Playwright MCP, `npx playwright codegen localhost:3000`, or a throwaway script).

## Known UI facts
- A connector's warehouse can be unlinked only after all its pipelines are deleted and the page is refreshed.
  The unlink button holds a `LinkOffIcon` and stays disabled while pipelines exist.
- MUI icons are aria-hidden but carry `data-testid="<IconName>"` (e.g. `DeleteOutlineOutlinedIcon`). Use `getByTestId` for icon-only buttons.
- Pipeline delete uses a browser `confirm()`: register `page.once('dialog', d => d.accept())` before clicking.
- With 0 pipelines the Configured Data Pipelines tab renders no table and no search box. Read the "N Configured Data Pipelines" header first.

## Done means
`npm run flow <a flow using the new task>` passes 3 times in a row (add `-- --repeat-each=3`).
