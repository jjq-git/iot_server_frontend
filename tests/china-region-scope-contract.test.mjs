import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = path => readFile(new URL(path, import.meta.url), 'utf8')

test('China-only location workflows render the country as read-only', async () => {
  const [podDetail, pods, locations, locationDetail] = await Promise.all([
    readSource('../src/views/PodDetail.vue'),
    readSource('../src/views/Pods.vue'),
    readSource('../src/views/Locations.vue'),
    readSource('../src/views/LocationDetail.vue')
  ])

  assert.doesNotMatch(podDetail, /startEdit\('country_code'/)
  assert.doesNotMatch(podDetail, /countrySelectOptions/)
  assert.doesNotMatch(pods, /assignForm\.location/)
  assert.doesNotMatch(pods, /country_code:\s*this\.assignForm/)
  assert.match(locations, /:value="formatCountry\(createForm\)"\s+disabled/)
  assert.match(locations, /:value="formatCountry\(currentEditLocation \|\| editForm\)"\s+disabled/)
  assert.match(locationDetail, /id="location-edit-country"[^>]+:value="formatCountry\(detail\)"[^>]+disabled/)
})

test('pod detail exposes empty and failed region-data states with retry', async () => {
  const source = await readSource('../src/views/PodDetail.vue')

  assert.match(source, /v-if="regionLoadIssue"/)
  assert.match(source, /@click="retryRegionLoad"/)
  assert.match(source, /pod_detail\.region_data\.empty/)
  assert.match(source, /pod_detail\.region_data\.load_failed/)
})

test('all locales explain unavailable China region data', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

  for (const locale of locales) {
    const messages = JSON.parse(await readSource(`../src/locales/${locale}.json`))
    assert.ok(messages.pod_detail.region_data.empty, `${locale} is missing the empty-region message`)
    assert.ok(messages.pod_detail.region_data.load_failed, `${locale} is missing the failed-region message`)
  }
})
