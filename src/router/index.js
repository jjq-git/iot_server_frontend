import Vue from 'vue'
import Router from 'vue-router'
import i18n from '@/locales'
import { error as showErrorToast } from '@/services/ui/toast'
import { getLoginEntryPath } from '@/utils/loginEntry'
import { getCurrentUser, getRoutePermission, hasPermission } from '@/utils/permission'
import { isDemoMode } from '@/app-mode/runtime'
import { isDemoRouteSupported } from '@/demo/navigation'

import AdminLayout from '@/layouts/AdminLayout.vue'

const Dashboard = () => import('@/views/DashboardRuntime.vue')
const Hosts = () => import('@/views/Hosts.vue')
const HostDetail = () => import('@/views/HostDetail.vue')
const DocPage = () => import('@/views/DocPage.vue')
const Login = () => import('@/views/Login.vue')
const AcceptInvitation = () => import('@/views/AcceptInvitation.vue')
const RequestPasswordReset = () => import('@/views/RequestPasswordReset.vue')
const ResetPassword = () => import('@/views/ResetPassword.vue')
const AccessDenied = () => import('@/views/AccessDenied.vue')
const NotFound = () => import('@/views/NotFound.vue')
const Companies = () => import('@/views/Companies.vue')
const CompanyRelationships = () => import('@/views/CompanyRelationships.vue')
const Pods = () => import('@/views/Pods.vue')
const PodDetail = () => import('@/views/PodDetail.vue')
const PodModels = () => import('@/views/PodModels.vue')
const ControllerWebConsole = () => import('@/views/ControllerWebConsole.vue')
const Nodes = () => import('@/views/Nodes.vue')
const NodeDetail = () => import('@/views/NodeDetail.vue')
const DeviceOnboardingWorkbench = () => import('@/views/device-enrollments/OnboardingWorkbench.vue')
const DeviceEnrollmentDetail = () => import('@/views/device-enrollments/EnrollmentDetail.vue')
const FileManager = () => import('@/views/FileManager.vue')
const SystemMonitor = () => import('@/views/SystemMonitor.vue')
const CompanyDetail = () => import('@/views/CompanyDetail.vue')
const Users = () => import('@/views/Users.vue')
const OrganizationAccess = () => import('@/views/OrganizationAccess.vue')
const UserDetail = () => import('@/views/UserDetail.vue')
const UserProfile = () => import('@/views/UserProfile.vue')
const Notifications = () => import('@/views/Notifications.vue')
const Locations = () => import('@/views/Locations.vue')
const LocationDetail = () => import('@/views/LocationDetail.vue')
const AuditLogs = () => import('@/views/AuditLogs.vue')
const HnModels = () => import('@/views/HnModels.vue')
const CompanyDashboardConfigs = () => import('@/views/company-dashboard-config/DashboardConfigs.vue')
const CompanyDashboardConfigDetail = () => import('@/views/company-dashboard-config/DashboardConfigDetail.vue')
const CompanyDashboardConfigEditor = () => import('@/views/company-dashboard-config/DashboardConfigEditor.vue')
const OtaConsole = () => import('@/views/OtaConsole.vue')
const FirmwareManager = () => import('@/views/FirmwareManager.vue')
const ApiKeys = () => import('@/views/ApiKeys.vue')
const DeviceLanguage = () => import('@/views/DeviceLanguage.vue')
const PodBookings = () => import('@/views/PodBookings.vue')
const PodBookingDetail = () => import('@/views/PodBookingDetail.vue')
const PodBookingSettings = () => import('@/views/PodBookingSettings.vue')
const IconLibrary = () => import('@/views/IconLibrary.vue')

// 运维与平台诊断按统一能力表拆分。
const DebugDevices = () => import('@/views/debug/Devices.vue')
const DebugOdDiagnostic = () => import('@/views/debug/OdDiagnostic.vue')
const DebugMqttStream = () => import('@/views/debug/MqttStream.vue')
const DebugSerialLogs = () => import('@/views/debug/SerialLogs.vue')
const DebugEmcyLogs = () => import('@/views/debug/EmcyLogs.vue')
const DebugAlertEvents = () => import('@/views/debug/AlertEvents.vue')
const DebugDeviceControl = () => import('@/views/debug/DeviceControl.vue')
const DebugSensorHistory = () => import('@/views/debug/SensorHistory.vue')
const DebugCredentials = () => import('@/views/debug/Credentials.vue')

// MQTT 服务（EMQX dashboard 全局视图，仅平台能力可见）
const MqttOverview = () => import('@/views/mqtt_server/Overview.vue')
const MqttClients = () => import('@/views/mqtt_server/Clients.vue')
const MqttSubs = () => import('@/views/mqtt_server/Subscriptions.vue')
const MqttTopics = () => import('@/views/mqtt_server/Topics.vue')
const MqttBanned = () => import('@/views/mqtt_server/Banned.vue')

Vue.use(Router)

// meta.title / description / section 现在是 i18n key，运行时由消费者通过 $t 翻译。
// 例如 title: 'route.dashboard.title' 对应 zh-CN.json 的 route.dashboard.title。
const docMeta = (titleKey, descriptionKey, docPath, sectionKey, icon) => ({
  title: titleKey,
  description: descriptionKey,
  docPath,
  section: sectionKey,
  icon
})

const routes = [
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      // 仪表盘
      { path: 'dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'route.dashboard.title', icon: 'speedometer2' } },
      { path: 'dashboard/status', name: 'DashboardStatus', component: Dashboard, meta: { title: 'route.dashboard_status.title', icon: 'speedometer2' } },
      { path: 'dashboard/alerts', name: 'DashboardAlerts', component: Dashboard, meta: { title: 'route.dashboard_alerts.title', icon: 'bell' } },
      { path: 'dashboard/charts', name: 'DashboardCharts', component: Dashboard, meta: { title: 'route.dashboard_charts.title', icon: 'pie-chart' } },

      // 组织与权限
      { path: 'org/companies', name: 'OrgCompanies', component: Companies, meta: { title: 'route.org_companies.title', icon: 'building' } },
      { path: 'org/companies/:companyId', name: 'CompanyDetail', component: CompanyDetail, meta: { title: 'route.company_detail.title', icon: 'building' } },
      { path: 'org/company-relationships', name: 'CompanyRelationships', component: CompanyRelationships, meta: { title: 'route.company_relationships.title', icon: 'link-45deg' } },
      { path: 'org/company-dashboard-config', name: 'CompanyDashboardConfigs', component: CompanyDashboardConfigs, meta: { title: 'route.company_dashboard_config.title', icon: 'web-interface' } },
      { path: 'org/company-dashboard-config/new', name: 'CompanyDashboardConfigNew', component: CompanyDashboardConfigEditor, meta: { title: 'route.company_dashboard_config_new.title', icon: 'web-interface' } },
      { path: 'org/company-dashboard-config/:companyId', name: 'CompanyDashboardConfigDetail', component: CompanyDashboardConfigDetail, meta: { title: 'route.company_dashboard_config_detail.title', icon: 'web-interface' } },
      { path: 'org/company-dashboard-config/:companyId/edit', name: 'CompanyDashboardConfigEdit', component: CompanyDashboardConfigEditor, meta: { title: 'route.company_dashboard_config_edit.title', icon: 'web-interface' } },
      // 旧界面配置书签只在前端重定向，不再调用旧后端 API。
      { path: 'org/company-templates', redirect: '/org/company-dashboard-config' },
      { path: 'org/company-templates/new', redirect: '/org/company-dashboard-config/new' },
      { path: 'org/company-templates/:companyId', redirect: to => `/org/company-dashboard-config/${to.params.companyId}` },
      { path: 'org/company-templates/:companyId/edit', redirect: to => `/org/company-dashboard-config/${to.params.companyId}/edit` },
      { path: 'admin/template-review', redirect: '/org/company-dashboard-config' },
      { path: 'org/users', name: 'Users', component: Users, meta: { title: 'route.users.title', icon: 'people' } },
      { path: 'org/company-access/:companyId?', name: 'OrganizationAccess', component: OrganizationAccess, meta: { title: 'route.organization_access.title', icon: 'person-badge' } },
      { path: 'org/users/:userId', name: 'UserDetail', component: UserDetail, meta: { title: 'route.user_detail.title', icon: 'person' } },
      { path: 'user/profile', name: 'UserProfile', component: UserProfile, meta: { title: 'route.user_profile.title', icon: 'person' } },
      { path: 'notifications', name: 'Notifications', component: Notifications, meta: { title: 'route.notifications.title', icon: 'bell' } },

      // 设备管理
      { path: 'devices/hn-models', name: 'DevicesHnModels', component: HnModels, meta: { title: 'route.hn_models.title', icon: 'product-model' } },
      { path: 'devices/hosts', name: 'DevicesHosts', component: Hosts, meta: { title: 'route.hosts.title', icon: 'controller-host' } },
      { path: 'devices/hosts/:deviceId', name: 'DeviceHostDetail', component: HostDetail, meta: { title: 'route.host_detail.title', icon: 'controller-host' } },
      { path: 'devices/nodes', name: 'DevicesNodes', component: Nodes, meta: { title: 'route.nodes.title', icon: 'controller-node' } },
      { path: 'devices/nodes/:nodeId', name: 'NodeDetail', component: NodeDetail, meta: { title: 'route.node_detail.title', icon: 'controller-node' } },
      { path: 'devices/enrollments', name: 'DeviceEnrollments', component: DeviceOnboardingWorkbench, meta: { title: 'device_onboarding.title', icon: 'controller-system' } },
      { path: 'devices/enrollments/:enrollmentUuid', name: 'DeviceEnrollmentDetail', component: DeviceEnrollmentDetail, meta: { title: 'device_enrollment.detail_title', icon: 'controller-system' } },
      { path: 'devices/factory-registry', name: 'DeviceFactoryRegistry', component: DeviceOnboardingWorkbench, meta: { title: 'device_onboarding.title', icon: 'controller-system' } },
      // API Keys 管理（系统工具，仅持平台管理权限的根公司管理员可见）
      { path: 'api-keys', name: 'ApiKeys', component: ApiKeys, meta: { title: 'route.api_keys.title', icon: 'key' } },

      // 平台图标库。管理页面仍由后端进行最终鉴权。
      { path: 'admin/icon-library', name: 'IconLibrary', component: IconLibrary, meta: { title: 'route.icon_library.title', icon: 'grid' } },

      // 系统调试：租户运维能力与平台诊断能力分开控制。
      { path: 'debug/devices', name: 'DebugDevices', component: DebugDevices, meta: { title: 'route.debug_devices.title', icon: 'hdd-stack' } },
      // 业务运维类
      { path: 'debug/ota-console', name: 'DebugOtaConsole', component: OtaConsole, meta: { title: 'route.debug_ota_console.title', icon: 'arrow-up-circle' } },
      { path: 'debug/firmwares', name: 'DebugFirmwares', component: FirmwareManager, meta: { title: 'route.debug_firmwares.title', icon: 'file-earmark' } },
      { path: 'debug/device-language', name: 'DebugDeviceLanguage', component: DeviceLanguage, meta: { title: 'route.debug_device_language.title', icon: 'translate' } },
      // 单片机开发联调类
      { path: 'debug/od', name: 'DebugOdDiagnostic', component: DebugOdDiagnostic, meta: { title: 'route.debug_od.title', icon: 'diagram-3' } },
      { path: 'debug/device-control', name: 'DebugDeviceControl', component: DebugDeviceControl, meta: { title: 'route.debug_device_control.title', icon: 'sliders' } },
      { path: 'debug/controller-console', name: 'ControllerWebConsole', component: ControllerWebConsole, meta: { title: 'route.controller_console.title', icon: 'controller-console' } },
      { path: 'debug/mqtt-stream', name: 'DebugMqttStream', component: DebugMqttStream, meta: { title: 'route.debug_mqtt_stream.title', icon: 'broadcast' } },
      { path: 'debug/credentials', name: 'DebugCredentials', component: DebugCredentials, meta: { title: 'route.debug_credentials.title', icon: 'key' } },

      // 历史数据 group（独立顶级菜单，按角色和数据范围过滤）
      { path: 'history/audit', name: 'HistoryAudit', component: AuditLogs, meta: { title: 'route.history_audit.title', icon: 'journal-text' } },
      { path: 'history/serial', name: 'HistorySerial', component: DebugSerialLogs, meta: { title: 'route.history_serial.title', icon: 'terminal' } },
      { path: 'history/emcy', name: 'HistoryEmcy', component: DebugEmcyLogs, meta: { title: 'route.history_emcy.title', icon: 'exclamation-octagon' } },
      { path: 'history/alerts', name: 'HistoryAlerts', component: DebugAlertEvents, meta: { title: 'route.history_alerts.title', icon: 'bell' } },
      { path: 'history/sensors', name: 'HistorySensors', component: DebugSensorHistory, meta: { title: 'route.history_sensors.title', icon: 'graph-up' } },

      // MQTT 服务（EMQX dashboard 代理）
      { path: 'mqtt-server', name: 'MqttServerOverview', component: MqttOverview, meta: { title: 'route.mqtt_server.title', icon: 'mqtt-broker' } },
      { path: 'mqtt-server/clients', name: 'MqttServerClients', component: MqttClients, meta: { title: 'route.mqtt_clients.title', icon: 'people' } },
      { path: 'mqtt-server/subscriptions', name: 'MqttServerSubs', component: MqttSubs, meta: { title: 'route.mqtt_subscriptions.title', icon: 'list-task' } },
      { path: 'mqtt-server/topics', name: 'MqttServerTopics', component: MqttTopics, meta: { title: 'route.mqtt_topics.title', icon: 'diagram-3' } },
      { path: 'mqtt-server/banned', name: 'MqttServerBanned', component: MqttBanned, meta: { title: 'route.mqtt_banned.title', icon: 'slash-circle' } },

      // 旧路由 redirect（保留兼容）
      { path: 'devices/od-manager', redirect: '/debug/od' },
      { path: 'devices/ota-console', redirect: '/debug/ota-console' },
      { path: 'devices/firmwares', redirect: '/debug/firmwares' },
      { path: 'devices/controller-console', redirect: '/debug/controller-console' },
      { path: 'devices/mqtt-host-console', redirect: '/debug/controller-console' },
      // 历史数据 group 整合：旧的 audit/debug 历史相关路径迁到 /history/*
      { path: 'audit/logs', redirect: '/history/audit' },
      { path: 'debug/serial-logs', redirect: '/history/serial' },
      { path: 'debug/emcy', redirect: '/history/emcy' },
      { path: 'debug/alerts', redirect: '/history/alerts' },
      { path: 'debug/sensor-history', redirect: '/history/sensors' },

      // 静音仓管理
      { path: 'pods/pod-models', name: 'PodModels', component: PodModels, meta: { title: 'route.pod_models.title', icon: 'product-model' } },
      { path: 'pods', name: 'Pods', component: Pods, meta: { title: 'route.pods.title', icon: 'soundproof-pod' } },
      { path: 'pods/handovers', redirect: '/pods' },
      { path: 'pod-bookings', name: 'PodBookings', component: PodBookings, meta: { title: 'meeting.list_title', icon: 'clock' } },
      { path: 'pod-bookings/settings', name: 'PodBookingSettings', component: PodBookingSettings, meta: { title: 'meeting.settings_title', icon: 'gear' } },
      { path: 'pod-bookings/:uuid', name: 'PodBookingDetail', component: PodBookingDetail, meta: { title: 'meeting.detail_title', icon: 'clock' } },
      { path: 'meetings', redirect: '/pod-bookings' },
      { path: 'meetings/calendar', redirect: '/pod-bookings' },
      { path: 'meetings/settings', redirect: '/pod-bookings/settings' },
      { path: 'meetings/:uuid', redirect: to => `/pod-bookings/${to.params.uuid}` },
      { path: 'pods/:podId', name: 'PodDetail', component: PodDetail, meta: { title: 'route.pod_detail.title', icon: 'soundproof-pod' } },
      // 旧 URL 仅作兼容重定向，页面与 API 均使用 pods。
      { path: 'units/unit-models', redirect: '/pods/pod-models' },
      { path: 'units', redirect: '/pods' },
      { path: 'units/:podId', redirect: to => `/pods/${to.params.podId}` },

      // 位置管理
      { path: 'locations', name: 'Locations', component: Locations, meta: { title: 'route.locations.title', icon: 'geo-alt' } },
      { path: 'locations/:locationId', name: 'LocationDetail', component: LocationDetail, meta: { title: 'route.location_detail.title', icon: 'file-earmark-text' } },

      // 配置与OTA
      { path: 'config/rules', name: 'ConfigRules', component: DocPage, meta: docMeta('route.config_rules.title', 'route.config_rules.description', 'backend/docs/数据模型/数据模型-CONFIGURATION_RULE.md', 'route.section.config_ota', 'sliders') },
      { path: 'config/history', name: 'ConfigHistory', component: DocPage, meta: docMeta('route.config_history.title', 'route.config_history.description', 'backend/docs/数据模型/数据模型-CONFIGURATION_HISTORY.md', 'route.section.config_ota', 'clock-history') },
      { path: 'ota/firmware', redirect: '/debug/firmwares' },
      { path: 'ota/tasks', redirect: '/debug/ota-console' },

      // 文件管理
      { path: 'files', name: 'Files', component: FileManager, meta: { title: 'route.files.title', icon: 'folder2-open' } },
      { path: 'files/upload', name: 'FileUpload', component: FileManager, meta: { title: 'route.files_upload.title', icon: 'upload' } },
      { path: 'files/relations', name: 'FileRelations', component: FileManager, meta: { title: 'route.files_relations.title', icon: 'link-45deg', fileMode: 'relations' } },
      { path: 'files/stats', name: 'FileStats', component: FileManager, meta: { title: 'route.files_stats.title', icon: 'bar-chart', fileMode: 'stats' } },

      // 审计与日志（页面已统一到 /history/audit；保留 export/operation-logs 功能页）
      { path: 'audit/export', name: 'AuditExport', component: AuditLogs, meta: { title: 'route.audit_export.title', icon: 'download' } },
      { path: 'audit/operation-logs', redirect: '/history/audit' },

      // 系统监控
      // 旧语言包书签只保留前端重定向；后端语言包文件 API 已下线。
      { path: 'debug/lang-packs', redirect: '/debug/device-language' },
      { path: 'system/lang-packs', redirect: '/debug/device-language' },
      { path: 'monitor/health', name: 'MonitorHealth', component: SystemMonitor, meta: { title: 'route.monitor_health.title', icon: 'heart-pulse' } },
      { path: 'monitor/metrics', name: 'MonitorMetrics', component: SystemMonitor, meta: { title: 'route.monitor_metrics.title', icon: 'bar-chart' } },
      { path: 'monitor/mqtt', name: 'MonitorMqtt', component: SystemMonitor, meta: { title: 'route.monitor_mqtt.title', icon: 'diagram-3' } },

      // API 与集成
      { path: 'integration/api', name: 'IntegrationApi', component: DocPage, meta: docMeta('route.integration_api.title', 'route.integration_api.description', 'backend/docs/API 总览.md', 'route.section.api_integration', 'diagram-3') },
      { path: 'integration/auth', name: 'IntegrationAuth', component: DocPage, meta: docMeta('route.integration_auth.title', 'route.integration_auth.description', 'backend/docs/API-登录.md', 'route.section.api_integration', 'key') },
      { path: 'integration/mqtt', name: 'IntegrationMqtt', component: DocPage, meta: docMeta('route.integration_mqtt.title', 'route.integration_mqtt.description', 'backend/docs/MQTT 设计.md', 'route.section.api_integration', 'mqtt-broker') },
      { path: 'integration/websocket', name: 'IntegrationWebsocket', component: DocPage, meta: docMeta('route.integration_websocket.title', 'route.integration_websocket.description', 'backend/docs/系统架构.md', 'route.section.api_integration', 'broadcast') },

      // 文档中心（保留）
      { path: 'docs/project-overview', name: 'DocsProjectOverview', component: DocPage, meta: docMeta('route.docs_project_overview.title', 'route.docs_project_overview.description', 'backend/docs/项目总览.md', 'route.section.docs_center', 'file-earmark-text') },
      { path: 'docs/architecture', name: 'DocsArchitecture', component: DocPage, meta: docMeta('route.docs_architecture.title', 'route.docs_architecture.description', 'backend/docs/系统架构.md', 'route.section.docs_center', 'diagram-3') },
      { path: 'docs/data-model', name: 'DocsDataModel', component: DocPage, meta: docMeta('route.docs_data_model.title', 'route.docs_data_model.description', 'backend/docs/数据模型/README.md', 'route.section.docs_center', 'layers') },
      { path: 'docs/development', name: 'DocsDevelopment', component: DocPage, meta: docMeta('route.docs_development.title', 'route.docs_development.description', 'backend/docs/开发指南.md', 'route.section.docs_center', 'tools') },
      { path: 'docs/deployment', name: 'DocsDeployment', component: DocPage, meta: docMeta('route.docs_deployment.title', 'route.docs_deployment.description', 'backend/docs/部署.md', 'route.section.docs_center', 'cloud-upload') },
      { path: 'docs/troubleshooting', name: 'DocsTroubleshooting', component: DocPage, meta: docMeta('route.docs_troubleshooting.title', 'route.docs_troubleshooting.description', 'backend/docs/故障排查.md', 'route.section.docs_center', 'exclamation-triangle') },

      // 重定向
      { path: 'companies', redirect: '/org/companies' }
    ]
  },
  { path: '/login/:companySlug?', name: 'Login', component: Login, meta: { layout: 'blank' } },
  { path: '/accept-invitation', name: 'AcceptInvitation', component: AcceptInvitation, meta: { layout: 'blank', title: 'invitation.title', public: true } },
  { path: '/forgot-password', name: 'RequestPasswordReset', component: RequestPasswordReset, meta: { layout: 'blank', title: 'auth.password_reset.title', public: true } },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPassword, meta: { layout: 'blank', title: 'auth.password_reset.title', public: true } },
  { path: '/access-denied', name: 'AccessDenied', component: AccessDenied, meta: { layout: 'blank', title: 'auth.access_denied_title', authorizationFailure: true } },
  { path: '*', name: 'NotFound', component: NotFound, meta: { layout: 'blank' } }
]

const router = new Router({
  mode: 'hash',
  routes,
  scrollBehavior () {
    return { x: 0, y: 0 }
  }
})

// meta.title 现在是 i18n key，这里翻译后再写入 document.title。
// 找不到 key 时 vue-i18n 默认返回 key 本身，fallbackLocale 兜底，不会崩溃。
function translateTitle (key) {
  if (!key) return ''
  const translated = i18n.t(key)
  // 兼容旧的硬编码中文：若 meta.title 直接是中文，t() 返回原文。
  return typeof translated === 'string' ? translated : key
}

router.beforeEach((to, from, next) => {
  const baseTitle = (typeof process !== 'undefined' && process.env && process.env.VUE_APP_TITLE) || 'pods.dengtec.com'
  const titleKey = to.meta && to.meta.title
  const translated = translateTitle(titleKey)
  document.title = translated ? `${baseTitle} - ${translated}` : baseTitle

  const token = localStorage.getItem('token')
  const isLoginPage = to.path.startsWith('/login')
  const isPublicPage = isLoginPage || Boolean(to.meta && to.meta.public)

  if (!token && !isPublicPage) {
    next({ path: getLoginEntryPath(), query: { redirect: to.fullPath } })
    return
  }
  if (token && isLoginPage) {
    next({ path: '/dashboard' })
    return
  }
  // 权限失败页只要求存在登录态。若继续按业务权限校验，会在用户缺少首页权限时形成重定向循环。
  if (to.meta && to.meta.authorizationFailure) {
    next()
    return
  }
  if (isDemoMode() && !isDemoRouteSupported(to.name)) {
    showErrorToast(i18n.t('demo.route_unavailable'))
    next({ path: token ? '/dashboard' : getLoginEntryPath() })
    return
  }
  if (isPublicPage) {
    next()
    return
  }

  // 所有命名业务路由统一从 permission.js 读取能力，未登记时 fail-closed。
  // 这里只做 UX 防呆，后端仍需独立校验角色和数据 scope。
  const requiredPermission = getRoutePermission(to.name)
  if (!requiredPermission || !hasPermission(requiredPermission, getCurrentUser())) {
    next({ name: 'AccessDenied', query: { redirect: to.fullPath } })
    return
  }

  next()
})

// 处理 ChunkLoadError：当懒加载的 chunk 文件不存在时自动刷新页面
router.onError((error) => {
  const pattern = /Loading (CSS )?chunk \S+ failed/
  const isChunkLoadFailed = pattern.test(error.message)
  if (isChunkLoadFailed) {
    const targetPath = router.history.pending ? router.history.pending.fullPath : router.history.current.fullPath
    // hash 模式下 fullPath 不含 '#'（形如 /login?redirect=%2Fdashboard）。
    // 直接赋给 location.href 会跳到服务器上并不存在的真实路径，静态服务器返回 404 白屏。
    // 必须写进 hash 再 reload：改 hash 本身不会重载文档，reload 才会重新拉取 chunk。
    if (router.mode === 'hash') {
      window.location.hash = targetPath
      window.location.reload()
    } else {
      // history 模式下服务端已配置 SPA fallback，直接跳转即可
      window.location.href = targetPath
    }
  }
})

export default router
