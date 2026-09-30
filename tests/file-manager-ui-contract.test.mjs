import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('file list normalizes compatible backend field names before rendering', () => {
  const source = read('src/mixins/fileManagerListWorkspace.js')

  assert.match(source, /item\.original_name \|\| item\.file_name \|\| item\.filename \|\| item\.name/)
  assert.match(source, /item\.size_bytes \?\? item\.file_size \?\? item\.size/)
  assert.match(source, /item\?\.content_kind \|\| item\?\.file_type/)
  assert.match(source, /records\.map\(normalizeFileRecord\)/)
})

test('file size formatting never renders NaN and visible upload controls have associated labels', () => {
  const source = read('src/views/FileManager.vue')

  assert.match(source, /Number\.isFinite\(value\)/)
  for (const id of ['file-manager-upload-trigger', 'file-manager-upload-category', 'file-manager-upload-description']) {
    assert.match(source, new RegExp(`label-for="${id}"`))
    assert.match(source, new RegExp(`id="${id}"`))
  }
})

test('the upload route closes back to the file list without leaving a stale modal', () => {
  const source = read('src/views/FileManager.vue')

  assert.match(source, /@hidden="handleUploadHidden"/)
  assert.match(source, /if \(this\.showUploadDialog\) this\.showUploadDialog = false/)
  assert.match(source, /this\.\$router\.replace\('\/files'\)/)
})

test('upload modal uses a custom file picker while styles survive BootstrapVue portal rendering', () => {
  const view = read('src/views/FileManager.vue')
  const styles = read('src/assets/styles/_modal-workflows.scss')

  assert.match(view, /modal-class="file-manager-upload-modal"/)
  assert.match(view, /:state="uploadFieldState\('file'\)"/)
  assert.match(view, /errors\.file = this\.\$t\('file_manager\.toast\.select_file'\)/)
  assert.match(view, /id="file-manager-upload-input"[\s\S]*type="file"[\s\S]*hidden/)
  assert.match(view, /class="upload-dropzone__trigger"[\s\S]*@click="openUploadFilePicker"/)
  assert.match(view, /this\.\$refs\.uploadInput\.click\(\)/)
  assert.match(styles, /\.file-manager-upload-modal\s*\{/)
  assert.match(styles, /\.upload-dropzone__trigger\.btn-link\s*\{[\s\S]*min-height:\s*152px/)
})

test('file manager accepts SVG device UI assets and PDF model documents', () => {
  const source = read('src/views/FileManager.vue')

  assert.match(source, /accept="[^"]*\.svg[^"]*\.pdf[^"]*"/)
  assert.match(source, /const imageExts = \[[^\]]*'svg'[^\]]*\]/)
  assert.match(source, /\['bin', 'mp3', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'\]\.includes\(ext\)/)
  assert.match(source, /uploadForm\.fileType === 'pdf'/)
  assert.doesNotMatch(source, /uploadForm\.fileType === 'document'/)
  assert.match(source, /formData\.append\('file_type', this\.uploadForm\.fileType\)/)
})

test('file relations use typed model or host foreign keys', () => {
  const source = read('src/views/FileManager.vue')

  assert.match(source, /hn_model_id: this\.relationForm\.target_scope === 'hn_model'/)
  assert.match(source, /host_id: this\.relationForm\.target_scope === 'host'/)
  assert.match(source, /kind: this\.relationForm\.kind/)
  assert.match(source, /lang: this\.isDocumentKind \? this\.relationForm\.lang/)
  assert.match(source, /fetchHnModelHardwareLines/)
  assert.doesNotMatch(source, /relationForm\.relation_id/)
  assert.doesNotMatch(source, /relationForm\.relation_type/)
})
