const { randomUUID } = require('crypto');

// The CouchDB that syncing scenarios sync through: `make db` locally, and
// the same compose service in CI. The app container reaches it by its
// service name, so compose sets COUCHDB_URL there.
const COUCHDB_URL = process.env.COUCHDB_URL || 'http://localhost:5984';
const COUCHDB_AUTH = { username: 'admin', password: 'password' };

// A device signs in with CouchDB's session cookie, which is SameSite=Strict,
// so the browser has to reach CouchDB on the app's own site, localhost.
// Where CouchDB is on another host (the db service, in the container), Chrome
// is launched with this address mapped to it.
const BROWSER_COUCHDB_URL = 'http://localhost:5984';
const couchDbHost = new URL(COUCHDB_URL);
const CHROME_ARGS =
  couchDbHost.hostname === 'localhost'
    ? []
    : [`--host-resolver-rules=MAP localhost:5984 ${couchDbHost.host}`];

const request = (path, method = 'GET', body) =>
  fetch(`${COUCHDB_URL}${path}`, {
    method,
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(`${COUCHDB_AUTH.username}:${COUCHDB_AUTH.password}`).toString(
          'base64'
        ),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
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

const userDocPath = (name) => `/_users/org.couchdb.user:${name}`;
const userDbPath = (name) => `/userdb-${Buffer.from(name).toString('hex')}`;

// A CouchDB user of its own for one scenario, as a family's shared login.
// couch_peruser makes the user's database a moment after the user, so this
// waits for it.
const createScenarioUser = async () => {
  await waitForCouchDb();
  const user = { name: `sync-test-${randomUUID()}`, password: randomUUID() };
  const response = await request(userDocPath(user.name), 'PUT', {
    ...user,
    roles: [],
    type: 'user',
  });
  if (!response.ok) {
    throw new Error(
      `Could not create CouchDB user ${user.name}: ${await response.text()}`
    );
  }
  const deadline = Date.now() + 5000;
  while (!(await request(userDbPath(user.name), 'HEAD')).ok) {
    if (Date.now() > deadline) {
      throw new Error(
        `CouchDB made no database for ${user.name}. Is couch_peruser enabled?`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return user;
};

const deleteScenarioUser = async ({ name }) => {
  const { _rev } = await (await request(userDocPath(name))).json();
  await request(`${userDocPath(name)}?rev=${_rev}`, 'DELETE');
  await request(userDbPath(name), 'DELETE');
};

module.exports = {
  BROWSER_COUCHDB_URL,
  CHROME_ARGS,
  COUCHDB_AUTH,
  createScenarioDb,
  createScenarioUser,
  deleteScenarioDb,
  deleteScenarioUser,
};
