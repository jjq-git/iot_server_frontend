import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const auditView = readFileSync(new URL('../src/views/AuditLogs.vue', import.meta.url), 'utf8')
const auditApi = readFileSync(new URL('../src/api/audit.js', import.meta.url), 'utf8')
const fileSection = readFileSync(new URL('../src/components/file/FileListSection.vue', import.meta.url), 'utf8')
const fileWorkspace = readFileSync(new URL('../src/mixins/fileManagerListWorkspace.js', import.meta.url), 'utf8')

test('file list exposes only filters supported by GET /files', () => {
  assert.match(fileWorkspace, /const queryFields = \['page', 'page_size', 'file_type'\]/)
  assert.doesNotMatch(fileWorkspace, /params\.keyword|query\.keyword|onSearchInput/)
  assert.doesNotMatch(fileSection, /query\.keyword|search-input/)
})

test('audit list sends only backend-supported action and date filters', () => {
  assert.match(auditView, /URL_QUERY_FIELDS = \['page', 'page_size', 'action', 'start_date', 'end_date'\]/)
  assert.match(auditView, /if \(this\.query\.action\) params\.action = this\.query\.action/)
  assert.doesNotMatch(auditView, /params\.(keyword|target_type|result)/)
  assert.match(auditApi, /queryParams\.date_from = queryParams\.start_date/)
  assert.match(auditApi, /queryParams\.date_to = queryParams\.end_date/)
})

test('audit operator rendering accepts the backend operator response field', () => {
  assert.match(auditView, /return log\?\.operator \|\| log\?\.operator_info \|\| null/)
  assert.match(auditView, /auditOperator\(currentLog\)/)
})

test('audit action filter includes actions returned by the backend', () => {
  assert.match(auditView, /this\.tableData\.forEach\(item =>/)
  assert.match(auditView, /if \(item\?\.action\) actions\.add\(item\.action\)/)
  assert.match(auditView, /if \(this\.query\.action\) actions\.add\(this\.query\.action\)/)
})

test('audit export reports when the backend export limit truncates results', () => {
  assert.match(auditView, /if \(res\?\.truncated\)/)
  assert.match(auditView, /audit_logs\.toast\.export_truncated/)
  assert.match(auditView, /exported: res\.exported/)
  assert.match(auditView, /total: res\.total/)
})
