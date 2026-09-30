import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve(import.meta.dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('retired standalone manuals pages and API are absent', () => {
  for (const relativePath of [
    'src/api/manuals.js',
    'src/views/Manuals.vue',
    'src/views/ManualsAdmin.vue'
  ]) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), false, `${relativePath} must stay retired`)
  }

  const router = read('src/router/index.js')
  const sidebar = read('src/components/Sidebar.vue')
  const permissions = read('src/utils/permission.js')
  assert.doesNotMatch(router, /views\/Manuals|path:\s*['"](?:admin\/)?manuals['"]|name:\s*['"]Manuals/)
  assert.doesNotMatch(sidebar, /navigateTo\(['"]\/(?:admin\/)?manuals['"]\)|MANUAL_MANAGE/)
  assert.doesNotMatch(permissions, /MANUAL_(?:VIEW|MANAGE)|\bManualsAdmin?:/)
})
