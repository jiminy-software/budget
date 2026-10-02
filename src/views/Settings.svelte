<script>
import Button from '../components/Button.svelte'
import ButtonRow from '../components/ButtonRow.svelte'
import DetailHeader from '../components/DetailHeader.svelte'
import Form from '../components/Form.svelte'
import { faCheck } from '@fortawesome/free-solid-svg-icons'
import database from '../data/database'
import { push } from 'svelte-spa-router'

let server = localStorage.getItem('sync.server') || 'http://localhost:5984'
let username = localStorage.getItem('sync.username') || ''
let password = ''

const onSyncFormSubmit = async () => {
  // Persist settings
  localStorage.setItem('sync.server', server)
  localStorage.setItem('sync.username', username)
  // Do NOT store password in localStorage

  // Start or restart sync
  const succeeded = await database.configureSync(server, username, password)
  if (succeeded) {
    push(`/budget`)
  }
}
</script>

<style>
/* The expense review's rows: the app-wide container already supplies half the
   gutter, so 8px more brings them to the 20px inset of the other screens. */
.details {
  display: flex;
  flex-direction: column;
  padding: 20px 8px 0;
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
  flex: 0 0 auto;
  font-size: 15px;
  font-weight: 500;
  margin: 0;
}

/* As the review's note: an input dressed as the row's value. */
.detail-input {
  background: none;
  border: 0;
  color: var(--on-surface);
  flex: 1;
  font-family: inherit;
  font-size: 16px;
  font-weight: 500;
  min-width: 0;
  padding: 0;
  text-align: right;
}

.detail-input:focus {
  outline: none;
}

.detail-input::placeholder {
  color: var(--outline);
}
</style>

<DetailHeader title="Sync settings" backUrl="#/budget" />

<Form on:submit={onSyncFormSubmit}>
  <div class="details">
    <div class="detail-row">
      <label class="detail-label" for="sync-server">Server</label>
      <input class="detail-input" id="sync-server" name="server" type="url"
             autocapitalize="off" bind:value={server} />
    </div>
    <div class="detail-row">
      <label class="detail-label" for="sync-username">Username</label>
      <input class="detail-input" id="sync-username" name="username"
             autocapitalize="off" autocomplete="username"
             placeholder="Add a username" bind:value={username} />
    </div>
    <div class="detail-row">
      <label class="detail-label" for="sync-password">Password</label>
      <input class="detail-input" id="sync-password" name="password" type="password"
             autocomplete="current-password"
             placeholder="Enter your password" bind:value={password} />
    </div>
  </div>
</Form>

<ButtonRow>
  <Button icon={faCheck} name="save" on:click={onSyncFormSubmit} />
</ButtonRow>
