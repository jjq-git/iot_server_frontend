import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const apiSource = await readFile(new URL('../src/api/firmwares.js', import.meta.url), 'utf8')
const managerSource = await readFile(new URL('../src/views/FirmwareManager.vue', import.meta.url), 'utf8')
const otaSource = await readFile(new URL('../src/views/OtaConsole.vue', import.meta.url), 'utf8')

test('firmware upload uses the backend multipart endpoint', () => {
  assert.match(apiSource, /http\.post\('\/firmwares\/upload', formData/)
  assert.doesNotMatch(apiSource, /http\.post\('\/firmwares', formData/)
})

test('firmware upload submits the canonical backend fields', () => {
  for (const field of [
    'file',
    'model_code',
    'version',
    'hn_model_id',
    'od_ver',
    'part_number',
    'model_type',
    'product_code',
    'vendor_id',
    'hw_version',
    'model_name',
    'manufacturer_id'
  ]) {
    assert.match(managerSource, new RegExp(`fd\\.append\\('${field}'`))
  }
  assert.match(managerSource, /fd\.append\('od_import_json'/)
  assert.match(managerSource, /fd\.append\('release_notes'/)
  assert.doesNotMatch(managerSource, /fd\.append\('(name|target_chip|note|is_latest)'/)
  assert.match(managerSource, /fetchHnModelHardwareLines/)
  assert.match(managerSource, /uploadForm\.hardware_line_id/)
  assert.match(managerSource, /query\.new_od === '1'/)
})

test('firmware metadata editing uses the backend update endpoint', () => {
  assert.match(apiSource, /http\.put\(`\/firmwares\/\$\{uuid\}`/)
  assert.match(managerSource, /updateFirmware\(this\.editingFirmware\.uuid/)
  assert.match(managerSource, /notes: this\.editForm\.notes \|\| null/)
  assert.doesNotMatch(managerSource, /updateFirmware[\s\S]*?revoked: this\.editForm\.revoked/)
})

test('firmware pages consume canonical response field names', () => {
  for (const field of ['model_code', 'file_name', 'file_size', 'hn_model_id']) {
    assert.match(managerSource, new RegExp(field))
  }
  assert.match(otaSource, /fw\.file_name \|\| fw\.model_code/)
})

test('firmware list uses backend pagination and supported model filtering', () => {
  assert.match(managerSource, /const params = \{ page: this\.page, page_size: this\.pageSize \}/)
  assert.match(managerSource, /params\.model_code = this\.filterTarget/)
  assert.match(managerSource, /this\.total = Number\(data\?\.total \?\? this\.firmwares\.length\)/)
  assert.match(managerSource, /<base-pagination/)
  assert.doesNotMatch(managerSource, /filterText|filteredFirmwares/)
})

test('firmware edit deep links fetch the exact backend resource outside the current page', () => {
  assert.match(managerSource, /import \{ fetchFirmware, fetchFirmwares/)
  assert.match(managerSource, /firmware = await fetchFirmware\(query\.edit\)/)
})

test('firmware upload rejects compatibility OD labels in the formal path', () => {
  assert.match(managerSource, /legacy-unknown/)
  assert.match(managerSource, /uploadForm\.od_import_file\.text\(\)/)
  assert.doesNotMatch(managerSource, /uploadForm\.is_latest/)
})

test('D1 OTA release metadata is explicit and fail-closed in the upload UI', () => {
  for (const field of [
    'project_name',
    'partition_table_sha256',
    'config_manifest_sha256',
    'signed_image_sha256',
    'ota_release_approved'
  ]) {
    assert.match(managerSource, new RegExp(field))
  }
  assert.match(managerSource, /\^\[0-9a-fA-F\]\{64\}\$/)
  assert.match(managerSource, /!this\.uploadForm\.ota_release_approved \|\| this\.otaMetadataComplete/)
})
