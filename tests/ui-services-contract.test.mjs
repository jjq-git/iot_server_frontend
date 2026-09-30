import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const sourceRoot = path.join(root, 'src')

function walk (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

test('business code uses shared toast and confirm services', () => {
  const offenders = []
  for (const file of walk(sourceRoot).filter(file => /\.(?:vue|js)$/.test(file))) {
    const name = path.relative(root, file).replaceAll('\\', '/')
    const source = fs.readFileSync(file, 'utf8')
    if (/\$bvToast\b/.test(source) && name !== 'src/services/ui/toast.js') offenders.push(name)
    if (/\bmsgBoxConfirm\b|\$bvModal\b/.test(source) && name !== 'src/services/ui/confirm.js') offenders.push(name)
  }
  assert.deepEqual(offenders, [])
})

test('shared async task and error normalization services exist', () => {
  const task = fs.readFileSync(path.join(sourceRoot, 'services/ui/task.js'), 'utf8')
  const error = fs.readFileSync(path.join(sourceRoot, 'services/error.js'), 'utf8')
  assert.match(task, /export\s+async\s+function\s+runUiTask/)
  assert.match(task, /setPending/)
  assert.match(task, /onSuccess/)
  assert.match(task, /onError/)
  assert.match(error, /export\s+function\s+getErrorMessage/)
})

test('shared async task lifecycle has at least three form consumers', () => {
  const consumers = [
    'views/ApiKeys.vue',
    'views/PodBookingDetail.vue',
    'views/PodBookings.vue'
  ].filter(file => fs.readFileSync(path.join(sourceRoot, file), 'utf8').includes('runUiTask('))
  assert.equal(consumers.length, 3)
})

test('business code does not duplicate user-facing error extraction chains', () => {
  const offenders = []
  for (const file of walk(sourceRoot).filter(file => /\.(?:vue|js)$/.test(file))) {
    const name = path.relative(root, file).replaceAll('\\', '/')
    if (name === 'src/services/error.js') continue
    const source = fs.readFileSync(file, 'utf8')
    if (/\b(?:error|err|e|firstError)\??\.userMessage\s*\|\|/.test(source)) offenders.push(name)
  }
  assert.deepEqual(offenders, [])
})
