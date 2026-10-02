const { randomUUID } = require('crypto');

// The CouchDB that syncing scenarios sync through: `make db` locally, and
// the same compose service in CI. The app container reaches it by its
// service name, so compose sets COUCHDB_URL there.
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_AUTH = { username: 'admin', password: 'password' };

const request = (path, method = 'GET') =>
  fetch(`${COUCHDB_URL}${path}`, {
    method,
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${COUCHDB_AUTH.username}:${COUCHDB_AUTH.password}`).toString(
          'base64'
        ),
    },
  });

// Checked once per run, and only by a scenario that syncs, so the rest of the
// suite runs without CouchDB.
let couchDbUp;
const waitForCouchDb = () => {
  couchDbUp = couchDbUp || pollUntilUp(30000);
  return couchDbUp;
};

const pollUntilUp = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await request('/_up')).ok) return;
    } catch (e) {
      // Not up yet; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(
    `Syncing needs CouchDB at ${COUCHDB_URL}, which did not respond. ` +
      'Start it with `make db`.'
  );
};

// A database of its own for one scenario, so no scenario sees another's data.
const createScenarioDb = async () => {
  await waitForCouchDb();
  const name = `sync-test-${randomUUID()}`;
  const response = await request(`/${name}`, 'PUT');
  if (!response.ok) {
    throw new Error(
      `Could not create CouchDB database ${name}: ${await response.text()}`
    );
  }
  return `${COUCHDB_URL}/${name}`;
};

const deleteScenarioDb = async (url) => {
  await request(url.slice(COUCHDB_URL.length), 'DELETE');
};

module.exports = { COUCHDB_AUTH, createScenarioDb, deleteScenarioDb };
