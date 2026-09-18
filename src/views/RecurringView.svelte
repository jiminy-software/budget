<script>
import CategoryTags from '../components/CategoryTags.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import MenuItem from '../components/MenuItem.svelte'
import MissingScreen from '../components/MissingScreen.svelte'
import { getAccount } from '../data/accounts'
import { deleteRecurringTransaction, getRecurringTransaction } from '../data/recurringTransactions'
import { formatDateCompact, getNoonTimestamp } from '../helpers/dates'
import { formatMoney } from '../helpers/numbers'
import { push } from 'svelte-spa-router'

export let params = {} // URL parameters provided by router

let recurringTransaction = {}
let account = {}
let missingDetail = ''

$: id = params.id || ''
$: loadRecurringTransaction(id)
$: loadAccount(recurringTransaction.accountId)
$: nextDue = recurringTransaction.nextDue || ''

const loadRecurringTransaction = async (recurringTransactionId) => {
  if (!recurringTransactionId) {
    return
  }
  try {
    recurringTransaction = await getRecurringTransaction(recurringTransactionId) || {}
    missingDetail = ''
  } catch (error) {
    // As on the category screen: only an absent document means this screen
    // cannot exist. Anything else belongs in the error banner.
    if (error.status !== 404) {
      throw error
    }
    recurringTransaction = {}
    missingDetail = error.message
  }
}

const loadAccount = async (accountId) => {
  if (accountId) {
    account = await getAccount(accountId)
  }
}

const onDeleteRecurringTransaction = async () => {
  const confirmed = confirm(
    `Are you sure you want to stop the recurring expense for ${recurringTransaction.who}?`
  )
  if (confirmed) {
    await deleteRecurringTransaction(id)
    push('/transactions')
  }
}
</script>

<style>
/* The review screen's layout, without its links and inputs: nothing here is
   edited, so the payee and amount are text rather than steps to go back to. */
.recurring {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 8px 0;
}

.headline {
  align-items: baseline;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.payee {
  color: var(--primary);
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total {
  color: var(--primary);
  flex: 0 0 auto;
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.details {
  display: flex;
  flex-direction: column;
}

.detail-row {
  align-items: center;
  border-bottom: 1px solid var(--surface-container-low);
  display: flex;
  gap: 12px;
  height: 52px;
  justify-content: space-between;
}

.detail-label {
  color: var(--on-surface-variant);
  font-size: 15px;
  font-weight: 500;
}

.detail-value {
  color: var(--on-surface);
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-date {
  font-variant-numeric: tabular-nums;
}
</style>

{#if missingDetail}
  <DetailHeader title="Recurring expense" backUrl="#/transactions" />
  <MissingScreen heading="This recurring expense isn't here"
                 body="It may have been deleted, or the link that brought you here is out of date."
                 actionLabel="Back to transactions" actionUrl="#/transactions"
                 detail={missingDetail} />
{:else}
  <DetailHeader title="Recurring expense" backUrl="#/transactions"
                menuLabel="Recurring expense actions">
    <svelte:fragment slot="menu">
      <MenuItem danger on:click={onDeleteRecurringTransaction}>
        Delete recurring expense
      </MenuItem>
    </svelte:fragment>
  </DetailHeader>

  <div class="recurring">
    <div class="headline">
      <span class="payee">{ recurringTransaction.who || '' }</span>
      <span class="total">{ formatMoney(recurringTransaction.amountTotal || 0) }</span>
    </div>

    <div class="tags">
      <CategoryTags transaction={recurringTransaction} />
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Account</span>
        <span class="detail-value">{ account.name || '' }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Next due</span>
        <span class="detail-value detail-date next-due-value">
          { nextDue ? formatDateCompact(getNoonTimestamp(nextDue)) : '' }
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Repeats</span>
        <span class="detail-value repeats-value">Monthly</span>
      </div>
      {#if recurringTransaction.note}
        <div class="detail-row">
          <span class="detail-label">Note</span>
          <span class="detail-value">{ recurringTransaction.note }</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
