import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('OD snapshot API and manager use canonical nid storage contract', () => {
  const api = read('src/api/od.js')
  const view = read('src/views/OdManager.vue')

  assert.match(api, /params: \{ host_uuid: hostUuid, nid \}/)
  assert.doesNotMatch(api, /od\/snapshot[^\n]*device_id/)
  assert.match(view, /snapshot\.nid/)
  assert.match(view, /message\?\.nid \?\? message\?\.data\?\.nid \?\? message\?\.device_id/)
  assert.doesNotMatch(view, /snapshot\.device_id/)
})

test('OD command keeps its independent command-route device id', () => {
  const view = read('src/views/OdManager.vue')

  assert.match(view, /device_id: this\.form\.device_id/)
  assert.match(view, /const queryNid = this\.snapshotNid\(\)/)
})

test('OD manager submits a bounded snapshot profile contract', () => {
  const view = read('src/views/OdManager.vue')

  assert.match(view, /profile: 'full'/)
  assert.match(view, /\['fault', 'startup', 'maintenance', 'full', 'custom'\]/)
  assert.match(view, /profile: this\.form\.profile/)
  assert.match(view, /objects: this\.customObjectResult\.objects/)
  assert.match(view, /tokens\.length === 0 \|\| tokens\.length > 128/)
  assert.match(view, /if \(!this\.canDump\) return/)
})

test('OD diagnostics load the resolved PostgreSQL model and match exact CANopen addresses', () => {
  const api = read('src/api/od.js')
  const view = read('src/views/OdManager.vue')

  assert.match(api, /params: hnModelId \? \{ hn_model_id: hnModelId \}/)
  assert.match(view, /this\.spec\?\.source === 'postgresql_hn_model_attrs'/)
  assert.match(view, /specByAddress\.get\(`\$\{devIdx\}:\$\{devSub\}`\)/)
  assert.match(view, /fetchOdSpec\(this\.specDeviceId, this\.specVersion, this\.specHnModelId\)/)
})
