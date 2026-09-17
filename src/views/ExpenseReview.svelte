<script>
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import CategoryTags from '../components/CategoryTags.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import { getAccount } from '../data/accounts'
import { savePendingRecurringTransaction } from '../data/recurringTransactions'
import { savePendingTransaction, transactionInProgress, updatePendingTransaction } from '../data/transactions'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import { formatDateISO8601, getNoonTimestamp } from '../helpers/dates'
import { formatMoney } from '../helpers/numbers'
import { push } from 'svelte-spa-router'

let account = {}

$: transaction = $transactionInProgress
$: transactionNote = transaction.note || ''
$: loadAccount(transaction.accountId)
$: accountName = account.name || ''
$: amountTotal = transaction.amountTotal || 0
$: repeatsMonthly = transaction.recurs === 'monthly'

const loadAccount = async (accountId) => {
  if (accountId) {
    account = await getAccount(accountId)
  }
}

const onDone = async () => {
  if (repeatsMonthly) {
    await savePendingRecurringTransaction()
  } else {
    await savePendingTransaction()
  }
  push(`/budget`)
}

const setRecurs = event => {
  updatePendingTransaction({ recurs: event.target.checked ? 'monthly' : null })
}

const setNote = event => {
  let note = event.target.value
  updatePendingTransaction({ note })
}

const setTimestamp = event => {
  updatePendingTransaction({ timestamp: getNoonTimestamp(event.target.value) })
}
</script>

<style>
.review {
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

/* Everything the flow collected is shown in the primary color and leads back
   to the step that set it. */
.payee,
.total,
.detail-value {
  color: var(--primary);
  text-decoration: none;
}

.payee {
  font-size: 20px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.total {
  flex: 0 0 auto;
  font-size: 26px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

/* Wraps, so splitting an expense across envelopes later just adds tags. */
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
  font-size: 16px;
  font-weight: 600;
}

/* Date and note have no step of their own, so they are edited here: inputs
   dressed as the row values beside them. */
.detail-input {
  background: none;
  border: 0;
  font-family: inherit;
  min-width: 0;
  padding: 0;
  text-align: right;
}

.detail-input:focus {
  outline: none;
}

.detail-date {
  font-variant-numeric: tabular-nums;
}

.detail-note {
  color: var(--on-surface);
  font-weight: 500;
}

.detail-note::placeholder {
  color: var(--outline);
  font-weight: 500;
}

/* A checkbox drawn as a switch: the track is the input, the knob its
   pseudo-element. */
.switch {
  appearance: none;
  background: var(--outline-variant);
  border: 0;
  border-radius: 13px;
  cursor: pointer;
  flex: 0 0 auto;
  height: 26px;
  margin: 0;
  position: relative;
  width: 44px;
}

.switch::after {
  background: var(--surface-container-lowest);
  border-radius: 50%;
  content: '';
  height: 20px;
  left: 3px;
  position: absolute;
  top: 3px;
  transition: transform 0.15s;
  width: 20px;
}

.switch:checked {
  background: var(--primary-container);
}

.switch:checked::after {
  transform: translateX(18px);
}
</style>

<DetailHeader title="Review" backUrl="#/expense/category/" />

<div class="review">
  <div class="headline">
    <a class="payee" href="#/expense/who/">{ transaction.who }</a>
    <a class="total" href="#/expense/amount/">{ formatMoney(amountTotal) }</a>
  </div>

  <div class="tags">
    <CategoryTags {transaction} />
  </div>

  <div class="details">
    <div class="detail-row">
      <span class="detail-label">Account</span>
      <a class="detail-value" href="#/expense/account/">{ accountName }</a>
    </div>
    <div class="detail-row">
      <span class="detail-label">{ repeatsMonthly ? 'First on' : 'Date' }</span>
      <input class="detail-value detail-input detail-date" type="date" aria-label="Date"
             on:change={setTimestamp} value={formatDateISO8601(transaction.timestamp)} />
    </div>
    <div class="detail-row">
      <label class="detail-label" for="repeats-monthly">Repeats monthly</label>
      <input class="switch" type="checkbox" id="repeats-monthly"
             checked={repeatsMonthly} on:change={setRecurs} />
    </div>
    <div class="detail-row">
      <span class="detail-label">Note</span>
      <input class="detail-value detail-input detail-note" type="text" aria-label="Note"
             placeholder="Add a note" on:change={setNote} value={transactionNote} />
    </div>
  </div>
</div>

<ButtonRow>
  <Button icon={faCheck} name="done" on:click={onDone} />
</ButtonRow>
