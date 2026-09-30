/**
 * 前端统一权限模型。
 *
 * permission 决定入口、路由和操作能力；role 决定动作类型；scope 决定数据范围。
 * 前端判断只负责体验和路由防呆，后端仍是最终安全边界。
 */

import { COMPANY_TYPES, normalizeCompanyType } from '@/utils/companyType'

export { COMPANY_TYPES }

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DATA_ENTRY: 'data_entry',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
})

export const PERMISSION = Object.freeze({
  AUTHENTICATED: 'authenticated',
  PLATFORM_PERMISSION_MANAGE: 'platform.permission.manage',
  PLATFORM_MODEL_MANAGE: 'platform.model.manage',
  DASHBOARD_VIEW: 'dashboard.view',
  ORGANIZATION_MANAGE: 'company.view',
  COMPANY_RELATIONSHIP_MANAGE: 'company.relationship.manage',
  USER_MANAGE: 'company.member.manage',
  COMPANY_ROLE_MANAGE: 'company.role.manage',
  COMPANY_DASHBOARD_CONFIG_VIEW: 'company.view',
  COMPANY_DASHBOARD_CONFIG_MANAGE: 'platform.permission.manage',
  PLATFORM_DEVICE_MANAGE: 'platform.device.inventory',
  DEVICE_ENROLLMENT_VIEW: 'pod.receive',
  FACTORY_REGISTRY_MANAGE: 'platform.device.inventory',
  FACTORY_STATION_MANAGE: 'platform.factory_station.manage',
  POD_VIEW: 'pod.view',
  POD_RECEIVE: 'pod.receive',
  POD_TRANSFER: 'pod.transfer',
  POD_MAINTAIN: 'pod.maintain',
  LOCATION_VIEW: 'company.view',
  MEETING_VIEW: 'meeting.view',
  MEETING_CONFIGURE: 'meeting.manage',
  FILE_VIEW: 'file.view',
  FILE_UPLOAD: 'file.manage',
  FIRMWARE_VIEW: 'firmware.view',
  FIRMWARE_MANAGE: 'firmware.manage',
  OTA_VIEW: 'ota.view',
  OTA_MANAGE: 'ota.manage',
  ICON_LIBRARY_MANAGE: 'platform.permission.manage',
  AUDIT_VIEW: 'audit.view',
  DEVICE_LOG_VIEW: 'pod.maintain',
  SENSOR_HISTORY_VIEW: 'pod.view',
  POD_CONTROL: 'pod.control',
  DEVICE_OPERATE: 'device.operate',
  PLATFORM_DIAGNOSE: 'platform.device.inventory',
  API_KEY_MANAGE: 'platform.permission.manage',
  MQTT_ADMIN: 'platform.device.inventory',
  SYSTEM_MONITOR: 'platform.permission.manage',
  PLATFORM_DOC_VIEW: 'platform.permission.manage'
})

export const MENU_KEY = Object.freeze({
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  COMPANY_RELATIONSHIPS: 'company_relationships',
  USERS: 'users',
  COMPANY_DASHBOARD_CONFIG: 'company_dashboard_config',
  DEVICES: 'devices',
  PODS: 'pods',
  MEETINGS: 'meetings',
  FILES: 'files',
  AUDIT_LOGS: 'audit_logs'
})

const MENU_PERMISSION = Object.freeze({
  [MENU_KEY.DASHBOARD]: PERMISSION.DASHBOARD_VIEW,
  [MENU_KEY.COMPANIES]: PERMISSION.ORGANIZATION_MANAGE,
  [MENU_KEY.COMPANY_RELATIONSHIPS]: PERMISSION.ORGANIZATION_MANAGE,
  [MENU_KEY.USERS]: PERMISSION.USER_MANAGE,
  [MENU_KEY.COMPANY_DASHBOARD_CONFIG]: PERMISSION.COMPANY_DASHBOARD_CONFIG_VIEW,
  [MENU_KEY.DEVICES]: PERMISSION.PLATFORM_DEVICE_MANAGE,
  [MENU_KEY.PODS]: PERMISSION.POD_VIEW,
  [MENU_KEY.MEETINGS]: PERMISSION.MEETING_VIEW,
  [MENU_KEY.FILES]: PERMISSION.FILE_VIEW,
  [MENU_KEY.AUDIT_LOGS]: PERMISSION.AUDIT_VIEW
})

// 命名路由统一映射到能力。未登记的受保护路由会 fail-closed。
export const ROUTE_PERMISSION = Object.freeze({
  Dashboard: PERMISSION.DASHBOARD_VIEW,
  DashboardStatus: PERMISSION.DASHBOARD_VIEW,
  DashboardAlerts: PERMISSION.DASHBOARD_VIEW,
  DashboardCharts: PERMISSION.DASHBOARD_VIEW,
  OrgCompanies: PERMISSION.ORGANIZATION_MANAGE,
  CompanyDetail: PERMISSION.ORGANIZATION_MANAGE,
  CompanyRelationships: PERMISSION.ORGANIZATION_MANAGE,
  CompanyDashboardConfigs: PERMISSION.COMPANY_DASHBOARD_CONFIG_VIEW,
  CompanyDashboardConfigNew: PERMISSION.COMPANY_DASHBOARD_CONFIG_MANAGE,
  CompanyDashboardConfigDetail: PERMISSION.COMPANY_DASHBOARD_CONFIG_VIEW,
  CompanyDashboardConfigEdit: PERMISSION.COMPANY_DASHBOARD_CONFIG_MANAGE,
  Users: PERMISSION.USER_MANAGE,
  OrganizationAccess: PERMISSION.USER_MANAGE,
  UserDetail: PERMISSION.USER_MANAGE,
  UserProfile: PERMISSION.AUTHENTICATED,
  Notifications: PERMISSION.POD_VIEW,
  DevicesHnModels: PERMISSION.PLATFORM_DEVICE_MANAGE,
  DevicesHosts: PERMISSION.POD_VIEW,
  DeviceHostDetail: PERMISSION.POD_VIEW,
  DevicesNodes: PERMISSION.POD_VIEW,
  NodeDetail: PERMISSION.POD_VIEW,
  DeviceEnrollments: PERMISSION.DEVICE_ENROLLMENT_VIEW,
  DeviceEnrollmentDetail: PERMISSION.DEVICE_ENROLLMENT_VIEW,
  DeviceFactoryRegistry: PERMISSION.FACTORY_REGISTRY_MANAGE,
  ApiKeys: PERMISSION.API_KEY_MANAGE,
  IconLibrary: PERMISSION.ICON_LIBRARY_MANAGE,
  DebugDevices: PERMISSION.DEVICE_OPERATE,
  DebugOtaConsole: PERMISSION.OTA_VIEW,
  DebugFirmwares: PERMISSION.FIRMWARE_VIEW,
  DebugDeviceLanguage: PERMISSION.DEVICE_OPERATE,
  DebugOdDiagnostic: PERMISSION.DEVICE_OPERATE,
  DebugDeviceControl: PERMISSION.DEVICE_OPERATE,
  ControllerWebConsole: PERMISSION.PLATFORM_DIAGNOSE,
  DebugMqttStream: PERMISSION.PLATFORM_DIAGNOSE,
  DebugCredentials: PERMISSION.DEVICE_OPERATE,
  HistoryAudit: PERMISSION.AUDIT_VIEW,
  HistorySerial: PERMISSION.DEVICE_LOG_VIEW,
  HistoryEmcy: PERMISSION.DEVICE_LOG_VIEW,
  HistoryAlerts: PERMISSION.DEVICE_LOG_VIEW,
  HistorySensors: PERMISSION.SENSOR_HISTORY_VIEW,
  MqttServerOverview: PERMISSION.MQTT_ADMIN,
  MqttServerClients: PERMISSION.MQTT_ADMIN,
  MqttServerSubs: PERMISSION.MQTT_ADMIN,
  MqttServerTopics: PERMISSION.MQTT_ADMIN,
  MqttServerBanned: PERMISSION.MQTT_ADMIN,
  PodModels: PERMISSION.POD_VIEW,
  Pods: PERMISSION.POD_VIEW,
  PodDetail: PERMISSION.POD_VIEW,
  PodBookings: PERMISSION.MEETING_VIEW,
  PodBookingSettings: PERMISSION.POD_MAINTAIN,
  PodBookingDetail: PERMISSION.MEETING_VIEW,
  Locations: PERMISSION.LOCATION_VIEW,
  LocationDetail: PERMISSION.LOCATION_VIEW,
  ConfigRules: PERMISSION.PLATFORM_DOC_VIEW,
  ConfigHistory: PERMISSION.PLATFORM_DOC_VIEW,
  Files: PERMISSION.FILE_VIEW,
  FileUpload: PERMISSION.FILE_UPLOAD,
  FileRelations: PERMISSION.FILE_VIEW,
  FileStats: PERMISSION.FILE_VIEW,
  AuditExport: PERMISSION.AUDIT_VIEW,
  MonitorHealth: PERMISSION.SYSTEM_MONITOR,
  MonitorMetrics: PERMISSION.SYSTEM_MONITOR,
  MonitorMqtt: PERMISSION.SYSTEM_MONITOR,
  IntegrationApi: PERMISSION.PLATFORM_DOC_VIEW,
  IntegrationAuth: PERMISSION.PLATFORM_DOC_VIEW,
  IntegrationMqtt: PERMISSION.PLATFORM_DOC_VIEW,
  IntegrationWebsocket: PERMISSION.PLATFORM_DOC_VIEW,
  DocsProjectOverview: PERMISSION.PLATFORM_DOC_VIEW,
  DocsArchitecture: PERMISSION.PLATFORM_DOC_VIEW,
  DocsDataModel: PERMISSION.PLATFORM_DOC_VIEW,
  DocsDevelopment: PERMISSION.PLATFORM_DOC_VIEW,
  DocsDeployment: PERMISSION.PLATFORM_DOC_VIEW,
  DocsTroubleshooting: PERMISSION.PLATFORM_DOC_VIEW,
  AccessDenied: PERMISSION.AUTHENTICATED,
  NotFound: PERMISSION.AUTHENTICATED
})

export function getCurrentUser () {
  try {
    const userString = localStorage.getItem('user')
    return userString ? JSON.parse(userString) : null
  } catch (error) {
    return null
  }
}

export function getUserCompanyType (user) {
  if (!user?.company_type) return null
  return normalizeCompanyType(String(user.company_type).split('+')[0])
}

export function isKnownUser (user) {
  return Boolean(user && (user.user_id || user.uuid) && user.company_id)
}

export function isPlatformAdmin (user = null) {
  const currentUser = user || getCurrentUser()
  return hasPermission(PERMISSION.PLATFORM_PERMISSION_MANAGE, currentUser)
}

export function isPlatformCompanyUser (user = null) {
  return getUserCompanyType(user || getCurrentUser()) === COMPANY_TYPES.PF
}

export function hasPermission (permission, user = null) {
  const currentUser = user || getCurrentUser()
  if (!isKnownUser(currentUser)) return false
  if (permission === PERMISSION.AUTHENTICATED) return true
  return Array.isArray(currentUser.permissions) && currentUser.permissions.includes(permission)
}

export function hasAnyPermission (permissions, user = null) {
  return Array.isArray(permissions) && permissions.some(permission => hasPermission(permission, user))
}

export function hasMenuPermission (menuKey, user = null) {
  const permission = MENU_PERMISSION[menuKey]
  return Boolean(permission && hasPermission(permission, user))
}

export function getRoutePermission (routeName) {
  return routeName ? ROUTE_PERMISSION[routeName] || null : null
}

export function canWriteCompany (companyId, user = null) {
  const currentUser = user || getCurrentUser()
  if (!isKnownUser(currentUser)) return false
  if (companyId === null || companyId === undefined || companyId === '') return false
  // 平台管理员拥有平台范围写权限（后端 has_platform_scope / platform.permission.manage），
  // 其 writable_companies 只含自身公司，故这里显式放行，避免前端误挡跨公司写操作
  if (isPlatformAdmin(currentUser)) return true
  const writableCompanies = Array.isArray(currentUser.writable_companies)
    ? currentUser.writable_companies.map(Number)
    : []
  return writableCompanies.includes(Number(companyId))
}

export function canWriteAnyCompany (companyIds, user = null) {
  return Array.isArray(companyIds) && companyIds.some(companyId => canWriteCompany(companyId, user))
}

const RESOURCE_COMPANY_FIELDS = Object.freeze({
  company: ['id', 'company_id'],
  user: ['company_id'],
  host: ['manufacturer_id', 'company_id'],
  node: ['manufacturer_id', 'company_id'],
  hnModel: ['owner_company_id', 'company_id'],
  podModel: ['owner_company_id', 'company_id'],
  location: ['com_id', 'company_id'],
  file: ['owner_company_id', 'company_id'],
  pod: ['owner_company_id', 'company_id']
})

export function canWriteRow (row, resourceType, user = null) {
  if (!row || typeof row !== 'object') return false
  // 平台管理员可写任意资源（含 manufacturer_id 尚未归属的行），与后端平台 scope 一致
  if (isPlatformAdmin(user || getCurrentUser())) return true
  const fields = RESOURCE_COMPANY_FIELDS[resourceType] || ['owner_company_id', 'company_id']
  const companyIds = fields
    .map(field => row[field])
    .filter(value => value !== null && value !== undefined && value !== '')
  return canWriteAnyCompany(companyIds, user)
}

export function canManageUserRow (row, user = null) {
  const currentUser = user || getCurrentUser()
  const isRootAdmin = Boolean(
    row &&
    row.role === ROLES.ADMIN &&
    isPlatformAdmin(currentUser) &&
    Number(row.company_id) === Number(currentUser.company_id)
  )
  return Boolean(
    row &&
    !isRootAdmin &&
    hasPermission(PERMISSION.USER_MANAGE, currentUser) &&
    canWriteRow(row, 'user', currentUser)
  )
}
