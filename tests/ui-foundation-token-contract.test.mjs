import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = file => fs.readFileSync(path.resolve(file), 'utf8')

const tokenGroups = {
  spacing: ['space-xs', 'space-sm', 'space-md', 'space-lg', 'space-xl', 'space-2xl'],
  typography: ['font-size-body', 'font-size-control', 'font-size-navigation', 'font-size-modal-title', 'line-height-body'],
  controls: ['control-height-sm', 'control-height-menu', 'control-height-md', 'icon-size-md', 'icon-button-size'],
  motion: ['motion-duration-base', 'motion-duration-medium', 'motion-duration-slow', 'motion-ease-standard'],
  layers: ['z-control', 'z-topbar', 'z-sticky', 'z-navigation', 'z-dropdown', 'z-modal', 'z-tooltip', 'z-toast']
}

test('the theme exposes global tokens beyond color and radius', () => {
  const tokens = read('src/assets/styles/_tokens.scss')
  const themeVars = read('src/assets/styles/_theme-vars.scss')

  for (const names of Object.values(tokenGroups)) {
    for (const name of names) {
      assert.match(tokens, new RegExp(`\\$${name}:`))
      assert.match(themeVars, new RegExp(`--${name}: #\\{\\$${name}\\};`))
    }
  }

  assert.match(themeVars, /--shadow-overlay: #\{\$shadow-overlay-light\}/)
  assert.match(themeVars, /--shadow-focus-compact: #\{\$shadow-focus-compact-l\}/)
})

test('shared controls and layouts consume the global foundation tokens', () => {
  const base = read('src/assets/styles/base.scss')
  const layout = read('src/assets/styles/layout.scss')
  const sidebar = read('src/assets/styles/_sidebar.scss')
  const controls = read('src/assets/styles/_form-controls.scss')
  const interaction = read('src/assets/styles/_interaction.scss')
  const bootstrapOverrides = read('src/assets/styles/bootstrap-overrides.scss')
  const shellUx = read('src/assets/styles/_shell-ux.scss')
  const finalLayer = read('src/assets/styles/_admin-system.scss')
  const languageSwitcher = read('src/components/LanguageSwitcher.vue')
  const fontSizeToggle = read('src/components/FontSizeToggle.vue')

  assert.match(base, /body[\s\S]*?font-size:\s*var\(--font-size-body\)/)
  assert.match(base, /\.btn,[\s\S]*?font-size:\s*var\(--font-size-control\)/)
  assert.match(layout, /transition:\s*width var\(--motion-duration-medium\)/)
  assert.match(layout, /z-index:\s*var\(--z-sticky\)/)
  assert.match(sidebar, /font-size:\s*var\(--font-size-navigation\)/)
  assert.match(controls, /z-index:\s*var\(--z-control\)/)
  assert.match(interaction, /\.base-pagination-wrapper \.page-link[\s\S]*?var\(--list-control-height\)/)
  assert.match(bootstrapOverrides, /\.table-responsive \.dropdown-menu[\s\S]*?var\(--z-popover\)/)
  assert.match(shellUx, /z-index:\s*var\(--z-toast\)/)
  assert.match(shellUx, /transition:\s*transform var\(--motion-duration-base\)/)
  assert.match(finalLayer, /box-shadow:\s*var\(--shadow-overlay\)/)
  assert.match(finalLayer, /font-size:\s*var\(--font-size-modal-title\)/)
  assert.match(languageSwitcher, /height:\s*var\(--control-height-menu\)/)
  assert.match(fontSizeToggle, /height:\s*var\(--control-height-menu\)/)
})

test('shared component and page styles do not reintroduce common foundation literals', () => {
  const sharedStyles = [
    'src/assets/styles/components.scss',
    'src/assets/styles/pages.scss'
  ]

  const commonFontSize = /font-size:\s*(?:11|12|13|13\.5|14|16|17|18|20|22|28)px/g
  const commonRadius = /border-radius:\s*(?:0|2|3|4|6|8|12|50|999)(?:px|%)/g
  const commonMotion = /transition:[^;]*(?:0\.12|0\.15|0\.2|0\.3)s/g

  for (const file of sharedStyles) {
    const source = read(file)
    assert.deepEqual(source.match(commonFontSize), null, `${file} should use typography tokens`)
    assert.deepEqual(source.match(commonRadius), null, `${file} should use radius tokens`)
    assert.deepEqual(source.match(commonMotion), null, `${file} should use motion tokens`)
  }
})

test('dashboard chart colors are sourced from theme variables', () => {
  const tokens = read('src/assets/styles/_tokens.scss')
  const themeVars = read('src/assets/styles/_theme-vars.scss')
  const dashboard = read('src/views/Dashboard.vue')
  const chartWidget = read('src/components/dashboard/ChartWidget.vue')
  const chartTokens = [
    'text',
    'text-strong',
    'grid',
    'surface',
    'success',
    'warning',
    'error',
    'info',
    'error-area',
    'tooltip-bg',
    'tooltip-border',
    'tooltip-text'
  ]

  for (const name of chartTokens) {
    assert.match(themeVars, new RegExp(`--color-chart-${name}:`))
    assert.match(dashboard, new RegExp(`--color-chart-${name}`))
  }

  assert.match(tokens, /\$color-chart-success:/)
  assert.doesNotMatch(dashboard, /#[\da-f]{3,8}|rgba?\(/i)
  assert.doesNotMatch(chartWidget, /chart-export-bg/)
})

test('dashboard widgets share the icon refresh action and do not expose chart export', () => {
  const chartWidget = read('src/components/dashboard/ChartWidget.vue')
  const tableWidget = read('src/components/dashboard/TableWidget.vue')

  assert.match(chartWidget, /<base-icon-button :label="\$t\('common\.refresh'\)"/)
  assert.match(tableWidget, /<base-icon-button :label="\$t\('common\.refresh'\)"/)
  assert.doesNotMatch(chartWidget, /exportChart|getDataURL|name="download"/)
  assert.doesNotMatch(tableWidget, /dashboard-widget__refresh/)
})

test('dashboard line charts use straight segments instead of smoothed curves', () => {
  const dashboard = read('src/views/Dashboard.vue')
  const runtime = read('src/views/DashboardRuntime.vue')

  assert.doesNotMatch(dashboard, /smooth:\s*true/)
  assert.doesNotMatch(runtime, /smooth:\s*!isBar|smooth:\s*true/)
  assert.match(runtime, /smooth:\s*false/)
})
