import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const toDataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const seedSource = await readFile(new URL('../src/demo/seeds/index.js', import.meta.url), 'utf8')
const handlersSource = await readFile(new URL('../src/demo/handlers/index.js', import.meta.url), 'utf8')
const bootstrapSource = await readFile(new URL('../src/demo/bootstrap.js', import.meta.url), 'utf8')
const loginSource = await readFile(new URL('../src/views/Login.vue', import.meta.url), 'utf8')
const backendEntrySource = await readFile(new URL('../src/app-mode-entries/backend.js', import.meta.url), 'utf8')
const demoEntrySource = await readFile(new URL('../src/app-mode-entries/demo.js', import.meta.url), 'utf8')
const databaseSource = await readFile(new URL('../src/demo/database.js', import.meta.url), 'utf8')
const demoRealtimeSource = await readFile(new URL('../src/realtime-mode-entries/demo.js', import.meta.url), 'utf8')
const seed = await import(toDataUrl(seedSource))

test('four Demo scenarios use explicit permission and company scopes', () => {
  assert.deepEqual(seed.DEMO_SCENARIOS.map(item => item.id), ['manufacturer', 'channel', 'office', 'rental'])
  for (const scenario of seed.DEMO_SCENARIOS) {
    assert.ok(scenario.permissions.includes('dashboard.view'))
    assert.ok(scenario.permissions.includes('company.view'))
    assert.ok(scenario.permissions.includes('pod.view'))
    assert.ok(scenario.permissions.includes('meeting.view'))
    assert.equal(scenario.permissions.some(permission => permission.startsWith('platform.')), false)
    assert.ok(scenario.visibleCompanies.includes(scenario.companyId))
    assert.ok(scenario.writableCompanies.every(companyId => scenario.visibleCompanies.includes(companyId)))
  }
  assert.deepEqual(seed.DEMO_SCENARIOS.find(item => item.id === 'office').writableCompanies, [300])
  assert.deepEqual(seed.DEMO_SCENARIOS.find(item => item.id === 'rental').writableCompanies, [400])
})

test('Demo seed contains only the current company type contract', () => {
  const types = seed.DEMO_COMPANIES.map(company => company.company_type)
  assert.deepEqual(types, ['MF', 'CP', 'EU', 'EU'])
  assert.equal(types.some(type => ['AG', 'DS'].includes(type)), false)
  assert.equal(seed.createDemoSeed().users.length, 4)
  assert.equal(seed.DEMO_SCHEMA_VERSION, 2)
  assert.equal(seed.DEMO_SEED_VERSION, 5)
  assert.equal(seed.createDemoSeed().locations.length, 2)
  assert.equal(seed.createDemoSeed().bookings.length, 2)
})

test('initial browser paths have strict local handlers', () => {
  for (const endpoint of [
    '/company-dashboard-config/public',
    '/users/me',
    '/dashboard/summary',
    '/dashboard/config/effective',
    '/dashboard/chart-data/query',
    '/companies',
    '/pods',
    '/pod-models',
    '/hosts',
    '/locations/search',
    '/pod-bookings',
    '/pod-booking-configs/bookable-pods',
    '/pods/:podId/status',
    '/pods/:podId/records',
    '/pods/:podId/control-schema',
    '/pods/:podId/control-state',
    '/pods/:podId/control',
    '/districts/provinces'
  ]) {
    assert.match(handlersSource, new RegExp(endpoint.replaceAll('/', '\\/')))
  }
  assert.match(bootstrapSource, /onUnhandledRequest/)
  assert.match(bootstrapSource, /throw new Error\(`Unhandled Demo API request:/)
  assert.match(handlersSource, /http\.all\(`\$\{API\}\/\*`, \(\) => HttpResponse\.error\(\)\)/)
  assert.match(bootstrapSource, /await worker\.start/)
  assert.doesNotMatch(bootstrapSource, /waitUntilReady/)
})

test('Demo pod list keeps pod and controller serial numbers distinct', () => {
  assert.doesNotMatch(handlersSource, /serial_no:\s*item\.serial_no\s*\|\|\s*item\.serial_number/)
})

test('Login reuses the current-user flow and backend entry stays Demo-free', () => {
  assert.match(loginSource, /service\.selectScenario\(scenarioId\)/)
  assert.match(loginSource, /getCurrentUser\(\)/)
  assert.match(loginSource, /this\.\$router\.push\('\/dashboard'\)/)
  assert.doesNotMatch(backendEntrySource, /@\/demo|msw|DemoRolePicker/)
  assert.match(demoEntrySource, /DemoToolbar/)
  assert.match(databaseSource, /'locations', 'bookings', 'podCommands'/)
  assert.doesNotMatch(demoRealtimeSource, /WebSocket|@\/utils\/websocket|podWebSocket/)
  assert.match(demoRealtimeSource, /createDemoHostRealtime/)
  assert.match(demoRealtimeSource, /createDemoPodRealtime/)
})

test('Demo database reset deletes the database and uses the reviewed startup error codes', () => {
  assert.match(databaseSource, /deleteDB\(DATABASE_NAME/)
  assert.match(databaseSource, /BroadcastChannel\(DATABASE_CHANNEL\)/)
  for (const metadataKey of ['schemaVersion', 'seedVersion', 'initializationState', 'lastMigration']) {
    assert.match(databaseSource, new RegExp(metadataKey))
  }
  for (const code of ['E_DEMO_IDB_UNAVAILABLE', 'E_DEMO_IDB_BLOCKED', 'E_DEMO_IDB_OPEN', 'E_DEMO_MIGRATION', 'E_DEMO_SEED', 'E_DEMO_QUOTA']) {
    assert.match(databaseSource, new RegExp(code))
  }
  assert.doesNotMatch(databaseSource, /E_DEMO_STORAGE_QUOTA/)
})
