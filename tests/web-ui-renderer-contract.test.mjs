import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const require = createRequire(import.meta.url)
const validation = require('../src/services/webUi/validate.js')
const normalization = require('../src/services/webUi/normalize.js')
const previewGeometry = require('../src/services/webUi/lvglPreviewGeometry.js')
const actions = require('../src/services/webUi/actionRuntime.js')
const vueCompiler = require('vue-template-compiler')
const fixtureUrl = name => new URL(`./fixtures/web-ui-v1/${name}`, import.meta.url)
const readJson = async name => JSON.parse(await readFile(fixtureUrl(name), 'utf8'))

test('frozen schema and capability snapshots keep their reviewed hashes', async () => {
  const expected = new Map([
    ['../src/services/webUi/contracts/web-ui-document.v1.schema.json', '130c5e45dfb732b6954844d09e3f91f020b6e4d11d96052f677de7410a728808'],
    ['../src/services/webUi/contracts/capabilities.v1.json', '430e8ed68cda33ba9a45f6e28bda8b3cbf2d797ee9c62bb84b8eb5bba71596bd']
  ])
  for (const [path, digest] of expected) {
    const bytes = await readFile(new URL(path, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest)
  }
})

test('38_index valid golden fixtures pass and keep canonical SHA-256', async () => {
  const manifest = await readJson('golden-manifest.json')
  for (const [name, digest] of Object.entries(manifest.files)) {
    const document = await readJson(name)
    const result = validation.validateWebUiDocument(document)
    assert.equal(result.valid, true, `${name}: ${JSON.stringify(result.errors)}`)
    assert.equal(createHash('sha256').update(validation.canonicalJson(document)).digest('hex'), digest, name)
  }
})

test('38_index invalid fixtures retain stable diagnostic codes', async () => {
  const cases = new Map([
    ['invalid/editor-leak.json', 'schema_invalid'],
    ['invalid/missing-action.json', 'action_missing'],
    ['invalid/unsupported-widget.json', 'unsupported_widget']
  ])
  for (const [name, code] of cases) {
    const result = validation.validateWebUiDocument(await readJson(name))
    assert.equal(result.valid, false, name)
    assert.ok(result.errors.some(error => error.code === code), `${name} should report ${code}`)
  }
})

test('validator rejects executable content and excessive widget depth', async () => {
  const dangerous = await readJson('minimal.json')
  dangerous.uiProject.screens[0].root.children[0].props.text = '<script>alert(1)</script>'
  assert.ok(validation.validateWebUiDocument(dangerous).errors.some(error => error.code === 'dangerous_content'))

  const deep = await readJson('minimal.json')
  let parent = deep.uiProject.screens[0].root
  parent.children = []
  for (let depth = 0; depth < 33; depth += 1) {
    const child = {
      id: `node:depth:${depth}`,
      type: 'obj',
      props: {},
      styleRefs: [],
      styles: [],
      events: [],
      bindings: [],
      children: []
    }
    parent.children.push(child)
    parent = child
  }
  assert.ok(validation.validateWebUiDocument(deep).errors.some(error => error.code === 'max_depth_exceeded'))
})

test('normalizer resolves P0 subjects, tokens, styles and bindings', async () => {
  const ir = normalization.normalizeWebUiDocument(await readJson('p0-widgets.json'))
  const screen = ir.screenIndex[ir.homeScreenId]
  const label = screen.root.children.find(node => node.type === 'label')
  const bar = screen.root.children.find(node => node.type === 'bar')
  const labelState = normalization.resolveWebUiNode(ir, screen, label, ir.initialSubjects)
  const barState = normalization.resolveWebUiNode(ir, screen, bar, ir.initialSubjects)

  assert.equal(labelState.props.text, '客厅')
  assert.equal(barState.props.value, 35)
  assert.equal(barState.styles.bg_color, '#2563EB')
  assert.equal(barState.partStyles.main.bg_color, '#2563EB')
  assert.equal(normalization.webUiStyleToCss(barState.props, barState.styles).backgroundColor, '#2563EB')
})

test('normalizer preserves LVGL main, indicator and knob style parts', async () => {
  const document = await readJson('p0-widgets.json')
  const bar = document.uiProject.screens[0].root.children.find(node => node.type === 'bar')
  bar.styles.push(
    { selector: { part: 'indicator' }, props: { bg_color: '#112233' } },
    { selector: { part: 'knob' }, props: { bg_color: '#445566' } }
  )
  const ir = normalization.normalizeWebUiDocument(document)
  const screen = ir.screenIndex[ir.homeScreenId]
  const resolved = normalization.resolveWebUiNode(ir, screen, screen.root.children.find(node => node.type === 'bar'), ir.initialSubjects)

  assert.equal(resolved.styles.bg_color, '#2563EB')
  assert.equal(resolved.partStyles.indicator.bg_color, '#112233')
  assert.equal(resolved.partStyles.knob.bg_color, '#445566')
})

test('current Designer WebUiDocumentV1 capabilities accept extended widgets', async () => {
  const document = await readJson('minimal.json')
  const node = (id, type, props) => ({
    id,
    type,
    props,
    styleRefs: [],
    styles: [],
    events: [],
    bindings: [],
    children: []
  })
  document.uiProject.screens[0].root.children = [
    node('node:matrix', 'buttonmatrix', { width: 200, height: 120, map: ['A', 'B', '\n', 'C'] }),
    node('node:spinbox', 'spinbox', { width: 100, height: 40, value: 12, step: 2 }),
    node('node:spinner', 'spinner', { width: 80, height: 80, anim_duration: 700, angle: 100 }),
    node('node:led', 'led', { width: 40, height: 40, color: '#00ff44', brightness: 180 })
  ]

  const result = validation.validateWebUiDocument(document)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  const ir = normalization.normalizeWebUiDocument(document)
  assert.deepEqual(ir.screens[0].root.children.map(item => item.type), ['buttonmatrix', 'spinbox', 'spinner', 'led'])
})

test('normalizer applies local widget state before bindings and maps reviewed LVGL styles', async () => {
  const document = await readJson('p0-widgets.json')
  const button = document.uiProject.screens[0].root.children.find(node => node.type === 'button')
  button.props = { ...button.props, x: 4, y: -3, align: 'center' }
  button.styles.push({
    props: {
      bg_color: '#112233',
      bg_opa: 128,
      bg_grad_color: '#445566',
      bg_grad_dir: 'hor',
      bg_main_stop: 0,
      bg_grad_stop: 255,
      pad_hor: 8,
      pad_ver: 4,
      shadow_width: 6,
      shadow_color: '#000000',
      shadow_opa: 128,
      transform_rotation: 150,
      text_font: 'montserrat_20'
    }
  })
  const ir = normalization.normalizeWebUiDocument(document)
  const screen = ir.screenIndex[ir.homeScreenId]
  const resolved = normalization.resolveWebUiNode(ir, screen, button, ir.initialSubjects, {
    states: { checked: true }
  })
  const css = normalization.webUiStyleToCss(resolved.props, resolved.styles)

  assert.equal(resolved.states.checked, true)
  assert.equal(css.left, 'calc(50% + 4px)')
  assert.equal(css.top, 'calc(50% + -3px)')
  assert.match(css.backgroundImage, /^linear-gradient\(to right,/)
  assert.equal(css.paddingLeft, '8px')
  assert.equal(css.paddingTop, '4px')
  assert.match(css.boxShadow, /rgba\(0, 0, 0,/)
  assert.match(css.transform, /translateX\(-50%\).*rotate\(15deg\)/)
  assert.equal(css.fontSize, '20px')
})

test('normalizer resolves resource backgrounds from verified blob URLs only', async () => {
  const document = await readJson('resource-icon.json')
  const ir = normalization.normalizeWebUiDocument(document)
  const screen = ir.screenIndex[ir.homeScreenId]
  const node = screen.root
  const resolved = normalization.resolveWebUiNode(ir, screen, node, ir.initialSubjects)
  const blobUrl = 'blob:http://localhost/verified-resource'

  assert.equal(
    normalization.webUiStyleToCss(resolved.props, resolved.styles, { 'icon:logo': blobUrl }).backgroundImage,
    `url("${blobUrl}")`
  )
  assert.equal(normalization.webUiStyleToCss(resolved.props, resolved.styles).backgroundImage, undefined)
  assert.equal(
    normalization.webUiStyleToCss(resolved.props, resolved.styles, { 'icon:logo': 'https://example.test/logo.png' }).backgroundImage,
    undefined
  )
})

test('LVGL default geometry keeps unset arc value and zero progress distinct', () => {
  assert.equal(previewGeometry.rangePercent({}), 0)
  assert.equal(previewGeometry.rangePercent({ min_value: 20, max_value: 80, value: 50 }), 50)
  assert.equal(previewGeometry.rangePercent({ min_value: 0, max_value: 100, value: 200 }), 100)

  const unset = previewGeometry.arcGeometry({ width: 60, height: 60 }, {}, 130)
  const zero = previewGeometry.arcGeometry({ width: 60, height: 60, value: 0 }, {}, 130)
  assert.ok(unset.background.startsWith('M '))
  assert.ok(unset.indicator.startsWith('M '))
  assert.equal(zero.indicator, '')
  assert.equal(unset.trackWidth, 20)
  assert.equal(unset.indicatorWidth, 20)

  const styled = previewGeometry.arcGeometry({ width: 60, height: 60, value: 50 }, { indicator: { arc_width: 6 } }, 130)
  assert.equal(styled.trackWidth, 20)
  assert.equal(styled.indicatorWidth, 10)
  assert.ok(styled.indicator.startsWith('M '))
})

test('HTML preview does not print accessibility names as button text or arc values', async () => {
  const button = await readFile(new URL('../src/components/device-ui/widgets/WidgetButton.vue', import.meta.url), 'utf8')
  const arc = await readFile(new URL('../src/components/device-ui/widgets/WidgetArc.vue', import.meta.url), 'utf8')
  const bar = await readFile(new URL('../src/components/device-ui/widgets/WidgetBar.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(button, /<span[^>]*>{{ accessibleName }}<\/span>/)
  assert.doesNotMatch(arc, /<span[^>]*>{{ value }}<\/span>/)
  assert.doesNotMatch(bar, /<progress\b/)
  assert.match(button, /:aria-label="accessibleName"/)
})

test('screen preview makes round and rectangular display profiles visible', async () => {
  const screen = await readFile(new URL('../src/components/device-ui/WebUiScreen.vue', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/assets/styles/_web-ui-renderer.scss', import.meta.url), 'utf8')

  assert.match(screen, /data-screen-shape/)
  assert.match(screen, /web-ui-screen__bezel--round/)
  assert.match(screen, /profile\.displayName/)
  assert.match(styles, /\.web-ui-screen__bezel\s*\{[^}]*background:/s)
  assert.match(styles, /\.web-ui-screen__bezel--round\s*\{[^}]*border-radius:\s*50%/s)
  assert.match(styles, /\.web-ui-screen__profile\s*\{/)
})

test('interactive widgets keep native local values even without custom actions', async () => {
  const node = await readFile(new URL('../src/components/device-ui/WebUiWidgetNode.vue', import.meta.url), 'utf8')
  const arc = await readFile(new URL('../src/components/device-ui/widgets/WidgetArc.vue', import.meta.url), 'utf8')
  const switchWidget = await readFile(new URL('../src/components/device-ui/widgets/WidgetSwitch.vue', import.meta.url), 'utf8')
  assert.match(node, /this\.\$set\(this\.localStates, 'checked', Boolean\(value\)\)/)
  assert.match(node, /this\.\$set\(this\.localProps, 'value', value\)/)
  assert.match(node, /this\.resolved\.flags\.checkable === true/)
  assert.match(node, /states: \{ \.\.\.this\.localStates, \.\.\.this\.interactionStates \}/)
  assert.match(arc, /this\.\$emit\('value-change', Math\.round\(value\)\)/)
  assert.match(switchWidget, /this\.widgetPartStyles\.indicator/)
  assert.match(switchWidget, /this\.widgetPartStyles\.knob/)
})

test('local action runtime changes only frozen screen and subject state', async () => {
  const ir = normalization.normalizeWebUiDocument(await readJson('p0-widgets.json'))
  let runtime = actions.createWebUiRuntime(ir)

  runtime = actions.executeWebUiAction(ir, runtime, 'subject.set', { subject: 'subject:level', value: '50' })
  assert.equal(runtime.subjects['subject:level'], 50)
  runtime = actions.executeWebUiAction(ir, runtime, 'subject.increment', { subject: 'subject:level', step: 5, min: 0, max: 100 })
  assert.equal(runtime.subjects['subject:level'], 55)
  runtime = actions.executeWebUiAction(ir, runtime, 'subject.toggle', { subject: 'subject:level' })
  assert.equal(runtime.subjects['subject:level'], 0)

  const unchanged = actions.executeWebUiAction(ir, runtime, 'network.request', { url: 'https://example.test' })
  assert.equal(unchanged, runtime)
})

test('Vue renderer uses a fixed registry and contains no executable payload sink', async () => {
  const componentPaths = [
    '../src/components/device-ui/WebUiRenderer.vue',
    '../src/components/device-ui/WebUiScreen.vue',
    '../src/components/device-ui/WebUiWidgetNode.vue',
    '../src/components/device-ui/widgets/WidgetObject.vue',
    '../src/components/device-ui/widgets/WidgetLabel.vue',
    '../src/components/device-ui/widgets/WidgetButton.vue',
    '../src/components/device-ui/widgets/WidgetButtonMatrix.vue',
    '../src/components/device-ui/widgets/WidgetSwitch.vue',
    '../src/components/device-ui/widgets/WidgetSlider.vue',
    '../src/components/device-ui/widgets/WidgetArc.vue',
    '../src/components/device-ui/widgets/WidgetBar.vue',
    '../src/components/device-ui/widgets/WidgetSpinbox.vue',
    '../src/components/device-ui/widgets/WidgetSpinner.vue',
    '../src/components/device-ui/widgets/WidgetLed.vue',
    '../src/components/device-ui/widgets/WidgetGeneric.vue'
  ]
  const files = await Promise.all(componentPaths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))
  for (const [index, source] of files.entries()) {
    const descriptor = vueCompiler.parseComponent(source)
    assert.ok(descriptor.template, `${componentPaths[index]} should have a template`)
    const compiled = vueCompiler.compile(descriptor.template.content)
    assert.deepEqual(compiled.errors, [], componentPaths[index])
  }
  files.push(await readFile(new URL('../src/components/device-ui/widgets/registry.js', import.meta.url), 'utf8'))
  const source = files.join('\n')

  for (const widget of Object.keys(validation.WEB_UI_CAPABILITIES_V1.widgets)) {
    const escaped = widget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    assert.match(source, new RegExp(`(?:\\b${escaped}:|['"]${escaped}['"]:)`), widget)
  }
  assert.doesNotMatch(source, /v-html|eval\s*\(|new Function|<iframe|<script[^>]+src=/i)
})

test('renderer management copy exists in all eight locales', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  for (const locale of locales) {
    const messages = JSON.parse(await readFile(new URL(`../src/locales/${locale}.json`, import.meta.url), 'utf8'))
    assert.equal(typeof messages.web_ui_renderer.preview_label, 'string', locale)
    assert.equal(typeof messages.web_ui_renderer.invalid_document, 'string', locale)
    assert.equal(typeof messages.web_ui_renderer.no_screen, 'string', locale)
  }
})
