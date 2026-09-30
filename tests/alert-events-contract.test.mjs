import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const localeNames = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

test('alert history consumes the canonical device alert endpoint', () => {
  const api = read('src/api/debug/logs.js')
  const page = read('src/views/debug/AlertEvents.vue')

  assert.match(api, /export const fetchAlertEvents/)
  assert.match(api, /\/debug\/devices\/\$\{encodeURIComponent\(deviceUuid\)\}\/alerts/)
  assert.match(page, /params\.nid = this\.nid/)
  assert.match(page, /params\.status = this\.status/)
  assert.match(page, /alert_rule_id|rule_key/)
})

test('alert history is lazy routed and permission gated', () => {
  const router = read('src/router/index.js')
  const permissions = read('src/utils/permission.js')

  assert.match(router, /DebugAlertEvents = \(\) => import\('@\/views\/debug\/AlertEvents\.vue'\)/)
  assert.match(router, /name: 'HistoryAlerts'/)
  assert.match(permissions, /HistoryAlerts: PERMISSION\.DEVICE_LOG_VIEW/)
})

test('telemetry alert copy is complete and contains no replacement question marks', () => {
  for (const localeName of localeNames) {
    const messages = JSON.parse(read(`src/locales/${localeName}.json`))
    const alertCopy = [
      messages.route?.history_alerts?.title,
      messages.sidebar?.menu?.alert_events,
      messages.topbar?.page_descriptions?.alerts,
      messages.debug_alert_events?.select_host,
      ...Object.values(messages.debug_alert_events?.filters || {}),
      ...Object.values(messages.debug_alert_events?.table || {})
    ]

    assert.ok(alertCopy.every(value => typeof value === 'string' && value.trim()), `${localeName}: incomplete telemetry alert copy`)
    assert.ok(alertCopy.every(value => !value.includes('?')), `${localeName}: corrupted telemetry alert copy`)
  }
})

test('sidebar uses semantic icons for scheduling and history entries', () => {
  const sidebar = read('src/components/Sidebar.vue')
  const sidebarStyles = read('src/assets/styles/_sidebar.scss')
  const sprite = read('src/assets/icons/icons.svg')

  for (const icon of ['calendar3', 'clock-history', 'exclamation-octagon', 'bell', 'graph-up']) {
    assert.match(sprite, new RegExp(`id="icon-${icon}"`), `missing ${icon} icon`)
  }

  assert.match(sidebar, /name="calendar3" class="sidebar-subitem__icon"[\s\S]*?meeting\.menu/)
  assert.match(sidebar, /sidebar\.menu\.history[\s\S]*?<app-icon name="clock-history"\s*\/>/)
  assert.match(sidebar, /sidebar\.menu\.emcy_alerts[\s\S]*?<app-icon name="exclamation-octagon"/)
  assert.match(sidebar, /sidebar\.menu\.alert_events[\s\S]*?<app-icon name="bell"/)
  assert.match(sidebar, /sidebar\.menu\.sensor_data[\s\S]*?<app-icon name="graph-up"/)
  assert.match(sidebarStyles, /\.sidebar-item__icon,[\s\S]*?width:\s*var\(--icon-size-md\)/)
  assert.match(sidebarStyles, /\.sidebar-item__icon,[\s\S]*?height:\s*var\(--icon-size-md\)/)
  assert.match(sidebarStyles, /\.sidebar \.sidebar-item__icon,[\s\S]*?opacity:\s*0\.85/)
  assert.match(sidebarStyles, /\.sidebar \.sidebar-item__icon > \.app-icon,[\s\S]*?stroke-width:\s*1\.5/)
  assert.doesNotMatch(sidebarStyles, /\.sidebar-subitem__icon\s*\{\s*font-size:\s*var\(--font-size-control\)/)
})
