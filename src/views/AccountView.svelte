<script>
import { getAccount, updateAccount } from '../data/accounts'
import { getTransactionsForAccount } from '../data/transactions'
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import MissingScreen from '../components/MissingScreen.svelte'
import MenuItem from '../components/MenuItem.svelte'
import TransactionList from '../components/TransactionList.svelte'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'

export let params = {} // URL parameters provided by router

let account = {}
let transactions = null // Until loaded, so the list never shows a false "none"
let missingDetail = ''

$: id = params.id || ''
$: loadAccount(id)
$: loadTransactions(id)

const loadAccount = async (accountId) => {
  if (!accountId) {
    return
  }
  try {
    account = await getAccount(accountId) || {}
    missingDetail = ''
  } catch (error) {
    // Only an absent document means this screen cannot exist. Anything else
    // is a real failure, and belongs in the error banner.
    if (error.status !== 404) {
      throw error
    }
    account = {}
    missingDetail = error.message
  }
}

const loadTransactions = async (accountId) => {
  if (accountId) {
    transactions = await getTransactionsForAccount(accountId)
  }
}

const renameAccount = async () => {
  let name = prompt('Edit account name:', account.name)
  if (name != null) {
    await updateAccount(id, {name})
    await loadAccount(id)
  }
}
</script>

{#if missingDetail}
  <DetailHeader title="Account" backUrl="#/accounts" />
  <MissingScreen heading="This account isn't here"
                 body="It may have been deleted, or the link that brought you here is out of date."
                 actionLabel="Back to accounts" actionUrl="#/accounts"
                 detail={missingDetail} />
{:else}
  <DetailHeader title={account.name || ''} backUrl="#/accounts" menuLabel="Account actions">
    <svelte:fragment slot="menu">
      <MenuItem on:click={renameAccount}>Rename account</MenuItem>
    </svelte:fragment>
  </DetailHeader>

  {#if transactions}
    <TransactionList {transactions} />
  {/if}
{/if}

<ButtonRow>
  <Button icon={faDollarSign} name="expense" url="#/expense/new" />
</ButtonRow>
