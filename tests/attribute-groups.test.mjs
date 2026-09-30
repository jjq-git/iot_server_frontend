import test from 'node:test'
import assert from 'node:assert/strict'

import { buildAttributeGroups } from '../src/utils/attribute-groups.mjs'

const items = [
  { category: 'communication', group_name: 'Communication', attr_code: 'COMM_BASE', attr_name: 'Base address', co_index: '0x2000' },
  { category: '', group_name: '', attr_code: 'fan_speed', attr_name: 'Fan speed' }
]

test('groups released attributes and preserves indexless MQTT properties', () => {
  const groups = buildAttributeGroups(items, '', 'Ungrouped')

  assert.equal(groups.length, 2)
  assert.equal(groups[0].name, 'Communication')
  assert.equal(groups[1].key, '__ungrouped__')
  assert.equal(groups[1].items[0].attr_code, 'fan_speed')
})

test('filters groups by metadata and attribute fields', () => {
  assert.equal(buildAttributeGroups(items, 'communication', 'Ungrouped')[0].items.length, 1)
  assert.equal(buildAttributeGroups(items, 'COMM_BASE', 'Ungrouped')[0].key, 'communication')
  assert.equal(buildAttributeGroups(items, 'fan speed', 'Ungrouped')[0].key, '__ungrouped__')
})
