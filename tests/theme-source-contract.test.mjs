import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const legacyUsages = [
  'color-bg',
  'color-card',
  'color-primary',
  'color-primary-dark',
  'color-primary-light',
  'color-muted',
  'color-disabled',
  'color-danger',
  'sidebar-bg',
  'sidebar-text',
  'sidebar-active',
  'sidebar-hover'
]

function collectStyleSources (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectStyleSources(target)
    return /\.(?:css|scss|vue)$/.test(entry.name) ? [target] : []
  })
}

test('the semantic theme has one source of truth', () => {
  assert.equal(fs.existsSync(path.join(root, 'src/assets/styles/variables.scss')), false)
  assert.doesNotMatch(read('src/assets/styles/index.scss'), /@use\s+["']variables["']/)

  const themeVars = read('src/assets/styles/_theme-vars.scss')
  for (const name of legacyUsages) {
    assert.match(themeVars, new RegExp(`--${name}: var\\(--`))
  }

  const duplicateDefinitions = collectStyleSources(path.join(root, 'src'))
    .filter(file => !file.endsWith('_theme-vars.scss'))
    .flatMap(file => {
      const source = fs.readFileSync(file, 'utf8')
      return [...source.matchAll(/^\s*(--color-[a-z0-9_-]+)\s*:/gim)]
        .map(match => `${path.relative(root, file)}: ${match[1]}`)
    })

  assert.deepEqual(duplicateDefinitions, [])
})

test('application styles no longer consume legacy theme aliases', () => {
  const violations = []

  for (const file of collectStyleSources(path.join(root, 'src'))) {
    if (file.endsWith('_theme-vars.scss')) continue
    const source = fs.readFileSync(file, 'utf8')
    for (const name of legacyUsages) {
      if (source.includes(`var(--${name})`)) {
        violations.push(`${path.relative(root, file)}: --${name}`)
      }
    }
  }

  assert.deepEqual(violations, [])
})

test('global theme layers only consume semantic color and shadow variables', () => {
  const globalLayers = [
    'src/assets/styles/base.scss',
    'src/assets/styles/layout.scss',
    'src/assets/styles/components.scss',
    'src/assets/styles/pages.scss',
    'src/assets/styles/dark-theme.scss',
    'src/assets/styles/_admin-system.scss',
    'src/assets/styles/_bootstrap-theme.scss',
    'src/assets/styles/_form-controls.scss',
    'src/assets/styles/_interaction.scss',
    'src/assets/styles/_sidebar.scss',
    'src/assets/styles/_shell-ux.scss'
  ]

  for (const file of globalLayers) {
    assert.doesNotMatch(read(file), /#[\da-f]{3,8}|rgba?\(/i, `${file} contains a hard-coded theme color`)
  }
})

test('stylesheet declarations do not bypass the semantic theme', () => {
  const violations = []

  for (const file of collectStyleSources(path.join(root, 'src'))) {
    if (file.endsWith('_tokens.scss') || file.endsWith('_theme-vars.scss')) continue
    const source = fs.readFileSync(file, 'utf8')
    const styles = file.endsWith('.vue')
      ? [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n')
      : source
    const literals = styles.match(/#[\da-f]{3,8}|rgba?\(/gi) || []
    if (literals.length) violations.push(`${path.relative(root, file)}: ${literals.join(', ')}`)
  }

  assert.deepEqual(violations, [])
})
