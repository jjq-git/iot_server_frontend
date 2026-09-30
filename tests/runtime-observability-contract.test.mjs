import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const monitorSource = fs.readFileSync(new URL('../src/views/SystemMonitor.vue', import.meta.url), 'utf8')
const odManagerSource = fs.readFileSync(new URL('../src/views/OdManager.vue', import.meta.url), 'utf8')
const deviceControlSource = fs.readFileSync(new URL('../src/views/debug/DeviceControl.vue', import.meta.url), 'utf8')
const mqttOverviewSource = fs.readFileSync(new URL('../src/views/mqtt_server/Overview.vue', import.meta.url), 'utf8')
const sidebarSource = fs.readFileSync(new URL('../src/components/Sidebar.vue', import.meta.url), 'utf8')
const iconLibraryApiSource = fs.readFileSync(new URL('../src/api/iconLibrary.js', import.meta.url), 'utf8')

test('system monitor labels process-local MQTT buffer metrics instead of broker totals', () => {
  assert.match(monitorSource, /backend_consumer_connections/)
  assert.match(monitorSource, /buffer_messages/)
  assert.match(monitorSource, /observed_messages/)
  assert.doesNotMatch(monitorSource, /mqttStats\.messages_total/)
  assert.doesNotMatch(monitorSource, /mqttStats\.clients_total/)
})

test('OD pages consume PostgreSQL-authoritative device model resolutions', () => {
  for (const source of [odManagerSource, deviceControlSource]) {
    assert.match(source, /fetchOdDeviceModels/)
    assert.match(source, /findOdDeviceResolution/)
    assert.match(source, /getResolvedOdSpec/)
    assert.doesNotMatch(source, /getCanopenModelCode/)
  }
})

test('MQTT overview supports current EMQX monitor field names', () => {
  for (const [legacyKey, currentKey] of [
    ['connections_count', 'connections'],
    ['sessions_count', 'live_connections'],
    ['subscriptions_count', 'subscriptions'],
    ['shared_subscriptions_count', 'shared_subscriptions'],
    ['topics_count', 'topics'],
    ['routes_count', 'topics']
  ]) {
    assert.match(mqttOverviewSource, new RegExp(`${legacyKey}: '${currentKey}'`))
  }
  assert.match(mqttOverviewSource, /MONITOR_CURRENT_ALIASES\[key\]/)
})

test('sidebar probes optional icon library through the availability endpoint', () => {
  assert.match(iconLibraryApiSource, /http\.get\('\/icon-library\/availability'\)/)
  assert.match(sidebarSource, /await getIconLibraryAvailability\(\)/)
  assert.match(sidebarSource, /data\.available === true/)
  assert.doesNotMatch(sidebarSource, /await getIconLibrary\(\)/)
})
