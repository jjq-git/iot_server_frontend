import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const view = fs.readFileSync(path.join(root, 'src/views/PodModels.vue'), 'utf8')
const api = fs.readFileSync(path.join(root, 'src/api/podModels.js'), 'utf8')

test('pod model attributes use the embedded attr contract', () => {
  assert.doesNotMatch(api, /\/pod-models\/\$\{[^}]+\}\/attributes/)
  assert.match(view, /fetchPodModelDetail\(row\.uuid\)/)
  assert.match(view, /updatePodModel\(this\.currentAttrModel\.uuid, \{ attr \}\)/)
  assert.match(view, /legacy_attrs: legacyAttrs/)
  assert.doesNotMatch(view, /fetchPodModelAttributes|createPodModelAttribute|updatePodModelAttribute|deletePodModelAttribute/)
})
