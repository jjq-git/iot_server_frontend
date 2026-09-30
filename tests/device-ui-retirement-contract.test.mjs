import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

const retiredFiles = [
  'src/api/deviceUi.js',
  'src/api/ui_previews.js',
  'src/services/deviceUiError.js',
  'src/views/DeviceUiWorkbench.vue',
  'src/views/UiPreviewsAdmin.vue',
  'src/assets/styles/pages/device-ui-workbench.scss'
]

const localeFiles = [
  'zh-CN.json',
  'zh-TW.json',
  'en-US.json',
  'de-DE.json',
  'ja-JP.json',
  'fr-FR.json',
  'es-ES.json',
  'ko-KR.json'
]

test('旧设备 UI 页面和 API 已退出代码库', async () => {
  for (const path of retiredFiles) {
    await assert.rejects(access(new URL(path, root)), { code: 'ENOENT' })
  }
})

test('旧路由、权限和侧栏探测不会回流', async () => {
  const sources = await Promise.all([
    read('src/router/index.js'),
    read('src/utils/permission.js'),
    read('src/components/Sidebar.vue'),
    read('src/api/index.js')
  ])
  const combined = sources.join('\n')

  assert.doesNotMatch(combined, /DeviceUiWorkbench|UiPreviewsAdmin|UiPreviews/)
  assert.doesNotMatch(combined, /devices\/device-ui|ui-previews/)
  assert.doesNotMatch(combined, /DEVICE_UI_|UI_PREVIEW_|device_ui\./)
  assert.doesNotMatch(combined, /listUiPreviews|hasAssignedUiPreviews/)
})

test('八种 locale 不保留旧业务命名空间', async () => {
  for (const localeFile of localeFiles) {
    const locale = JSON.parse(await read(`src/locales/${localeFile}`))
    assert.equal(locale.device_ui, undefined, localeFile)
    assert.equal(locale.ui_previews, undefined, localeFile)
    assert.equal(locale.ui_previews_admin, undefined, localeFile)
    assert.equal(locale.route?.ui_previews, undefined, localeFile)
    assert.equal(locale.route?.ui_previews_admin, undefined, localeFile)
    assert.equal(locale.sidebar?.menu?.ui_previews, undefined, localeFile)
    assert.equal(locale.sidebar?.menu?.ui_previews_admin, undefined, localeFile)
  }
})

test('评审文档以 ui_json 安全渲染链路为唯一方向', async () => {
  const source = await read('docs/业务/LVGL-IoT平台-设备UI前端预研与页面API评审.md')

  assert.match(source, /WebUiDocumentV1/)
  assert.match(source, /ui_json/)
  assert.match(source, /JavaScript Renderer/)
  assert.match(source, /禁止 iframe 和 WASM/)
  assert.match(source, /软件版本 UI CRUD、权限、ETag、文件关联和错误码均可供前端正式接入/)
  assert.match(source, /联调期间继续保持旧入口下线/)
})
