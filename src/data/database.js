import { clearError, setError } from './errors'
import PouchDB from 'pouchdb-browser'
import IndexedDbAdapter from 'pouchdb-adapter-indexeddb'

// The indexeddb adapter reads several times faster than the default idb one,
// which matters because balances are summed from every transaction. It can't
// open the database idb made under the old name, 'budget', so this one is
// new, and named for its adapter. Data in the old one is left where it is.
PouchDB.plugin(IndexedDbAdapter)
const pouchDb = new PouchDB('budget_indexeddb', { adapter: 'indexeddb' })

// Test hook: lets the UI tests seed data directly (see features/support/).
// Gated to local hosts so it is never exposed by the deployed app. It cannot
// be gated on NODE_ENV instead: the UI tests build and serve the production
// bundle (see features/support/hooks.js), so the hook has to survive that.
if (typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  window.__budgetDb = pouchDb
}

// Keep track of current sync so we can cancel/restart
let currentSync = null
let remoteDb = null

// Helper: username -> hex (per CouchDB per-user db naming: userdb-<hex(username)>)
const usernameToHex = (str) => {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, '0')
    hex += h
  }
  return hex
}

const perUserDbName = (username) => `userdb-${usernameToHex(username)}`

const serverUrl = (server) =>
  (server || 'http://localhost:5984').replace(/\/$/, '')

const sessionUrl = (server) => `${serverUrl(server)}/_session`

// Signs in to CouchDB, which answers with its session cookie. The cookie is
// HttpOnly, so nothing the app can read is kept, and the password goes no
// further than this request. Throws with CouchDB's reason if it refuses.
const signIn = async (server, username, password) => {
  const response = await fetch(sessionUrl(server), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username, password }),
  })
  if (!response.ok) {
    const { reason } = await response.json().catch(() => ({}))
    throw new Error(reason || `The server answered ${response.status}`)
  }
}

// The user the session cookie signs in, or null without a valid one.
const getSessionUsername = async (server) => {
  const response = await fetch(sessionUrl(server), { credentials: 'include' })
  return (await response.json()).userCtx.name
}

// Starts live sync with the signed-in user's database. Resolves to false if
// nobody is signed in, and rejects if the server can't be asked.
const configureSync = async (server) => {
  const username = await getSessionUsername(server)
  if (!username) {
    return false
  }

  try {
    if (currentSync && typeof currentSync.cancel === 'function') {
      currentSync.cancel()
      currentSync = null
    }

    // PouchDB sends the session cookie itself. couch_peruser has already made
    // the database, so skip_setup keeps a mistyped server from sending PouchDB
    // off to create one.
    const remoteUrl = `${serverUrl(server)}/${perUserDbName(username)}`
    remoteDb = new PouchDB(remoteUrl, { skip_setup: true })

    // Start bidirectional live sync with retry
    currentSync = pouchDb.sync(remoteDb, { live: true, retry: true })

    // Optional: attach basic logging for visibility
    currentSync
      .on('change', info => console.debug('Sync change', info))
      .on('paused', err => {
        if (err) {
          console.warn('Sync paused (error)', err)
          if (err.message) {
            setError('Sync stopped', err.message)
          }
        } else {
          console.debug('Sync paused')
          clearError()
        }
      })
      .on('active', () => console.debug('Sync active'))
      .on('denied', err => {
        console.error('Sync denied', err)
        if (err.message) {
          setError('Sync was refused', err.message)
        }
      })
      .on('complete', info => console.debug('Sync complete', info))
      .on('error', err => {
        console.error('Sync error', err)
        if (err.message) {
          setError('Sync failed', err.message)
        }
      })

    return true
  } catch (e) {
    console.error('Failed to configure sync', e)
    return false
  }
}

const deleteItem = async (id) => {
  const doc = await pouchDb.get(id);
  doc._deleted = true;
  await pouchDb.put(doc);
}

const get = async (id) => pouchDb.get(id)

/**
 * @param response
 * @returns Array
 */
const getItemsFromResponse = (response) => {
  return response.rows.map(row => row.doc);
}

const insert = async (itemTypePrefix, values) => {
  // An _id among the values, such as a refill's fixed one, replaces this one.
  const response = await pouchDb.put({
    _id: itemTypePrefix + '-' + crypto.randomUUID(),
    ...values,
  });
  
  if (response.ok) {
    return response.id
  }
  
  console.error(response)
  return null
}

const list = async (itemTypePrefix) => {
  const response = await pouchDb.allDocs({
    include_docs: true,
    startkey: itemTypePrefix + '-',
    endkey: itemTypePrefix + '-\ufff0',
  });
  return getItemsFromResponse(response)
}

const update = async (revisedItem) => {
  const response = await pouchDb.put(revisedItem)
  if (!response.ok) {
    console.error(response)
  }
}

export default {
  configureSync,
  deleteItem,
  get,
  insert,
  list,
  signIn,
  update,
}
