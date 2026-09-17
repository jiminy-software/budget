<script>
import { listTransactions } from '../data/transactions'
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import ScreenHeader from '../components/ScreenHeader.svelte'
import TransactionList from '../components/TransactionList.svelte'
import { faDollarSign } from '@fortawesome/free-solid-svg-icons'
import { onMount } from 'svelte'

let transactions = []

onMount(async () => {
  transactions = await listTransactions()
})
</script>

<ScreenHeader title="Transactions" />

<TransactionList {transactions} emptyMessage="No transactions yet" />

<ButtonRow>
  <Button icon={faDollarSign} name="expense" url="#/expense/new" />
</ButtonRow>
