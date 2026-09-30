import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

function vueSources (directory) {
  return fs.readdirSync(path.join(projectRoot, directory), { recursive: true })
    .filter(file => file.endsWith('.vue'))
    .map(file => ({ file, source: read(path.join(directory, file)) }))
}

test('table actions use the shared native-button component', () => {
  const main = read('src/main.js')
  const component = read('src/components/base/BaseActionButton.vue')

  assert.match(main, /Vue\.component\('BaseActionButton', BaseActionButton\)/)
  assert.match(component, /<button/)
  assert.match(component, /:disabled="disabled \|\| loading"/)

  for (const { file, source } of vueSources('src/views')) {
    const openingSpans = source.match(/<span\b[^>]*>/g) || []
    assert.equal(
      openingSpans.some(tag => tag.includes('action-icon') && tag.includes('@click')),
      false,
      `${file} contains a clickable action span`
    )
  }
})

test('detail fields expose click and keyboard editing instead of double-click only', () => {
  const views = vueSources('src/views')
  const source = views.map(view => view.source).join('\n')
  const directive = read('src/directives/editableTrigger.js')

  assert.doesNotMatch(source, /@dblclick/)
  assert.ok((source.match(/v-editable-trigger=/g) || []).length >= 50)
  assert.match(directive, /setAttribute\('role', 'button'\)/)
  assert.match(directive, /setAttribute\('tabindex', '0'\)/)
  assert.match(directive, /\['Enter', ' '\]\.includes\(event\.key\)/)
  assert.match(directive, /#icon-pencil/)
  assert.match(directive, /classList\.add\('editable-trigger__icon'\)/)
})

test('detail edit indicators stay hidden until pointer or keyboard intent', () => {
  const styles = read('src/assets/styles/base.scss')

  assert.match(styles, /\.editable-trigger__icon\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?visibility:\s*hidden;/)
  assert.match(styles, /\.editable-trigger:hover > \.editable-trigger__icon/)
  assert.match(styles, /\.editable-trigger:focus-visible > \.editable-trigger__icon/)
  assert.match(styles, /\.detail-row:hover \.editable-trigger > \.editable-trigger__icon/)
  assert.match(styles, /opacity:\s*0\.9;[\s\S]*?visibility:\s*visible;/)
})

test('known websocket acknowledgements do not produce unknown-message warnings', () => {
  const source = read('src/services/realtime/podWebSocket.js')

  assert.match(source, /if \(msg\.type === 'connected'\)/)
  assert.match(source, /else if \(msg\.type === 'pong'\)/)
})

test('high-impact row operations lock while their request is running', () => {
  const firmware = read('src/views/FirmwareManager.vue')
  const ota = read('src/views/OtaConsole.vue')
  const enrollment = read('src/views/device-enrollments/EnrollmentDetail.vue')

  assert.match(firmware, /:loading="deletingUuid === row\.item\.uuid"/)
  assert.match(firmware, /if \(this\.deletingUuid\) return/)
  assert.match(ota, /:loading="cancellingUuid === row\.item\.uuid"/)
  assert.match(ota, /if \(this\.cancellingUuid\) return/)
  assert.match(enrollment, /:loading="rematching"/)
  assert.match(enrollment, /if \(this\.rematching\) return/)
})
