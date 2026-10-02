<script>
import { listRecurringTransactions } from '../data/recurringTransactions'
import { listTransactions } from '../data/transactions'
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import MenuItem from '../components/MenuItem.svelte'
import RecurringList from '../components/RecurringList.svelte'
import ScreenHeader from '../components/ScreenHeader.svelte'
import TransactionList from '../components/TransactionList.svelte'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { onMount } from 'svelte'

let transactions = null // Until loaded, so the list never shows a false "none"
let recurringTransactions = []

// The recurring expenses sit above the transactions when asked for, since
// they are the few that shape the many. Whether they are shown lasts as long
// as the screen does; the menu is how to get them back.
let showRecurring = false

const toggleRecurring = () => showRecurring = !showRecurring

onMount(async () => {
  transactions = await listTransactions()
  recurringTransactions = await listRecurringTransactions()
})
</script>

<ScreenHeader title="Transactions" menuLabel="Transaction actions">
  <svelte:fragment slot="menu">
    <MenuItem on:click={toggleRecurring}>
      { showRecurring ? 'Hide recurring' : 'Show recurring' }
    </MenuItem>
  </svelte:fragment>
</ScreenHeader>

{#if showRecurring}
  <RecurringList {recurringTransactions} />
{/if}

{#if transactions}
  <TransactionList {transactions} emptyMessage="No transactions yet" />
{/if}

<ButtonRow>
  <Button icon={faDollarSign} name="expense" url="#/expense/new" />
</ButtonRow>
