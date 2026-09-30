import assert from 'node:assert/strict'
import test from 'node:test'

import { expandControlModules } from '../src/utils/control-modules.mjs'

test('expands same-model node instances into separate control cards', () => {
  const module = {
    device_model_uuid: 'light-model',
    quantity: 2,
    instances: [
      { device_uuid: 'node-2', can_node_id: 2 },
      { device_uuid: 'node-3', can_node_id: 3 }
    ]
  }

  const cards = expandControlModules([module])

  assert.deepEqual(cards.map(card => card.instance.can_node_id), [2, 3])
  assert.deepEqual(cards.map(card => card.bound), [true, true])
  assert.equal(new Set(cards.map(card => card.key)).size, 2)
})

test('keeps missing expected instances visible as unbound cards', () => {
  const module = {
    device_model_uuid: 'light-model',
    quantity: 2,
    instances: [{ device_uuid: 'node-2', can_node_id: 2 }]
  }

  const cards = expandControlModules([module])

  assert.equal(cards.length, 2)
  assert.equal(cards[0].bound, true)
  assert.equal(cards[1].bound, false)
  assert.equal(cards[1].instance, null)
  assert.equal(cards[1].module.bound, false)
  assert.deepEqual(cards[1].module.instances, [])
})
