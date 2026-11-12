# Category balances

Goal: a category's balance survives offline edits on two devices. Today each
category stores `remaining`, which every expense reads, changes and writes
back, so when two devices each record an expense offline in one category,
the sync keeps only one of the subtractions. Step 5 of
`docs/cross-device-syncing-options.md` showed it: $77.66 instead of $57.66.

Status: in progress. Steps 1 to 4 are done. It lands before sign-in, step 7 of
that plan.

## Decisions

- **A balance is derived from transactions.** It's the negated sum of the
  category's amounts across all transactions: expenses count against it, and
  refills, being negative, count toward it. Nothing writes a balance, so
  there's nothing to conflict.
- **budget-data 4.0.0 removes `remaining`** from categories and says how a
  balance is derived. It's a major version because a 3.x reader relies on
  the field.
- **No migration.** The one user doesn't need their data kept, so each
  balance becomes whatever the stored transactions sum to. At start-up, the
  unused `remaining` is deleted from each category.
- **A 409 now means "already recorded".** With no balance written beside
  them, inserting a fixed-ID transaction is the whole of recording it, so
  catch-up can insert first and then advance `refilled` or `nextDue`.

## Steps

Each step is its own PR.

- [x] **1. Publish budget-data 4.0.0.** In `forevermatt/budget-data`: drop
  `remaining` from categories, and define a balance as above.
- [x] **2. Derive balances.**
  - A function in `src/data/` sums each category's balance from
    `listTransactions()`. The budget overview reads it instead of
    `remaining`.
  - `recordTransaction` and `unrecordTransaction` only insert and delete.
    `addAmountToBudgetCategory` and its pair go.
  - At start-up, before the refill, `remaining` is deleted from each
    category that has it.
  - The UI tests seed a full category as this month's refill, and any other
    balance as a test-only "Starting balance" transaction.
  - The README and `AGENTS.md` move to budget-data 4.0.0.
- [x] **3. Simplify catch-up.** The refill and the recurring catch-up insert
  first, count a 409 as recorded, then advance `refilled` or `nextDue`. This
  replaces the write-order workarounds from sync steps 2 and 3.
- [x] **4. Check speed.** The target was the overview taking at most 500 ms
  longer with 5,000 transactions than with none. Timed in headless Chrome,
  with the CPU at full speed and slowed 4x as for a mid-range phone:
  - With the default `idb` adapter it took 581 ms and 1,859 ms longer.
    Nearly all of that is reading the documents; adding them up takes 4 ms.
  - A `_sum` view was no faster, since PouchDB reduces every row on each
    grouped query.
  - The `indexeddb` adapter reads 3 to 4 times faster: 252 ms and 641 ms
    longer. The app now uses it, under a new database name, so devices
    start empty. Check the overview on a real phone; if it's too slow,
    cache the balances per device in a `_local` document.
- [ ] **5. Remove the `remaining` clean-up** in a later release, once every
  device in use has opened a version that ran it.

## Scenarios to draft

Each gets its wording approved before its steps are written.

- Two devices each record an expense offline in one category, and both count
  once they sync. This fails today.
- A category's stored `remaining` is deleted at start-up.
- An interrupted refill is finished on the next launch, not skipped.

## Not solved here

- **Category settings.** Two devices that rename a category, or change its
  monthly amount, offline keep only one of the changes. That's the last
  write, which is acceptable.
