import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/services/dashboard/configResolver.js', import.meta.url), 'utf8')
const resolver = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

test('dashboard fallback matches the backend platform default panel contract', () => {
  const fallback = resolver.createDefaultDashboardConfig()

  assert.deepEqual(
    fallback.modules.map(module => ({ id: module.id, module_key: module.module_key })),
    [
      { id: 'stats-preview', module_key: 'stats_preview' },
      { id: 'online-rate', module_key: 'device_online_rate' },
      { id: 'device-status', module_key: 'device_status_distribution' },
      { id: 'pod-usage-trend', module_key: 'pod_usage_trend' },
      { id: 'pod-usage-duration', module_key: 'pod_usage_distribution' },
      { id: 'alert-trend', module_key: 'alert_trend' },
      { id: 'alert-types', module_key: 'alert_stats' },
      { id: 'file-activity', module_key: 'file_usage_stats' },
      { id: 'pod-environment', module_key: 'pod_environment_trend' },
      { id: 'pod-occupancy', module_key: 'pod_occupancy_trend' },
      { id: 'pod-noise', module_key: 'pod_noise_trend' },
      { id: 'pod-power', module_key: 'pod_power_trend' },
      { id: 'pod-fan', module_key: 'pod_fan_trend' },
      { id: 'pod-light', module_key: 'pod_light_trend' },
      { id: 'pod-network-signal', module_key: 'pod_network_signal_trend' },
      { id: 'pod-desk-height', module_key: 'pod_desk_height_trend' },
      { id: 'daily-details', module_key: 'detailed_stats' }
    ]
  )
})

test('an explicit empty v1 dashboard remains empty instead of creating unconfigured panels', () => {
  const resolved = resolver.resolveDashboardConfig({
    source: 'company-dashboard-config',
    config_json: { schema_version: 1, branding: {}, panels: [] }
  })

  assert.deepEqual(resolved.modules, [])
})

test('configured panel ids remain authoritative for runtime chart queries', () => {
  const resolved = resolver.resolveDashboardConfig({
    source: 'company-dashboard-config',
    config_json: {
      schema_version: 1,
      branding: {},
      panels: [{
        id: 'online-main',
        module_key: 'device_online_rate',
        title: 'Online',
        chart: 'line',
        grid: { x: 0, y: 0, w: 12, h: 4 }
      }]
    }
  })

  assert.equal(resolved.modules.length, 1)
  assert.equal(resolved.modules[0].id, 'online-main')
  assert.equal(resolved.modules[0].module_key, 'device_online_rate')
})

test('configured branding remains available to the dashboard runtime', () => {
  const resolved = resolver.resolveDashboardConfig({
    source: 'company-dashboard-config',
    config_json: {
      schema_version: 1,
      branding: { title: '运营数据看板' },
      panels: []
    }
  })

  assert.equal(resolved.branding.title, '运营数据看板')
})
