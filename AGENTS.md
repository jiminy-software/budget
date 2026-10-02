# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and
others) when working with code in this repository. `CLAUDE.md` imports it.

## What this is

A budget-tracking web app built on envelope budgeting: categories hold a
monthly amount that refills, and expenses are recorded against accounts and
categories. It's a static single-page app with no backend of its own,
published to GitHub Pages at https://jiminy-software.github.io/budget/ and
installable as an offline PWA.

- **Code:** Svelte 5 with svelte-spa-router, bundled by Vite.
- **Storage:** PouchDB in the browser.
- **Sync:** CouchDB, in progress. See `docs/cross-device-syncing-options.md`.
- **Svelte syntax:** components are still written in Svelte 3 syntax, which
  Svelte 5 runs in legacy mode. Converting them to runes is a deliberate
  later step (Phase 7 in `docs/modernization-plan.md`), so don't mix runes
  into a legacy component.

## Commands

Run things in Docker through the `make` targets. That's the supported path,
and it's what CI matches. Use the host only when there's a reason to, and
say what the reason is.

```bash
make install   # npm install + Puppeteer's Chrome, in the container
make dev       # Vite dev server on http://localhost:8080
make test      # the whole UI suite (npm run test:ui)
make build     # production build to dist/ (gitignored)
make db        # local CouchDB 3 on http://localhost:5984, for sync work
make bash      # shell in the app container
make update    # npm update, then regenerate installed-versions.json
make list-deps # regenerate installed-versions.json from package-lock.json
```

Run one feature file or scenario by passing Cucumber arguments through npm.
`--name` takes a regular expression, so anchor it to match a single
scenario. Each run rebuilds the app first.

```bash
docker compose run --rm app npm run test:ui -- features/transactions-tab.feature
docker compose run --rm app npm run test:ui -- --name "^Record an expense$"
```

- **`node_modules`:** the container and the host each keep their own, because
  Vite installs a native binary for whichever platform installed it. After
  changing `package.json`, run `make install`, or `make test` tests the old
  dependency tree.
- **Puppeteer's Chrome** lives in a named volume, so `--rm` doesn't discard
  it.
- **Host runs** need Node 22, 24 or 26, because Cucumber 13 refuses to start
  on anything else.
- **Windows hosts:** the dev server in the container doesn't see host edits
  over the bind mount. Run `docker compose restart app` after changing a
  source file, or you'll be looking at stale code.
- **Linting and formatting:** there's no lint or format script.
  `.prettierrc` sets single quotes and bracket spacing.
- **Icons:** `npm run icons` regenerates every icon in `public/` from
  `img/logo.svg`. Edit the SVG and re-run it rather than editing the PNGs.

## Architecture

### Data layer (`src/data/`)

This is where the app's behavior lives; views are mostly thin wrappers
around it.

- **`database.js`** wraps one `PouchDB('budget')` and exposes `insert`,
  `get`, `update`, `deleteItem` and `list`. Document types are
  distinguished only by an `_id` prefix: `a-` account, `c-` category, `t-`
  transaction, `r-` recurring transaction, each followed by a UUID.
  `list(prefix)` is an `allDocs` range query over the prefix. There are no
  separate databases and no `type` field.
- **Entity modules:** `accounts.js`, `categories.js`, `transactions.js` and
  `recurringTransactions.js` are near-identical CRUD modules, one prefix
  each. Follow that pattern for a new type.
- **Balances.** Each category stores `budgeted`, `remaining` (both in
  cents), and `refilled` (`yyyy-mm`).
  - `recordTransaction` and `unrecordTransaction` in `transactions.js` are
    the only path by which an expense changes balances. Recording subtracts
    the transaction's `categoryAmounts` from each category's `remaining`, and
    deleting puts them back.
  - Balances are read-modify-write. Recurring expenses are therefore
    recorded one at a time, because two of them in one category would race.
- **Start-up.** `startUp` in `App.svelte` runs these in order, and the router
  stays unmounted until they finish, so no view renders a pre-refill
  balance:
  1. `refillBudgetCategories` (`budget.js`): adds `budgeted` for each month
     since `refilled`, capped at 100 months.
  2. `recordDueRecurringTransactions`: records each recurring expense while
     its `nextDue` is today or earlier, saving `nextDue` after each one so an
     interrupted catch-up can't repeat a month.
  3. The leftover-localStorage check in `migration.js`.
- **The expense flow.** The multi-screen flow (`/expense/new` through
  `/expense/review/`) builds up state in the `transactionInProgress` store,
  then saves once. The Review screen's "Repeats monthly" switch saves it as
  a recurring expense instead.
- **Errors.** `errors.js` holds the `appError` store, set with
  `setError(title, detail)` and rendered by `ErrorMessage.svelte`. Its
  `window.onunhandledrejection` handler is the global catch-all. A fault
  injected from a function defined inside Puppeteer's `page.evaluate` never
  reaches that handler, so install one with `evaluateOnNewDocument`.
- **Sync.** `configureSync` in `database.js` syncs live with the CouchDB
  database `userdb-<hex(username)>` (CouchDB's `couch_peruser` convention),
  using Basic Auth. It's unfinished and deliberately unreachable from the
  UI: only typing `#/settings` gets there. The planned design and its
  release steps are in `docs/cross-device-syncing-options.md`, which tracks
  the status of that work.
- **Test hook.** `database.js` exposes the database as `window.__budgetDb`,
  but only on localhost. The UI tests seed data through it, and they run
  the production bundle, so the hook can't be gated on the build mode.

### Data spec

Stored documents follow version 3.0.0 of the schema in the separate repo
`forevermatt/budget-data`, which the README records. Keep document shapes
compatible with it. Amounts are integer cents, and timestamps are
JavaScript milliseconds.

### Views, components, styling

- **Routes.** `src/views/routes.js` maps hash routes to views in
  `src/views/`. Reusable pieces live in `src/components/`.
- **Layout.** `App.svelte` wraps every view in `.container-xl.my-3`. A
  full-bleed header escapes it with
  `margin: -1rem calc(var(--bs-gutter-x) * -0.5) 0`.
- **The bottom bar** is `ButtonRow` (tabs, plus a slot), with one `Button`
  action on the right. A new screen supplies only its own action button.
- **Icons** are FontAwesome solid, drawn by `Icon.svelte` from
  `@fortawesome/free-solid-svg-icons` path data, with no wrapper package and
  no hand-drawn SVGs. An icon renders at 1em, so size it with a `font-size`
  on a wrapper.
- **Bootstrap 5.3** is compiled from Sass by `src/styles/bootstrap.scss`,
  which imports only the partials in use. A Bootstrap class the markup
  hasn't used before may need its partial added there, or it silently does
  nothing. Set Bootstrap variables at the top of that file rather than
  overriding compiled rules.
- **Colors** come from the CSS custom properties in that file's `:root`
  block, named as `docs/DESIGN.md` names them (`--primary`,
  `--surface-container-low`, and so on). Never write color literals in
  components; add a token from DESIGN.md when a screen needs one.
- **Styles** are scoped to each component. There's no global app
  stylesheet.
- **Typeface.** Plus Jakarta Sans is bundled through `@fontsource`, so it
  works offline.
- **Settings** is the one screen still on the old design.

### UI tests (`features/`)

Cucumber with Puppeteer. `features/support/hooks.js` builds the app, serves
`dist/` on port 5000, and drives it in headless Chrome. There are no unit
tests; the suite is the safety net.

- **Coupling to markup.** The suite finds elements through the real DOM, so
  a cosmetic change can break it. `features/support/world.js` is the
  inventory of the selectors, ids and heading texts it relies on. Change
  markup and `world.js` together.
- **Seeding.** Seed data with `world.seed` and the `seed*` helpers.
  `ensureAccount` and `ensureCategory` create a named item once. A category
  created that way has $100.00 budgeted and remaining.
- **Dates.** `Given today is YYYY-MM-DD` freezes the browser clock, so it has
  to be a scenario's first step.
- **Service worker.** It registers during test runs (`localhost` is a secure
  context), and the offline and installability scenarios in
  `features/budget.feature` depend on it.

### Build and deploy

`.github/workflows/ci.yml` runs the suite on every push and pull request. On
`main`, if the suite passes, it builds and deploys `dist/` to Pages. Actions
are pinned to commit SHAs, and Dependabot refreshes those pins monthly.

Two things in `vite.config.mjs` are load-bearing:

- `base: './'`, so the same build works under the Pages subpath and at the
  test server's root.
- The `events` alias, which gives PouchDB an `EventEmitter` in the browser.

## Working in this repo

- **Ask before choosing.** When a change has more than one reasonable
  implementation, ask the maintainer to choose rather than picking one and
  explaining afterwards.
- **Gherkin first.** Present new or changed Gherkin scenarios verbatim and
  get them approved before writing step definitions.
- **Scenario style.** Keep scenarios short. They read as the behavior, not
  the setup: no navigation steps a step can absorb, and no payee unless it
  matters. Every precondition that a Then asserts on is stated in a Given.
  There's one feature file per area.
- **Plan docs.** Plans live in `docs/*-plan.md`. Once a feature is
  releasable, cut its plan to a goal, a status line, and done and not-done
  bullets.
- **Branches.** Branch from `main` with `--no-track`, and keep each step
  small enough to be its own pull request back to `main`. Never force push,
  and ask before rewriting history. Ask before anything that touches GitHub:
  pushes, pull requests, `gh`, the API, or settings.
- **Commits.** Commit each coherent change separately. Subjects must paste
  verbatim as Keep a Changelog bullets ("Add...", "Fix...", "Remove..."),
  followed by at most a sentence or two on why.
- **Text in files.** Use LF line endings, ASCII only in source (no em
  dashes, curly quotes or arrows), and American spelling. Keep prose,
  comments and docs as short as still explains what the reader needs.

## Known, deliberate

- `npm audit` reports two moderate findings in `uuid@8.3.2`, reached only
  through `pouchdb-browser`, which is already at its latest release. They
  can't be reached here, because PouchDB only calls `uuid.v4()`. Don't
  re-investigate.
- `installed-versions.json` is generated by `make list-deps` and `make
  update`. Don't edit it by hand.
