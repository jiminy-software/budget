# Modernization Plan: Vite + Svelte 5 + PWA

Goal: get this app to a state where a real user can install it on their phone
and use it offline, running on a current version of Svelte, with cross-device
sync as a later, separable project.

Guiding constraints:

- Stay a static SPA — no backend of our own, no SSR (plain Vite Svelte
  template, **not** SvelteKit).
- The Cucumber/Puppeteer UI tests drive the built app in a real browser, so
  they are framework- and bundler-agnostic. They are the safety net for every
  phase; each phase ends with the suite green.
- Keep document shapes compatible with the budget-data 2.0.0 spec.

## Phase 0 — Build the safety net

Starting state: the suite was a single smoke test (the Budget heading
renders). That is not enough coverage to migrate against, so this phase
*adds* the scenarios that define "the app works".

**Status: complete.** All items below are done and the exit criteria are met.

Decisions made:

- **Hybrid test-data strategy**: scenarios drive the UI for the behavior
  under test, but prerequisite data is seeded directly into PouchDB via a
  small helper (`page.evaluate` against a test hook the app exposes on
  `window`). Seeding is also the only way to test monthly refill, which
  requires a category with a past `refilled` month.
- Each scenario gets a fresh Puppeteer browser (empty IndexedDB), so
  scenarios are isolated and each creates/seeds its own data.
- Seeded refill months are expressed relatively ("last refilled two months
  ago") and resolved at runtime by `yearMonthMonthsAgo` in the step
  definitions, so the tests never go stale as real time passes.

- [x] Verify `npm run test:ui` / `make test` passes as-is (baseline).
- [x] Add a tiny test hook in `src/data/database.js` exposing the PouchDB
  instance (`window.__budgetDb`) so the seeding helper can insert docs.
  Gated to `localhost`/`127.0.0.1` so it is not exposed by the deployed
  app. **Do not "improve" this into a build-time gate** (`NODE_ENV`, or
  `import.meta.env.DEV`): the suite builds and serves the *production*
  bundle, so a dev-only gate silently removes the hook and every seeded
  scenario fails.
- [x] Add scenarios covering category creation, account creation, the
  multi-step expense flow, monthly refill, and the two `:id` detail views.
- [x] Step-definition/World improvements those scenarios need (navigation
  helpers, the seeding helper).
- [x] Replace the fixed 2-second server-start sleep in
  `features/support/hooks.js` with an actual readiness check. Also fixed:
  Node 20.12+ on Windows requires `shell: true` to spawn `.cmd` files.

The scenarios themselves live in `features/budget.feature`; that file is the
single source of truth for their wording. Changing an existing scenario's
wording needs Matt's approval first.

Deferred (wanted later, not a blocker): assert that a recorded transaction
appears on the applicable account detail view, and similarly on the category
detail view.

Exit criteria: suite covers the flows above and passes reliably, twice in a
row, before any migration work starts. **Met** — 7 scenarios / 34 steps,
green on repeated consecutive runs.

## Phase 1 — Move to Vite + Svelte 5 in one hop

**Status: complete.** Svelte 5 runs the Svelte 3 components in legacy mode,
so this was a build swap rather than a rewrite — no component was changed for
syntax reasons.

- [x] Vite scaffold, applied in place rather than into a fresh directory
  (same end state, less churn): `vite.config.mjs`, an `index.html` that loads
  `/src/main.js` as a module, and the bootstrap/global stylesheets moved to
  `src/styles/` so they are bundled instead of hand-linked.
- [x] Entry point: `new App({...})` in `src/main.js` became `mount(App, ...)`.
- [x] Replaced `fa-svelte` with `src/components/Icon.svelte`, which draws the
  path data `@fortawesome/free-solid-svg-icons` already exports.
- [x] `svelte-spa-router` 5 works under Svelte 5; the hand-rolled fallback
  router was not needed. Routing stays hash-based.
- [x] Dropped `uuid` for `crypto.randomUUID()`.
- [x] PouchDB under Vite: it wants Node's `EventEmitter`, which Vite leaves
  out of browser builds. Fixed by aliasing `events` to the npm package of
  that name — the `global` shim this plan anticipated was not needed.
- [x] Vite `base`: `'./'` rather than `'/budget/'`. Relative works both under
  the GitHub Pages path and at the root of the static server the UI tests
  use, and hash routing needs no path prefix either way.
- [x] `features/support/hooks.js` builds with Vite and serves `dist/`.
- [x] Docker image moved from node:18 to node:20, which Vite requires. The
  Makefile needed no changes.

Exit criteria: `npm run dev` and `npm run build` work; the full Phase 0 suite
passes against the Vite build; manual smoke test of the sync setup screen at
`#/settings` (its button is hidden — see the sync phase). **Met.**

## Phase 2 — Deploy from CI

Pulled forward from what used to be a later tooling phase: Phase 1 changes
the shape of the build output, so it has to be paired with a change to how
the site is published.

Motivation, found during Phase 0: the committed bundles had silently gone
**nine commits stale** — last rebuilt 2025-09-19 while `src/` kept changing
through 2025-09-27 — so the live site was serving older code than `main`, and
the whole sync/Settings feature had never actually been deployed. The
pre-push hook only caught that if it was installed, and it was opt-in.

- [x] `.github/workflows/ci.yml` runs the UI suite on every push and pull
  request; on `main`, and only if that suite passed, it builds and deploys
  `dist/` to GitHub Pages. The suite builds the app itself before serving it,
  so a broken build fails the test job too.
- [x] Build output gitignored; the committed `assets/` bundles and the
  opt-in pre-push rebuild hook are gone.
- [x] Set the repository's Pages source to "GitHub Actions" (Settings →
  Pages). This is a repo setting, not something that lives in the codebase.

Noted while switching that setting over: the workflow's deploy job succeeds
either way — the setting controls what Pages *serves*, not whether a
deployment is accepted. So a green deploy job is not by itself proof the live
site is serving what CI built.

**Status: complete**, verified live on 2026-08-20. Exit criteria met: a push
to `main` publishes the current source to https://forevermatt.github.io/budget/
with no manual build step, and the `window.__budgetDb` test hook is correctly
absent from the deployed origin.

## Phase 3 — Refill before the first render

A quirk found during Phase 0, worth its own small phase because it is an app
behavior fix rather than migration work.

`refillBudgetCategories()` raced the first render and lost deterministically:
Svelte runs a child component's `onMount` before its parent's, so
`BudgetOverview` always read category balances before `App`'s `onMount` had
finished refilling them, and the overview showed pre-refill amounts until
something reloaded the page.

- [x] Start the refill during `App`'s initialisation and hold the router
  until it resolves, so the first render is the correct one.
- [x] Drop the reload-and-retry tolerance the overview assertion in
  `features/support/world.js` needed to work around it.

Exit criteria: the refill scenario passes with no reload tolerance in the
test helper. **Met.**

## Phase 4 — PWA

PouchDB already keeps all data on-device; this phase adds offline delivery
of the app shell.

**Status: complete**, verified on a real device on 2026-08-27.

- [x] Add `vite-plugin-pwa`: service worker precaching the built assets,
  `registerType: 'autoUpdate'`. The relative `base` did not fight the plugin
  after all — registration, the precache manifest and the navigation fallback
  all come out as relative URLs, which resolve correctly both under the Pages
  subpath and at the root of the test server. The `base: '/budget/'` fallback
  this plan held in reserve was not needed. Worth knowing: `includeManifestIcons`
  defaults on and, with icons already swept up by `globPatterns`, listed each
  of them in the precache manifest twice.
- [x] Web app manifest: name, colors, icons (192/512 px, maskable, plus Apple
  touch icon for iOS Add-to-Home-Screen). The open question this item carried
  is settled: Matt supplied artwork, and `img/logo.svg` is now the source of
  record. `npm run icons` (`scripts/generate-icons.mjs`) rasterises every size
  from it with Puppeteer, which the UI tests already depend on, so there is no
  hand-maintained icon set and no new image tooling to install. The maskable
  icon is made by shrinking only the artwork and leaving the SVG's gradient
  background full-bleed, which keeps the bird inside the safe zone without
  leaving a seam. iOS decides standalone launch from its own meta tags rather
  than the manifest's display mode, so `index.html` carries those too.
- [x] Verify the app is installable. Not with Lighthouse: version 12 removed
  the PWA category outright, so the `installable-manifest` audit this plan
  assumed no longer exists (confirmed against Lighthouse 13.4.1). Chrome's own
  verdict is a better check anyway — it fires `beforeinstallprompt` only when
  it judges an app installable, it does fire here, and it fires in headless,
  so the suite can assert on it.
- [x] Keep the UI suite honest about the service worker. It does register and
  take control during test runs: the page is already controlled by the time
  the first load settles. No flakiness appeared, across repeated full runs.
  Rather than suppress the worker, three scenarios now depend on it, so it is
  exercised rather than tolerated. Each was checked against a build with the
  plugin removed, to confirm it fails without it; and Puppeteer's offline mode
  was checked to confirm it really does cut the network, so that those
  scenarios cannot pass for want of anything to block.
- [x] Real-device test: installed to the home screen, recorded an expense in
  airplane mode, relaunched, went back online. Run against the deployed site
  rather than the dev server over a LAN IP, because `crypto.randomUUID()`
  (used for every document id) only exists in a secure context.

Exit criteria: installable on a phone and fully usable offline. **Met.**

## Phase 5 — Tooling cleanup (optional, recommended)

**Status: complete.**

- [x] Verify the Docker dev/build path still works. It does, and `make test`
  now runs the UI suite in the container again rather than on the host. Two
  things were in the way: the `node:20` base image carries none of the shared
  libraries Chrome needs to start, and a Chrome downloaded during a
  `--rm` run is discarded with the container. Chrome therefore lives in a
  named volume populated by `make install`, alongside `node_modules` and for
  the same reason — that keeps it matched to the installed puppeteer, which
  baking it into the image would not. Docker turned out to be less friction
  than expected, so the item below is not needed.
- [~] Shrink Docker to just the CouchDB container — the fallback if the above
  had failed. It didn't, and Matt wants the isolation, so this is dropped.
- [x] Bump node:20 to node:24 in the Dockerfile and the deploy workflow —
  24 rather than the 22 this item named, since 22 bought nothing once 24
  proved green. node:24 is still Debian bookworm, so the Chrome library names
  above did not change. Note this does **not** silence GitHub's Node 20
  deprecation warning: that is about the runtime the actions themselves run
  on, and needs newer action majors, not a different `node-version`.

## Phase 6 — Harden the CI workflow

The Node 24 bump in Phase 5 did not clear GitHub's Node 20 deprecation
warning, and was never going to: `node-version` picks the Node our build and
tests run on, while the warning is about the runtime the actions themselves
declare in their own manifests. Only newer action majors fix that.

- [x] Bump `actions/checkout` (v7.0.1), `actions/setup-node` (v7.0.0),
  `actions/upload-pages-artifact` (v5.0.0) and `actions/deploy-pages` (v5.0.0)
  to majors that run on Node 24. Verified at the pinned SHAs rather than
  assumed: each declares `using: node24`, and `upload-pages-artifact` is a
  composite whose only inner action, `actions/upload-artifact` v7.0.0, does
  too.
- [x] Pin each action to a commit SHA rather than a tag. A tag can be moved to
  point at different code; a SHA cannot. The trailing comment names both the
  SHA and its version (`# 3d3c42e = v7.0.1`) so it stays true, if outdated,
  should the pin ever be updated without it. Tags resolve to full SHAs with
  `git ls-remote https://github.com/actions/checkout refs/tags/v7.0.1`, which
  needs no API access and no authentication.
- [x] Add `.github/dependabot.yml` for the `github-actions` ecosystem,
  monthly and grouped. Note the trap: Dependabot raises **no** security alerts
  for SHA-pinned actions, only for ones using semantic versioning, so pinning
  buys immutability at the cost of advisory alerting. Scheduled version
  updates are therefore the only thing that refreshes a pin. Grouping keeps a
  refresh to one PR, and monthly is plenty for four actions that publish a few
  times a year.

Exit criteria: CI passes with every action pinned, and the Node 20
deprecation warning is gone.

## Phase 7 — Adopt Svelte 5 idioms (optional, no deadline)

- [ ] `npx sv migrate svelte-5` (or convert by hand as files are touched):
  runes (`$state`, `$props`, `$derived`), event attribute syntax, etc.
  Pure modernization; can trail indefinitely.

## Phase 8 — Cross-device sync (separate project)

Moved to `docs/cross-device-syncing-options.md`: CouchDB rather than
Couchbase, released in small steps.

## Sequencing

Phases 0 → 1 → 2 → 4 were the critical path to "installable, offline-usable
on a phone," and are done. Phases 5–8 are independent follow-ons.

(A storage interface to avoid lock-in is no longer needed: sync
keeps PouchDB and speaks CouchDB's open protocol.)
