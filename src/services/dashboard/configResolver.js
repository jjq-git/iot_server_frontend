const WIDGET_BY_MODULE = Object.freeze({
  stats_preview: 'metric',
  device_online_rate: 'line',
  device_online_rate_gauge: 'gauge',
  pod_usage_rate_gauge: 'gauge',
  device_status_distribution: 'pie',
  pod_usage_distribution: 'pie',
  pod_usage_trend: 'bar',
  pod_environment_trend: 'line',
  pod_noise_trend: 'line',
  pod_occupancy_trend: 'line',
  pod_power_trend: 'line',
  pod_fan_trend: 'line',
  pod_light_trend: 'line',
  pod_network_signal_trend: 'line',
  pod_desk_height_trend: 'line',
  file_usage_stats: 'bar',
  alert_stats: 'pie',
  alert_trend: 'line',
  detailed_stats: 'table'
})

const DEFAULT_LAYOUTS = Object.freeze({
  stats_preview: { x: 0, y: 0, w: 12, h: 3 },
  device_online_rate: { x: 0, y: 3, w: 8, h: 4 },
  device_online_rate_gauge: { x: 0, y: 2, w: 4, h: 4 },
  pod_usage_rate_gauge: { x: 4, y: 2, w: 4, h: 4 },
  device_status_distribution: { x: 8, y: 3, w: 4, h: 4 },
  pod_usage_trend: { x: 0, y: 7, w: 8, h: 4 },
  pod_usage_distribution: { x: 8, y: 7, w: 4, h: 4 },
  alert_trend: { x: 0, y: 11, w: 8, h: 4 },
  alert_stats: { x: 8, y: 11, w: 4, h: 4 },
  file_usage_stats: { x: 0, y: 15, w: 12, h: 4 },
  pod_environment_trend: { x: 0, y: 19, w: 6, h: 4 },
  pod_occupancy_trend: { x: 6, y: 19, w: 6, h: 4 },
  pod_noise_trend: { x: 0, y: 23, w: 6, h: 4 },
  pod_power_trend: { x: 6, y: 23, w: 6, h: 4 },
  pod_fan_trend: { x: 0, y: 27, w: 6, h: 4 },
  pod_light_trend: { x: 6, y: 27, w: 6, h: 4 },
  pod_network_signal_trend: { x: 0, y: 31, w: 6, h: 4 },
  pod_desk_height_trend: { x: 6, y: 31, w: 6, h: 4 },
  detailed_stats: { x: 0, y: 35, w: 12, h: 5 }
})

export const DEFAULT_DASHBOARD_MODULES = Object.freeze([
  { id: 'stats-preview', module_key: 'stats_preview', enabled: true, position: 1 },
  { id: 'online-rate', module_key: 'device_online_rate', enabled: true, position: 2 },
  { id: 'device-status', module_key: 'device_status_distribution', enabled: true, position: 3 },
  { id: 'pod-usage-trend', module_key: 'pod_usage_trend', enabled: true, position: 4 },
  { id: 'pod-usage-duration', module_key: 'pod_usage_distribution', enabled: true, position: 5 },
  { id: 'alert-trend', module_key: 'alert_trend', enabled: true, position: 6 },
  { id: 'alert-types', module_key: 'alert_stats', enabled: true, position: 7 },
  { id: 'file-activity', module_key: 'file_usage_stats', enabled: true, position: 8 },
  { id: 'pod-environment', module_key: 'pod_environment_trend', enabled: true, position: 9, query: { interval: '1hour' } },
  { id: 'pod-occupancy', module_key: 'pod_occupancy_trend', enabled: true, position: 10, query: { interval: '1hour' }, display: { unit: '%' } },
  { id: 'pod-noise', module_key: 'pod_noise_trend', enabled: true, position: 11, query: { interval: '1hour' }, display: { unit: 'dB' } },
  { id: 'pod-power', module_key: 'pod_power_trend', enabled: true, position: 12, query: { interval: '1hour' }, display: { unit: 'W', decimal_places: 2 } },
  { id: 'pod-fan', module_key: 'pod_fan_trend', enabled: true, position: 13, query: { interval: '1hour' } },
  { id: 'pod-light', module_key: 'pod_light_trend', enabled: true, position: 14, query: { interval: '1hour' }, display: { unit: '%' } },
  { id: 'pod-network-signal', module_key: 'pod_network_signal_trend', enabled: true, position: 15, query: { interval: '1hour' }, display: { unit: 'dBm' } },
  { id: 'pod-desk-height', module_key: 'pod_desk_height_trend', enabled: true, position: 16, query: { interval: '1hour' }, display: { unit: 'cm' } },
  { id: 'daily-details', module_key: 'detailed_stats', enabled: true, position: 17 }
])

const clamp = (value, min, max, fallback) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

const normalizeLayout = (moduleKey, layout = {}) => {
  const fallback = DEFAULT_LAYOUTS[moduleKey] || { x: 0, y: 0, w: 6, h: 4 }
  const width = clamp(layout.w, 1, 12, fallback.w)
  return {
    x: clamp(layout.x, 0, 12 - width, fallback.x),
    y: clamp(layout.y, 0, 999, fallback.y),
    w: width,
    h: clamp(layout.h, 1, 24, fallback.h)
  }
}

const normalizeModule = (module, index) => {
  const moduleKey = String(module?.module_key || module?.id || '').trim()
  const id = String(module?.id || `${moduleKey}-${index + 1}`).trim()
  const config = module?.config || {}
  const widgetType = module?.chart || module?.widget_type || config.widget_type || config.chart_type || WIDGET_BY_MODULE[moduleKey] || 'unsupported'
  return {
    id,
    module_key: moduleKey,
    name: module?.title || module?.name || '',
    description: module?.description || '',
    enabled: module?.enabled !== false,
    position: clamp(module?.position, 0, 999, index + 1),
    layout: normalizeLayout(moduleKey, module?.grid || module?.layout || config.layout),
    widget_type: widgetType === 'number' ? 'metric' : widgetType,
    chart: module?.chart || widgetType,
    query: { interval: '1day', default_range: '7d', resource_uuids: [], ...(config.query || {}), ...(module?.query || {}) },
    display: { ...(config.display || {}), ...(module?.display || {}), title: module?.title || module?.display?.title },
    config,
    supported: Object.prototype.hasOwnProperty.call(WIDGET_BY_MODULE, moduleKey)
  }
}

export const createDefaultDashboardConfig = () => ({
  config_version: 0,
  schema_version: 1,
  timezone: 'Asia/Shanghai',
  source: 'platform-default',
  branding: {},
  modules: DEFAULT_DASHBOARD_MODULES.map(normalizeModule)
})

export const resolveDashboardConfig = payload => {
  const envelope = payload?.data || payload?.result || payload || null
  const config = envelope?.config_json || envelope
  const rawModules = Array.isArray(config?.panels) ? config.panels : config?.modules
  if (!Array.isArray(rawModules)) return createDefaultDashboardConfig()

  const modules = rawModules
    .map(normalizeModule)
    .filter(module => module.id && module.module_key && module.enabled)
    .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x || a.position - b.position)

  return {
    company_uuid: envelope?.company_uuid || null,
    config_version: Number(envelope?.config_version || envelope?.version || 0),
    schema_version: Number(config?.schema_version || 1),
    timezone: config?.timezone || envelope?.timezone || 'Asia/Shanghai',
    source: envelope?.source || 'effective-config',
    branding: { ...(config?.branding || {}) },
    modules: rawModules.length && !modules.length ? createDefaultDashboardConfig().modules : modules
  }
}

export const getDashboardRefreshInterval = modules => {
  const values = (modules || [])
    .map(module => Number(module.display?.refresh_seconds || module.display?.refresh_interval || 60))
    .filter(value => Number.isFinite(value) && value >= 30)
  return values.length ? Math.min(...values) : 60
}
