import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const view = readFileSync(new URL('../src/views/debug/Credentials.vue', import.meta.url), 'utf8')

test('credential list uses backend pagination and totals', () => {
  assert.match(view, /:total-rows="total"/)
  assert.match(view, /page: this\.query\.page/)
  assert.match(view, /page_size: this\.query\.page_size/)
  assert.match(view, /this\.total = Number\(data\?\.total \?\? this\.credentials\.length\)/)
  assert.match(view, /<base-pagination/)
})

test('credential mutations follow backend management scopes', () => {
  assert.match(view, /canCreateCredentials[\s\S]*PERMISSION\.PLATFORM_DEVICE_MANAGE/)
  assert.match(view, /canManageCredentials[\s\S]*PERMISSION\.DEVICE_OPERATE/)
  assert.match(view, /v-if="canCreateCredentials" variant="primary"/)
  assert.match(view, /v-if="canManageCredentials"/)
  assert.doesNotMatch(view, /v-if="isPlatformAdmin"/)
})
