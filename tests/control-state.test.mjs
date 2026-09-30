import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildControlAddressIndex,
  controlAddressKey,
  hasActiveControlShadows,
  stateSnapshotUpdates,
  statusMessageUpdates
} from '../src/utils/control-state.mjs'

function schemaModules () {
  const field = {
    attr_code: 'fan_speed',
    co_index: '0X3021',
    co_sub_index: '0x02',
    current_values: {},
    shadows: {}
  }
  return [{
    device_type: 'node',
    instances: [{ device_uuid: 'node-1', can_node_id: 21 }],
    fields: [field],
    widgets: [{ fields: [{ ...field }] }]
  }]
}

test('normalizes OD addresses and maps status values to schema fields', () => {
  const modules = schemaModules()
  const index = buildControlAddressIndex(modules)
  const updates = statusMessageUpdates({
    control_values_accepted: true,
    data: [{ nid: 21, objs: [{ idx: '0x3021', sidx: 2, val: 61 }] }]
  }, index)

  assert.equal(controlAddressKey(21, '0X3021', '0x02'), '21:0x3021:2')
  assert.equal(updates.length, 2)
  assert.equal(updates[0].targetUuid, 'node-1')
  assert.equal(updates[0].value, 61)
})

test('rejects stale status events and maps authoritative state shadows', () => {
  const modules = schemaModules()
  const index = buildControlAddressIndex(modules)
  assert.deepEqual(statusMessageUpdates({
    control_values_accepted: false,
    data: [{ nid: 21, objs: [{ idx: '0x3021', sidx: 2, val: 1 }] }]
  }, index), [])

  const updates = stateSnapshotUpdates({
    items: [{
      target_uuid: 'node-1',
      nid: 21,
      co_index: '0x3021',
      co_sub_index: '0x02',
      value: 72,
      shadow: { state: 'acknowledged' }
    }]
  }, index)
  assert.equal(updates.length, 2)
  assert.equal(updates[0].shadow.state, 'acknowledged')
})

test('detects only unresolved desired state', () => {
  const modules = schemaModules()
  modules[0].fields[0].shadows['node-1'] = { state: 'reported' }
  assert.equal(hasActiveControlShadows(modules), false)
  modules[0].fields[0].shadows['node-1'] = { state: 'pending' }
  assert.equal(hasActiveControlShadows(modules), true)
})

test('keeps current values and shadows isolated for same-model nodes', () => {
  const modules = schemaModules()
  modules[0].instances.push({ device_uuid: 'node-2', can_node_id: 22 })
  const index = buildControlAddressIndex(modules)
  const updates = stateSnapshotUpdates({
    items: [
      {
        target_uuid: 'node-1',
        nid: 21,
        co_index: '0x3021',
        co_sub_index: '0x02',
        value: 20,
        shadow: { state: 'applied', desired_value: 20, reported_value: 20 }
      },
      {
        target_uuid: 'node-2',
        nid: 22,
        co_index: '0x3021',
        co_sub_index: '0x02',
        value: 50,
        shadow: { state: 'acknowledged', desired_value: 50, reported_value: 40 }
      }
    ]
  }, index)

  const moduleFieldUpdates = updates.filter(update => update.field === modules[0].fields[0])
  assert.deepEqual(moduleFieldUpdates.map(update => [update.targetUuid, update.value]), [
    ['node-1', 20],
    ['node-2', 50]
  ])
  assert.equal(moduleFieldUpdates[0].shadow.reported_value, 20)
  assert.equal(moduleFieldUpdates[1].shadow.reported_value, 40)
})
