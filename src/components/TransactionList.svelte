<script>
import { formatDateCompact } from '../helpers/dates'
import { formatMoney } from '../helpers/numbers'

export let transactions = []
export let emptyMessage = 'No matching transactions found.'
</script>

<style>
/* The app-wide container already supplies half the gutter, so 8px more brings
   the rows to the 20px inset the design draws. */
.transaction-list {
  padding: 8px 8px 0;
}

/* A hairline rather than a gap between rows: the list is dense enough that
   air alone stops separating them. Each row is the link to the transaction it
   shows, so the whole row is the touch target. */
.transaction-row {
  align-items: center;
  border-bottom: 1px solid var(--surface-container-low);
  display: flex;
  gap: 14px;
  height: 48px;
  text-decoration: none;
}

.transaction-date {
  color: var(--on-surface-variant);
  flex: 0 0 62px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.transaction-who {
  color: var(--on-surface);
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Same weight as the payee: nothing in the row shouts. */
.transaction-amount {
  color: var(--on-surface);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.no-transactions {
  color: var(--outline);
  font-size: 15px;
  padding: 16px 0;
}
</style>

<div class="transaction-list">
  {#each transactions as { _id, amountTotal, timestamp, who } (_id)}
    <a class="transaction-row" href="#/transaction/{ _id }">
      <span class="transaction-date">{ formatDateCompact(timestamp) }</span>
      <span class="transaction-who">{ who }</span>
      <span class="transaction-amount">{ formatMoney(amountTotal) }</span>
    </a>
  {:else}
    <p class="no-transactions">{ emptyMessage }</p>
  {/each}
</div>
