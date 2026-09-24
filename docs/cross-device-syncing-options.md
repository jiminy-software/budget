# Cross-device sync: CouchDB, plus making it safe to use

## Context

Phase 8 of `docs/modernization-plan.md` picked Couchbase Capella. Having
compared Couchbase, hosted CouchDB and DynamoDB, Matt is switching to
**CouchDB, with one login per family**. Spouses share the same credentials,
so as far as the app is concerned, one user is one budget.

Syncing in both directions also exposes things each device currently does
on its own when it loads, which would then double up across devices. The
work below prevents that. It also keeps a device signed in without storing
credentials where JavaScript can read them, in the same way locally and in
production, and on iPhones.

## Why CouchDB with per-user databases

- `configureSync` (`src/data/database.js`) already syncs with
  `userdb-<hex(username)>`, which is what CouchDB's `couch_peruser` setting
  creates. The local CouchDB that `make db` starts already has that setting
  on.
- **Separation is built into CouchDB.** Creating a user creates a database
  that only that user and server admins can open. A second family is a
  second user.
- **No lock-in.** It's an open protocol, so changing host is a replication.
- **The cost of one shared login:** you can't revoke one device without
  changing the password on every device.

Couchbase: Lite JS works in a browser now (1.0 in Nov 2025), but it would
replace PouchDB, and the free cluster shuts off after 72 idle hours.
DynamoDB: you would write the sync yourself, and Amplify DataStore (AWS's
ready-made version) reaches end of life May 1, 2027.

## 1. Spike: sync as it is today, locally (no code)

1. Run `make db`, then create users A and B by hand as admin
   (`PUT /_users/org.couchdb.user:<name>`). Confirm each gets its own
   `userdb-...` database.
2. Sign two browser profiles in as A at `#/settings` and check that expenses
   sync both ways.
3. Sign a third profile in as B. Check that its budget is empty and that B
   gets a 401 or 403 from A's database.
4. Measure a conflict: take both of A's profiles offline, record an expense
   in the same category on each, then reconnect.

## 2. Record each refill as a transaction

Right now `refillBudgetCategories` (`src/data/budget.js`) changes
`remaining` without leaving any record. Instead, record one transaction per
category per month, through `recordTransaction`
(`src/data/transactions.js`):

- `who: "Monthly refill"`, `accountId: ""`, `amountTotal: -budgeted` and
  `categoryAmounts: { <categoryId>: -budgeted }`. A negative amount means
  money going into the category. Its timestamp is noon on the 1st of the
  month refilled (`getNoonTimestamp`).
- The views already skip the account lookup when `accountId` is falsy, so an
  empty string needs no new handling there.
- Catch up one month at a time, saving `refilled` after each month, the way
  `recordWhileDue` saves `nextDue`. A category with nothing budgeted just
  advances `refilled` without recording a transaction. `fillBudgetCategory`,
  a new category's first fill, records one refill for the current month.
- Deleting a refill from the transaction screen reverses it, because
  `unrecordTransaction` adds back the negative amount.
- **Spec:** bump budget-data to 2.2.0. It's additive: the spec doesn't
  require amounts to be positive or `accountId` to point at an existing
  account. Document `accountId: ""` as "not tied to an account", and
  negative amounts as money into a category. Update the README's Data
  Structure line. That repo is on GitHub, so pushing to it needs Matt's
  go-ahead.

## 3. Fixed IDs for generated transactions

One rule for both kinds: a generated transaction's ID is
`t-<source ID>-<period>`. It's unique because category IDs start with `c-`
and recurring ones with `r-`.

- Refill: `t-<categoryId>-<yyyy-mm>`, e.g. `t-c-3f2a...-2026-09`.
- Recurring occurrence, recorded by `recordWhileDue`
  (`src/data/recurringTransactions.js`): `t-<recurringId>-<yyyy-mm-dd>`,
  e.g. `t-r-9b1c...-2026-09-24`.
- Add a way to insert a transaction under a given ID. Today
  `database.insert` always generates a random UUID.
- In `recordTransaction`, if that insert returns 409 (the transaction
  already exists, having arrived by sync), skip touching the category
  balances. The insert already happens before the balance changes.
- If two devices both recorded it before syncing, the result is one document
  with a conflict, not two transactions.

## 4. Stay signed in: CouchDB's session cookie, on sibling subdomains

**Hosting.** Keep the app and CouchDB on separate origins that share a
site. That's the same setup locally and in production, with no proxy in
either:

| | App | CouchDB | Same site because |
|---|---|---|---|
| Local | `http://localhost:8080` | `http://localhost:5984` | Ports don't count toward "site" |
| Production | `https://budget.<domain>` (Pages, custom domain) | `https://sync.<domain>` | Both share `<domain>` |

- `SameSite=Strict` cookies are sent on these cross-origin requests, because
  SameSite checks the site, not the origin. CORS with credentials is still
  required. `db-config/couchdb/docker.ini` already allows it for
  `localhost:8080`, and production adds the `budget.<domain>` origin.
- Safari caps the cookie at 7 days, because the two servers are in different
  IP ranges. Matt accepts that: after a week without use, you sign in again.
- Needs a domain name. Pointing Pages at a custom domain is a GitHub setting,
  which needs Matt's go-ahead. The CouchDB host must allow a custom domain
  with TLS: your own server on AWS with Caddy does, and Layerbase is to be
  checked.

**Sign-in.** Enter the password once, as a `POST /_session`, and never
store it. The username, needed for the `userdb-...` name, comes back from
`GET /_session`. CouchDB replies with its own `AuthSession` cookie, which
JavaScript can't read:

- Settings in `[chttpd_auth]`: `same_site = strict` and
  `allow_persistent_cookies = true`. Pick a `timeout` short enough that
  CouchDB renews the cookie well inside Safari's 7 days while the app is in
  use. The spike confirms when it renews, from the `Set-Cookie` headers.
- `configureSync` drops the Basic Auth `fetch` wrapper and uses
  `credentials: 'include'`. The Settings form posts to `/_session` instead of
  passing the password along.
- On load, `GET /_session` tells whether the session is still valid. If it
  has expired, the app keeps working offline and shows a "Sign in to sync"
  prompt, rather than a sign-in screen that blocks it.
- Passkeys can be added later without touching the sync code. A Lambda would
  issue a JWT cookie, and the sync server would pass it on as a Bearer
  header.

**iPhone:** use the app installed to the home screen. In a Safari tab, a
site's IndexedDB (PouchDB's data) is deleted after 7 days of Safari use
without a visit to that site. An installed web app counts only days the app
itself is used.

## 5. Pull before refilling

In `startUp` (`src/App.svelte`):

1. If the device is signed in and online, do one pull from the server
   (`replicate.from`), with a timeout of about 5 s.
2. Then run the refill and record any due recurring expenses.
3. Then start live two-way sync.

Skip the pull at once when `navigator.onLine` is false, or when the session
has expired (a 401), so offline start-up stays as fast as it is now and the
PWA offline scenarios still pass. Also run the refill and recurring step
right after the first pull when signing in on a device.

## 6. Hosted test from a real phone

Set up the domain, the Pages custom domain, and a CouchDB host on
`sync.<domain>`. Turn on `couch_peruser`, apply the cookie settings above,
and repeat the spike's steps 1–3 on an iPhone with the app installed.

## Still unsolved (separate planning)

- **Category balances.** `remaining` is read, changed and written back, so
  two offline edits to one category keep only one of them. Parts 2, 3 and 5
  make this rarer, but only deriving balances from transactions ends it.
- **Merging existing data.** Signing a device that already has its own data
  into an account merges two budgets.

## Afterwards

- Rewrite Phase 8 of `docs/modernization-plan.md` to match this plan,
  keeping it short.
- Update the project memory `modernization-plan.md`, which still says
  "Matt chose Couchbase Capella".
- Correct the spec version in `CLAUDE.md` (it says 2.0.0; the README says
  2.1.0).

## Verification

- Parts 2 and 3: Gherkin scenarios, approved by Matt before any step
  definitions are written. Seed a refill, or a recurring occurrence, under
  its fixed ID with the category still behind, as though it arrived by
  sync. Then check that loading the app leaves the balance unchanged and
  shows one row. Also check that a normal refill appears on the Transactions
  screen as "Monthly refill".
- Parts 4 and 5: by hand against `make db`. The UI suite doesn't run a
  CouchDB. Close and reopen the app and check there's no prompt. Check the
  cookie is HttpOnly and `SameSite=Strict` in DevTools, and check when
  CouchDB renews it. Check that a device offline at load starts as fast as
  before.
- `make test` passes after each part.

## Sources

- [CouchDB: database per user](https://docs.couchdb.org/en/stable/config/couch-peruser.html)
- [CouchDB: auth config (cookie, JWT)](https://docs.couchdb.org/en/stable/config/auth.html)
- [CouchDB security](https://docs.couchdb.org/en/stable/intro/security.html)
- [Safari 16.4 IP-based cookie cap](https://louder.com.au/2023/07/06/apple-itp-targets-http-cookies-with-7-day-cap/)
- [Couchbase Lite JS release notes](https://docs.couchbase.com/couchbase-lite-javascript/current/releasenotes.html)
- [Capella free tier](https://docs.couchbase.com/cloud/get-started/create-account.html)
- [Layerbase: serverless CouchDB](https://layerbase.com/blog/serverless-couchdb)
- [Amplify DataStore deprecation (via RxDB)](https://rxdb.info/articles/alternatives/aws-amplify-datastore-alternative.html)