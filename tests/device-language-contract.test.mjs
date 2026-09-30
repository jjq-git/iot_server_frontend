import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = relativePath => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const api = read('src/api/device_language.js')
const view = read('src/views/DeviceLanguage.vue')
const router = read('src/router/index.js')
const sidebar = read('src/components/Sidebar.vue')
const permissions = read('src/utils/permission.js')

test('device language uses firmware indexes without language-pack file APIs', () => {
  assert.match(api, /http\.get\('\/device-languages'\)/)
  assert.match(api, /http\.post\(`\/hosts\/\$\{hostUuid\}\/language`, payload\)/)
  assert.doesNotMatch(api, /\/lang-packs|upload|download|delete/i)

  assert.match(view, /fetchDeviceLanguages/)
  assert.match(view, /data\?\.languages \|\| \[\]/)
  assert.doesNotMatch(view, /FIRMWARE_LANGS|lang_pack|LangPack/i)
  assert.match(view, /action: 'host_language_set'/)
  assert.doesNotMatch(view, /module: 'device_language'/)
  assert.match(view, /fetchAuditLogDetail\(item\.uuid\)/)
  assert.match(view, /operator_name: this\.auditOperatorName/)
  assert.match(view, /this\.deviceId <= 127/)
  assert.match(view, /hasPermission\(PERMISSION\.AUDIT_VIEW, getCurrentUser\(\)\)/)
  assert.match(view, /v-if="canViewHistory"/)
})

test('device language has one canonical route and legacy bookmark redirects', () => {
  assert.match(router, /path: 'debug\/device-language', name: 'DebugDeviceLanguage'/)
  assert.match(router, /path: 'debug\/lang-packs', redirect: '\/debug\/device-language'/)
  assert.match(router, /path: 'system\/lang-packs', redirect: '\/debug\/device-language'/)
  assert.match(sidebar, /navigateTo\('\/debug\/device-language'\)/)
  assert.match(permissions, /DEVICE_OPERATE: 'device\.operate'/)
  assert.match(permissions, /DebugDeviceLanguage: PERMISSION\.DEVICE_OPERATE/)
})

test('all locales expose the device-language namespace and remove active pack labels', () => {
  const localeDir = path.join(process.cwd(), 'src/locales')
  for (const name of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const locale = JSON.parse(fs.readFileSync(path.join(localeDir, name), 'utf8'))
    assert.ok(locale.device_language_manager, `${name}: device_language_manager`)
    assert.ok(locale.device_language_manager.toast.load_languages_failed, `${name}: load_languages_failed`)
    assert.ok(locale.route.debug_device_language?.title, `${name}: route title`)
    assert.ok(locale.sidebar.menu.device_language, `${name}: sidebar label`)
    assert.ok(locale.topbar.page_descriptions.device_language, `${name}: page description`)
    assert.equal(locale.lang_pack_manager, undefined, `${name}: retired namespace`)
  }
})
