import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findOdDeviceResolution,
  getCanopenModelCode,
  getResolvedOdSpec,
  isFreshOdSnapshot,
  readCanopenStatusValue
} from '../src/utils/canopen.mjs'

test('resolves only catalog-backed CANopen model codes', () => {
  const catalog = { nodes: [{ id: 'NU0001' }], hosts: [{ id: 'HU0000' }] }
  assert.equal(getCanopenModelCode({ node_model_code: 'NU0001' }, catalog), 'NU0001')
  assert.equal(getCanopenModelCode({ product_code: '0x4E550001' }, catalog), '')
  assert.equal(getCanopenModelCode({ node_model_code: 'NU9999' }, catalog), '')
})

test('accepts target data-model codes without treating them as legacy catalog ids', () => {
  assert.equal(getCanopenModelCode({ model_code: 'N-0001' }), 'N-0001')
  assert.equal(getCanopenModelCode({ model_code: 'P-WF2-0050' }), 'P-WF2-0050')
})

test('uses authoritative route ids and only resolved available specs', () => {
  const devices = [{
    target_type: 'node',
    route_device_id: 2,
    resolution_status: 'resolved',
    spec_status: 'available',
    spec_id: 'NU0001',
    spec_versions: ['V0.0.1'],
    preferred_spec_version: 'V0.0.1'
  }]
  const resolution = findOdDeviceResolution(devices, 'node', 2)
  assert.equal(resolution.spec_id, 'NU0001')
  assert.deepEqual(getResolvedOdSpec(resolution), {
    id: 'NU0001',
    version: 'V0.0.1',
    versions: ['V0.0.1'],
    hnModelId: null,
    source: 'legacy_yaml'
  })
  assert.deepEqual(getResolvedOdSpec({
    ...resolution,
    model_code: 'N-7800',
    od_version: '1.0.0',
    resolved_hn_model_id: 22,
    spec_status: 'missing'
  }), {
    id: 'N-7800',
    version: '1.0.0',
    versions: ['1.0.0'],
    hnModelId: 22,
    source: 'postgresql_hn_model_attrs'
  })
  assert.equal(getResolvedOdSpec({ ...resolution, resolution_status: 'model_unmatched' }), null)
})

test('rejects a completed snapshot from the previous dump', () => {
  const baseline = { exists: true, dump_id: 7, started_at: '2026-08-18T01:00:00Z' }
  assert.equal(isFreshOdSnapshot({ ...baseline, completed: true }, baseline, 0), false)
  assert.equal(isFreshOdSnapshot({ exists: true, dump_id: 8, started_at: '2026-08-18T01:01:00Z' }, baseline, 0), true)
})

test('reads flat and node-scoped current values', () => {
  assert.deepEqual(readCanopenStatusValue({ led_enable: 1 }, { name: 'led_enable' }, 2), { found: true, value: 1 })
  assert.deepEqual(readCanopenStatusValue({ nodes: { 2: { fan_speed: 35 } } }, { name: 'fan_speed' }, 2), { found: true, value: 35 })
  assert.deepEqual(readCanopenStatusValue({ controls: { lighting: { brightness: 80 } } }, { name: 'brightness' }, 2), { found: true, value: 80 })
  assert.deepEqual(readCanopenStatusValue({}, { name: 'unknown' }, 2), { found: false, value: null })
})
