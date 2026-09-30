import assert from 'node:assert/strict'
import test from 'node:test'

import { buildControlAddressIndex } from '../src/utils/control-state.mjs'
import { formatPodRecordDescription } from '../src/utils/pod-records.mjs'

const modules = [{
  device_type: 'node',
  title: 'Light',
  instances: [{ device_uuid: 'node-1', can_node_id: 2 }],
  fields: [
    { attr_uuid: 'a1', attr_code: 'led_mode', attr_name: 'LED 模式', co_index: '0x3001', co_sub_index: '0x01' },
    { attr_uuid: 'a2', attr_code: 'led_enable', attr_name: 'LED 开关', data_type: 'BOOLEAN', widget: 'switch', co_index: '0x3001', co_sub_index: '0x02' }
  ],
  widgets: []
}]

test('formats three-layer MQTT status by control-schema address', () => {
  const index = buildControlAddressIndex(modules)
  const description = formatPodRecordDescription({
    message_id: 12,
    data: [{ nid: 2, objs: [
      { idx: '0x3001', sidx: 1, val: 2 },
      { idx: '0x3001', sidx: 2, val: true }
    ] }]
  }, index, { on: '开', off: '关', node: '节点' })

  assert.equal(description, 'Light｜LED 模式: 2，LED 开关: 开')
  assert.equal(description.includes('[object Object]'), false)
})

test('keeps unknown addresses readable instead of stringifying objects', () => {
  const description = formatPodRecordDescription(
    { data: [{ nid: 3, objs: [{ idx: '0x4000', sidx: 4, val: 18 }] }] },
    new Map(),
    { node: '节点' }
  )
  assert.equal(description, '节点 3｜0x4000:4: 18')
})

test('flattens legacy nested data safely', () => {
  const description = formatPodRecordDescription(
    { data: { environment: { temperature: 26, online: true } } },
    new Map(),
    { on: '开', off: '关', fields: { temperature: '温度' } }
  )
  assert.equal(description, '温度: 26；environment.online: 开')
  assert.equal(description.includes('[object Object]'), false)
})
