import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const sourceRoot = path.join(root, 'src')
const sprite = fs.readFileSync(path.join(sourceRoot, 'assets/icons/icons.svg'), 'utf8')
const appIcon = fs.readFileSync(path.join(sourceRoot, 'components/AppIcon.vue'), 'utf8')

function walk (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

test('AppIcon resolves every statically named icon from the generated sprite', () => {
  const symbolNames = new Set([...sprite.matchAll(/<symbol\s+id="icon-([^"]+)"/g)].map(match => match[1]))
  const aliases = new Map([...appIcon.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*['"]([a-z0-9-]+)['"]/gmi)].map(match => [match[1], match[2]]))
  const missing = []

  for (const file of walk(sourceRoot).filter(file => file.endsWith('.vue'))) {
    const source = fs.readFileSync(file, 'utf8')
    for (const tag of source.match(/<app-icon\b[\s\S]*?>/gi) || []) {
      const literal = tag.match(/\sname="([^"]+)"/)
      if (!literal) continue
      const resolved = aliases.get(literal[1]) || literal[1]
      if (!symbolNames.has(resolved)) missing.push(`${path.relative(root, file)}: ${literal[1]}`)
    }
  }

  const router = fs.readFileSync(path.join(sourceRoot, 'router/index.js'), 'utf8')
  for (const match of router.matchAll(/\bicon:\s*['"]([^'"]+)['"]/g)) {
    const resolved = aliases.get(match[1]) || match[1]
    if (!symbolNames.has(resolved)) missing.push(`src/router/index.js: ${match[1]}`)
  }

  assert.deepEqual(missing, [])
})

test('legacy BootstrapVue icon components are absent from application source', () => {
  const offenders = walk(sourceRoot)
    .filter(file => /\.(?:vue|js)$/.test(file))
    .filter(file => /<(?:b-icon|BIcon)(?=[\s>])|\bb-icon-/i.test(fs.readFileSync(file, 'utf8')))
  assert.deepEqual(offenders, [])
})

test('column visibility uses the dedicated column-layout glyph', () => {
  const columnVisibility = fs.readFileSync(path.join(sourceRoot, 'components/ColumnVisibility.vue'), 'utf8')

  assert.match(columnVisibility, /<app-icon name="layout-three-columns"/)
  assert.match(sprite, /id="icon-layout-three-columns"/)
  assert.doesNotMatch(appIcon, /['"]layout-three-columns['"]:\s*['"]product-model['"]/)
})

test('icon modifiers crop the base glyph and use semantic state colors', () => {
  assert.match(appIcon, /app-icon--corner-modifier[\s\S]*clip-path:/)
  assert.match(appIcon, /app-icon--modifier-dot[\s\S]*var\(--color-error\)/)
  assert.match(sprite, /id="icon-modifier-list"[\s\S]*M13\.5 15h9/)
  assert.match(sprite, /id="icon-modifier-dot"[\s\S]*cx="19" cy="5"/)
  assert.doesNotMatch(sprite, /id="icon-modifier-plus"/)
  assert.match(sprite, /id="icon-plus"/)
  assert.match(sprite, /id="icon-person-add"/)
  assert.match(sprite, /id="icon-product-model-add"/)
  assert.match(sprite, /id="icon-controller-host-add"/)
  for (const name of ['person-add', 'product-model-add', 'controller-host-add']) {
    const symbol = sprite.match(new RegExp(`<symbol id="icon-${name}"[\\s\\S]*?<\\/symbol>`))?.[0] || ''
    assert.match(symbol, /<rect x="12\.5" y="12\.5" width="10\.5" height="10\.5"\/>/)
  }

  const sources = walk(sourceRoot)
    .filter(file => file.endsWith('.vue'))
    .map(file => fs.readFileSync(file, 'utf8'))
    .join('\n')
  assert.doesNotMatch(sources, /<app-icon\b[^>]*\bmodifier="plus"/i)
})

test('documented common actions use adjustable line glyphs', () => {
  const lineIcons = [
    'search', 'sort', 'chevron-down', 'chevron-left', 'chevron-right',
    'trash', 'pencil', 'eye', 'x', 'arrow-clockwise', 'download', 'upload',
    'save', 'key', 'json-validate', 'menu', 'play', 'pause', 'stop', 'droplet'
  ]

  for (const name of lineIcons) {
    const symbol = sprite.match(new RegExp(`<symbol id="icon-${name}"[\\s\\S]*?<\\/symbol>`))?.[0] || ''
    assert.match(symbol, /fill="none" stroke="currentColor"/, `${name} must be a line glyph`)
    assert.doesNotMatch(symbol, /transform="scale\(1\.5\)" fill="currentColor"/, `${name} must not use a Bootstrap fill path`)
  }
})

test('AppIcon exposes accessible titles and theme-neutral currentColor rendering', () => {
  assert.match(appIcon, /<title v-if="title">/)
  assert.match(appIcon, /:aria-hidden="title \? null : 'true'"/)
  assert.match(sprite, /currentColor/)
})

test('runtime and navigation icons keep their distinct semantic glyphs', () => {
  const semanticIcons = [
    'bar-chart', 'fan', 'heart-pulse', 'lightning',
    'pie-chart', 'soundwave', 'thermometer-half', 'wifi'
  ]

  for (const name of semanticIcons) {
    assert.match(sprite, new RegExp(`id="icon-${name}"`), `${name} must exist in the sprite`)
    assert.doesNotMatch(appIcon, new RegExp(`['"]${name}['"]\\s*:`), `${name} must not be aliased to another meaning`)
  }
})

test('shared icon sizing uses semantic tokens for buttons and table actions', () => {
  const button = fs.readFileSync(path.join(sourceRoot, 'components/base/BaseButton.vue'), 'utf8')
  const theme = fs.readFileSync(path.join(sourceRoot, 'assets/styles/_theme-vars.scss'), 'utf8')

  assert.match(appIcon, /default:\s*'var\(--app-icon-size, 1em\)'/)
  assert.match(button, /--app-icon-size:\s*var\(--icon-size-md\)/)
  assert.match(button, /gap:\s*var\(--space-xs\)/)
  assert.match(theme, /--table-action-size:\s*var\(--control-height-sm\)/)
})
