# Cross-device sync

Goal: one family's budget on several devices, with each family's data kept
apart by the server, and no password prompt each time the app opens.

Status: planned. Nothing below has been built yet.

## Decisions

- **CouchDB, with a database per user.** `couch_peruser` gives each CouchDB
  user a database named `userdb-<hex(username)>` that only that user and
  server admins can open, and `configureSync` in `src/data/database.js`
  already targets it. There's no lock-in: CouchDB is an open protocol, so
  changing host is a replication.
  - Couchbase was rejected: Couchbase Lite JS would replace PouchDB, and the
    free Capella cluster shuts off after 72 idle hours.
  - DynamoDB was rejected: the sync would have to be written by hand.
    Amplify DataStore, AWS's ready-made version, reaches end of life May 1,
    2027.
- **One login per family.** Spouses share the credentials, so one user is
  one budget. The cost: one device can't be revoked without changing the
  password everywhere.
- **Generated transactions get fixed IDs** of the form
  `t-<source ID>-<period>`, so that two devices recording the same one make
  a single document, not two. If inserting one returns 409, it has already
  been recorded (by sync, or before an interruption), and the balances are
  left alone.
- **Signing in** takes a password once (`POST /_session`), which is never
  stored. After that, CouchDB's own `AuthSession` cookie carries the
  session. It's HttpOnly, set with `same_site = strict`, and
  `allow_persistent_cookies = true`. Its `timeout` must be short enough that
  CouchDB renews the cookie well inside Safari's 7-day cap.
- **The app and CouchDB are sibling subdomains**, so the cookie is sent on
  cross-origin requests without a proxy, the same way locally and in
  production. Safari caps the cookie at 7 days because the two servers are
  in different IP ranges; signing in again after a week without use is
  acceptable.

  | | App | CouchDB |
  |---|---|---|
  | Local | `http://localhost:8080` | `http://localhost:5984` |
  | Production | `https://budget.<domain>` (Pages) | `https://sync.<domain>` |

- **On iPhone, install the app to the home screen.** In a Safari tab, a
  site's IndexedDB is deleted after 7 days of Safari use without a visit to
  that site. An installed web app counts only the days it's used.
- Passkeys may replace the one-time password later, with a Lambda issuing a
  JWT cookie that the sync server passes on as a Bearer header. The sync
  code wouldn't change.

## Steps

Each step is its own release PR. Groundwork comes first, and sync stays
hidden until the last step.

- [ ] **1. Adopt budget-data 2.2.0.** Waiting on Matt to publish the spec.
  It's additive: `accountId: ""` means a transaction not tied to an account,
  and a negative amount is money going into a category. Update the README's
  Data Structure line and the spec version in `CLAUDE.md`, which still
  says 2.0.0.
- [ ] **2. Record each refill as a transaction.** The refill in
  `src/data/budget.js` goes through `recordTransaction` with
  `who: "Monthly refill"`, `accountId: ""`, and `-budgeted` as both the
  total and the category amount. It is dated noon on the 1st, and its ID is
  `t-<categoryId>-<yyyy-mm>`.
  - Catch up one month at a time, saving `refilled` after each, as
    `recordWhileDue` does. A category with nothing budgeted advances without
    a transaction.
  - Deleting a refill reverses it through `unrecordTransaction`.
  - `database.insert` needs a way to take a given ID.
- [ ] **3. Give recurring occurrences fixed IDs.** `recordWhileDue` in
  `src/data/recurringTransactions.js` records each occurrence as
  `t-<recurringId>-<yyyy-mm-dd>`.
- [ ] **4. Spike: sync as it is today, locally.** No code and no release.
  Use `make db` with users A and B. Check that two browser profiles signed
  in as A sync both ways, that B sees nothing and gets a 401 or 403 from A's
  database, and what happens when A records an expense offline on both
  profiles in the same category.
- [ ] **5. Sign in with CouchDB's session cookie.** The Settings form posts
  to `/_session`. `configureSync` drops the Basic Auth `fetch` wrapper for
  `credentials: 'include'` and gets the username from `GET /_session`. Add
  the cookie settings to `db-config/couchdb/docker.ini`, and check when
  CouchDB renews the cookie.
- [ ] **6. Resume sync at launch.** If `GET /_session` says the session is
  still valid, start sync. If not, keep working offline and show a "Sign in
  to sync" prompt that doesn't block the app.
- [ ] **7. Pull before refilling.** In `startUp` (`src/App.svelte`), pull
  once (`replicate.from`) with a timeout of about 5 s before the refill and
  recurring step, then start live sync. Skip the pull immediately when
  offline or signed out. Also run the refill and recurring step after the
  first pull when a device signs in.
- [ ] **8. Production sync server.** Needs a domain, the Pages custom domain
  (a GitHub setting, so Matt's call), and a CouchDB host on `sync.<domain>`
  with TLS, `couch_peruser`, CORS for `budget.<domain>`, and the cookie
  settings. Layerbase ($15/mo) needs checking for custom-domain support;
  your own server with Caddy (about $5/mo) supports one. Set the app's
  default server per environment. Test on an iPhone with the app installed.
- [ ] **9. Show sync in the app.** Restore the gear button that's commented
  out in `src/views/Budget.svelte`. Settings is the last screen on the old
  design.

Parts 2, 3 and 7 are verified by Gherkin scenarios, with the wording
approved before any steps are written. The fixed-ID steps also seed the
generated transaction, as though it had arrived by sync, and check that the
balance doesn't change. The UI suite runs no CouchDB, so steps 4 to 6 are
checked by hand against `make db`.

## Not solved here

- **Category balances.** `remaining` is read, changed and written back, so
  two offline edits to one category keep only one of them. Steps 2, 3 and 7
  make this rarer; only deriving balances from transactions ends it.
- **Merging existing data.** Signing a device that already has its own data
  into an account merges two budgets.

## Sources

- [CouchDB: database per user](https://docs.couchdb.org/en/stable/config/couch-peruser.html)
- [CouchDB: auth config (cookie, JWT)](https://docs.couchdb.org/en/stable/config/auth.html)
- [CouchDB security](https://docs.couchdb.org/en/stable/intro/security.html)
- [Safari 16.4 IP-based cookie cap](https://louder.com.au/2023/07/06/apple-itp-targets-http-cookies-with-7-day-cap/)
- [Couchbase Lite JS release notes](https://docs.couchbase.com/couchbase-lite-javascript/current/releasenotes.html)
- [Capella free tier](https://docs.couchbase.com/cloud/get-started/create-account.html)
- [Layerbase: serverless CouchDB](https://layerbase.com/blog/serverless-couchdb)
- [Amplify DataStore deprecation (via RxDB)](https://rxdb.info/articles/alternatives/aws-amplify-datastore-alternative.html)
