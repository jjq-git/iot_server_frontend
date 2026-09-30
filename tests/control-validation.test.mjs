import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyControlSafetyInterlocks,
  isControlFieldInterlocked,
  normalizeControlFieldValue,
  pendingControlKey,
  reconcileControlDisplayState,
  shouldRollbackControlDraft,
  sliderDisplayValue,
  validateControlFieldValue
} from '../src/utils/control-validation.mjs'

const brightness = {
  attr_code: 'brightness_percent',
  data_type: 'UNSIGNED8',
  min_val: '0',
  max_val: '100',
  co_index: '0x3001',
  co_sub_index: '0x03'
}

test('accepts brightness endpoints and rejects invalid values', () => {
  assert.equal(validateControlFieldValue(brightness, 0).valid, true)
  assert.equal(validateControlFieldValue(brightness, 100).valid, true)
  assert.equal(validateControlFieldValue(brightness, -1).reason, 'below_min')
  assert.equal(validateControlFieldValue(brightness, 101).reason, 'above_max')
  assert.equal(validateControlFieldValue(brightness, 12.5).reason, 'not_integer')
  assert.equal(validateControlFieldValue(brightness, 'bad').reason, 'not_number')
})

test('normalizes generic integer values from MQTT property forms', () => {
  const integerField = { data_type: 'INTEGER' }
  assert.equal(normalizeControlFieldValue(integerField, '0'), 0)
  assert.equal(normalizeControlFieldValue(integerField, '100'), 100)
  assert.equal(normalizeControlFieldValue(integerField, 'bad'), null)
})

test('preserves unknown device values instead of fabricating zero or a minimum', () => {
  assert.equal(normalizeControlFieldValue(brightness, null), null)
  assert.equal(normalizeControlFieldValue({ ...brightness, default_val: '35' }, null), 35)
  assert.equal(normalizeControlFieldValue({ data_type: 'BOOLEAN' }, null), null)
  assert.equal(normalizeControlFieldValue({ data_type: 'BOOLEAN', default_val: 'false' }, null), false)
})

test('renders an unknown slider at its minimum without changing the stored value', () => {
  assert.equal(sliderDisplayValue(null, 0, 100), 0)
  assert.equal(sliderDisplayValue(undefined, 2700, 6500), 2700)
  assert.equal(sliderDisplayValue(91, 0, 100), 91)
  assert.equal(sliderDisplayValue(120, 0, 100), 100)
})

test('rolls back only the matching failed command and unchanged draft', () => {
  const pending = { commandId: '42', submittedValue: 50 }
  assert.equal(shouldRollbackControlDraft({ pending, shadow: { state: 'failed', command_id: '42' }, draft: 50 }), true)
  assert.equal(shouldRollbackControlDraft({ pending, shadow: { state: 'timeout', command_id: '41' }, draft: 50 }), false)
  assert.equal(shouldRollbackControlDraft({ pending, shadow: { state: 'failed', command_id: '42' }, draft: 60 }), false)
})

test('pending keys isolate the same field on different nodes', () => {
  assert.notEqual(pendingControlKey('node-2', brightness), pendingControlKey('node-3', brightness))
})

test('turning a fan switch off also submits a zero speed target', () => {
  const fields = [
    { attr_code: 'fan_on' },
    { attr_code: 'fan_speed' }
  ]

  assert.deepEqual(
    applyControlSafetyInterlocks(fields, { fan_on: false, fan_speed: 83 }),
    { fan_on: false, fan_speed: 0 }
  )
  assert.deepEqual(
    applyControlSafetyInterlocks(fields, { fan_on: true, fan_speed: 83 }),
    { fan_on: true, fan_speed: 83 }
  )
  assert.equal(isControlFieldInterlocked(fields[1], { fan_on: false }), true)
  assert.equal(isControlFieldInterlocked(fields[1], { fan_on: true }), false)
})

test('a non-zero fan output is displayed as on when the compatibility switch is stale', () => {
  const fields = [
    { attr_code: 'fan_on' },
    { attr_code: 'fan_speed' }
  ]

  assert.deepEqual(
    reconcileControlDisplayState(fields, { fan_on: false, fan_speed: 56 }),
    { fan_on: true, fan_speed: 56 }
  )
  assert.deepEqual(
    reconcileControlDisplayState(fields, { fan_on: false, fan_speed: 0 }),
    { fan_on: false, fan_speed: 0 }
  )
})

test('fan display reconciliation does not change independent light controls', () => {
  const fields = [
    { attr_code: 'light_on' },
    { attr_code: 'brightness' }
  ]

  assert.deepEqual(
    reconcileControlDisplayState(fields, { light_on: false, brightness: 80 }),
    { light_on: false, brightness: 80 }
  )
})

test('fan and light interlocks do not invent fields for unrelated modules', () => {
  assert.deepEqual(
    applyControlSafetyInterlocks([{ attr_code: 'fan_on' }], { fan_on: false }),
    { fan_on: false }
  )
  assert.deepEqual(
    applyControlSafetyInterlocks([{ attr_code: 'light_on' }], { light_on: false, brightness: 80 }),
    { light_on: false, brightness: 80 }
  )
})

test('turning a light switch off submits zero brightness and locks brightness editing', () => {
  const fields = [
    { attr_code: 'light_on' },
    { attr_code: 'brightness' }
  ]

  assert.deepEqual(
    applyControlSafetyInterlocks(fields, { light_on: false, brightness: 80 }),
    { light_on: false, brightness: 0 }
  )
  assert.equal(isControlFieldInterlocked(fields[1], { light_on: false }), true)
  assert.equal(isControlFieldInterlocked(fields[1], { light_on: true }), false)
  assert.equal(isControlFieldInterlocked({ attr_code: 'cct' }, { light_on: false }), false)
})

test('legacy LED output aliases receive the same zero-output interlock', () => {
  const fields = [
    { attr_code: 'led_output' },
    { attr_code: 'BRIGHTNESS_PERCENT' }
  ]

  assert.deepEqual(
    applyControlSafetyInterlocks(fields, { led_output: false, BRIGHTNESS_PERCENT: 65 }),
    { led_output: false, BRIGHTNESS_PERCENT: 0 }
  )
  assert.equal(isControlFieldInterlocked(fields[1], { led_output: false }), true)
})
