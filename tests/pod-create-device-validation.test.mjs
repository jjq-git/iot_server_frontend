import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('pod create pre-validates model composition and offers authorized node binding', () => {
  const podsView = source('src/views/Pods.vue')
  const podsApi = source('src/api/pods.js')

  assert.match(podsApi, /validatePodDevicesPreview/)
  assert.match(podsApi, /\/pods\/validate-devices-preview/)
  assert.match(podsView, /await validatePodDevicesPreview/)
  assert.match(podsView, /deviceValidation\.validation_items/)
  assert.match(podsView, /deviceValidation && !deviceValidation\.is_valid/)
  assert.match(podsView, /hasPermission\(PERMISSION\.POD_MAINTAIN, user\)/)
  assert.match(podsView, /openCreateNodeBinding/)
  assert.match(podsView, /handleCreateDialogHidden/)
  assert.match(podsView, /handleNodeBindingSuccess/)
})

test('node binding UI follows the backend CAN Node ID range', () => {
  const bindingView = source('src/views/HostNodeBinding.vue')
  const hostDetail = source('src/views/HostDetail.vue')

  assert.match(bindingView, /min="2"/)
  assert.match(bindingView, /for \(let i = 2; i <= 127; i\+\+\)/)
  assert.match(bindingView, /canNodeId < 2 \|\| canNodeId > 127/)
  assert.match(bindingView, /bindingList\.length >= 126/)
  assert.match(hostDetail, /min="2"/)
  assert.match(hostDetail, /canNodeId < 2 \|\| canNodeId > 127/)
})
