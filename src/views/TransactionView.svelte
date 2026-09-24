<script>
import CategoryTags from '../components/CategoryTags.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import MenuItem from '../components/MenuItem.svelte'
import MissingScreen from '../components/MissingScreen.svelte'
import { getAccount } from '../data/accounts'
import { deleteTransaction, getTransaction } from '../data/transactions'
import { formatDateCompact } from '../helpers/dates'
import { formatMoney } from '../helpers/numbers'
import { push } from 'svelte-spa-router'

export let params = {} // URL parameters provided by router

let transaction = {}
let account = {}
let missingDetail = ''

$: id = params.id || ''
$: loadTransaction(id)
$: loadAccount(transaction.accountId)

const loadTransaction = async (transactionId) => {
  if (!transactionId) {
    return
  }
  try {
    transaction = await getTransaction(transactionId) || {}
    missingDetail = ''
  } catch (error) {
    // As on the recurring expense screen: only an absent document means this
    // screen cannot exist. Anything else belongs in the error banner.
    if (error.status !== 404) {
      throw error
    }
    transaction = {}
    missingDetail = error.message
  }
}

const loadAccount = async (accountId) => {
  if (accountId) {
    account = await getAccount(accountId)
  }
}

const onDeleteTransaction = async () => {
  const confirmed = confirm(
    `Are you sure you want to delete the ${formatMoney(transaction.amountTotal || 0)} expense at ${transaction.who}?`
  )
  if (confirmed) {
    await deleteTransaction(id)
    push('/transactions')
  }
}
</script>

<style>
/* The review screen's layout, without its links and inputs, as on the
   recurring expense screen: nothing here is edited, so the payee and amount
   are text rather than steps to go back to. */
.transaction-detail {
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
  <DetailHeader title="Expense" backUrl="#/transactions" />
  <MissingScreen heading="This expense isn't here"
                 body="It may have been deleted, or the link that brought you here is out of date."
                 actionLabel="Back to transactions" actionUrl="#/transactions"
                 detail={missingDetail} />
{:else}
  <DetailHeader title="Expense" backUrl="#/transactions" menuLabel="Expense actions">
    <svelte:fragment slot="menu">
      <MenuItem danger on:click={onDeleteTransaction}>
        Delete expense
      </MenuItem>
    </svelte:fragment>
  </DetailHeader>

  <div class="transaction-detail">
    <div class="headline">
      <span class="payee">{ transaction.who || '' }</span>
      <span class="total">{ formatMoney(transaction.amountTotal || 0) }</span>
    </div>

    <div class="tags">
      <CategoryTags {transaction} />
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Account</span>
        <span class="detail-value account-value">{ account.name || '' }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value detail-date date-value">
          { transaction.timestamp ? formatDateCompact(transaction.timestamp) : '' }
        </span>
      </div>
      {#if transaction.note}
        <div class="detail-row">
          <span class="detail-label">Note</span>
          <span class="detail-value note-value">{ transaction.note }</span>
        </div>
      {/if}
    </div>
  </div>
{/if}
