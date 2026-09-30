import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

function luminance (hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast (foreground, background = '#ffffff') {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function tokenHex (source, name) {
  const match = source.match(new RegExp(`^\\$${name}:\\s*(#[0-9a-f]{6});`, 'mi'))
  assert.ok(match, `missing hexadecimal token ${name}`)
  return match[1]
}

function collectStyleSources (directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectStyleSources(target)
    return /\.(?:css|scss|vue)$/.test(entry.name) ? [target] : []
  })
}

test('light-theme text colors meet normal-text contrast requirements', () => {
  const tokens = read('src/assets/styles/_tokens.scss')
  const backgrounds = ['#ffffff', tokenHex(tokens, 'color-bg-page-light')]
  const names = [
    'color-text-muted-light',
    'color-text-hint-light',
    'color-success-text-0e700e-l',
    'color-warning-text-8a6914-l',
    'color-error-d3-l',
    'color-info-text-light'
  ]

  for (const name of names) {
    for (const background of backgrounds) {
      const ratio = contrast(tokenHex(tokens, name), background)
      assert.ok(ratio >= 4.5, `${name} contrast ${ratio.toFixed(2)} must be at least 4.5`)
    }
  }

  const admin = read('src/assets/styles/_admin-system.scss')
  assert.match(admin, /\.text-success\s*\{[\s\S]*?var\(--color-success-text\)/)
  assert.match(admin, /\.text-warning\s*\{[\s\S]*?var\(--color-warning-text\)/)
  assert.match(admin, /\.text-info\s*\{[\s\S]*?var\(--color-info-text\)/)
  assert.match(admin, /\.text-danger\s*\{[\s\S]*?var\(--color-error-text\)/)
})

test('password and toggle controls expose consistent action semantics', () => {
  const login = read('src/views/Login.vue')
  const template = read('src/components/customization/LoginPageTemplate.vue')

  for (const source of [login, template]) {
    assert.match(source, /showPassword \? 'eye-slash' : 'eye'/)
    assert.match(source, /:aria-label="showPassword \? \$t\('common\.hide'\) : \$t\('common\.show'\)"/)
    assert.match(source, /:aria-pressed="showPassword \? 'true' : 'false'"/)
    assert.match(source, /:aria-pressed="rememberLogin \? 'true' : 'false'"/)
  }
})

test('icon-only boolean values include readable text alternatives', () => {
  for (const file of ['src/views/PodModels.vue', 'src/views/FileManager.vue']) {
    const source = read(file)
    assert.match(source, /name="status-active"[^>]*aria-hidden="true"/)
    assert.match(source, /class="sr-only">\{\{ \$t\('common\.yes'\) \}\}<\/span>/)
  }
})

test('document routes provide meaningful page icons and avoid duplicate content titles', () => {
  const router = read('src/router/index.js')
  const calls = [...router.matchAll(/meta:\s*docMeta\(([^)\n]+)\)/g)]
  assert.equal(calls.length, 12)
  for (const call of calls) assert.equal((call[1].match(/'[^']*'/g) || []).length, 5)

  assert.doesNotMatch(read('src/views/DocPage.vue'), /<h2>\{\{ title \}\}<\/h2>/)
  assert.doesNotMatch(read('src/views/OrganizationAccess.vue'), /<h1[^>]*>\{\{ \$t\('organization_access\.title'\)/)
  assert.doesNotMatch(read('src/views/IconLibrary.vue'), /<h5[^>]*>[\s\S]*?icon_library\.title/)
  assert.match(read('src/views/PodBookingDetail.vue'), /<h2[^>]*>\{\{ booking \? booking\.subject/)
})

test('common typography values use semantic size and weight tokens', () => {
  const sources = collectStyleSources(path.join(root, 'src')).map(file => fs.readFileSync(file, 'utf8')).join('\n')
  assert.doesNotMatch(sources, /font-size\s*:\s*[0-9.]+(?:px|rem|em)\b/)
  assert.doesNotMatch(sources, /font-weight\s*:\s*(?:400|500|600|650|700|800|bold)\b/i)

  const theme = read('src/assets/styles/_theme-vars.scss')
  for (const name of ['regular', 'medium', 'semibold', 'strong', 'bold', 'extrabold']) {
    assert.match(theme, new RegExp(`--font-weight-${name}:`))
  }
})
