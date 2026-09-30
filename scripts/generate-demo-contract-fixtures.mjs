import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixtureRoot = path.join(projectRoot, 'tests/fixtures/demo')
const contract = JSON.parse(await readFile(path.join(projectRoot, 'config/demo-contract.json'), 'utf8'))
const seedSource = await readFile(path.join(projectRoot, 'src/demo/seeds/index.js'), 'utf8')
const seedModule = await import(`data:text/javascript;base64,${Buffer.from(seedSource).toString('base64')}`)
const seed = seedModule.createDemoSeed(new Date(contract.fixtureReferenceTime))
const generatedAt = contract.fixtureReferenceTime

const page = (items, pageSize = 20) => ({ items, total: items.length, page: 1, page_size: pageSize })
const company = id => seed.companies.find(item => item.id === id)
const pod = uuid => seed.pods.find(item => item.uuid === uuid)
const booking = uuid => seed.bookings.find(item => item.uuid === uuid)
const dashboardSummary = {
  stats: { totalDevices: 2, onlineDevices: 1, offlineDevices: 1, onlineRate: 50, podTotal: 2, podInUse: 0, podUsageRate: 0, fileTotal: 4, fileSize: '16 MB', alertsToday: 1, alertsWeek: 2, alertsPending: 1, fileDownloads: 8, filePlays: 20, fileNew: 1 },
  deviceStatusData: { online: 1, offline: 1, maintenance: 0, inactive: 0 },
  onlineRateData: [50, 45, 52, 48, 53, 51, 50],
  onlineRateTrend: [50, 45, 52, 48, 53, 51, 50].map((value, index) => ({ label: `D${index + 1}`, value })),
  podDurationData: { short: 4, medium: 6, long: 2, total: 12 },
  podDurationPercent: { short: 33, medium: 50, long: 17 },
  podAvgDuration: 48,
  podLongestDuration: 132,
  podUsageTrend: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((label, index) => ({ label, usage_count: 2 + index, avg_duration_minutes: 42 + index * 2 })),
  alertTypes: { offline: 1, communication: 0, other: 0 },
  alertTrend: [1, 0, 1, 0, 1, 0, 1].map((count, index) => ({ label: `D${index + 1}`, count })),
  tableData: Array.from({ length: 7 }, (_, index) => {
    const date = `2026-09-${String(11 + index).padStart(2, '0')}`
    const onlineDevices = [1, 0, 1, 1, 2, 1, 1][index]
    return {
      date,
      date_label: date,
      online_devices: onlineDevices,
      total_devices: 2,
      online_rate: Math.round(onlineDevices / 2 * 100),
      pod_usage: onlineDevices * 2 + index % 3,
      avg_usage_time: 38 + index * 3,
      file_downloads: 4 + index,
      alerts_count: 2 - onlineDevices + (index % 3 === 2 ? 1 : 0)
    }
  })
}
const chartRequest = {
  queries: [{ request_id: 'device_online_rate', source_key: 'device_status', metric_key: 'online_rate', aggregation: 'avg', interval: '1day', start_time: '2026-09-10T00:00:00.000Z', end_time: generatedAt, timezone: 'Asia/Shanghai', resource_uuids: [] }]
}
const chartResponse = {
  items: [{ request_id: 'device_online_rate', series: [{ name: 'online_rate', points: [50, 45, 52, 48, 53, 51, 50].map((value, index) => ({ timestamp: `D${index + 1}`, value })) }], statistics: {}, cache: { hit: false, source: 'demo' }, generated_at: generatedAt, data_version: 1, status: 'ok', error: null }]
}
const dashboardModules = [
  'stats_preview',
  'device_online_rate',
  'device_status_distribution',
  'pod_usage_distribution',
  'pod_usage_trend',
  'file_usage_stats',
  'alert_stats',
  'alert_trend',
  'detailed_stats'
].map((id, index) => ({ id, enabled: true, position: index + 1 }))
const dashboardPanels = [
  { id: 'stats_preview', title: 'Overview', chart: 'stat', source: 'dashboard.summary', grid: { x: 0, y: 0, w: 12, h: 2 } },
  { id: 'device_online_rate', title: 'Online rate', chart: 'line', source: 'device_status.online_rate', grid: { x: 0, y: 2, w: 8, h: 4 } },
  { id: 'device_status_distribution', title: 'Device status', chart: 'pie', source: 'device_status.status_distribution', grid: { x: 8, y: 2, w: 4, h: 4 } },
  { id: 'pod_usage_distribution', title: 'Usage duration', chart: 'pie', source: 'pod_usage.duration_distribution', grid: { x: 0, y: 6, w: 6, h: 4 } },
  { id: 'pod_usage_trend', title: 'Usage trend', chart: 'bar', source: 'pod_usage.usage_count', grid: { x: 6, y: 6, w: 6, h: 4 } },
  { id: 'file_usage_stats', title: 'File activity', chart: 'bar', source: 'file_activity.usage_count', grid: { x: 0, y: 10, w: 6, h: 4 } },
  { id: 'alert_stats', title: 'Alert types', chart: 'pie', source: 'alerts.type_distribution', grid: { x: 6, y: 10, w: 6, h: 4 } },
  { id: 'alert_trend', title: 'Alert trend', chart: 'line', source: 'alerts.alert_count', grid: { x: 0, y: 14, w: 12, h: 4 } },
  { id: 'detailed_stats', title: 'Daily details', chart: 'table', source: 'dashboard_summary.daily_detail', grid: { x: 0, y: 18, w: 12, h: 5 } }
]
const controlModules = [{
  title: '舱内照明', control_category: 'light', device_type: 'node', device_model_uuid: 'demo-control-light', quantity: 1, bound: true,
  instances: [{ device_uuid: 'demo-pod-office-01-light', can_node_id: 2, node_pos: '顶部', online: true }],
  fields: [
    { attr_code: 'light_on', attr_name: '照明开关', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3001', co_sub_index: '0x01', default_value: true, display_order: 1, current_value: true, current_values: { 'demo-pod-office-01-light': true }, shadows: {} },
    { attr_code: 'brightness', attr_name: '照明亮度', data_type: 'UNSIGNED8', access_type: 'RW', web_editable: true, widget: 'slider', min_val: 0, max_val: 100, step: 5, unit: '%', co_index: '0x3001', co_sub_index: '0x02', default_value: 72, display_order: 2, current_value: 72, current_values: { 'demo-pod-office-01-light': 72 }, shadows: {} }
  ]
}, {
  title: '新风系统', control_category: 'fresh_air', device_type: 'node', device_model_uuid: 'demo-control-fresh-air', quantity: 1, bound: true,
  instances: [{ device_uuid: 'demo-pod-office-01-fresh-air', can_node_id: 3, node_pos: '后舱', online: true }],
  fields: [
    { attr_code: 'fan_on', attr_name: '新风开关', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3010', co_sub_index: '0x01', default_value: true, display_order: 1, current_value: true, current_values: { 'demo-pod-office-01-fresh-air': true }, shadows: {} },
    { attr_code: 'fan_speed', attr_name: '风速档位', data_type: 'UNSIGNED8', access_type: 'RW', web_editable: true, widget: 'stepper', min_val: 0, max_val: 5, step: 1, co_index: '0x3010', co_sub_index: '0x02', default_value: 3, display_order: 2, current_value: 3, current_values: { 'demo-pod-office-01-fresh-air': 3 }, shadows: {} }
  ]
}, {
  title: '环境调节', control_category: 'ac', device_type: 'node', device_model_uuid: 'demo-control-climate', quantity: 1, bound: true,
  instances: [{ device_uuid: 'demo-pod-office-01-climate', can_node_id: 4, node_pos: '控制箱', online: true }],
  fields: [
    { attr_code: 'target_temperature', attr_name: '目标温度', data_type: 'REAL32', access_type: 'RW', web_editable: true, widget: 'slider', min_val: 18, max_val: 30, step: 0.5, unit: '°C', co_index: '0x3020', co_sub_index: '0x01', default_value: 23.5, display_order: 1, current_value: 23.5, current_values: { 'demo-pod-office-01-climate': 23.5 }, shadows: {} },
    { attr_code: 'quiet_mode', attr_name: '静音模式', data_type: 'BOOLEAN', access_type: 'RW', web_editable: true, widget: 'switch', co_index: '0x3020', co_sub_index: '0x02', default_value: true, display_order: 2, current_value: true, current_values: { 'demo-pod-office-01-climate': true }, shadows: {} }
  ]
}]
const controlState = {
  is_online: true,
  last_seen: pod('demo-pod-office-01').last_seen,
  items: controlModules.flatMap(module => module.fields.map(field => ({
    target_uuid: module.instances[0].device_uuid,
    nid: module.instances[0].can_node_id,
    co_index: field.co_index,
    co_sub_index: field.co_sub_index,
    value: field.current_value,
    shadow: { state: 'reported', desired_value: field.current_value, reported_value: field.current_value }
  })))
}
const dashboardConfigForCompany = item => ({
  id: item.id,
  company_id: item.id,
  company_name: item.company_name,
  config_json: {
    branding: { company_name: item.company_name, short_name: item.short_name, slogan: item.slogan || 'PODSC Demo' },
    panels: dashboardPanels
  },
  html_content: null,
  css_content: null,
  js_content: null,
  is_active: true,
  created_at: item.created_at,
  updated_at: item.updated_at
})
const officeBooking = booking('demo-booking-office-01')
const createdBooking = { ...officeBooking, uuid: 'demo-booking-created', subject: 'Demo contract review', revision: 1 }
const updatedBooking = { ...createdBooking, subject: 'Updated demo contract review', revision: 2, updated_at: generatedAt }

const fixtures = new Map([
  ['public/public-login-config.response.json', { company: { company_name: 'PODSC Demo', short_name: 'PODSC Demo', domain: 'https://demo.podsc.com', slogan: 'Explore PODSC safely' }, branding: { company_name: 'PODSC Demo', logo_url: null }, templates: [] }],
  ...seed.scenarios.map(item => [`session/current-${item.id}.json`, { access_token: `demo-session:${item.id}:fixture`, user: seed.users.find(user => user.uuid === `demo-user-${item.id}`) }]),
  ...seed.scenarios.map(item => [`users/current-${item.id}.response.json`, seed.users.find(user => user.uuid === `demo-user-${item.id}`)]),
  ['dashboard/summary.response.json', dashboardSummary],
  ['dashboard/effective-config.response.json', { config_version: 1, timezone: 'Asia/Shanghai', source: 'demo-seed', modules: dashboardModules }],
  ['dashboard/chart-query.request.json', chartRequest],
  ['dashboard/chart-query.response.json', chartResponse],
  ['dashboard-configs/list-page.response.json', page(seed.companies.map(dashboardConfigForCompany))],
  ['dashboard-configs/detail.response.json', dashboardConfigForCompany(company(100))],
  ['companies/list-page.response.json', page(seed.companies.filter(item => [300].includes(item.id)))],
  ['companies/detail-mf.response.json', company(100)],
  ['companies/detail-cp.response.json', company(200)],
  ['companies/detail-eu.response.json', company(300)],
  ['locations/list-page.response.json', page(seed.locations.filter(item => item.company_id === 300))],
  ['locations/detail.response.json', seed.locations[0]],
  ['locations/create.request.json', { location_name: '演示新增地点', district_id: 3, street: '演示路 1 号', timezone: 'Asia/Shanghai', remark: '合成测试数据' }],
  ['locations/create.response.json', { ...seed.locations[0], id: 3, uuid: 'demo-location-created', location_name: '演示新增地点', street: '演示路 1 号', remark: '合成测试数据' }],
  ['locations/update.request.json', { location_name: '演示更新地点', is_active: true }],
  ['locations/update.response.json', { ...seed.locations[0], location_name: '演示更新地点', updated_at: generatedAt }],
  ['districts/provinces.response.json', { total: seed.districts.provinces.length, items: seed.districts.provinces }],
  ['districts/cities.response.json', { total: seed.districts.cities.length, items: seed.districts.cities }],
  ['districts/districts.response.json', { total: seed.districts.districts.length, items: seed.districts.districts }],
  ['pods/list-page.response.json', { ...page(seed.pods.filter(item => item.company_id === 300)), limit: 20 }],
  ['pods/detail.response.json', { ...pod('demo-pod-office-01'), resource_permissions: [], current_topology_version: 1 }],
  ['pods/status.response.json', { status: { temperature: 23.5, humidity: 48, noise: 36, air_quality: 'good' } }],
  ['pods/records-page.response.json', { records: [{ uuid: 'demo-pod-office-01-record-0', recorded_at: generatedAt, event_type: 'telemetry', record_data: { temperature: 23.5, humidity: 48, noise: 36 } }], total: 1, page: 1, page_size: 10 }],
  ['pods/control-schema.response.json', { modules: controlModules, actions: [{ key: 'restart' }] }],
  ['pods/control-state.response.json', controlState],
  ['pods/control-write.request.json', { attr_code: 'brightness', value: 80, target_uuid: 'demo-pod-office-01-light' }],
  ['pods/control-write.response.json', { uuid: 'demo-control-fixture', command_id: 'demo-control-fixture', message_id: 'demo-control-fixture', pod_uuid: 'demo-pod-office-01', command: 'write_attr', payload: { attr_code: 'brightness', value: 80, target_uuid: 'demo-pod-office-01-light' }, status: 'success', sent_at: generatedAt, published: true }],
  ['pods/command.request.json', { command: 'restart' }],
  ['pods/command.response.json', { uuid: 'demo-command-fixture', command_id: 'demo-command-fixture', pod_uuid: 'demo-pod-office-01', command: 'restart', payload: { command: 'restart' }, status: 'success', sent_at: generatedAt }],
  ['pod-models/options-page.response.json', page(seed.podModels.filter(item => seed.pods.some(podItem => podItem.company_id === 300 && podItem.pod_model_id === item.id)), 200)],
  ['hosts/options-page.response.json', page(seed.hosts.filter(item => item.company_id === 300), 200)],
  ['bookings/list-page.response.json', page(seed.bookings.filter(item => item.owner_company_id === 300))],
  ['bookings/bookable-pods.response.json', seed.pods.filter(item => item.company_id === 300).map(item => ({ pod_uuid: item.uuid, pod_name: item.pod_name, booking_config_uuid: `demo-booking-config-${item.uuid}`, owner_company_id: item.owner_company_id, timezone: 'Asia/Shanghai', booking_capability: 'enabled' }))],
  ['bookings/create.request.json', { pod_uuid: 'demo-pod-office-01', owner_company_id: 300, subject: createdBooking.subject, start_at: createdBooking.start_at, end_at: createdBooking.end_at, timezone: 'Asia/Shanghai', participant_count: 4 }],
  ['bookings/create.response.json', createdBooking],
  ['bookings/detail.response.json', officeBooking],
  ['bookings/update.request.json', { revision: 1, subject: updatedBooking.subject }],
  ['bookings/update.response.json', updatedBooking],
  ['bookings/cancel.response.json', { ...officeBooking, status: 'cancelled', lifecycle: 'cancelled', revision: 2, updated_at: generatedAt }],
  ['bookings/logs.response.json', [{ id: 1, event_type: 'created', source_type: 'local', actor_type: 'user', actor_display_name: 'Demo User', actor_external_id: null, before: null, after: { subject: officeBooking.subject, status: officeBooking.status, revision: 1 }, reason: null, created_at: officeBooking.created_at }]],
  ['bookings/deliveries.response.json', [{ booking_revision: 1, status: 'acked', attempt_count: 1, next_retry_at: null, pushed_at: officeBooking.updated_at, acked_at: officeBooking.updated_at, last_error_code: null, last_error_detail: null, created_at: officeBooking.created_at, updated_at: officeBooking.updated_at }]],
  ['errors/unauthorized.response.json', { code: 'E2001', message: 'Demo session is missing or invalid' }],
  ['errors/forbidden.response.json', { code: 'E2003', message: 'Demo scenario does not grant this capability' }],
  ['errors/not-found.response.json', { code: 'E1004', message: 'Demo resource was not found' }],
  ['errors/validation.response.json', { code: 'E1001', message: 'Demo request validation failed' }],
  ['errors/conflict.response.json', { code: 'E3009', message: 'Demo request conflicts with current state' }]
])

const textFor = value => `${JSON.stringify(value, null, 2)}\n`
const hashes = Object.fromEntries([...fixtures].map(([name, value]) => [name, createHash('sha256').update(textFor(value)).digest('hex')]))
const manifest = {
  version: contract.version,
  owner: contract.owner,
  contractSource: `iot_server_backend@${contract.backendCommit}`,
  fixtureReferenceTime: contract.fixtureReferenceTime,
  schemaVersion: seedModule.DEMO_SCHEMA_VERSION,
  seedVersion: seedModule.DEMO_SEED_VERSION,
  fixtures: hashes
}
fixtures.set('manifest.json', manifest)

const checkOnly = process.argv.includes('--check')
const failures = []
for (const [name, value] of fixtures) {
  const filename = path.join(fixtureRoot, name)
  const expected = textFor(value)
  if (checkOnly) {
    const actual = await readFile(filename, 'utf8').catch(() => null)
    if (actual !== expected) failures.push(name)
  } else {
    await mkdir(path.dirname(filename), { recursive: true })
    await writeFile(filename, expected, 'utf8')
  }
}

if (failures.length) {
  process.stderr.write(`Demo contract fixtures are missing or stale:\n${failures.map(name => `- ${name}`).join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`${checkOnly ? 'Verified' : 'Generated'} ${fixtures.size - 1} Demo contract fixtures and manifest.\n`)
}
