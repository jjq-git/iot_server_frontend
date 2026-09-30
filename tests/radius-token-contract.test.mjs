import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = file => fs.readFileSync(path.resolve(file), 'utf8')

const sharedRadiusSources = [
  'src/assets/styles/_interaction.scss',
  'src/assets/styles/_form-controls.scss',
  'src/assets/styles/layout.scss',
  'src/assets/styles/_sidebar.scss',
  'src/assets/styles/_user-profile.scss',
  'src/assets/styles/_login.scss',
  'src/assets/styles/_software-version-web-ui.scss',
  'src/components/LanguageSwitcher.vue',
  'src/components/FontSizeToggle.vue'
]

const semanticTokens = [
  'control',
  'surface',
  'overlay',
  'status',
  'track',
  'avatar'
]

function literalRadiusDeclarations (source) {
  return [...source.matchAll(/border-radius\s*:\s*([^;]+);/g)]
    .map(match => match[1].trim())
    .filter(value => !value.startsWith('var('))
}

test('shared component families expose independent semantic radius tokens', () => {
  const tokens = read('src/assets/styles/_tokens.scss')
  const themeVars = read('src/assets/styles/_theme-vars.scss')

  for (const token of semanticTokens) {
    assert.match(tokens, new RegExp(`\\$radius-${token}:`))
    assert.match(themeVars, new RegExp(`--radius-${token}: #\\{\\$radius-${token}\\};`))
  }
})

test('the final Bootstrap layer maps component families to semantic radius tokens', () => {
  const source = read('src/assets/styles/_admin-system.scss')
  const finalLayerStart = source.indexOf('/* 基础组件 */')
  assert.notEqual(finalLayerStart, -1)

  const finalLayer = source.slice(finalLayerStart)
  assert.match(finalLayer, /\.btn,[\s\S]*?--component-radius:\s*var\(--radius-control\)/)
  assert.match(finalLayer, /\.card,[\s\S]*?--component-radius:\s*var\(--radius-surface\)/)
  assert.match(finalLayer, /\.dropdown-menu,[\s\S]*?--component-radius:\s*var\(--radius-overlay\)/)
  assert.match(finalLayer, /\.badge,[\s\S]*?--component-radius:\s*var\(--radius-status\)/)
  assert.match(finalLayer, /border-radius:\s*var\(--component-radius\)\s*!important/)
  assert.match(finalLayer, /\.progress,[\s\S]*?border-radius:\s*var\(--radius-track\)/)
  assert.deepEqual(literalRadiusDeclarations(finalLayer), [])
})

test('shared layout and control styles do not hard-code border radii', () => {
  const violations = sharedRadiusSources.flatMap(file =>
    literalRadiusDeclarations(read(file)).map(value => `${file}: ${value}`)
  )

  assert.deepEqual(violations, [])
})
