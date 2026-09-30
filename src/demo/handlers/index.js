import { http, HttpResponse } from 'msw'
import { getDemoDatabase } from '../database'
import { publishDemoCommandAck } from '../realtime'
import { getCurrentDemoScenario, resolveDemoToken } from '../session'

const API = '/api/v1'

const errorResponse = (status, code, message) => HttpResponse.json({ code, message }, { status })

const authorize = request => {
  const selected = resolveDemoToken(request.headers.get('authorization'))
  return selected || null
}

const requireScenario = request => {
  const scenario = authorize(request)
  if (!scenario) return { error: errorResponse(401, 'E2001', 'Demo session is missing or invalid') }
  return { scenario }
}

const requirePermission = (request, permission) => {
  const result = requireScenario(request)
  if (result.error) return result
  if (!result.scenario.permissions.includes(permission)) {
    return { error: errorResponse(403, 'E2003', 'Demo scenario does not grant this capability') }
  }
  return result
}

const visibleItems = (items, scenario) => items.filter(item => (
  scenario.visibleCompanies.includes(Number(item.company_id || item.com_id || item.owner_company_id || item.id))
))

const page = (items, request) => {
  const url = new URL(request.url)
  const pageNumber = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('page_size') || 20)
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) return null
  const start = (pageNumber - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page: pageNumber, page_size: pageSize }
}

const pageResponse = (items, request, aliases = {}) => {
  const result = page(items, request)
  return result
    ? HttpResponse.json({ ...result, ...Object.fromEntries(Object.entries(aliases).map(([key, source]) => [key, result[source]])) })
    : errorResponse(422, 'E1001', 'page and page_size must be positive integers and page_size cannot exceed 200')
}

const jsonBody = async request => {
  try {
    return await request.json()
  } catch (error) {
    return null
  }
}

const newUuid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const writableCompany = (scenario, companyId) => scenario.writableCompanies.includes(Number(companyId))

const validDateOnly = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const validTimezone = value => {
  if (value == null) return true
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format()
    return true
  } catch (error) {
    return false
  }
}

const validCoordinates = payload => {
  const hasLatitude = payload?.gps_lat != null
  const hasLongitude = payload?.gps_lng != null
  if (hasLatitude !== hasLongitude) return false
  if (!hasLatitude) return true
  const latitude = Number(payload.gps_lat)
  const longitude = Number(payload.gps_lng)
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180
}

const findVisiblePod = async (database, scenario, uuid) => {
  const pod = await database.get('pods', String(uuid))
  return pod && scenario.visibleCompanies.includes(Number(pod.company_id || pod.owner_company_id)) ? pod : null
}

const validBookingWindow = payload => {
  const offsetTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/
  if (!offsetTimestamp.test(payload?.start_at || '') || !offsetTimestamp.test(payload?.end_at || '')) return false
  const start = Date.parse(payload?.start_at)
  const end = Date.parse(payload?.end_at)
  return Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= 24 * 60 * 60 * 1000
}

const hasBookingConflict = (bookings, candidate, excludedUuid = null) => bookings.some(item => (
  item.uuid !== excludedUuid &&
  item.pod_uuid === candidate.pod_uuid &&
  item.status !== 'cancelled' &&
  Date.parse(item.start_at) < Date.parse(candidate.end_at) &&
  Date.parse(item.end_at) > Date.parse(candidate.start_at)
))

const locationRegion = async (database, districtId) => {
  if (!districtId) return {}
  const [provinces, cities, districts] = await Promise.all([
    database.get('districts', 'provinces'),
    database.get('districts', 'cities'),
    database.get('districts', 'districts')
  ])
  const district = districts.find(item => item.id === Number(districtId))
  const city = district ? cities.find(item => item.id === district.parent_id) : cities.find(item => item.id === Number(districtId))
  const province = city ? provinces.find(item => item.id === city.parent_id) : provinces.find(item => item.id === Number(districtId))
  const baseline = district || city || province
  if (!baseline) return null
  return {
    district_id: Number(districtId),
    country_code: 'CN',
    country: '中国',
    country_name: '中国',
    province: province?.code || null,
    province_code: province?.code || null,
    province_name: province?.name || null,
    city: city?.code || null,
    city_code: city?.code || null,
    city_name: city?.name || null,
    district: district?.code || null,
    district_code: district?.code || null,
    district_name: district?.name || null,
    timezone: baseline?.timezone || 'Asia/Shanghai',
    baseline
  }
}

const locationFromPayload = async (database, payload, companyId, current = {}) => {
  const resolvedRegion = await locationRegion(database, payload.district_id ?? current.district_id)
  if (resolvedRegion === null) return null
  const { baseline, ...region } = resolvedRegion
  const hasCoordinates = payload.gps_lat != null && payload.gps_lng != null
  const gpsLat = hasCoordinates ? Number(payload.gps_lat) : (current.gps?.lat ?? baseline?.gps_lat ?? null)
  const gpsLng = hasCoordinates ? Number(payload.gps_lng) : (current.gps?.lng ?? baseline?.gps_lng ?? null)
  const createdAt = current.created_at || new Date().toISOString()
  const street = payload.street ?? current.street ?? null
  const building = payload.building ?? current.building ?? null
  const floor = payload.floor ?? current.floor ?? null
  const address = [street, building, floor].filter(Boolean).join(' ') || null
  return {
    ...current,
    ...payload,
    ...region,
    company_id: companyId,
    com_id: companyId,
    gps_lat: gpsLat,
    gps_lng: gpsLng,
    gps: gpsLat != null && gpsLng != null ? { lat: gpsLat, lng: gpsLng } : null,
    gps_source: hasCoordinates ? 'manual' : (current.gps_source || 'district_baseline'),
    gps_verified_at: current.gps_verified_at || null,
    gps_verified_by: current.gps_verified_by || null,
    address,
    full_address: payload.full_address || current.full_address || [region.province_name, region.district_name, address].filter(Boolean).join(''),
    pod_count: current.pod_count || 0,
    pods: current.pods || [],
    is_active: payload.is_active ?? current.is_active ?? true,
    created_at: createdAt
  }
}

const bookingLog = (booking, action = 'created') => [{
  id: booking.revision,
  event_type: action,
  source_type: 'local',
  actor_type: 'user',
  actor_display_name: 'Demo User',
  actor_external_id: null,
  before: null,
  after: { subject: booking.subject, status: booking.status, revision: booking.revision },
  reason: null,
  created_at: booking.updated_at || booking.created_at
}]

const formatDateOnly = date => date.toISOString().slice(0, 10)

const buildDashboardDates = (startDate, endDate) => {
  const fallbackEnd = new Date(Date.UTC(2026, 8, 18))
  const end = endDate ? new Date(`${endDate}T00:00:00.000Z`) : fallbackEnd
  const requestedStart = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(end.getTime() - 6 * 86400000)
  const start = requestedStart <= end ? requestedStart : end
  const firstDate = new Date(Math.max(start.getTime(), end.getTime() - 30 * 86400000))
  const dates = []
  for (let date = firstDate; date <= end; date = new Date(date.getTime() + 86400000)) dates.push(formatDateOnly(date))
  return dates
}

const buildDashboardSummary = (pods, startDate, endDate) => {
  const total = pods.length
  const online = pods.filter(item => item.is_online).length
  const offline = total - online
  const inUse = pods.filter(item => item.status?.status_text === 'in_use').length
  const onlineRate = total ? Math.round(online / total * 100) : 0
  const usageRate = total ? Math.round(inUse / total * 100) : 0
  const rateTrend = [0, -5, 2, -2, 3, 1, 0].map(offset => Math.max(0, Math.min(100, onlineRate + offset)))
  return {
    stats: { totalDevices: total, onlineDevices: online, offlineDevices: offline, onlineRate, podTotal: total, podInUse: inUse, podUsageRate: usageRate, fileTotal: total * 2, fileSize: `${total * 8} MB`, alertsToday: offline, alertsWeek: offline * 2, alertsPending: offline, fileDownloads: total * 4, filePlays: total * 10, fileNew: total ? 1 : 0 },
    deviceStatusData: { online, offline, maintenance: 0, inactive: 0 },
    onlineRateData: rateTrend,
    onlineRateTrend: rateTrend.map((value, index) => ({ label: `D${index + 1}`, value })),
    podDurationData: { short: total * 2, medium: total * 3, long: total, total: total * 6 },
    podDurationPercent: { short: 33, medium: 50, long: 17 },
    podAvgDuration: total ? 48 : 0,
    podLongestDuration: total ? 132 : 0,
    podUsageTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, index) => ({ label, usage_count: total + index, avg_duration_minutes: 42 + index * 2 })),
    alertTypes: { offline, communication: 0, other: 0 },
    alertTrend: [offline, 0, offline, 0, offline, 0, offline].map((count, index) => ({ label: `D${index + 1}`, count })),
    tableData: buildDashboardDates(startDate, endDate).map((date, index) => {
      const onlineDelta = [0, -1, 0, 0, 1, 0, 0][index % 7]
      const dailyOnline = Math.max(0, Math.min(total, online + onlineDelta))
      return {
        date,
        date_label: date,
        online_devices: dailyOnline,
        total_devices: total,
        online_rate: total ? Math.round(dailyOnline / total * 100) : 0,
        pod_usage: total ? dailyOnline * 2 + index % 3 : 0,
        avg_usage_time: total ? 38 + index * 3 : 0,
        file_downloads: total ? total * 2 + index : 0,
        alerts_count: Math.max(0, total - dailyOnline + (index % 3 === 2 ? 1 : 0))
      }
    })
  }
}

const DEMO_DASHBOARD_MODULES = Object.freeze([
  { id: 'stats_preview', enabled: true, position: 1 },
  { id: 'device_online_rate', enabled: true, position: 2 },
  { id: 'device_status_distribution', enabled: true, position: 3 },
  { id: 'pod_usage_distribution', enabled: true, position: 4 },
  { id: 'pod_usage_trend', enabled: true, position: 5 },
  { id: 'file_usage_stats', enabled: true, position: 6 },
  { id: 'alert_stats', enabled: true, position: 7 },
  { id: 'alert_trend', enabled: true, position: 8 },
  { id: 'pod_environment_trend', enabled: true, position: 9 },
  { id: 'pod_occupancy_trend', enabled: true, position: 10 },
  { id: 'pod_noise_trend', enabled: true, position: 11 },
  { id: 'pod_power_trend', enabled: true, position: 12 },
  { id: 'pod_fan_trend', enabled: true, position: 13 },
  { id: 'pod_light_trend', enabled: true, position: 14 },
  { id: 'pod_network_signal_trend', enabled: true, position: 15 },
  { id: 'pod_desk_height_trend', enabled: true, position: 16 },
  { id: 'detailed_stats', enabled: true, position: 17 }
])

const DEMO_DASHBOARD_PANELS = Object.freeze([
  { id: 'stats_preview', title: 'Overview', chart: 'stat', source: 'dashboard.summary', grid: { x: 0, y: 0, w: 12, h: 2 } },
  { id: 'device_online_rate', title: 'Online rate', chart: 'line', source: 'device_status.online_rate', grid: { x: 0, y: 2, w: 8, h: 4 } },
  { id: 'device_status_distribution', title: 'Device status', chart: 'pie', source: 'device_status.status_distribution', grid: { x: 8, y: 2, w: 4, h: 4 } },
  { id: 'pod_usage_trend', title: 'Usage trend', chart: 'bar', source: 'pod_usage.usage_count', grid: { x: 0, y: 7, w: 8, h: 4 } },
  { id: 'pod_usage_distribution', title: 'Usage duration', chart: 'pie', source: 'pod_usage.duration_distribution', grid: { x: 8, y: 7, w: 4, h: 4 } },
  { id: 'alert_trend', title: 'Alert trend', chart: 'line', source: 'alerts.alert_count', grid: { x: 0, y: 11, w: 8, h: 4 } },
  { id: 'alert_stats', title: 'Alert types', chart: 'pie', source: 'alerts.type_distribution', grid: { x: 8, y: 11, w: 4, h: 4 } },
  { id: 'file_usage_stats', title: 'File activity', chart: 'bar', source: 'file_activity.usage_count', grid: { x: 0, y: 15, w: 12, h: 4 } },
  { id: 'pod_environment_trend', title: 'Pod environment', chart: 'line', source: 'pod_telemetry.environment', interval: '1hour', grid: { x: 0, y: 19, w: 6, h: 4 } },
  { id: 'pod_occupancy_trend', title: 'Pod occupancy', chart: 'line', source: 'pod_telemetry.occupancy', interval: '1hour', grid: { x: 6, y: 19, w: 6, h: 4 } },
  { id: 'pod_noise_trend', title: 'Pod noise', chart: 'line', source: 'pod_telemetry.noise', interval: '1hour', grid: { x: 0, y: 23, w: 6, h: 4 } },
  { id: 'pod_power_trend', title: 'Pod power', chart: 'line', source: 'pod_telemetry.power', interval: '1hour', grid: { x: 6, y: 23, w: 6, h: 4 } },
  { id: 'pod_fan_trend', title: 'Fan operation', chart: 'line', source: 'pod_telemetry.fan', interval: '1hour', grid: { x: 0, y: 27, w: 6, h: 4 } },
  { id: 'pod_light_trend', title: 'Lighting level', chart: 'line', source: 'pod_telemetry.light', interval: '1hour', grid: { x: 6, y: 27, w: 6, h: 4 } },
  { id: 'pod_network_signal_trend', title: 'Network signal', chart: 'line', source: 'pod_telemetry.network_signal', interval: '1hour', grid: { x: 0, y: 31, w: 6, h: 4 } },
  { id: 'pod_desk_height_trend', title: 'Desk height', chart: 'line', source: 'pod_telemetry.desk_height', interval: '1hour', grid: { x: 6, y: 31, w: 6, h: 4 } },
  { id: 'detailed_stats', title: 'Daily details', chart: 'table', source: 'dashboard_summary.daily_detail', grid: { x: 0, y: 35, w: 12, h: 5 } }
])

const DEMO_DASHBOARD_QUERY_MODULES = Object.freeze({
  stats_preview: { metric: null, resultShape: 'cards' },
  device_online_rate: { metric: 'online_rate', resultShape: 'timeseries' },
  device_online_rate_gauge: { metric: 'online_rate', resultShape: 'scalar' },
  pod_usage_rate_gauge: { metric: 'pod_usage_rate', resultShape: 'scalar' },
  device_status_distribution: { metric: 'status_distribution', resultShape: 'category' },
  pod_usage_distribution: { metric: 'duration_distribution', resultShape: 'category' },
  pod_usage_trend: { metric: 'usage_count', resultShape: 'timeseries' },
  pod_environment_trend: { metric: 'environment', resultShape: 'timeseries' },
  pod_noise_trend: { metric: 'noise', resultShape: 'timeseries' },
  pod_occupancy_trend: { metric: 'occupancy', resultShape: 'timeseries' },
  pod_power_trend: { metric: 'power', resultShape: 'timeseries' },
  pod_fan_trend: { metric: 'fan', resultShape: 'timeseries' },
  pod_light_trend: { metric: 'light', resultShape: 'timeseries' },
  pod_network_signal_trend: { metric: 'network_signal', resultShape: 'timeseries' },
  pod_desk_height_trend: { metric: 'desk_height', resultShape: 'timeseries' },
  file_usage_stats: { metric: 'usage_count', resultShape: 'timeseries' },
  alert_stats: { metric: 'type_distribution', resultShape: 'category' },
  alert_trend: { metric: 'alert_count', resultShape: 'timeseries' },
  detailed_stats: { metric: 'daily_detail', resultShape: 'table' }
})

const chartPointsForMetric = metricKey => ({
  online_rate: [62, 67, 71, 68, 73, 76, 74].map((value, index) => ({ timestamp: `D${index + 1}`, value })),
  status_distribution: [
    { label: 'online', value: 2 },
    { label: 'offline', value: 1 },
    { label: 'maintenance', value: 0 },
    { label: 'inactive', value: 0 }
  ],
  duration_distribution: [
    { label: '0-1h', value: 6 },
    { label: '1-2h', value: 9 },
    { label: '2-4h', value: 4 },
    { label: '4h+', value: 2 }
  ],
  usage_count: [5, 8, 6, 11, 9, 13, 10].map((value, index) => ({ timestamp: `D${index + 1}`, value })),
  type_distribution: [
    { label: 'Offline', value: 1 },
    { label: 'Communication', value: 2 },
    { label: 'Other', value: 1 }
  ],
  alert_count: [1, 0, 2, 1, 3, 1, 1].map((value, index) => ({ timestamp: `D${index + 1}`, value })),
  daily_detail: []
})[metricKey] || [12, 18, 15, 22, 20, 26, 24].map((value, index) => ({ timestamp: `D${index + 1}`, value }))

const demoTelemetrySeries = moduleKey => {
  const points = values => values.map((value, index) => ({ timestamp: `H${index + 1}`, label: `${8 + index}:00`, value }))
  const series = {
    pod_environment_trend: [
      { name: 'temperature', unit: '°C', y_axis: 0, points: points([23.1, 23.4, 23.8, 24.2, 24.0, 23.7, 23.5]) },
      { name: 'humidity', unit: '%', y_axis: 1, points: points([46, 45, 44, 43, 44, 45, 46]) }
    ],
    pod_noise_trend: [{ name: 'noise', unit: 'dB', y_axis: 0, points: points([31, 34, 38, 42, 36, 33, 30]) }],
    pod_occupancy_trend: [{ name: 'occupancy', unit: '%', y_axis: 0, points: points([0, 25, 75, 100, 75, 25, 0]) }],
    pod_power_trend: [{ name: 'estimated_power', unit: 'W', y_axis: 0, points: points([1.8, 2.4, 3.1, 3.6, 3.0, 2.3, 1.7]) }],
    pod_fan_trend: [
      { name: 'fan_request', unit: '%', y_axis: 0, points: points([20, 30, 50, 70, 60, 40, 20]) },
      { name: 'fan_actual', unit: '%', y_axis: 0, points: points([18, 29, 48, 68, 59, 39, 19]) },
      { name: 'fan_rpm', unit: 'rpm', y_axis: 1, points: points([720, 1080, 1800, 2520, 2160, 1440, 720]) }
    ],
    pod_light_trend: [{ name: 'light_level', unit: '%', y_axis: 0, points: points([20, 40, 70, 80, 65, 45, 20]) }],
    pod_network_signal_trend: [{ name: 'wifi_rssi', unit: 'dBm', y_axis: 0, points: points([-58, -56, -55, -57, -54, -56, -58]) }],
    pod_desk_height_trend: [{ name: 'desk_height', unit: 'cm', y_axis: 0, points: points([72, 72, 95, 110, 110, 88, 72]) }]
  }
  return series[moduleKey] || null
}

const controlDefinitions = Object.freeze([
  {
    key: 'light',
    title: '舱内照明',
    control_category: 'light',
    device_model_uuid: 'demo-control-light',
    can_node_id: 2,
    node_pos: '顶部',
    fields: [
      { attr_code: 'light_on', attr_name: '照明开关', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3001', co_sub_index: '0x01', default_value: true, display_order: 1 },
      { attr_code: 'brightness', attr_name: '照明亮度', data_type: 'UNSIGNED8', access_type: 'RW', web_editable: true, widget: 'slider', min_val: 0, max_val: 100, step: 5, unit: '%', co_index: '0x3001', co_sub_index: '0x02', default_value: 72, display_order: 2 }
    ]
  },
  {
    key: 'fresh-air',
    title: '新风系统',
    control_category: 'fresh_air',
    device_model_uuid: 'demo-control-fresh-air',
    can_node_id: 3,
    node_pos: '后舱',
    fields: [
      { attr_code: 'fan_on', attr_name: '新风开关', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3010', co_sub_index: '0x01', default_value: true, display_order: 1 },
      { attr_code: 'fan_speed', attr_name: '风速档位', data_type: 'UNSIGNED8', access_type: 'RW', web_editable: true, widget: 'stepper', min_val: 0, max_val: 5, step: 1, co_index: '0x3010', co_sub_index: '0x02', default_value: 3, display_order: 2 }
    ]
  },
  {
    key: 'climate',
    title: '环境调节',
    control_category: 'ac',
    device_model_uuid: 'demo-control-climate',
    can_node_id: 4,
    node_pos: '控制箱',
    fields: [
      { attr_code: 'target_temperature', attr_name: '目标温度', data_type: 'REAL32', access_type: 'RW', web_editable: true, widget: 'slider', min_val: 18, max_val: 30, step: 0.5, unit: '°C', co_index: '0x3020', co_sub_index: '0x01', default_value: 23.5, display_order: 1 },
      { attr_code: 'quiet_mode', attr_name: '静音模式', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3020', co_sub_index: '0x02', default_value: true, display_order: 2 }
    ]
  }
])

const controlModulesForPod = pod => controlDefinitions.map(definition => {
  const deviceUuid = `${pod.uuid}-${definition.key}`
  return {
    title: definition.title,
    control_category: definition.control_category,
    device_type: 'node',
    device_model_uuid: definition.device_model_uuid,
    quantity: 1,
    bound: true,
    instances: [{ device_uuid: deviceUuid, can_node_id: definition.can_node_id, node_pos: definition.node_pos, online: pod.is_online }],
    fields: definition.fields.map(field => ({
      ...field,
      current_value: pod.attr?.[field.attr_code] ?? field.default_value,
      current_values: { [deviceUuid]: pod.attr?.[field.attr_code] ?? field.default_value },
      shadows: {}
    }))
  }
})

const controlStateForPod = pod => ({
  is_online: pod.is_online,
  last_seen: pod.last_seen,
  items: controlModulesForPod(pod).flatMap(module => module.fields.map(field => ({
    target_uuid: module.instances[0].device_uuid,
    nid: module.instances[0].can_node_id,
    co_index: field.co_index,
    co_sub_index: field.co_sub_index,
    value: field.current_value,
    shadow: { state: 'reported', desired_value: field.current_value, reported_value: field.current_value }
  })))
})

const dashboardConfigForCompany = company => ({
  id: company.id,
  company_id: company.id,
  company_name: company.company_name,
  config_json: {
    branding: {
      company_name: company.company_name,
      short_name: company.short_name,
      slogan: company.slogan || 'PODSC Demo'
    },
    panels: DEMO_DASHBOARD_PANELS.map(panel => ({ ...panel, grid: { ...panel.grid } }))
  },
  html_content: null,
  css_content: null,
  js_content: null,
  is_active: true,
  created_at: company.created_at,
  updated_at: company.updated_at
})

export const demoHandlers = [
  http.get(`${API}/company-dashboard-config/public`, () => HttpResponse.json({
    company: { company_name: 'PODSC Demo', short_name: 'PODSC Demo', domain: 'https://demo.podsc.com', slogan: 'Explore PODSC safely' },
    branding: { company_name: 'PODSC Demo', logo_url: null },
    templates: []
  })),

  http.get(`${API}/company-dashboard-config`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const companies = visibleItems(await (await getDemoDatabase()).getAll('companies'), scenario)
    return pageResponse(companies.map(dashboardConfigForCompany), request)
  }),

  http.get(`${API}/company-dashboard-config/:companyId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const companyId = String(params.companyId)
    const company = (await (await getDemoDatabase()).getAll('companies')).find(item => String(item.id) === companyId || item.uuid === companyId)
    if (!company) return errorResponse(404, 'E1004', 'Company dashboard config not found')
    if (!scenario.visibleCompanies.includes(Number(company.id))) return errorResponse(403, 'E2003', 'Company dashboard config is outside the Demo scope')
    return HttpResponse.json(dashboardConfigForCompany(company))
  }),

  http.get(`${API}/users/me`, ({ request }) => {
    const { scenario, error } = requireScenario(request)
    if (error) return error
    const current = getCurrentDemoScenario()
    if (!current || current.id !== scenario.id) return errorResponse(401, 'E2001', 'Demo session has changed')
    return getDemoDatabase().then(database => database.get('users', `demo-user-${scenario.id}`)).then(user => HttpResponse.json(user))
  }),

  http.get(`${API}/dashboard/summary`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'dashboard.view')
    if (error) return error
    const url = new URL(request.url)
    for (const field of ['start_date', 'end_date']) {
      const value = url.searchParams.get(field)
      if (value && !validDateOnly(value)) return errorResponse(422, 'E1001', `${field} must use a valid YYYY-MM-DD date`)
    }
    const pods = visibleItems(await (await getDemoDatabase()).getAll('pods'), scenario)
    return HttpResponse.json(buildDashboardSummary(
      pods,
      url.searchParams.get('start_date'),
      url.searchParams.get('end_date')
    ))
  }),

  http.get(`${API}/dashboard/config/effective`, ({ request }) => {
    const { error } = requirePermission(request, 'dashboard.view')
    if (error) return error
    return HttpResponse.json({
      config_version: 1,
      timezone: 'Asia/Shanghai',
      source: 'demo-seed',
      modules: DEMO_DASHBOARD_MODULES.map(module => ({ ...module }))
    })
  }),

  http.post(`${API}/dashboard/chart-data/query`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'dashboard.view')
    if (error) return error
    const payload = await jsonBody(request)
    if (!Array.isArray(payload?.queries) || payload.queries.length < 1 || payload.queries.length > 50) return errorResponse(422, 'E1001', 'queries must contain between 1 and 50 items')
    const visiblePods = visibleItems(await (await getDemoDatabase()).getAll('pods'), scenario)
    const visiblePodUuids = new Set(visiblePods.map(item => item.uuid))
    const invalidQuery = payload.queries.find(query => (
      !query?.request_id || !query?.interval ||
      (!query?.module_key && (!query?.source_key || !query?.metric_key || !query?.aggregation)) ||
      (query?.module_key && (!query?.panel_id || !DEMO_DASHBOARD_QUERY_MODULES[query.module_key])) ||
      !Array.isArray(query.resource_uuids || []) || (query.resource_uuids || []).length > 100 ||
      !validTimezone(query.timezone || 'Asia/Shanghai')
    ))
    if (invalidQuery) return errorResponse(422, 'E1001', 'Dashboard query fields are incomplete')
    const forbiddenResource = payload.queries.some(query => (query.resource_uuids || []).some(uuid => !visiblePodUuids.has(uuid)))
    if (forbiddenResource) return errorResponse(403, 'E2003', 'Dashboard query references a resource outside the Demo scope')
    const generatedAt = new Date().toISOString()
    const summary = buildDashboardSummary(visiblePods)
    return HttpResponse.json({
      items: payload.queries.map(query => {
        const module = DEMO_DASHBOARD_QUERY_MODULES[query.module_key]
        const metricKey = module?.metric || query.metric_key
        let points
        let series = demoTelemetrySeries(query.module_key)
        if (query.module_key === 'stats_preview') points = Object.entries(summary.stats).map(([label, value]) => ({ label, value }))
        else if (query.module_key === 'device_online_rate_gauge') points = [{ label: 'online_rate', value: summary.stats.onlineRate }]
        else if (query.module_key === 'pod_usage_rate_gauge') points = [{ label: 'pod_usage_rate', value: summary.stats.podUsageRate }]
        else if (query.module_key === 'detailed_stats') points = summary.tableData.map(data => ({ data }))
        else if (!series) points = chartPointsForMetric(metricKey)
        if (!series) series = [{ name: query.module_key || metricKey, points }]
        return {
          request_id: query.request_id,
          panel_id: query.panel_id || null,
          module_key: query.module_key || null,
          result_shape: module?.resultShape || null,
          series,
          statistics: {},
          cache: { hit: false, source: 'demo' },
          generated_at: generatedAt,
          data_version: 1,
          status: 'ok',
          error: null
        }
      })
    })
  }),

  http.get(`${API}/companies`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const database = await getDemoDatabase()
    const url = new URL(request.url)
    const keyword = String(url.searchParams.get('keyword') || '').trim().toLowerCase()
    let items = visibleItems(await database.getAll('companies'), scenario)
    if (keyword) items = items.filter(item => `${item.company_name} ${item.short_name} ${item.company_code}`.toLowerCase().includes(keyword))
    if (url.searchParams.has('parent_com_id')) items = items.filter(item => Number(item.parent_com_id) === Number(url.searchParams.get('parent_com_id')))
    if (url.searchParams.has('is_active')) items = items.filter(item => String(item.is_active) === url.searchParams.get('is_active'))
    return pageResponse(items, request)
  }),

  http.get(`${API}/companies/:companyId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const companyId = String(params.companyId)
    const companies = await (await getDemoDatabase()).getAll('companies')
    const company = companies.find(item => String(item.id) === companyId || item.uuid === companyId)
    if (!company) return errorResponse(404, 'E1004', 'Company not found')
    if (!scenario.visibleCompanies.includes(Number(company.id))) return errorResponse(403, 'E2003', 'Company is outside the Demo scope')
    return HttpResponse.json(company)
  }),

  http.get(`${API}/pods`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const database = await getDemoDatabase()
    const url = new URL(request.url)
    const search = String(url.searchParams.get('search') || '').trim().toLowerCase()
    let items = visibleItems(await database.getAll('pods'), scenario)
    if (search) items = items.filter(item => `${item.pod_name} ${item.serial_number} ${item.company_name}`.toLowerCase().includes(search))
    for (const field of ['is_online', 'is_active']) {
      if (url.searchParams.has(field)) items = items.filter(item => String(item[field]) === url.searchParams.get(field))
    }
    return pageResponse(items, request, { limit: 'page_size' })
  }),

  http.get(`${API}/pods/:podId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const pod = await findVisiblePod(await getDemoDatabase(), scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    const permissions = []
    if (scenario.permissions.includes('pod.maintain') && writableCompany(scenario, pod.company_id)) permissions.push('pod.maintain')
    if (scenario.permissions.includes('pod.control')) permissions.push('pod.control')
    return HttpResponse.json({ ...pod, resource_permissions: permissions, current_topology_version: 1 })
  }),

  http.get(`${API}/pods/:podId/status`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const pod = await findVisiblePod(await getDemoDatabase(), scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    return HttpResponse.json({ status: { temperature: pod.is_online ? 23.5 : null, humidity: pod.is_online ? 48 : null, noise: pod.is_online ? 36 : null, air_quality: pod.is_online ? 'good' : '-' } })
  }),

  http.get(`${API}/pods/:podId/records`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const pod = await findVisiblePod(await getDemoDatabase(), scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    const now = Date.now()
    const records = [0, 1, 2].map(offset => ({
      uuid: `${pod.uuid}-record-${offset}`,
      recorded_at: new Date(now - offset * 60 * 60 * 1000).toISOString(),
      event_type: 'telemetry',
      record_data: { temperature: 23.5 - offset * 0.2, humidity: 48 + offset, noise: 36 + offset }
    }))
    return HttpResponse.json({ records, total: records.length, page: 1, page_size: 10 })
  }),

  http.get(`${API}/pods/:podId/control-schema`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.control')
    if (error) return error
    const pod = await findVisiblePod(await getDemoDatabase(), scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    return HttpResponse.json({ modules: controlModulesForPod(pod), actions: [{ key: 'restart' }] })
  }),

  http.get(`${API}/pods/:podId/control-state`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.control')
    if (error) return error
    const pod = await findVisiblePod(await getDemoDatabase(), scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    return HttpResponse.json(controlStateForPod(pod))
  }),

  http.post(`${API}/pods/:podId/control`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.control')
    if (error) return error
    const database = await getDemoDatabase()
    const pod = await findVisiblePod(database, scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    if (!pod.is_online) return errorResponse(409, 'E3011', 'Offline Demo pods cannot accept commands')
    const payload = await jsonBody(request)
    const field = controlDefinitions.flatMap(module => module.fields).find(item => item.attr_code === payload?.attr_code)
    if (!field) return errorResponse(422, 'E1001', 'Unsupported Demo control attribute')
    const numericValue = ['UNSIGNED8', 'REAL32'].includes(field.data_type) ? Number(payload.value) : payload.value
    if (field.data_type === 'BOOLEAN' && ![true, false, 0, 1, '0', '1'].includes(payload.value)) return errorResponse(422, 'E1001', 'Control value must be boolean')
    if (field.data_type !== 'BOOLEAN' && (!Number.isFinite(numericValue) || numericValue < field.min_val || numericValue > field.max_val)) return errorResponse(422, 'E1001', 'Control value is outside the supported range')
    const value = field.data_type === 'BOOLEAN' ? [true, 1, '1'].includes(payload.value) : numericValue
    const updatedPod = { ...pod, attr: { ...(pod.attr || {}), [field.attr_code]: value } }
    await database.put('pods', updatedPod)
    const uuid = newUuid('demo-control')
    const command = { uuid, command_id: uuid, message_id: uuid, pod_uuid: pod.uuid, command: 'write_attr', payload: { ...payload, value }, status: 'success', sent_at: new Date().toISOString() }
    await database.put('podCommands', command)
    publishDemoCommandAck(params.podId, command)
    return HttpResponse.json({ ...command, published: true })
  }),

  http.get(`${API}/pods/:podId/commands`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.control')
    if (error) return error
    const database = await getDemoDatabase()
    const pod = await findVisiblePod(database, scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    const commands = (await database.getAll('podCommands')).filter(item => item.pod_uuid === params.podId).reverse()
    return pageResponse(commands, request)
  }),

  http.post(`${API}/pods/:podId/status/command`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.control')
    if (error) return error
    const database = await getDemoDatabase()
    const pod = await findVisiblePod(database, scenario, params.podId)
    if (!pod) return errorResponse(404, 'E1004', 'Pod not found')
    if (!pod.is_online) return errorResponse(409, 'E3011', 'Offline Demo pods cannot accept commands')
    const payload = await jsonBody(request)
    if (!['restart'].includes(payload?.command)) return errorResponse(422, 'E1001', 'Unsupported Demo command')
    const uuid = newUuid('demo-command')
    const command = { uuid, command_id: uuid, pod_uuid: String(params.podId), command: payload.command, payload, status: 'success', sent_at: new Date().toISOString() }
    await database.put('podCommands', command)
    publishDemoCommandAck(params.podId, command)
    return HttpResponse.json(command)
  }),

  http.get(`${API}/pod-models`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const database = await getDemoDatabase()
    const modelIds = new Set(visibleItems(await database.getAll('pods'), scenario).map(item => Number(item.pod_model_id)))
    const items = (await database.getAll('podModels')).filter(item => modelIds.has(Number(item.id)))
    return pageResponse(items, request)
  }),

  http.get(`${API}/hosts`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'pod.view')
    if (error) return error
    const database = await getDemoDatabase()
    return pageResponse(visibleItems(await database.getAll('hosts'), scenario), request)
  }),

  http.get(`${API}/locations/search`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const url = new URL(request.url)
    const keyword = String(url.searchParams.get('keyword') || '').trim().toLowerCase()
    let items = visibleItems(await (await getDemoDatabase()).getAll('locations'), scenario)
    if (keyword) items = items.filter(item => `${item.location_name} ${item.street} ${item.building}`.toLowerCase().includes(keyword))
    for (const field of ['province', 'city']) {
      const value = url.searchParams.get(field)
      if (value) items = items.filter(item => String(item[field]) === value)
    }
    if (url.searchParams.has('is_active')) items = items.filter(item => String(item.is_active) === url.searchParams.get('is_active'))
    if (url.searchParams.has('has_gps')) items = items.filter(item => Boolean(item.gps_lat && item.gps_lng) === (url.searchParams.get('has_gps') === 'true'))
    return pageResponse(items, request)
  }),

  http.get(`${API}/locations/:locationId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'company.view')
    if (error) return error
    const location = await (await getDemoDatabase()).get('locations', String(params.locationId))
    if (!location || !scenario.visibleCompanies.includes(Number(location.company_id))) return errorResponse(404, 'E1004', 'Location not found')
    return HttpResponse.json(location)
  }),

  http.post(`${API}/locations`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'pod.receive')
    if (error) return error
    const payload = await jsonBody(request)
    const companyId = Number(payload?.com_id || payload?.company_id || scenario.companyId)
    if (!payload?.location_name?.trim()) return errorResponse(422, 'E1001', 'location_name is required')
    if (!writableCompany(scenario, companyId)) return errorResponse(403, 'E2003', 'Company is outside the writable Demo scope')
    if (!validCoordinates(payload) || !validTimezone(payload.timezone)) return errorResponse(422, 'E1001', 'Location coordinates or timezone are invalid')
    const database = await getDemoDatabase()
    const existing = await database.getAll('locations')
    if (existing.some(item => item.company_id === companyId && item.location_name.trim().toLowerCase() === payload.location_name.trim().toLowerCase())) return errorResponse(409, 'E3009', 'A location with this name already exists')
    const location = await locationFromPayload(database, payload, companyId, { id: Math.max(0, ...existing.map(item => Number(item.id) || 0)) + 1, uuid: newUuid('demo-location') })
    if (!location) return errorResponse(422, 'E1001', 'district_id is invalid')
    await database.put('locations', location)
    return HttpResponse.json(location, { status: 201 })
  }),

  http.put(`${API}/locations/:locationId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.receive')
    if (error) return error
    const database = await getDemoDatabase()
    const current = await database.get('locations', String(params.locationId))
    if (!current) return errorResponse(404, 'E1004', 'Location not found')
    if (!writableCompany(scenario, current.company_id)) return errorResponse(403, 'E2003', 'Location is outside the writable Demo scope')
    const payload = await jsonBody(request)
    if (!payload || (payload.location_name != null && !payload.location_name.trim())) return errorResponse(422, 'E1001', 'location_name cannot be blank')
    if (!validCoordinates(payload) || !validTimezone(payload.timezone)) return errorResponse(422, 'E1001', 'Location coordinates or timezone are invalid')
    const targetName = String(payload.location_name || current.location_name).trim().toLowerCase()
    if ((await database.getAll('locations')).some(item => item.uuid !== current.uuid && item.company_id === current.company_id && item.location_name.trim().toLowerCase() === targetName)) return errorResponse(409, 'E3009', 'A location with this name already exists')
    const resolvedLocation = await locationFromPayload(database, payload, current.company_id, current)
    if (!resolvedLocation) return errorResponse(422, 'E1001', 'district_id is invalid')
    const location = { ...resolvedLocation, uuid: current.uuid, updated_at: new Date().toISOString() }
    await database.put('locations', location)
    return HttpResponse.json(location)
  }),

  http.get(`${API}/pod-booking-configs/bookable-pods`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'meeting.view')
    if (error) return error
    const pods = visibleItems(await (await getDemoDatabase()).getAll('pods'), scenario)
    return HttpResponse.json(pods.map(pod => ({ pod_uuid: pod.uuid, pod_name: pod.pod_name || pod.name, booking_config_uuid: `demo-booking-config-${pod.uuid}`, owner_company_id: pod.owner_company_id, timezone: 'Asia/Shanghai', booking_capability: 'enabled' })))
  }),

  http.get(`${API}/pod-bookings`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'meeting.view')
    if (error) return error
    const url = new URL(request.url)
    let items = visibleItems(await (await getDemoDatabase()).getAll('bookings'), scenario)
    const from = Date.parse(url.searchParams.get('from') || '')
    const to = Date.parse(url.searchParams.get('to') || '')
    if (Number.isFinite(from)) items = items.filter(item => Date.parse(item.end_at) >= from)
    if (Number.isFinite(to)) items = items.filter(item => Date.parse(item.start_at) <= to)
    if (url.searchParams.get('pod_uuid')) items = items.filter(item => item.pod_uuid === url.searchParams.get('pod_uuid'))
    if (url.searchParams.get('status')) items = items.filter(item => item.status === url.searchParams.get('status'))
    return pageResponse(items.sort((a, b) => a.start_at.localeCompare(b.start_at)), request)
  }),

  http.post(`${API}/pod-bookings`, async ({ request }) => {
    const { scenario, error } = requirePermission(request, 'pod.receive')
    if (error) return error
    const payload = await jsonBody(request)
    if (!payload?.pod_uuid || !payload?.subject?.trim() || payload.subject.length > 255 || !validBookingWindow(payload) || !validTimezone(payload.timezone || 'Asia/Shanghai')) return errorResponse(422, 'E1001', 'Booking fields are incomplete or invalid')
    if (payload.participant_count != null && (!Number.isInteger(Number(payload.participant_count)) || Number(payload.participant_count) < 0 || Number(payload.participant_count) > 10000)) return errorResponse(422, 'E1001', 'participant_count is invalid')
    const database = await getDemoDatabase()
    const pod = await findVisiblePod(database, scenario, payload.pod_uuid)
    if (!pod || !writableCompany(scenario, pod.owner_company_id)) return errorResponse(403, 'E2003', 'Pod is outside the writable Demo scope')
    if (payload.owner_company_id != null && Number(payload.owner_company_id) !== Number(pod.owner_company_id)) return errorResponse(403, 'E2003', 'owner_company_id does not own the selected Pod')
    const bookings = await database.getAll('bookings')
    if (hasBookingConflict(bookings, payload)) return errorResponse(409, 'E3009', 'Booking conflicts with an existing reservation')
    const now = new Date().toISOString()
    const booking = { ...payload, uuid: newUuid('demo-booking'), pod_name: pod.pod_name || pod.name, owner_company_id: pod.owner_company_id, source_type: 'local', source_provider: null, integration_name: null, status: 'scheduled', lifecycle: 'upcoming', sensitivity: null, join_url: null, organizer_display_name: null, scene_key: payload.scene_key || null, automation_status: 'unconfigured', delivery_status: 'acked', delivery_attempt_count: 1, delivery_error_code: null, delivery_updated_at: now, revision: 1, created_at: now, updated_at: now }
    await database.put('bookings', booking)
    return HttpResponse.json(booking, { status: 201 })
  }),

  http.get(`${API}/pod-bookings/:bookingId/logs`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'meeting.view')
    if (error) return error
    const booking = await (await getDemoDatabase()).get('bookings', String(params.bookingId))
    if (!booking || !scenario.visibleCompanies.includes(Number(booking.owner_company_id))) return errorResponse(404, 'E1004', 'Booking not found')
    return HttpResponse.json(bookingLog(booking, booking.status === 'cancelled' ? 'cancelled' : 'created'))
  }),

  http.get(`${API}/pod-bookings/:bookingId/deliveries`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'meeting.view')
    if (error) return error
    const booking = await (await getDemoDatabase()).get('bookings', String(params.bookingId))
    if (!booking || !scenario.visibleCompanies.includes(Number(booking.owner_company_id))) return errorResponse(404, 'E1004', 'Booking not found')
    return HttpResponse.json([{ booking_revision: booking.revision, status: 'acked', attempt_count: 1, next_retry_at: null, pushed_at: booking.updated_at, acked_at: booking.updated_at, last_error_code: null, last_error_detail: null, created_at: booking.created_at, updated_at: booking.updated_at }])
  }),

  http.get(`${API}/pod-bookings/:bookingId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'meeting.view')
    if (error) return error
    const booking = await (await getDemoDatabase()).get('bookings', String(params.bookingId))
    if (!booking || !scenario.visibleCompanies.includes(Number(booking.owner_company_id))) return errorResponse(404, 'E1004', 'Booking not found')
    return HttpResponse.json(booking)
  }),

  http.patch(`${API}/pod-bookings/:bookingId`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.receive')
    if (error) return error
    const database = await getDemoDatabase()
    const booking = await database.get('bookings', String(params.bookingId))
    if (!booking) return errorResponse(404, 'E1004', 'Booking not found')
    if (!writableCompany(scenario, booking.owner_company_id)) return errorResponse(403, 'E2003', 'Booking is outside the writable Demo scope')
    const payload = await jsonBody(request)
    if (!payload) return errorResponse(422, 'E1001', 'Booking update body is required')
    if (Number(payload?.revision) !== booking.revision) return errorResponse(409, 'E3010', 'Booking revision is stale')
    const candidate = { ...booking, ...payload }
    if (!candidate.subject?.trim() || candidate.subject.length > 255 || !validBookingWindow(candidate) || !validTimezone(candidate.timezone)) return errorResponse(422, 'E1001', 'Booking fields are incomplete or invalid')
    if (candidate.participant_count != null && (!Number.isInteger(Number(candidate.participant_count)) || Number(candidate.participant_count) < 0 || Number(candidate.participant_count) > 10000)) return errorResponse(422, 'E1001', 'participant_count is invalid')
    if (hasBookingConflict(await database.getAll('bookings'), candidate, booking.uuid)) return errorResponse(409, 'E3009', 'Booking conflicts with an existing reservation')
    const updated = { ...booking, ...payload, uuid: booking.uuid, revision: booking.revision + 1, updated_at: new Date().toISOString() }
    await database.put('bookings', updated)
    return HttpResponse.json(updated)
  }),

  http.post(`${API}/pod-bookings/:bookingId/cancel`, async ({ request, params }) => {
    const { scenario, error } = requirePermission(request, 'pod.receive')
    if (error) return error
    const database = await getDemoDatabase()
    const booking = await database.get('bookings', String(params.bookingId))
    if (!booking) return errorResponse(404, 'E1004', 'Booking not found')
    if (!writableCompany(scenario, booking.owner_company_id)) return errorResponse(403, 'E2003', 'Booking is outside the writable Demo scope')
    if (booking.status === 'cancelled') return errorResponse(409, 'E3010', 'Booking is already cancelled')
    const updated = { ...booking, status: 'cancelled', lifecycle: 'cancelled', revision: booking.revision + 1, updated_at: new Date().toISOString() }
    await database.put('bookings', updated)
    return HttpResponse.json(updated)
  }),

  http.get(`${API}/districts/provinces`, async ({ request }) => {
    const { error } = requireScenario(request)
    if (error) return error
    const items = await (await getDemoDatabase()).get('districts', 'provinces')
    return HttpResponse.json({ total: items.length, items })
  }),

  http.get(`${API}/districts/cities`, async ({ request }) => {
    const { error } = requireScenario(request)
    if (error) return error
    const url = new URL(request.url)
    const provinceCode = url.searchParams.get('province_code')
    if (!/^\d{6}$/.test(provinceCode || '')) return errorResponse(422, 'E1001', 'province_code must be a 6-digit code')
    const items = await (await getDemoDatabase()).get('districts', 'cities')
    const filtered = items.filter(item => item.province_code === provinceCode)
    return HttpResponse.json({ total: filtered.length, items: filtered })
  }),

  http.get(`${API}/districts/districts`, async ({ request }) => {
    const { error } = requireScenario(request)
    if (error) return error
    const url = new URL(request.url)
    const cityCode = url.searchParams.get('city_code')
    if (!/^\d{6}$/.test(cityCode || '')) return errorResponse(422, 'E1001', 'city_code must be a 6-digit code')
    const items = await (await getDemoDatabase()).get('districts', 'districts')
    const filtered = items.filter(item => item.city_code === cityCode)
    return HttpResponse.json({ total: filtered.length, items: filtered })
  }),

  // An explicit final handler is required: MSW's custom onUnhandledRequest
  // reporter logs errors but does not guarantee a network-level rejection.
  http.all(API, () => HttpResponse.error()),
  http.all(`${API}/*`, () => HttpResponse.error())
]
