import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/views/debug/EmcyLogs.vue', import.meta.url), 'utf8')

test('EMCY logs use canonical nid query and response fields', () => {
  assert.match(source, /URL_QUERY_FIELDS = \['host', 'limit', 'since', 'nid'\]/)
  assert.match(source, /params\.nid = this\.nid/)
  assert.match(source, /key: 'nid'/)
  assert.doesNotMatch(source, /params\.device_id =/)
})

test('EMCY logs render structured bytes 3 through 7', () => {
  assert.match(source, /key: 'error_bit'/)
  assert.match(source, /key: 'vendor_data'/)
  assert.match(source, /formatHex\(row\.item\.error_bit, 2\)/)
  assert.match(source, /formatHex\(row\.item\.vendor_data, 8\)/)
})

test('legacy device_id URL filters are restored but rewritten as nid', () => {
  assert.match(source, /q\.nid !== undefined \? q\.nid : q\.device_id/)
})
