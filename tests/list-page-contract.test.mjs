import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const mixinPath = path.join(root, 'src/mixins/listPage.js')
const consumers = [
  'src/views/mqtt_server/Clients.vue',
  'src/views/mqtt_server/Subscriptions.vue',
  'src/views/mqtt_server/Topics.vue'
]

test('list page lifecycle has at least three real consumers', () => {
  assert.equal(fs.existsSync(mixinPath), true)
  const actualConsumers = consumers.filter(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    return /createListPageMixin\s*\(/.test(source)
  })
  assert.deepEqual(actualConsumers, consumers)
})

test('shared list lifecycle owns query, URL, pagination and response states', () => {
  const source = fs.readFileSync(mixinPath, 'utf8')
  assert.match(source, /hydrateListQuery/)
  assert.match(source, /syncListQuery/)
  assert.match(source, /buildListParams/)
  assert.match(source, /async loadList/)
  assert.match(source, /loadError/)
  assert.match(source, /onPageChange/)
  assert.match(source, /onPageSizeChange/)
  assert.match(source, /onReset/)
})

test('MQTT list pages use the standard section, table and footer layout', () => {
  for (const file of consumers) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    assert.match(source, /<list-page-card\b/, file)
    assert.match(source, /<template #filters>/, file)
    assert.match(source, /<template #footer>/, file)
    assert.match(source, /:show-per-page="true"/, file)
    assert.match(source, /@update:perPage="onPageSizeChange"/, file)
  }
})

test('HN model list keeps its permission-gated create action', () => {
  const view = fs.readFileSync(path.join(root, 'src/views/HnModels.vue'), 'utf8')
  const section = fs.readFileSync(path.join(root, 'src/components/hn-model/HnModelListSection.vue'), 'utf8')

  assert.match(view, /:allow-create="canCreate\(\)"/)
  assert.match(view, /@create="openCreateDialog"/)
  assert.match(section, /<base-button v-if="allowCreate" @click="\$emit\('create'\)">/)
  assert.match(section, /allowCreate: \{ type: Boolean, default: false \}/)
})
