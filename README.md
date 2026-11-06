# E2E2

UI flows for DataChannel. They run against whichever d-l is up on `localhost:3000`.

## Setup (once)

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm test                    # all flows
npm test -- postgres        # only flows whose file name matches "postgres"
npm run watch -- postgres   # same, with the browser visible
npm run ui                  # pick and watch flows in Playwright's UI
npm run report              # open the last run's report (screenshots, video, trace)
```

Defaults match d-l. To change anything (URL, login, warehouse creds), set it in a `.env` file. Keys are in `config.ts`.

## Add a flow

Ask Claude: *"add a flow that …"*. It follows `CLAUDE.md`.
