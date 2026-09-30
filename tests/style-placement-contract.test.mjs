import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viewsRoot = path.join(projectRoot, 'src/views')

function walk (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

const viewFiles = walk(viewsRoot).filter(file => file.endsWith('.vue'))
const relative = file => path.relative(projectRoot, file).replaceAll('\\', '/')

const dynamicStyleAllowlist = new Map([
  ['src/views/OdManager.vue', 1],
  ['src/views/PodModels.vue', 1],
  // Live brand preview binds reviewed color/font CSS variables from the editor form.
  ['src/views/company-dashboard-config/DashboardConfigEditor.vue', 1],
  ['src/views/mqtt_server/Overview.vue', 2]
])

test('view styles live in dedicated stylesheets', () => {
  for (const file of viewFiles) {
    const source = fs.readFileSync(file, 'utf8')
    const embeddedStyles = [...source.matchAll(/<style\b(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/style>/gi)]
    assert.equal(embeddedStyles.length, 0, `${relative(file)} contains an embedded style block`)

    for (const match of source.matchAll(/<style\b[^>]*\bsrc="([^"]+)"[^>]*><\/style>/gi)) {
      assert.match(match[1], /^@\/assets\/styles\//, `${relative(file)} imports styles from outside the shared styles directory`)
    }
  }
})

test('view templates have no static inline styles and dynamic styles are allowlisted', () => {
  for (const file of viewFiles) {
    const source = fs.readFileSync(file, 'utf8')
    const scriptIndex = source.indexOf('<script>')
    const template = scriptIndex >= 0 ? source.slice(0, scriptIndex) : source
    assert.doesNotMatch(template, /(?<!:)\bstyle\s*=/, `${relative(file)} contains a static inline style`)

    const dynamicCount = (template.match(/(?:v-bind:|:)style\s*=/g) || []).length
    const allowedCount = dynamicStyleAllowlist.get(relative(file)) || 0
    assert.equal(dynamicCount, allowedCount, `${relative(file)} has an unreviewed dynamic inline style`)
  }
})

test('portal-specific workflow styles are centralized and modal-class scoped', () => {
  const styles = fs.readFileSync(path.join(projectRoot, 'src/assets/styles/_modal-workflows.scss'), 'utf8')
  const fileManager = fs.readFileSync(path.join(projectRoot, 'src/views/FileManager.vue'), 'utf8')
  const claimWizard = fs.readFileSync(path.join(projectRoot, 'src/views/device-enrollments/ClaimWizard.vue'), 'utf8')
  const enrollmentDetail = fs.readFileSync(path.join(projectRoot, 'src/views/device-enrollments/EnrollmentDetail.vue'), 'utf8')

  for (const modalClass of ['file-manager-upload-modal', 'enrollment-claim-modal', 'enrollment-action-modal']) {
    assert.match(styles, new RegExp(`\\.${modalClass}\\s*\\{`))
  }
  assert.match(fileManager, /modal-class="file-manager-upload-modal"/)
  assert.match(claimWizard, /modal-class="enrollment-claim-modal"/)
  assert.match(enrollmentDetail, /modal-class="enrollment-action-modal"/)
})

test('active outline-primary buttons use the final semantic theme override', () => {
  const styles = fs.readFileSync(path.join(projectRoot, 'src/assets/styles/_admin-system.scss'), 'utf8')
  const finalOverrides = styles.slice(styles.indexOf('@mixin final-overrides'))

  assert.match(finalOverrides, /html\[data-theme\] \.btn\.btn-outline-primary\.active/)
  assert.match(finalOverrides, /background: var\(--color-brand-solid, var\(--color-brand\)\)/)
})

test('pill navigation states use the semantic brand palette', () => {
  const styles = fs.readFileSync(path.join(projectRoot, 'src/assets/styles/_admin-system.scss'), 'utf8')
  const finalOverrides = styles.slice(styles.indexOf('@mixin final-overrides'))

  assert.match(finalOverrides, /html\[data-theme\] \.nav-pills \.nav-link\.active/)
  assert.match(finalOverrides, /html\[data-theme\] \.nav-pills \.show > \.nav-link/)
  assert.match(finalOverrides, /background: var\(--color-brand-solid, var\(--color-brand\)\)/)
  assert.match(finalOverrides, /color: var\(--color-on-brand\)/)
  assert.match(finalOverrides, /html\[data-theme\] \.nav-pills \.nav-link:hover:not\(\.disabled\)/)
  assert.match(finalOverrides, /background: var\(--color-brand-soft\)/)
  assert.doesNotMatch(finalOverrides, /#(?:007bff|0069d9|0d6efd)/i)
})
