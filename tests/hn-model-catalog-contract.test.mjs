import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { groupHnModelHardwareLines } from '../src/utils/hn-model-catalog.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('HN model list shows one expandable row per paginated hardware line', () => {
  const api = read('src/api/hnModels.js')
  const workspace = read('src/mixins/hnModelListWorkspace.js')
  const view = read('src/views/HnModels.vue')
  const section = read('src/components/hn-model/HnModelListSection.vue')

  assert.match(api, /\/hn-model-catalog\/hardware-lines/)
  assert.match(api, /http\.post\('\/hn-model-catalog\/hardware-lines', data\)/)
  assert.match(api, /response\?\.status !== 404/)
  assert.match(api, /fetchLegacyHardwareLines/)
  assert.match(workspace, /fetchHnModelHardwareLines/)
  assert.doesNotMatch(workspace, /fetchHnModels/)
  assert.doesNotMatch(view, /toggleVersions/)
  assert.match(section, /#row-details="row"/)
  assert.match(section, /<hn-model-version-tree/)
  assert.match(section, /row\.toggleDetails\(\)/)
  assert.match(section, /data\.item\.version_count/)
  assert.match(section, /#cell\(actions\)="data"/)
  assert.match(section, /\$emit\('attributes', data\.item\)/)
  assert.match(section, /\$emit\('attributes', data\.item\)[\s\S]*?<app-icon name="list-ul"/)
  assert.doesNotMatch(section, /\$emit\('standard-attributes', data\.item\)/)
  assert.match(view, /:allow-create="canCreate\(\)"/)
  assert.match(section, /v-if="allowCreate"/)
  assert.match(section, /\$emit\('create'\)/)
  assert.match(section, /\$emit\('add-hardware', data\.item\)/)
  assert.match(view, /openAddHardwareDialog/)
  assert.match(view, /new_od: '1'/)
  assert.match(view, /company_id: Number\(this\.form\.company_id\)/)
  assert.match(view, /part_number: this\.form\.part_number\.trim\(\)\.toUpperCase\(\)/)
  assert.match(view, /model_type: this\.form\.is_host \? 'product' : 'node'/)
})

test('HN model version tree follows the backend hardware to OD to software hierarchy', () => {
  const tree = read('src/components/hn-model/HnModelVersionTree.vue')

  assert.match(tree, /fetchHnModelRevisions\(this\.hardwareLine\.id\)/)
  assert.match(tree, /fetchHnModelVersions\(revision\.id\)/)
  assert.match(tree, /expandedRevisionId/)
  assert.match(tree, /hardwareLine\.is_host/)
  assert.match(tree, /revisionId: revision\.id, versionUuid: version\.uuid/)
  assert.match(tree, /fetchFirmwares\(\{ model_code: this\.hardwareLine\.model_code/)
  assert.match(tree, /item\.hn_model_id/)
  assert.match(tree, /firmwareFor\(version\)\.file_name/)
  assert.match(tree, /version\.is_active === false/)
  assert.match(tree, /\$emit\('upload-firmware'/)
  assert.match(tree, /\$emit\('edit-firmware'/)
})

test('HN model detail is the only model editing surface', () => {
  const view = read('src/views/HnModels.vue')
  const section = read('src/components/hn-model/HnModelListSection.vue')

  assert.doesNotMatch(section, /allowEdit|\$emit\('edit'/)
  assert.doesNotMatch(view, /@edit="editModel"|async editModel/)
  assert.match(view, /:title="createDialogTitle"/)
  assert.match(view, /this\.addingHardwareLine[\s\S]*?hn_models\.version_catalog\.hw_version/)
  for (const field of ['vendor_id', 'product_code', 'hw_version', 'compatible_hw_versions', 'auto_discovery_enabled']) {
    assert.match(view, new RegExp(`editingField === '${field}'`), `detail is missing the ${field} editor`)
    assert.match(view, new RegExp(`startEdit\\('${field}'`), `detail is missing the ${field} edit trigger`)
  }
  assert.match(view, /CATALOG_DETAIL_EDITABLE_FIELDS = new Set\(\['model_name', 'status', 'desc', 'url'\]\)/)
  assert.match(view, /fetchHnModelRevisions\(row\.id\)[\s\S]*?fetchHnModelVersions\(revision\.id\)[\s\S]*?target\.uuid/)
  assert.match(view, /await updateHnModel\(this\.detailUpdateUuid\(\), updateData\)/)
  assert.match(view, /await createHnModel\(payload\)/)
})

test('legacy exact-version rows are grouped without losing aggregate status or anchors', () => {
  const rows = [
    { id: 24, model_code: 'H0050', hw_version: '1.0', od_ver: 'legacy-unknown', sw_ver: 'formal', status: 'frozen', created_at: '2026-09-05T06:11:00Z', updated_at: '2026-09-05T06:11:00Z' },
    { id: 16, model_code: 'H0050', hw_version: '1.0', od_ver: 'legacy-unknown', sw_ver: 'legacy-unknown', status: 'active', created_at: '2026-09-03T06:45:00Z', updated_at: '2026-09-03T06:45:00Z' },
    { id: 29, model_code: 'H0050', hw_version: '1.0', od_ver: 'V2', sw_ver: 'retry', status: 'active', created_at: '2026-09-05T08:10:00Z', updated_at: '2026-09-05T08:10:00Z' },
    { id: 30, model_code: 'N7800', hw_version: '1.0', od_ver: 'legacy-unknown', sw_ver: 'old', status: 'frozen', created_at: '2026-09-04T00:00:00Z', updated_at: '2026-09-04T00:00:00Z' }
  ]

  const lines = groupHnModelHardwareLines(rows)
  const host = lines.find(line => line.model_code === 'H0050')
  assert.equal(lines.length, 2)
  assert.equal(host.hn_model_id, 16)
  assert.equal(host.version_count, 3)
  assert.equal(host.revision_count, 2)
  assert.equal(host.status, 'active')
  assert.deepEqual(
    groupHnModelHardwareLines(rows, 'frozen').map(line => line.model_code),
    ['N7800']
  )
})

test('HN model status and version catalog copy exists in every locale', () => {
  const localeDir = path.join(projectRoot, 'src/locales')
  const localeFiles = fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))

  assert.equal(localeFiles.length, 8)
  for (const file of localeFiles) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    assert.ok(messages.hn_models?.status?.active, `${file} missing active status`)
    assert.ok(messages.hn_models?.status?.frozen, `${file} missing frozen status`)
    assert.ok(messages.hn_models?.form?.part_number, `${file} missing part-number label`)
    assert.ok(messages.hn_models?.version_catalog?.hw_version, `${file} missing HW version label`)
    assert.ok(messages.hn_models?.version_catalog?.od_version, `${file} missing OD version label`)
    assert.ok(messages.hn_models?.version_catalog?.software_version, `${file} missing SW version label`)
    assert.ok(messages.hn_models?.version_catalog?.summary, `${file} missing version summary`)
  }
})
