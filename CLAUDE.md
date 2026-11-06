# E2E2 — rules for adding flows

Playwright (TypeScript) UI flows run against a local d-l (frontend `localhost:3000`).

## Layout
- `pages/<screen>.ts`: the only place selectors live, one file per screen. Edit one when the UI changes.
- `flows/<verbNoun>.ts`: one atomic action, e.g. `addPostgresWarehouse(page, opts)`. It takes options, returns what the next flow needs (names, ids), and uses only `pages/`.
- `journeys/<name>.spec.ts`: what people run. It combines flows and asserts the result.
- `config.ts`: every env-dependent value, with a d-l default. Never hard-code URLs or creds elsewhere.
- `auth.setup.ts`: logs in once; every journey starts already logged in.

## Rules
- Add new files. Don't change existing flows/journeys unless the UI really changed.
- Selectors, in order of preference: `getByRole` / `getByLabel` → `input[name=…]` (forms are schema-driven, names match the API) → visible text.
  Never use `css-xxxx` classes, `#mui-N` / `:rN:` ids, or `Mui*` layout classes.
- Some popups in frontend-v2 sit inside an `aria-hidden` container, so `getByRole` finds nothing there. Use `locator('button', { hasText })`.
- No `waitForTimeout`. Wait on a condition instead (`expect(...).toBeVisible/Enabled`).
- Names you create are unique: `e2e2_<thing>_${stamp()}`.
- Data must come from d-l's own seed and containers (e.g. `postgres-warehouse`), not cloud accounts, so any d-l can run it.
- Explore the real UI before writing (Playwright MCP, `npx playwright codegen localhost:3000`, or a throwaway script).
- Done = `npx playwright test <name> --repeat-each=3` passes.
