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

test('business templates depend on Base* rather than guarded BootstrapVue primitives', () => {
  const baseRoot = path.join(sourceRoot, 'components/base') + path.sep
  const pattern = /<b-(?:button|card|form-group|form-input|input|table|modal)(?=[\s>])/i
  const offenders = walk(sourceRoot)
    .filter(file => file.endsWith('.vue') && !file.startsWith(baseRoot))
    .filter(file => pattern.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file))
  assert.deepEqual(offenders, [])
})

test('Base* components stay route- and business-neutral', () => {
  const offenders = walk(path.join(sourceRoot, 'components/base'))
    .filter(file => file.endsWith('.vue'))
    .filter(file => /\$route\b|@\/api\//.test(fs.readFileSync(file, 'utf8')))
    .map(file => path.relative(root, file))
  assert.deepEqual(offenders, [])
})

test('icon-only actions use the accessible BaseIconButton primitive', () => {
  const main = fs.readFileSync(path.join(sourceRoot, 'main.js'), 'utf8')
  const component = fs.readFileSync(path.join(sourceRoot, 'components/base/BaseIconButton.vue'), 'utf8')

  assert.match(main, /Vue\.component\('BaseIconButton', BaseIconButton\)/)
  assert.match(component, /:aria-label="label"/)
  assert.match(component, /:title="label"/)
  assert.match(component, /border:\s*1px solid transparent/)
  assert.match(component, /:focus-visible/)

  const offenders = walk(sourceRoot)
    .filter(file => file.endsWith('.vue') && !file.endsWith('BaseIconButton.vue'))
    .flatMap(file => {
      const source = fs.readFileSync(file, 'utf8')
      return [...source.matchAll(/<base-button\b[^>]*>([\s\S]*?)<\/base-button>/gi)]
        .filter(match => /^\s*<app-icon\b[\s\S]*?\/>\s*$/.test(match[1]))
        .map(() => path.relative(root, file))
    })
  assert.deepEqual(offenders, [])

  const missingLabels = walk(sourceRoot)
    .filter(file => file.endsWith('.vue'))
    .flatMap(file => {
      const source = fs.readFileSync(file, 'utf8')
      return [...source.matchAll(/<base-icon-button\b[\s\S]*?>/gi)]
        .filter(match => !/\s(?::)?label=/.test(match[0]))
        .map(() => path.relative(root, file))
    })
  assert.deepEqual(missingLabels, [])
})

test('BaseModal renders the standard line close icon instead of a text glyph', () => {
  const modal = fs.readFileSync(path.join(sourceRoot, 'components/base/BaseModal.vue'), 'utf8')

  assert.match(modal, /#modal-header-close[\s\S]*<app-icon name="x"/)
  assert.match(modal, /:header-close-label="resolvedCloseLabel"/)
  assert.match(modal, /:title="resolvedCloseLabel"/)
  assert.doesNotMatch(modal, />\s*×\s*</)
})

test('BaseButton centers icon and text content', () => {
  const button = fs.readFileSync(path.join(sourceRoot, 'components/base/BaseButton.vue'), 'utf8')

  assert.match(button, /class="base-button"/)
  assert.match(button, /\.base-button\s*\{[\s\S]*?display:\s*inline-flex/)
  assert.match(button, /\.base-button\s*\{[\s\S]*?align-items:\s*center/)
  assert.match(button, /\.base-button\s*\{[\s\S]*?justify-content:\s*center/)
  assert.match(button, /\.base-button\s*\{[\s\S]*?gap:\s*var\(--space-xs\)/)
  assert.match(button, /--app-icon-size:\s*var\(--icon-size-md\)/)
  assert.match(button, /\.base-button\.btn-sm\s*\{[\s\S]*?--app-icon-size:\s*var\(--icon-size-sm\)/)
})

test('BaseSelect centers its arrow without overriding AppIcon transforms', () => {
  const styles = fs.readFileSync(path.join(sourceRoot, 'assets/styles/_form-controls.scss'), 'utf8')
  const arrowRule = styles.match(/\.base-select-control__arrow\s*\{([^}]+)\}/)?.[1] || ''

  assert.match(arrowRule, /top:\s*0/)
  assert.match(arrowRule, /bottom:\s*0/)
  assert.match(arrowRule, /margin-block:\s*auto/)
  assert.doesNotMatch(arrowRule, /transform:/)
})
