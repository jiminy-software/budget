# Cross-device sync: which option to try first

## Context

Phase 8 of `docs/modernization-plan.md` picked Couchbase Capella, then made
its first step a spike to check whether a browser can sync with it at all.
Matt is reconsidering and weighing three options: Couchbase, hosted CouchDB,
or DynamoDB. The goal is a family's budget on several devices, with one
family never able to see another's data.

**Decision:** one login per family. Spouses share the same credentials, so as
far as the app is concerned, one user is one budget.

## Recommendation: CouchDB, using its per-user databases

The code is already written this way. `configureSync` in
`src/data/database.js` syncs with `userdb-<hex(username)>`, which is how
CouchDB's `couch_peruser` feature names each user's database. The local
CouchDB that `make db` starts already has `couch_peruser` turned on
(`db-config/couchdb/docker.ini`).

- **Separation is built into CouchDB.** Once `couch_peruser` is on, creating
  a user in `_users` makes CouchDB create that user's database, which only
  that user (and server admins) can open. The app never decides which data a
  user may see. A second family is simply a second user.
- **Several devices** means signing in as the same user on each.
- **No lock-in.** CouchDB is an open protocol, so moving to another host is
  just a replication. The stored documents don't change, so they stay on
  budget-data spec 2.0.0.
- **Cost of sharing one login:** you can't revoke one device or person
  without changing the password on every device. That's acceptable for a
  prototype.

Why not the others, even with one login each:

- **Couchbase (Capella + Couchbase Lite JS):** it works in a browser now
  (Lite JS 1.0 in Nov 2025, 1.0.2 in Sep 2026). But it means replacing
  PouchDB throughout `src/data/` and writing a Sync Function to keep users
  apart. The free cluster shuts off after 72 idle hours and is deleted
  after 30 days.
- **DynamoDB:** keeping families apart is easy (use the user's ID as the
  partition key), but you'd still write the sync yourself. AWS's ready-made
  version, Amplify DataStore, is deprecated, with end of life May 1, 2027.

## Hosts (choice pending)

The host must let you turn on `couch_peruser`, which means having server
admin access.

| Host | Cost | Notes |
|---|---|---|
| Layerbase (unmodified CouchDB 3.5) | $15/mo flat, 7-day trial | Full admin access. Sleeps after 6 idle hours (~0.7 s to wake). A young company: everything here comes from its own blog. |
| Your own CouchDB on a VPS or Lightsail | about $5/mo | You handle patching, backups and HTTPS. |
| IBM Cloudant | Lite: free. Standard: about $77/mo | Doesn't appear to support `couch_peruser`, so you'd create each database and its access yourself. Capped at 20 databases on Lite and 200 on Standard. |

## The spike

1. **Local, free.** Run `make db`, then create two users by hand as admin,
   e.g. `PUT /_users/org.couchdb.user:<name>`. Confirm CouchDB creates a
   `userdb-...` database for each one.
2. Open the app in two browser profiles, sign both in as user A at
   `#/settings` (its gear button is still hidden), and check that expenses
   sync both ways.
3. Sign a third profile in as user B. Check that its budget is empty, and
   that `GET /userdb-<hex(A)>` with B's credentials gets a 401 or 403.
4. Measure conflicts instead of guessing about them (see below). Take both
   of A's profiles offline, record an expense in the same category on each,
   then reconnect.
5. **Hosted.** Once a host is chosen: turn on `couch_peruser` there, allow
   CORS from `https://jiminy-software.github.io`, then repeat steps 1–3 from
   a real phone using the GitHub Pages build.

The spike likely needs no code changes. Steps 2–4 run against code that
already exists.

## What syncing will show, whichever option you pick

Sharing one login doesn't stop two devices from editing the same document
without seeing each other's change. When that happens, CouchDB keeps one
version and quietly drops the other.

- **Category balances.** `remaining` is a running total that is read,
  changed, and written back (`addAmountToBudgetCategory` in
  `src/data/budget.js`). If two offline edits hit the same category, one of
  the subtractions disappears. The transaction itself survives; only the
  balance is wrong.
- **Refills and recurring expenses.** These run on each device when it
  loads (the "Known limits" in `docs/recurring-transactions-plan.md`). A
  recurring expense would be recorded twice, because each device gives its
  copy a different random UUID. Giving each occurrence a fixed ID instead,
  such as `t-<recurringId>-<date>`, makes the second copy a harmless
  conflict rather than a duplicate.
- **Merging existing data.** If two devices already hold separate data,
  signing both in merges two budgets into one. Only the first device should
  bring its data in.

Fixing these is its own piece of planning. The spike only proves they
happen.

## Afterwards

- Rewrite Phase 8 of `docs/modernization-plan.md` around CouchDB, keeping it
  short.
- Update the project memory `modernization-plan.md`, which still says
  "Matt chose Couchbase Capella".

## Verification

- Steps 1–4 above, run by hand against `make db`, and then against the host.
- `make test` still passes. The UI suite doesn't exercise sync, so this
  catches regressions only.

## Sources

- [CouchDB: database per user](https://docs.couchdb.org/en/stable/config/couch-peruser.html)
- [CouchDB security](https://docs.couchdb.org/en/stable/intro/security.html)
- [Couchbase Lite JS release notes](https://docs.couchbase.com/couchbase-lite-javascript/current/releasenotes.html)
- [Capella free tier](https://docs.couchbase.com/cloud/get-started/create-account.html)
- [Layerbase: serverless CouchDB](https://layerbase.com/blog/serverless-couchdb)
- [Layerbase: Cloudant caps](https://layerbase.com/blog/cloudant-deprecations-2026)
- [Per-user databases on Cloudant (Nolan Lawson)](https://gist.github.com/nolanlawson/9676093)
- [Amplify DataStore deprecation (via RxDB)](https://rxdb.info/articles/alternatives/aws-amplify-datastore-alternative.html)