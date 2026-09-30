export const DEMO_SCHEMA_VERSION = 2
export const DEMO_SEED_VERSION = 5

const BASE_PERMISSIONS = Object.freeze(['dashboard.view', 'company.view', 'pod.view', 'meeting.view'])

export const DEMO_COMPANIES = Object.freeze([
  { id: 100, uuid: 'demo-company-mf', company_code: 'DEMO-MF', company_name: '演示制造商', short_name: '演示制造商', name: '演示制造商', company_type: 'MF', parent_com_id: null, created_by_company_id: null, logo_file_id: null, logo_url: null, location_id: null, country: 'CN', domain: null, slogan: '智能静音空间演示', primary_color: null, secondary_color: null, accent_color: null, contact_person: null, contact_email: 'manufacturer@demo.podsc.com', contact_phone: null, address: null, pod_usage: null, status: 'active', is_platform: false, is_active: true, is_pod_manufacturer: true, is_channel_partner: false, is_brand: false, is_enduser: false, is_household: false, is_school: false, created_by: null, updated_by: null, created_at: '2026-09-01T00:00:00.000Z', updated_at: '2026-09-01T00:00:00.000Z' },
  { id: 200, uuid: 'demo-company-cp', company_code: 'DEMO-CP', company_name: '演示渠道伙伴', short_name: '演示渠道伙伴', name: '演示渠道伙伴', company_type: 'CP', parent_com_id: 100, created_by_company_id: 100, logo_file_id: null, logo_url: null, location_id: null, country: 'CN', domain: null, slogan: null, primary_color: null, secondary_color: null, accent_color: null, contact_person: null, contact_email: 'channel@demo.podsc.com', contact_phone: null, address: null, pod_usage: null, status: 'active', is_platform: false, is_active: true, is_pod_manufacturer: false, is_channel_partner: true, is_brand: false, is_enduser: false, is_household: false, is_school: false, created_by: null, updated_by: null, created_at: '2026-09-01T00:10:00.000Z', updated_at: '2026-09-01T00:10:00.000Z' },
  { id: 300, uuid: 'demo-company-office', company_code: 'DEMO-OFFICE', company_name: '演示办公客户', short_name: '演示办公客户', name: '演示办公客户', company_type: 'EU', parent_com_id: 200, created_by_company_id: 200, logo_file_id: null, logo_url: null, location_id: 1, country: 'CN', domain: null, slogan: null, primary_color: null, secondary_color: null, accent_color: null, contact_person: null, contact_email: 'office@demo.podsc.com', contact_phone: null, address: '上海市浦东新区世纪大道 100 号', pod_usage: 'internal', status: 'active', is_platform: false, is_active: true, is_pod_manufacturer: false, is_channel_partner: false, is_brand: false, is_enduser: true, is_household: false, is_school: false, created_by: null, updated_by: null, created_at: '2026-09-01T00:20:00.000Z', updated_at: '2026-09-01T00:20:00.000Z' },
  { id: 400, uuid: 'demo-company-rental', company_code: 'DEMO-RENTAL', company_name: '演示租赁客户', short_name: '演示租赁客户', name: '演示租赁客户', company_type: 'EU', parent_com_id: 200, created_by_company_id: 200, logo_file_id: null, logo_url: null, location_id: 2, country: 'CN', domain: null, slogan: null, primary_color: null, secondary_color: null, accent_color: null, contact_person: null, contact_email: 'rental@demo.podsc.com', contact_phone: null, address: '上海市浦东新区张江路 88 号', pod_usage: 'rental', status: 'active', is_platform: false, is_active: true, is_pod_manufacturer: false, is_channel_partner: false, is_brand: false, is_enduser: true, is_household: false, is_school: false, created_by: null, updated_by: null, created_at: '2026-09-01T00:30:00.000Z', updated_at: '2026-09-01T00:30:00.000Z' }
])

const scenario = (id, companyId, companyType, labelKey, descriptionKey, options = {}) => ({
  id,
  labelKey,
  descriptionKey,
  companyId,
  companyType,
  podUsage: options.podUsage || null,
  visibleCompanies: options.visibleCompanies || [companyId],
  writableCompanies: options.writableCompanies || [],
  permissions: [...BASE_PERMISSIONS, ...(options.permissions || [])]
})

export const DEMO_SCENARIOS = Object.freeze([
  scenario('manufacturer', 100, 'MF', 'demo.scenarios.manufacturer.title', 'demo.scenarios.manufacturer.description', { visibleCompanies: [100, 200, 300, 400], permissions: ['pod.control'] }),
  scenario('channel', 200, 'CP', 'demo.scenarios.channel.title', 'demo.scenarios.channel.description', { visibleCompanies: [200, 300, 400] }),
  scenario('office', 300, 'EU', 'demo.scenarios.office.title', 'demo.scenarios.office.description', { podUsage: 'internal', writableCompanies: [300], permissions: ['pod.receive'] }),
  scenario('rental', 400, 'EU', 'demo.scenarios.rental.title', 'demo.scenarios.rental.description', { podUsage: 'rental', writableCompanies: [400], permissions: ['pod.receive'] })
])

export const DEMO_LOCATIONS = Object.freeze([
  { id: 1, uuid: 'demo-location-office', com_id: 300, company_id: 300, company_name: '演示办公客户', location_name: '上海办公室', district_id: 3, country_code: 'CN', country: '中国', country_name: '中国', province: '310000', province_code: '310000', province_name: '上海市', city: '310100', city_code: '310100', city_name: '上海市', district: '310115', district_code: '310115', district_name: '浦东新区', street: '世纪大道 100 号', building: 'A 座', floor: '8 层', room: null, address: '世纪大道 100 号 A 座 8 层', full_address: '上海市浦东新区世纪大道 100 号 A 座 8 层', timezone: 'Asia/Shanghai', gps_lat: 31.2304, gps_lng: 121.4737, gps: { lat: 31.2304, lng: 121.4737 }, gps_source: 'manual', gps_verified_at: null, gps_verified_by: null, pods: [], pod_count: 2, is_active: true, created_at: '2026-09-01T01:00:00.000Z', remark: '办公场景演示地点' },
  { id: 2, uuid: 'demo-location-rental', com_id: 400, company_id: 400, company_name: '演示租赁客户', location_name: '共享空间旗舰店', district_id: 3, country_code: 'CN', country: '中国', country_name: '中国', province: '310000', province_code: '310000', province_name: '上海市', city: '310100', city_code: '310100', city_name: '上海市', district: '310115', district_code: '310115', district_name: '浦东新区', street: '张江路 88 号', building: null, floor: '1 层', room: null, address: '张江路 88 号 1 层', full_address: '上海市浦东新区张江路 88 号 1 层', timezone: 'Asia/Shanghai', gps_lat: 31.2011, gps_lng: 121.5903, gps: { lat: 31.2011, lng: 121.5903 }, gps_source: 'manual', gps_verified_at: null, gps_verified_by: null, pods: [], pod_count: 1, is_active: true, created_at: '2026-09-02T01:00:00.000Z', remark: '租赁场景演示地点' }
])

const podStatus = isOnline => ({ is_online: isOnline, state: isOnline ? 'idle' : 'offline' })

export const DEMO_PODS = Object.freeze([
  { id: 1, uuid: 'demo-pod-office-01', name: '办公静音舱 A01', pod_name: '办公静音舱 A01', serial_number: 'DEMO-OFFICE-001', company_id: 300, owner_company_id: 300, company_name: '演示办公客户', manufacturer_id: 100, manufacturer_name: '演示制造商', pod_model_id: 1, pod_model_name: 'Solo Pro', pod_model: { code: 'SP-100', name: 'Solo Pro', description: '单人办公静音舱' }, model_name: 'Solo Pro', model_code: 'SP-100', host_id: 1, host_uuid: 'demo-host-office-01', host_name: 'Office Host 01', host: { uuid: 'demo-host-office-01', mac_address: '02:00:00:00:00:01', model_code: 'HN-100', model_name: 'Office Host 01' }, location_uuid: 'demo-location-office', location_name: '上海办公室', location: DEMO_LOCATIONS[0], is_online: true, is_active: true, status: { ...podStatus(true), last_seen_at: '2026-09-17T08:20:00.000Z', current_status: { temperature: 23.5, humidity: 48, noise_level: 36 }, status_text: 'idle' }, last_seen: '2026-09-17T08:20:00.000Z', lifecycle_state: 'active', record_source: 'enrollment', nodes: [], files: [], node_count: 0, file_count: 0, resource_permissions: [], current_topology_version: 1, attr: {}, created_at: '2026-09-01T02:00:00.000Z', remark: '演示办公舱' },
  { id: 2, uuid: 'demo-pod-office-02', name: '办公静音舱 A02', pod_name: '办公静音舱 A02', serial_number: 'DEMO-OFFICE-002', company_id: 300, owner_company_id: 300, company_name: '演示办公客户', manufacturer_id: 100, manufacturer_name: '演示制造商', pod_model_id: 1, pod_model_name: 'Solo Pro', pod_model: { code: 'SP-100', name: 'Solo Pro', description: '单人办公静音舱' }, model_name: 'Solo Pro', model_code: 'SP-100', host_id: 2, host_uuid: 'demo-host-office-02', host_name: 'Office Host 02', host: { uuid: 'demo-host-office-02', mac_address: '02:00:00:00:00:02', model_code: 'HN-100', model_name: 'Office Host 02' }, location_uuid: 'demo-location-office', location_name: '上海办公室', location: DEMO_LOCATIONS[0], is_online: false, is_active: true, status: { ...podStatus(false), last_seen_at: '2026-09-17T07:45:00.000Z', current_status: null, status_text: 'offline' }, last_seen: '2026-09-17T07:45:00.000Z', lifecycle_state: 'active', record_source: 'enrollment', nodes: [], files: [], node_count: 0, file_count: 0, resource_permissions: [], current_topology_version: 1, attr: {}, created_at: '2026-09-01T02:10:00.000Z', remark: '演示离线舱' },
  { id: 3, uuid: 'demo-pod-rental-01', name: '共享静音舱 R01', pod_name: '共享静音舱 R01', serial_number: 'DEMO-RENTAL-001', company_id: 400, owner_company_id: 400, company_name: '演示租赁客户', manufacturer_id: 100, manufacturer_name: '演示制造商', pod_model_id: 2, pod_model_name: 'Meet Duo', pod_model: { code: 'MD-200', name: 'Meet Duo', description: '双人共享静音舱' }, model_name: 'Meet Duo', model_code: 'MD-200', host_id: 3, host_uuid: 'demo-host-rental-01', host_name: 'Rental Host 01', host: { uuid: 'demo-host-rental-01', mac_address: '02:00:00:00:00:03', model_code: 'HN-200', model_name: 'Rental Host 01' }, location_uuid: 'demo-location-rental', location_name: '共享空间旗舰店', location: DEMO_LOCATIONS[1], is_online: true, is_active: true, status: { ...podStatus(true), last_seen_at: '2026-09-17T08:21:00.000Z', current_status: { temperature: 24.1, humidity: 51, noise_level: 39 }, status_text: 'in_use' }, last_seen: '2026-09-17T08:21:00.000Z', lifecycle_state: 'active', record_source: 'enrollment', nodes: [], files: [], node_count: 0, file_count: 0, resource_permissions: [], current_topology_version: 1, attr: {}, created_at: '2026-09-02T02:00:00.000Z', remark: '演示租赁舱' }
])

export const DEMO_HOSTS = Object.freeze([
  { id: 1, uuid: 'demo-host-office-01', name: 'Office Host 01', serial_no: 'DEMO-HOST-001', serial_number: 'DEMO-HOST-001', company_id: 300, pod_com_id: 300, manufacturer_id: 100, manufacturer_name: '演示制造商', hw_ver: '1.0', sw_ver: '1.4.0', product_code: 'HN-100', vendor_id: 'DEMO', mac_address: '02:00:00:00:00:01', hn_model_id: 1, hn_model_code: 'HN-100', hn_model_name: 'Office Host', od_release_id: null, has_new_firmware: false, is_active: true, ai_voice_enabled: false, heartbeat_interval: 60, mqtt_upload_interval: 30, status: 'online', last_seen: '2026-09-17T08:20:00.000Z', is_online: true, presence: { is_online: true, asserted_online: true, last_seen_at: '2026-09-17T08:20:00.000Z', observed_at: '2026-09-17T08:20:00.000Z', timed_out: false }, shipped_at: '2026-08-25T00:00:00.000Z', remark: null, topology_pending: false, record_source: 'enrollment', created_at: '2026-08-20T00:00:00.000Z', updated_at: '2026-09-17T08:20:00.000Z' },
  { id: 2, uuid: 'demo-host-office-02', name: 'Office Host 02', serial_no: 'DEMO-HOST-002', serial_number: 'DEMO-HOST-002', company_id: 300, pod_com_id: 300, manufacturer_id: 100, manufacturer_name: '演示制造商', hw_ver: '1.0', sw_ver: '1.4.0', product_code: 'HN-100', vendor_id: 'DEMO', mac_address: '02:00:00:00:00:02', hn_model_id: 1, hn_model_code: 'HN-100', hn_model_name: 'Office Host', od_release_id: null, has_new_firmware: false, is_active: true, ai_voice_enabled: false, heartbeat_interval: 60, mqtt_upload_interval: 30, status: 'offline', last_seen: '2026-09-17T07:45:00.000Z', is_online: false, presence: { is_online: false, asserted_online: false, last_seen_at: '2026-09-17T07:45:00.000Z', observed_at: '2026-09-17T07:45:00.000Z', timed_out: true }, shipped_at: '2026-08-25T00:00:00.000Z', remark: null, topology_pending: false, record_source: 'enrollment', created_at: '2026-08-20T00:10:00.000Z', updated_at: '2026-09-17T07:45:00.000Z' },
  { id: 3, uuid: 'demo-host-rental-01', name: 'Rental Host 01', serial_no: 'DEMO-HOST-003', serial_number: 'DEMO-HOST-003', company_id: 400, pod_com_id: 400, manufacturer_id: 100, manufacturer_name: '演示制造商', hw_ver: '2.0', sw_ver: '1.4.0', product_code: 'HN-200', vendor_id: 'DEMO', mac_address: '02:00:00:00:00:03', hn_model_id: 2, hn_model_code: 'HN-200', hn_model_name: 'Rental Host', od_release_id: null, has_new_firmware: false, is_active: true, ai_voice_enabled: false, heartbeat_interval: 60, mqtt_upload_interval: 30, status: 'online', last_seen: '2026-09-17T08:21:00.000Z', is_online: true, presence: { is_online: true, asserted_online: true, last_seen_at: '2026-09-17T08:21:00.000Z', observed_at: '2026-09-17T08:21:00.000Z', timed_out: false }, shipped_at: '2026-08-26T00:00:00.000Z', remark: null, topology_pending: false, record_source: 'enrollment', created_at: '2026-08-21T00:00:00.000Z', updated_at: '2026-09-17T08:21:00.000Z' }
])

export const DEMO_POD_MODELS = Object.freeze([
  { id: 1, uuid: 'demo-model-solo-pro', company_id: 100, owner_company_id: 100, pod_com_id: 100, name: 'Solo Pro', model: 'SP-100', code: 'SP-100', avatar: null, description: '单人办公静音舱', url: null, bound_host_id: null, bound_node_ids: [], attr_schema: {}, attr: {}, attributes: [], devices: [], is_active: true, created_at: '2026-08-01T00:00:00.000Z' },
  { id: 2, uuid: 'demo-model-meet-duo', company_id: 100, owner_company_id: 100, pod_com_id: 100, name: 'Meet Duo', model: 'MD-200', code: 'MD-200', avatar: null, description: '双人共享静音舱', url: null, bound_host_id: null, bound_node_ids: [], attr_schema: {}, attr: {}, attributes: [], devices: [], is_active: true, created_at: '2026-08-01T00:10:00.000Z' }
])

export const DEMO_DISTRICTS = Object.freeze({
  provinces: [{ id: 1, code: '310000', name: '上海市', parent_id: null, level: 'province', parent_code: null, full_path: '上海市', gps_lat: 31.2304, gps_lng: 121.4737, timezone: 'Asia/Shanghai' }],
  cities: [{ id: 2, code: '310100', province_code: '310000', name: '上海市', parent_id: 1, level: 'city', parent_code: '310000', full_path: '上海市/上海市', gps_lat: 31.2304, gps_lng: 121.4737, timezone: 'Asia/Shanghai' }],
  districts: [{ id: 3, code: '310115', city_code: '310100', name: '浦东新区', parent_id: 2, level: 'district', parent_code: '310100', full_path: '上海市/上海市/浦东新区', gps_lat: 31.2304, gps_lng: 121.5447, timezone: 'Asia/Shanghai' }]
})

export function createDemoUser (scenarioConfig) {
  const company = DEMO_COMPANIES.find(item => item.id === scenarioConfig.companyId)
  return {
    id: scenarioConfig.companyId,
    user_id: `demo-user-${scenarioConfig.id}`,
    uuid: `demo-user-${scenarioConfig.id}`,
    email: `${scenarioConfig.id}@demo.podsc.com`,
    phone: null,
    display_name: 'Demo User',
    role: 'admin',
    company_id: scenarioConfig.companyId,
    company_name: company?.name || 'PODSC Demo',
    company,
    company_type: scenarioConfig.companyType,
    pod_usage: scenarioConfig.podUsage,
    permissions: [...scenarioConfig.permissions],
    allowed_companies: [...scenarioConfig.visibleCompanies],
    visible_companies: [...scenarioConfig.visibleCompanies],
    writable_companies: [...scenarioConfig.writableCompanies],
    is_active: true,
    invitation_pending: false,
    must_change_password: false,
    password_changed_at: null,
    last_login_at: '2026-09-17T08:00:00.000Z',
    last_login_ip: '192.0.2.10',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-17T08:00:00.000Z',
    locale: 'zh-CN',
    preferred_language: 'zh-CN',
    timezone: 'Asia/Shanghai',
    membership_id: scenarioConfig.companyId,
    authorization_version: 1
  }
}

const addHours = (date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()

const createBookings = (referenceDate = new Date()) => {
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  return [
    { uuid: 'demo-booking-office-01', pod_uuid: 'demo-pod-office-01', pod_name: '办公静音舱 A01', owner_company_id: 300, subject: '项目周会', start_at: addHours(today, 10), end_at: addHours(today, 11), timezone: 'Asia/Shanghai', participant_count: 4, source_type: 'local', source_provider: null, integration_name: null, status: 'scheduled', lifecycle: 'upcoming', sensitivity: null, join_url: null, organizer_display_name: null, scene_key: null, automation_status: 'unconfigured', delivery_status: 'acked', delivery_attempt_count: 1, delivery_error_code: null, delivery_updated_at: addHours(today, 1), revision: 1 },
    { uuid: 'demo-booking-rental-01', pod_uuid: 'demo-pod-rental-01', pod_name: '共享静音舱 R01', owner_company_id: 400, subject: '客户访谈', start_at: addHours(today, 14), end_at: addHours(today, 15), timezone: 'Asia/Shanghai', participant_count: 2, source_type: 'local', source_provider: null, integration_name: null, status: 'scheduled', lifecycle: 'upcoming', sensitivity: null, join_url: null, organizer_display_name: null, scene_key: null, automation_status: 'unconfigured', delivery_status: 'acked', delivery_attempt_count: 1, delivery_error_code: null, delivery_updated_at: addHours(today, 1), revision: 1 }
  ].map(item => ({ ...item, created_at: addHours(today, 1), updated_at: addHours(today, 1) }))
}

export function createDemoSeed (referenceDate) {
  return {
    scenarios: DEMO_SCENARIOS.map(item => ({ ...item })),
    companies: DEMO_COMPANIES.map(item => ({ ...item })),
    users: DEMO_SCENARIOS.map(item => createDemoUser(item)),
    pods: DEMO_PODS.map(item => ({ ...item })),
    hosts: DEMO_HOSTS.map(item => ({ ...item })),
    podModels: DEMO_POD_MODELS.map(item => ({ ...item })),
    locations: DEMO_LOCATIONS.map(item => ({ ...item })),
    bookings: createBookings(referenceDate),
    podCommands: [],
    districts: DEMO_DISTRICTS
  }
}
