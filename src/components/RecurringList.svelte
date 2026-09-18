<script>
import { formatDateCompact, getNoonTimestamp } from '../helpers/dates'
import { formatMoney } from '../helpers/numbers'

// The recurring expenses, laid out like TransactionList's rows, but dated by
// when each is next due rather than by when something happened.
export let recurringTransactions = []
export let emptyMessage = 'No recurring expenses yet'
</script>

<style>
/* The app-wide container already supplies half the gutter, so 8px more brings
   the rows to the 20px inset the design draws. The rule below the list is
   darker and thicker than the hairlines within it, with air on both sides, so
   the recurring expenses read as a block above the transactions rather than
   as more of them. */
.recurring-list {
  border-bottom: 2px solid var(--outline-variant);
  margin-bottom: 12px;
  padding: 8px 8px 12px;
}

/* The rule below is separation enough for the last row. */
.recurring-row:last-of-type {
  border-bottom: 0;
}

.recurring-heading {
  color: var(--on-surface-variant);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin: 0;
  padding: 8px 0;
  text-transform: uppercase;
}

/* A hairline rather than a gap between rows, as in the transaction list. Each
   row is the link to what it describes, so the whole row is the touch
   target. */
.recurring-row {
  align-items: center;
  border-bottom: 1px solid var(--surface-container-low);
  display: flex;
  gap: 14px;
  height: 48px;
  text-decoration: none;
}

.recurring-next-due {
  color: var(--on-surface-variant);
  flex: 0 0 62px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.recurring-who {
  color: var(--on-surface);
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recurring-amount {
  color: var(--on-surface);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.no-recurring {
  color: var(--outline);
  font-size: 15px;
  padding: 16px 0;
}
</style>

<div class="recurring-list">
  <p class="recurring-heading">Recurring</p>
  {#each recurringTransactions as { _id, amountTotal, nextDue, who } (_id)}
    <a class="recurring-row" href="#/recurring/{ _id }">
      <span class="recurring-next-due">{ formatDateCompact(getNoonTimestamp(nextDue)) }</span>
      <span class="recurring-who">{ who }</span>
      <span class="recurring-amount">{ formatMoney(amountTotal) }</span>
    </a>
  {:else}
    <p class="no-recurring">{ emptyMessage }</p>
  {/each}
</div>
