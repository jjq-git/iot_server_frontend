import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const view = fs.readFileSync(path.join(root, 'src/views/PodModels.vue'), 'utf8')
const styles = fs.readFileSync(path.join(root, 'src/assets/styles/_pod-models.scss'), 'utf8')
const podModelApi = fs.readFileSync(path.join(root, 'src/api/podModels.js'), 'utf8')
const hnModelApi = fs.readFileSync(path.join(root, 'src/api/hnModels.js'), 'utf8')

test('device composition is read-only and uses current Product OD contracts', () => {
  assert.doesNotMatch(podModelApi, /\/pod-models\/\$\{modelId\}\/(devices|device-slots)/)
  assert.match(hnModelApi, /http\.get\('\/hn-model-catalog\/slots'/)
  assert.match(view, /fetchPodModelDetail\(row\.uuid\)/)
  assert.match(view, /this\.deviceList = detail\.devices \|\| \[\]/)
  assert.match(view, /fetchHnModelSlots\(detail\.host_model_id\)/)
  assert.doesNotMatch(view, /openAddDeviceDialog|openAddSlotDialog/)
})

test('model detail layout is scoped to the portaled modal', () => {
  assert.match(view, /id="pod-models-detail-modal"[\s\S]*?modal-class="[^"]*pod-model-detail[^"]*"/)
  assert.match(styles, /\.pod-model-detail\s*\{[\s\S]*?\.model-detail-grid\s*\{[\s\S]*?display:\s*grid;/)
  assert.match(styles, /\.pod-model-detail\s*\{[\s\S]*?\.model-detail-item\s*\{[\s\S]*?display:\s*flex;/)
})

test('model image uploader is scoped to the portaled form modal', () => {
  assert.match(view, /modal-class="[^"]*pod-model-form-dialog[^"]*"[\s\S]*?<div class="avatar-field">/)
  assert.match(styles, /\.pod-model-form-dialog\s*\{[\s\S]*?\.avatar-uploader\s*\{[\s\S]*?border:\s*1px dashed/)
  assert.match(styles, /\.pod-model-form-dialog\s*\{[\s\S]*?\.avatar-uploader-icon\s*\{[\s\S]*?width:\s*75px;[\s\S]*?height:\s*75px;/)
})
