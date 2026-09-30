import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const view = readFileSync(new URL('../src/views/ApiKeys.vue', import.meta.url), 'utf8')

test('API key testing follows backend provider test_supported metadata', () => {
  assert.match(view, /v-if="providerSupportsTest\(row\.item\.provider\)"/)
  assert.match(view, /provider\.test_supported !== false/)
  assert.match(view, /!this\.providerSupportsTest\(item\.provider\)/)
  assert.match(view, /api_keys\.test_status\.unsupported/)
})

test('providers without a default endpoint require an explicit base URL', () => {
  assert.match(view, /:required="requiresBaseUrl"/)
  assert.match(view, /!this\.currentProviderInfo\.default_base_url/)
  assert.match(view, /if \(this\.requiresBaseUrl && !this\.form\.base_url\) return false/)
  assert.match(view, /api_keys\.base_url_required/)
})
