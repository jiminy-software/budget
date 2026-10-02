<script>
import { deleteCategory, getCategory, updateCategory } from '../data/categories'
import { getTransactionsForCategory } from '../data/transactions'
import { formatMoneyAsWholeNumber } from '../helpers/numbers'
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import MissingScreen from '../components/MissingScreen.svelte'
import MenuItem from '../components/MenuItem.svelte'
import TransactionList from '../components/TransactionList.svelte'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { push } from 'svelte-spa-router'

export let params = {} // URL parameters provided by router

let category = {}
let transactions = null // Until loaded, so the list never shows a false "none"
let missingDetail = ''

$: id = params.id || ''
$: loadCategory(id)
$: loadTransactions(id)

const loadCategory = async (categoryId) => {
  if (!categoryId) {
    return
  }
  try {
    category = await getCategory(categoryId) || {}
    missingDetail = ''
  } catch (error) {
    // Only an absent document means this screen cannot exist. Anything else
    // is a real failure, and belongs in the error banner.
    if (error.status !== 404) {
      throw error
    }
    category = {}
    missingDetail = error.message
  }
}

const loadTransactions = async (categoryId) => {
  if (categoryId) {
    transactions = await getTransactionsForCategory(categoryId)
  }
}

const renameCategory = async () => {
  let name = prompt('Edit category name:', category.name)
  if (name != null) {
    await updateCategory(id, {name})
    await loadCategory(id)
  }
}

const onDeleteCategory = async () => {
  let confirmed = confirm('Are you sure you want to delete ' + category.name + '?')
  if (confirmed) {
    await deleteCategory(id)
    push(`/budget/`)
  }
}
</script>

<style>
/* What the category is worth a month, as quiet secondary text. Setting it is
   an action in the menu, so this is a label rather than a link. */
.category-budget {
  color: var(--primary-fixed);
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  padding-right: 2px;
}
</style>

{#if missingDetail}
  <DetailHeader title="Category" backUrl="#/budget" />
  <MissingScreen heading="This category isn't here"
                 body="It may have been deleted, or the link that brought you here is out of date."
                 actionLabel="Back to budget" actionUrl="#/budget"
                 detail={missingDetail} />
{:else}
  <DetailHeader title={category.name || ''} backUrl="#/budget" menuLabel="Category actions">
    <span class="category-budget" slot="meta">
      { formatMoneyAsWholeNumber(category.budgeted) } / mo
    </span>
    <svelte:fragment slot="menu">
      <MenuItem on:click={renameCategory}>Rename category</MenuItem>
      <MenuItem url="#/category/{ id }/amount">Set monthly budget</MenuItem>
      <MenuItem danger separated on:click={onDeleteCategory}>Delete category</MenuItem>
    </svelte:fragment>
  </DetailHeader>

  {#if transactions}
    <TransactionList {transactions} />
  {/if}
{/if}

<ButtonRow>
  <Button icon={faDollarSign} name="expense" url="#/expense/new" />
</ButtonRow>
