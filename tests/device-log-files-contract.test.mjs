import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const api = fs.readFileSync(new URL('../src/api/debug/logs.js', import.meta.url), 'utf8')
const view = fs.readFileSync(new URL('../src/views/debug/SerialLogs.vue', import.meta.url), 'utf8')

test('device log history uses the file-package API instead of legacy serial rows', () => {
  assert.match(api, /export const fetchDeviceLogFiles/)
  assert.match(api, /\/device-log-files/)
  assert.doesNotMatch(api, /fetchSerialLogs/)
  assert.doesNotMatch(api, /\/serial-logs/)
  assert.match(view, /fetchDeviceLogFiles/)
})

test('device log filters use canonical package fields', () => {
  assert.match(view, /params\.since = new Date\(this\.since\)\.toISOString\(\)/)
  assert.match(view, /params\.nid = this\.nidFilter/)
  assert.match(view, /params\.source = this\.sourceFilter/)
  assert.match(view, /params\.trigger_type = this\.triggerFilter/)
  assert.match(view, /params\.level = this\.levelFilter/)
  assert.match(view, /key: 'started_at'/)
  assert.match(view, /key: 'file_name'/)
})

test('device log history reports backend totals and can increase the supported limit', () => {
  assert.match(view, /this\.total = Number\(data\?\.total \?\? this\.logs\.length\)/)
  // 后端 limit 校验上限为 1000(le=1000),前端统一用 MAX_LOG_LIMIT 常量收口
  assert.match(view, /const MAX_LOG_LIMIT = 1000/)
  assert.match(view, /this\.logs\.length < this\.total && this\.limit < MAX_LOG_LIMIT/)
  assert.match(view, /this\.limit = Math\.min\(MAX_LOG_LIMIT, this\.limit \+ 200\)/)

  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']) {
    const messages = JSON.parse(fs.readFileSync(new URL(`../src/locales/${locale}.json`, import.meta.url), 'utf8'))
    assert.ok(messages.debug_serial_logs.actions.load_more?.trim(), `${locale} missing device log load-more copy`)
  }
})

test('device log packages download through authenticated file API', () => {
  assert.match(view, /import \{ downloadFile \} from '@\/api\/files'/)
  assert.match(view, /downloadFile\(item\.file_uuid\)/)
  assert.match(view, /window\.URL\.createObjectURL\(blob\)/)
})
