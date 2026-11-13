# Category balances

Goal: a category's balance survives offline edits on two devices. A stored
`remaining` kept only one of two offline expenses after syncing ($77.66
instead of $57.66 in step 5 of `docs/cross-device-syncing-options.md`).

Status: done. Step 6 of that plan.

## Done

- A balance is the negated sum of the category's transaction amounts, so
  nothing writes one and there's nothing to conflict. budget-data 4.0.0
  dropped `remaining` from categories.
- No migration: the one user didn't need their data kept.
- Refills and recurring expenses record their fixed-ID transaction before
  advancing `refilled` or `nextDue`, and count a 409 as already recorded,
  so a launch that stops partway finishes on the next one.
- Speed, with 5,000 transactions against a 500 ms target: the overview took
  581 ms longer at full speed and 1,859 ms longer with the CPU slowed 4x on
  the default `idb` adapter. A `_sum` view was no faster, since PouchDB
  reduces every row on each query. The `indexeddb` adapter brought it to
  252 ms and 641 ms, so the app uses it, as a new `budget_indexeddb`
  database, and devices started empty.

## Not done

- **Timing on a real phone.** If the overview is too slow there, cache the
  balances per device in a `_local` document.
- **Category settings.** Two devices that rename a category, or change its
  monthly amount, offline keep only one of the changes. That's the last
  write, which is acceptable.
