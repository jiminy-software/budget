import { clearError, setError } from './errors'
import PouchDB from 'pouchdb-browser'

const pouchDb = new PouchDB('budget')

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

// Configure live sync to CouchDB per-user database
const configureSync = async (server, username, password) => {
  try {
    // Basic defaults and cleanup
    const trimmedServer = (server || 'http://localhost:5984').replace(/\/$/, '')
    if (currentSync && typeof currentSync.cancel === 'function') {
      currentSync.cancel()
      currentSync = null
    }

    // Build remote DB URL
    const dbName = perUserDbName(username)
    const remoteUrl = `${trimmedServer}/${dbName}`

    // Use custom fetch to set Basic Auth header without extra plugins
    remoteDb = new PouchDB(remoteUrl, {
      fetch: (url, opts = {}) => {
        const options = { ...opts }
        options.headers = new Headers(options.headers || {})
        if (username && password) {
          const token = btoa(`${username}:${password}`)
          options.headers.set('Authorization', `Basic ${token}`)
        }
        return PouchDB.fetch(url, options)
      },
      skip_setup: false, // ensure the DB gets created if allowed by CouchDB
    })

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
  update,
}
