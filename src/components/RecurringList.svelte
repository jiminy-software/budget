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
   the rows to the 20px inset the design draws. */
.recurring-list {
  padding: 8px 8px 0;
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

/* A hairline rather than a gap between rows, as in the transaction list. */
.recurring-row {
  align-items: center;
  border-bottom: 1px solid var(--surface-container-low);
  display: flex;
  gap: 14px;
  height: 48px;
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
    <div class="recurring-row">
      <span class="recurring-next-due">{ formatDateCompact(getNoonTimestamp(nextDue)) }</span>
      <span class="recurring-who">{ who }</span>
      <span class="recurring-amount">{ formatMoney(amountTotal) }</span>
    </div>
  {:else}
    <p class="no-recurring">{ emptyMessage }</p>
  {/each}
</div>
