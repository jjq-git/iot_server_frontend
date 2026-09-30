import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('host file API exposes effective, history, retry and rollback endpoints', () => {
  const api = read('src/api/hostFiles.js')
  assert.match(api, /files\/effective/)
  assert.match(api, /file-deployments/)
  assert.match(api, /\/retry/)
  assert.match(api, /\/rollback/)
})

test('image upload exposes the file ID and normalized URL to dashboard config', () => {
  const api = read('src/api/files.js')
  const editor = read('src/views/company-dashboard-config/DashboardConfigEditor.vue')

  assert.match(api, /url: payload\?\.url \|\| payload\?\.download_url/)
  assert.match(editor, /import \{[^}]*\buploadImage\b[^}]*\} from '@\/api\/files'/)
  assert.match(editor, /result\?\.id/)
})

test('file manager uses the managed file contract and relation lifecycle', () => {
  const view = read('src/views/FileManager.vue')
  const api = read('src/api/files.js')
  assert.match(view, /accept="\.bin,\.mp3,\.jpg,\.jpeg,\.png,\.gif,\.webp,\.bmp,\.svg,\.pdf"/)
  assert.match(view, /formData\.append\('file_type', this\.uploadForm\.fileType\)/)
  assert.match(view, /purpose: this\.isDocumentKind \? undefined : this\.relationForm\.purpose/)
  assert.match(view, /publishRelation/)
  assert.match(view, /disableRelation/)
  assert.match(api, /relations\/\$\{relationId\}\/publish/)
  assert.match(api, /relations\/\$\{relationId\}\/disable/)
})

test('host detail renders effective files and delivery history', () => {
  const detail = read('src/views/HostDetail.vue')
  const panel = read('src/components/host/HostFilesPanel.vue')
  assert.match(detail, /<host-files-panel/)
  assert.match(panel, /<base-card class="host-files-panel">/)
  assert.match(panel, /\.base-table-wrapper \.table-responsive\s*\{[\s\S]*?padding-right:\s*0;[\s\S]*?padding-left:\s*0;/)
  assert.match(panel, /fetchEffectiveHostFiles/)
  assert.match(panel, /fetchFileDeployments/)
  assert.match(panel, /retryFileDeployment/)
  assert.match(panel, /rollbackFileDeployment/)
})

test('host file locale keys are aligned in all eight locales', () => {
  const localeDir = path.join(root, 'src/locales')
  const files = fs.readdirSync(localeDir).filter(name => name.endsWith('.json')).sort()
  assert.equal(files.length, 8)
  const keySets = files.map(name => {
    const locale = JSON.parse(fs.readFileSync(path.join(localeDir, name), 'utf8'))
    return Object.keys(locale.host_files || {}).sort()
  })
  for (const keys of keySets.slice(1)) assert.deepEqual(keys, keySets[0])
})
