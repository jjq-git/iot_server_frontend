import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const fixtureUrl = name => new URL(`./fixtures/demo/${name}`, import.meta.url)
const readJson = async name => JSON.parse(await readFile(fixtureUrl(name), 'utf8'))

test('P0 Demo fixture manifest is accountable, pinned and hash-complete', async () => {
  const manifest = await readJson('manifest.json')
  const contract = JSON.parse(await readFile(new URL('../config/demo-contract.json', import.meta.url), 'utf8'))
  const webpack = await readFile(new URL('../webpack.config.js', import.meta.url), 'utf8')
  assert.match(manifest.owner, /\S/)
  assert.notEqual(manifest.owner, 'unassigned')
  assert.equal(manifest.owner, contract.owner)
  assert.equal(manifest.contractSource, `iot_server_backend@${contract.backendCommit}`)
  assert.match(contract.backendCommit, /^[0-9a-f]{40}$/)
  assert.match(webpack, /contractBackendCommit: demoContract\.backendCommit/)
  assert.ok(Object.keys(manifest.fixtures).length >= 50)

  for (const [name, expectedHash] of Object.entries(manifest.fixtures)) {
    const content = await readFile(fixtureUrl(name))
    assert.equal(createHash('sha256').update(content).digest('hex'), expectedHash, name)
  }
})

test('identity, company and option fixtures follow the frozen backend response fields', async () => {
  const user = await readJson('users/current-office.response.json')
  const companies = await readJson('companies/list-page.response.json')
  const hosts = await readJson('hosts/options-page.response.json')
  const models = await readJson('pod-models/options-page.response.json')

  for (const field of ['id', 'uuid', 'email', 'company_id', 'company', 'role', 'permissions', 'allowed_companies', 'writable_companies', 'created_at']) assert.ok(field in user, field)
  assert.deepEqual(user.allowed_companies, [300])
  assert.deepEqual(user.writable_companies, [300])
  assert.ok(companies.items.every(item => item.company_name && item.short_name && item.company_code && item.status === 'active'))
  assert.ok(hosts.items.every(item => item.serial_no && item.mac_address && item.presence))
  assert.ok(models.items.every(item => item.code && item.company_id && item.created_at))
})

test('location, district, pod and booking fixtures use paged backend envelopes', async () => {
  const districts = await readJson('districts/provinces.response.json')
  const locations = await readJson('locations/list-page.response.json')
  const pods = await readJson('pods/list-page.response.json')
  const bookings = await readJson('bookings/list-page.response.json')
  const bookablePods = await readJson('bookings/bookable-pods.response.json')

  for (const response of [districts, locations, pods, bookings]) {
    assert.equal(response.total, response.items.length)
    assert.ok(Array.isArray(response.items))
  }
  assert.ok(districts.items.every(item => item.id && item.code && item.level))
  assert.ok(locations.items.every(item => item.com_id && item.gps && item.gps_source))
  assert.ok(pods.items.every(item => item.pod_name && item.pod_model && item.host && item.status))
  assert.ok(bookings.items.every(item => item.lifecycle && item.automation_status && item.revision))
  assert.ok(bookablePods.every(item => item.booking_config_uuid && item.booking_capability === 'enabled'))
})

test('Dashboard batch fixtures include every required request and response field', async () => {
  const request = await readJson('dashboard/chart-query.request.json')
  const response = await readJson('dashboard/chart-query.response.json')
  const query = request.queries[0]
  const result = response.items[0]

  for (const field of ['request_id', 'source_key', 'metric_key', 'aggregation', 'interval', 'timezone', 'resource_uuids']) assert.ok(field in query, field)
  for (const field of ['request_id', 'series', 'statistics', 'cache', 'generated_at', 'data_version', 'status', 'error']) assert.ok(field in result, field)
})

test('visible dashboard configuration routes have frozen read-only fixtures', async () => {
  const list = await readJson('dashboard-configs/list-page.response.json')
  const detail = await readJson('dashboard-configs/detail.response.json')

  assert.equal(list.total, 4)
  assert.ok(list.items.every(item => item.company_id && item.company_name && Array.isArray(item.config_json?.panels)))
  assert.equal(detail.company_id, 100)
  assert.equal(detail.is_active, true)
  assert.equal(detail.config_json.panels.length, 9)
  assert.deepEqual(
    detail.config_json.panels.map(panel => panel.chart),
    ['stat', 'line', 'pie', 'pie', 'bar', 'bar', 'pie', 'line', 'table']
  )
})
