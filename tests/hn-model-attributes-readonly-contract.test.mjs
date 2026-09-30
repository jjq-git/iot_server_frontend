import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

const viewSource = readFileSync(
  new URL('../src/views/HnModels.vue', import.meta.url),
  'utf8'
)
const apiSource = readFileSync(
  new URL('../src/api/hnModels.js', import.meta.url),
  'utf8'
)

test('model attribute management is a read-only Configs release view', () => {
  const start = viewSource.indexOf('id="hn-models-new-attr-modal"')
  const end = viewSource.indexOf('</base-modal>', start)
  assert.ok(start >= 0 && end > start)
  const modal = viewSource.slice(start, end)

  assert.match(modal, /hn_models\.publication\.configs_package/)
  assert.match(modal, /hn_models\.publication\.profile_id/)
  assert.match(modal, /hn_models\.index_tree\.empty_configs/)
  assert.match(modal, /attributePublication\.active !== null/)
  assert.doesNotMatch(modal, /uploadJsonInput|triggerUploadJson|saveNewAttribute|saveIndexImport/)
})

test('model index resource no longer exposes the legacy replacement write', () => {
  assert.match(apiSource, /http\.get\(`\/hn-models\/\$\{modelId\}\/indexes`\)/)
  assert.doesNotMatch(apiSource, /http\.put\(`\/hn-models\/\$\{modelId\}\/indexes`/)
  assert.doesNotMatch(apiSource, /replaceModelIndexes/)
  assert.doesNotMatch(apiSource, /attributes\/single|standard-canopen|copyStandardAttribute/)
})

test('read-only attribute selection supports indexless MQTT attributes', () => {
  assert.match(viewSource, /: `mqtt:\$\{attrCode \|\| ''\}`/)
  assert.match(viewSource, /index\.co_index \|\| index\.attr_code/)
  assert.match(viewSource, /selectedNewAttrKey/)
})

test('all locales describe the read-only Configs publication flow without import actions', () => {
  const localeDirectory = new URL('../src/locales/', import.meta.url)
  const localeFiles = readdirSync(localeDirectory).filter(file => file.endsWith('.json'))

  assert.equal(localeFiles.length, 8)
  for (const file of localeFiles) {
    const messages = JSON.parse(readFileSync(new URL(file, localeDirectory), 'utf8'))
    assert.ok(messages.hn_models?.publication?.configs_package, `${file} missing publication source`)
    assert.ok(messages.hn_models?.index_tree?.empty_configs, `${file} missing Configs empty state`)
    assert.equal(messages.hn_models?.index_tree?.upload_json, undefined, `${file} still exposes JSON upload`)
    assert.equal(messages.hn_models?.index_tree?.save_import, undefined, `${file} still exposes import save`)
  }
})
