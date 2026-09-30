import assert from 'node:assert/strict'
import test from 'node:test'

import { optionList, widgetsForModule, WIDGET_TYPES } from '../src/utils/widget-contract.mjs'

test('catalog exposes all 13 widget types', () => {
  assert.equal(WIDGET_TYPES.length, 13)
  assert.equal(new Set(WIDGET_TYPES).size, 13)
})

test('legacy flat fields are promoted to widgets', () => {
  const widgets = widgetsForModule({ fields: [{ attr_code: 'x', attr_name: 'X', widget: 'switch' }] })
  assert.equal(widgets[0].id, 'x')
  assert.equal(widgets[0].widget, 'switch')
  assert.equal(widgets[0].fields.length, 1)
})

test('object option maps become select options', () => {
  assert.deepEqual(optionList({ 0: 'Off', 1: 'On' }), [
    { value: '0', text: 'Off' },
    { value: '1', text: 'On' }
  ])
})

test('controlled switch widgets propagate the BootstrapVue input value', async () => {
  const source = await import('node:fs/promises')
    .then(fs => fs.readFile(new URL('../src/components/DeviceWidget.vue', import.meta.url), 'utf8'))

  assert.match(source, /type === 'switch'[^>]+@input="setPrimary"/)
  assert.match(source, /type === 'channel_switch'[\s\S]+@input="setField\(field, \$event\)"/)
})
