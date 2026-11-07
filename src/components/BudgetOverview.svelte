<script>
import { formatMonthAndYear, getMonthProgress } from '../helpers/dates'
import { formatMoney, formatMoneyAsWholeNumber } from '../helpers/numbers'
import ErrorMessage from './ErrorMessage.svelte'
import { getCategoryBalances } from '../data/budget'
import { listCategories } from '../data/categories'
import { onMount } from 'svelte'

const monthLabel = formatMonthAndYear()
const { elapsedPercent, daysLeft } = getMonthProgress()

let categories = []

onMount(async () => {
  const [list, balances] = await Promise.all([listCategories(), getCategoryBalances()])
  categories = list.map(category => ({ ...category, balance: balances[category._id] || 0 }))
})

/**
 * Work out how to draw one category: how much of its envelope is still full,
 * and which of the four states it is in. A category is "low" once the share
 * of it spent has outrun the share of the month that has passed, which is the
 * same comparison the pace line draws down the list. An overspent one fills
 * red inward from the right instead, in proportion to the overspend.
 */
const describeEnvelope = ({ budgeted, balance }) => {
  const total = Number(budgeted) || 0
  const left = balance
  const percentLeft = (total === 0) ? ((left > 0) ? 100 : 0) : ((left / total) * 100)

  if (left < 0) {
    const overspendOf = total || Math.abs(left)
    return {
      status: 'over',
      remainingPercent: 0,
      overspendPercent: Math.max(4, Math.min(100, (Math.abs(left) / overspendOf) * 100)),
    }
  }

  let status = 'empty'
  if (left > 0) {
    status = ((100 - percentLeft) > elapsedPercent) ? 'low' : 'ok'
  }
  return {
    status,
    remainingPercent: Math.max(0, Math.min(100, percentLeft)),
    overspendPercent: 0,
  }
}

$: totalRemaining = categories.reduce((total, { balance }) => total + balance, 0)
</script>

<style>
/* The header runs edge to edge, so it has to escape the padding and top
   margin of the app-wide container it is rendered inside. */
.month-header {
  background: var(--primary);
  color: var(--on-primary);
  margin: -1rem calc(var(--bs-gutter-x) * -0.5) 0;
  padding: 18px 20px 16px;
}

.month-header-line {
  align-items: baseline;
  display: flex;
  justify-content: space-between;
}

.month-header h2 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
}

.days-left {
  color: var(--primary-fixed);
  font-size: 12px;
  font-weight: 600;
}

.month-total {
  color: var(--primary-fixed);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  line-height: 18px;
  margin: 6px 0 0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 0;
  position: relative;
}

/* Drawn once, behind the opaque envelopes, so it shows only through the gaps
   between them: the point a category's fill has to still reach to be on pace.
   It slides left as the month runs out. */
.pace-line {
  background-color: var(--pace-line);
  bottom: 16px;
  pointer-events: none;
  position: absolute;
  top: 16px;
  width: 2px;
  z-index: 1;
}

.category-row {
  background: var(--surface-container-low);
  border-radius: 12px;
  color: inherit;
  flex: 0 0 auto;
  height: 40px;
  overflow: hidden;
  position: relative;
  text-decoration: none;
  z-index: 2;
}

.category-fill,
.category-overspend {
  bottom: 0;
  position: absolute;
  top: 0;
}

.category-fill {
  left: 0;
}

.category-overspend {
  background: var(--overspend-fill);
  right: 0;
}

.ok .category-fill {
  background: var(--on-pace-fill);
}

.low .category-fill {
  background: var(--behind-pace-fill);
}

.category-row-content {
  align-items: center;
  display: flex;
  gap: 10px;
  height: 40px;
  justify-content: space-between;
  padding: 0 14px;
  position: relative;
}

.category-name {
  color: var(--on-surface);
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-amounts {
  align-items: baseline;
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
}

.category-available {
  color: var(--on-surface);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.over .category-available {
  color: var(--on-error-container);
}

.category-budgeted {
  color: var(--outline);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.ok .category-budgeted {
  color: var(--on-surface-variant);
}

.over .category-budgeted {
  color: var(--on-error-container);
}
</style>

<header class="month-header">
  <div class="month-header-line">
    <h2>{ monthLabel }</h2>
    <span class="days-left">{ daysLeft } days left</span>
  </div>
  <p class="month-total">
    { formatMoney(totalRemaining) } across { categories.length }
    { categories.length === 1 ? 'envelope' : 'envelopes' }
  </p>
</header>

<ErrorMessage />

<div class="category-list">
  <div class="pace-line" style="left: { 100 - elapsedPercent }%"></div>
  {#each categories as category (category._id)}
    {@const envelope = describeEnvelope(category)}
    <a class="category-row"
       class:ok={envelope.status === 'ok'}
       class:low={envelope.status === 'low'}
       class:over={envelope.status === 'over'}
       href="#/category/{ category._id }">
      <div class="category-fill" style="width: { envelope.remainingPercent }%"></div>
      <div class="category-overspend" style="width: { envelope.overspendPercent }%"></div>
      <div class="category-row-content">
        <span class="category-name">{ category.name }</span>
        <span class="category-amounts">
          <span class="category-available">{ formatMoney(category.balance) }</span>
          <span class="category-budgeted">/&nbsp;{ formatMoneyAsWholeNumber(category.budgeted) }</span>
        </span>
      </div>
    </a>
  {/each}
</div>
