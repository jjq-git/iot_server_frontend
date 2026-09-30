import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/views/PodDetail.vue', import.meta.url), 'utf8')

test('bound node dialog hides unusable MAC actions when no node has a MAC address', () => {
  assert.match(source, /const hasMacAddress = this\.nodesList\.some\(node => Boolean\(node\.mac_address\)\)/)
  assert.match(source, /if \(hasMacAddress\) \{[\s\S]*key: 'mac_address'[\s\S]*key: 'actions'/)
  assert.match(source, /v-if="data\.item\.mac_address"[\s\S]*copyMacAddress\(data\.item\)/)
})

test('bound node dialog renders a placeholder for a missing MAC in mixed lists', () => {
  assert.match(source, /#cell\(mac_address\)="data"[\s\S]*v-else class="text-muted">—<\/span>/)
})
