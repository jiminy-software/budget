# Cross-device sync: which option to try first

## Context

Phase 8 of `docs/modernization-plan.md` picked Couchbase Capella, then made
its first step a spike to check whether a browser can sync with it at all.
Matt is now reconsidering and weighing three options: Couchbase, hosted
CouchDB, or DynamoDB. The goal is one family's budget shared across several
devices, with no family ever able to see another family's data.

## Recommendation: CouchDB first

- **It needs the least new code.** PouchDB already speaks CouchDB's
  replication protocol, and `configureSync` in `src/data/database.js` already
  does live two-way sync. `make db` already runs a local CouchDB 3 with CORS
  set up (`db-config/couchdb/docker.ini`).
- **No lock-in.** It is an open protocol, so moving to another host is just a
  replication. Couchbase would replace PouchDB throughout `src/data/`.
- **Separation is a server setting, not app logic** (see below). The stored
  documents don't change, so they stay on budget-data spec 2.0.0.

| Option | Cost | What it means here |
|---|---|---|
| **Layerbase** (hosted, unmodified CouchDB 3.5) | $15/mo flat, 7-day trial | Full admin access, no database-count cap. Sleeps after 6 idle hours (~0.7 s to wake) unless pinned on. A young company: everything here comes from its own blog. |
| **IBM Cloudant** (CouchDB-compatible) | Lite: free, 1 GB. Standard: about $77/mo | Since March 2025, new instances are capped at 20 databases on Lite and 200 on Standard. IBM Lite instances are deleted after 30 days of inactivity. |
| **Your own CouchDB** on a VPS or Lightsail | about $5/mo | $10/mo less than Layerbase, but you handle patching and backups. |
| **Couchbase Capella + Couchbase Lite JS** | Free tier; paid tier billed per hour (price not found) | Lite JS reached 1.0 in Nov 2025 (1.0.2 in Sep 2026), so the old spike's question is answered: it works. But the free cluster shuts off after 72 idle hours and is deleted after 30 days. Adopting it means replacing PouchDB and writing a Sync Function that assigns each household its own channel. |
| **DynamoDB** | pennies | You would be right to assume you'd write the sync yourself: tracking changes, deletions, conflicts, plus a Lambda API and auth. AWS's ready-made version (Amplify DataStore) is deprecated, end of life May 1, 2027. |

## Keeping each family's data separate (CouchDB)

A CouchDB **database** is what access control applies to. A member of a
database can read and write every document in it and nothing outside it.
Only server admins can create databases, change their `_security`, or
assign roles to users.

- **One database per household**, not per user: `budget-<random id>`. The
  current code targets `couch_peruser`'s `userdb-<hex(username)>`, which would
  give a husband and wife separate budgets, so it must change.
- Set the database's `_security` members to the role `household-<id>`.
- Give every family member's CouchDB user (in `_users`) that role. Each device
  signs in as that person, so a phone, a laptop, and a spouse's phone all
  sync the same database.
- The app finds its database from `GET /_session`, which returns that user's
  roles. The same server-side fact both grants access and points to the
  database, so no app code decides which data a user may see.
- Creating a household and joining one by invitation need admin rights. For
  the prototype, do that by hand in Fauxton. Later, use a small function that
  holds the admin credentials (e.g. an AWS Lambda). Users can't give
  themselves roles.

## The spike

1. **Local, free.** In `db-config/couchdb/docker.ini`, turn off
   `couch_peruser`. Using `make db`, create two households by hand, with two
   users in household A and one in household B.
2. Change `configureSync` (`src/data/database.js`) to sync with the
   household database found from the signed-in user's roles, replacing
   `perUserDbName`. Keep the Basic Auth `fetch` wrapper as it is.
3. Check that separation holds: a user in household B gets a 401 or 403 on
   household A's database, and both of A's users see each other's expenses.
4. Measure conflicts instead of guessing about them (see below). Take two
   devices offline, record an expense in the same category on each, then
   sync both.
5. **Hosted.** Repeat steps 1–3 against the chosen host from a real phone,
   using the GitHub Pages build. That needs HTTPS and a CORS origin for
   `https://jiminy-software.github.io`.

## What syncing will show, whichever option you pick

Syncing in both directions means devices will sometimes edit the same
document without seeing each other's change. When that happens, PouchDB and
CouchDB keep one version and quietly drop the other.

- **Category balances.** `remaining` is a running total that is read, changed,
  and written back (`addAmountToBudgetCategory` in `src/data/budget.js`). If
  two offline edits hit the same category, one of the subtractions disappears.
  The transaction itself survives; only the balance is wrong.
- **Refills and recurring expenses.** Each device runs the refill and records
  recurring expenses when it loads (the "Known limits" in
  `docs/recurring-transactions-plan.md`). A recurring expense would be
  recorded twice, because each device gives its copy a different random
  UUID. Giving each occurrence a fixed ID instead, such as
  `t-<recurringId>-<date>`, makes the second copy a harmless conflict rather
  than a duplicate.
- **Merging existing data.** Two devices that already hold separate data
  would merge two budgets. Only the first device should bring data into a
  household.

Fixing these is its own piece of planning. The spike only proves they
happen.

## Afterwards

- Rewrite Phase 8 of `docs/modernization-plan.md` around CouchDB, keeping it
  short.
- Update the project memory `modernization-plan.md`, which still says
  "Matt chose Couchbase Capella".

## Verification

- Steps 3 and 4 above, run by hand against `make db`, and then against the
  host.
- `make test` still passes. The UI suite doesn't exercise sync, so this
  catches regressions only.

## Sources

- [Couchbase Lite JS release notes](https://docs.couchbase.com/couchbase-lite-javascript/current/releasenotes.html)
- [Capella free tier](https://docs.couchbase.com/cloud/get-started/create-account.html)
- [Layerbase: serverless CouchDB](https://layerbase.com/blog/serverless-couchdb)
- [Layerbase: Cloudant caps](https://layerbase.com/blog/cloudant-deprecations-2026)
- [Cloudant pricing FAQ](https://github.com/ibm-cloud-docs/Cloudant/blob/master/faqs/pricing-faq.md)
- [CouchDB security](https://docs.couchdb.org/en/stable/intro/security.html)
- [Amplify DataStore deprecation (via RxDB)](https://rxdb.info/articles/alternatives/aws-amplify-datastore-alternative.html)
