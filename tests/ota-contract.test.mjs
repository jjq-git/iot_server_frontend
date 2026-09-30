import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'src/views/OtaConsole.vue'), 'utf8')
const permissionSource = fs.readFileSync(path.join(root, 'src/utils/permission.js'), 'utf8')
const sidebarSource = fs.readFileSync(path.join(root, 'src/components/Sidebar.vue'), 'utf8')

test('OTA console sends the backend device_id contract', () => {
  assert.match(source, /device_id:\s*this\.newTask\.device_id/)
  assert.doesNotMatch(source, /node_id:\s*this\.newTask\.node_id/)
})

test('OTA creation requires the backend host contract and exposes no unsupported note field', () => {
  assert.match(source, /if \(!this\.newTask\.host_uuid\)/)
  assert.match(source, /host_uuid:\s*this\.newTask\.host_uuid/)
  assert.doesNotMatch(source, /host_uuid:\s*this\.newTask\.host_uuid\s*\|\|\s*null/)
  assert.doesNotMatch(source, /newTask\.note|note_label|note_placeholder/)
})

test('OTA list uses backend pagination and supported server filters', () => {
  assert.match(source, /const params = \{ page: this\.page, page_size: this\.pageSize \}/)
  assert.match(source, /params\.status = this\.filterStatus/)
  assert.match(source, /params\.host_uuid = this\.filterHost/)
  assert.match(source, /<base-pagination/)
  assert.doesNotMatch(source, /filterText|filteredTasks/)
})

test('OTA progress copy reflects polling instead of claiming an unused WebSocket', () => {
  assert.match(source, /setInterval\(\(\) => this\.loadTasks\(true\), 3000\)/)
  assert.doesNotMatch(source, /wsConnected|new WebSocket|disconnectWs/)
})

test('OTA and firmware routes use their backend capabilities', () => {
  assert.match(permissionSource, /OTA_VIEW:\s*'ota\.view'/)
  assert.match(permissionSource, /OTA_MANAGE:\s*'ota\.manage'/)
  assert.match(permissionSource, /DebugOtaConsole:\s*PERMISSION\.OTA_VIEW/)
  assert.match(permissionSource, /DebugFirmwares:\s*PERMISSION\.FIRMWARE_VIEW/)
  assert.match(source, /hasPermission\(PERMISSION\.OTA_MANAGE, getCurrentUser\(\)\)/)
  assert.match(sidebarSource, /v-if="canViewOta"[\s\S]*?isActive\('\/debug\/ota-console'\)/)
  assert.match(sidebarSource, /v-if="canViewFirmwares"[\s\S]*?isActive\('\/debug\/firmwares'\)/)
})

test('OTA required-host copy is available in every locale', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']) {
    const messages = JSON.parse(fs.readFileSync(path.join(root, `src/locales/${locale}.json`), 'utf8'))
    assert.ok(messages.ota_console.filters.host_all?.trim(), `${locale} missing OTA host filter copy`)
    assert.ok(messages.ota_console.toast.select_host?.trim(), `${locale} missing OTA host validation copy`)
  }
})

test('OTA console uses the server task status enum', () => {
  for (const status of ['pending', 'sent', 'downloading', 'flashing', 'canceling', 'canceled', 'done', 'error']) {
    assert.match(source, new RegExp(`${status}:|value: '${status}'|status === '${status}'`))
  }
  assert.doesNotMatch(source, /status === 'failed'|status === 'running'/)
})
