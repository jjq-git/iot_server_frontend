import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const companyTypeSource = await readFile(new URL('../src/utils/companyType.js', import.meta.url), 'utf8')
const companyTypeUrl = `data:text/javascript;base64,${Buffer.from(companyTypeSource).toString('base64')}`
const permissionSource = (await readFile(new URL('../src/utils/permission.js', import.meta.url), 'utf8'))
  .replace("from '@/utils/companyType'", `from '${companyTypeUrl}'`)
const permissionModule = await import(`data:text/javascript;base64,${Buffer.from(permissionSource).toString('base64')}`)

const {
  PERMISSION,
  ROUTE_PERMISSION,
  canManageUserRow,
  canWriteCompany,
  canWriteRow,
  hasPermission
} = permissionModule

const rolePermissions = {
  admin: [PERMISSION.ORGANIZATION_MANAGE, PERMISSION.USER_MANAGE, PERMISSION.AUDIT_VIEW, PERMISSION.FILE_UPLOAD, PERMISSION.POD_VIEW, PERMISSION.POD_CONTROL, PERMISSION.DEVICE_OPERATE, PERMISSION.DEVICE_LOG_VIEW, PERMISSION.SENSOR_HISTORY_VIEW],
  data_entry: [PERMISSION.ORGANIZATION_MANAGE, PERMISSION.FILE_UPLOAD, PERMISSION.POD_VIEW, PERMISSION.SENSOR_HISTORY_VIEW],
  maintainer: [PERMISSION.ORGANIZATION_MANAGE, PERMISSION.POD_VIEW, PERMISSION.POD_CONTROL, PERMISSION.DEVICE_OPERATE, PERMISSION.DEVICE_LOG_VIEW, PERMISSION.SENSOR_HISTORY_VIEW],
  viewer: [PERMISSION.ORGANIZATION_MANAGE, PERMISSION.POD_VIEW, PERMISSION.SENSOR_HISTORY_VIEW]
}

const user = (role, companyType = 'BR', writableCompanies = [20], permissions = rolePermissions[role] || []) => ({
  user_id: `${role}-uuid`,
  company_id: 20,
  role,
  company_type: companyType,
  writable_companies: writableCompanies,
  permissions
})

test('平台资产、平台诊断和 MQTT 全局管理仅向持平台权限的根公司 admin 开放', () => {
  const platformAdmin = user('admin', 'PF', [], Object.values(PERMISSION))
  const tenantAdmin = user('admin')
  const maintainer = user('maintainer')

  for (const permission of [
    PERMISSION.PLATFORM_DEVICE_MANAGE,
    PERMISSION.PLATFORM_DIAGNOSE,
    PERMISSION.MQTT_ADMIN,
    PERMISSION.SYSTEM_MONITOR,
    PERMISSION.FACTORY_REGISTRY_MANAGE
  ]) {
    assert.equal(hasPermission(permission, platformAdmin), true)
    assert.equal(hasPermission(permission, tenantAdmin), false)
    assert.equal(hasPermission(permission, maintainer), false)
  }
})

test('租户可按后端 scope 查看主机与节点列表和详情', () => {
  const maintainer = user('maintainer')

  assert.equal(hasPermission(ROUTE_PERMISSION.DevicesHosts, maintainer), true)
  assert.equal(hasPermission(ROUTE_PERMISSION.DevicesNodes, maintainer), true)
  assert.equal(hasPermission(ROUTE_PERMISSION.DeviceHostDetail, maintainer), true)
  assert.equal(hasPermission(ROUTE_PERMISSION.NodeDetail, maintainer), true)
})

test('租户角色只获得职责需要的业务能力', () => {
  const tenantAdmin = user('admin')
  const dataEntry = user('data_entry')
  const maintainer = user('maintainer')
  const viewer = user('viewer', 'BR', [])

  assert.equal(hasPermission(PERMISSION.ORGANIZATION_MANAGE, tenantAdmin), true)
  assert.equal(hasPermission(PERMISSION.AUDIT_VIEW, tenantAdmin), true)
  assert.equal(hasPermission(PERMISSION.FILE_UPLOAD, dataEntry), true)
  assert.equal(hasPermission(PERMISSION.POD_CONTROL, maintainer), true)
  assert.equal(hasPermission(PERMISSION.DEVICE_OPERATE, maintainer), true)
  assert.equal(hasPermission(PERMISSION.DEVICE_LOG_VIEW, maintainer), true)

  assert.equal(hasPermission(PERMISSION.ORGANIZATION_MANAGE, viewer), true)
  assert.equal(hasPermission(PERMISSION.COMPANY_RELATIONSHIP_MANAGE, viewer), false)
  assert.equal(hasPermission(PERMISSION.AUDIT_VIEW, viewer), false)
  assert.equal(hasPermission(PERMISSION.POD_CONTROL, viewer), false)
  assert.equal(hasPermission(PERMISSION.DEVICE_OPERATE, viewer), false)
  assert.equal(hasPermission(PERMISSION.POD_VIEW, viewer), true)
  assert.equal(hasPermission(PERMISSION.SENSOR_HISTORY_VIEW, viewer), true)
})

test('权限数组缺失时 fail-closed，角色名和公司类型不参与授权', () => {
  assert.equal(hasPermission(PERMISSION.DASHBOARD_VIEW, user('unknown')), false)
  assert.equal(hasPermission(PERMISSION.DASHBOARD_VIEW, { role: 'viewer' }), false)
  assert.equal(hasPermission(PERMISSION.DASHBOARD_VIEW, user('admin', 'PF', [], [])), false)
  assert.equal(hasPermission(PERMISSION.DASHBOARD_VIEW, user('custom-role', null, [], [PERMISSION.DASHBOARD_VIEW])), true)
  assert.equal(hasPermission('permission.does_not_exist', user('admin', 'PF', [], Object.values(PERMISSION))), false)
})

test('根公司 admin 行在普通用户管理中只读', () => {
  const rootAdmin = user('admin', 'PF', [20, 21], Object.values(PERMISSION))
  const tenantAdmin = user('admin')

  assert.equal(canManageUserRow({ role: 'admin', company_id: 20 }, rootAdmin), false)
  assert.equal(canManageUserRow({ role: 'viewer', company_id: 21 }, rootAdmin), true)
  assert.equal(canManageUserRow({ role: 'viewer', company_id: 20 }, tenantAdmin), true)
})

test('行级写操作校验 writable_companies，Pod 不再信任旧供应链字段', () => {
  const tenantAdmin = user('admin', 'BR', [20, 21])
  const viewer = user('viewer', 'BR', [])

  assert.equal(canWriteCompany(20, tenantAdmin), true)
  assert.equal(canWriteCompany(99, tenantAdmin), false)
  assert.equal(canWriteCompany(20, viewer), false)
  assert.equal(canWriteRow({ owner_company_id: 21 }, 'file', tenantAdmin), true)
  assert.equal(canWriteRow({ owner_company_id: 99 }, 'file', tenantAdmin), false)
  assert.equal(canWriteRow({ owner_company_id: 20 }, 'pod', tenantAdmin), true)
  assert.equal(canWriteRow({ com_brand_id: 99, com_user_id: 20 }, 'pod', tenantAdmin), false)
})

test('平台管理员拥有平台范围写权限，可写任意公司/资源（对齐后端 has_platform_scope）', () => {
  // writable_companies 为空，证明放行不依赖它，而依赖 platform.permission.manage
  const platformAdmin = user('admin', 'PF', [], Object.values(PERMISSION))

  assert.equal(canWriteCompany(99, platformAdmin), true)
  assert.equal(canWriteRow({ owner_company_id: 99 }, 'file', platformAdmin), true)
  assert.equal(canWriteRow({ manufacturer_id: 99 }, 'host', platformAdmin), true)
  // 即使资源行没有任何归属公司字段（如尚未出货的主机），平台管理员仍可写
  assert.equal(canWriteRow({}, 'host', platformAdmin), true)
})

test('每个受保护命名路由都登记统一能力，路由文件不再维护 roles 数组', async () => {
  const routerSource = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const routeNames = [...routerSource.matchAll(/name:\s*'([^']+)'/g)].map(match => match[1])
  const protectedRouteNames = routeNames.filter(name => ![
    'Login',
    'AcceptInvitation',
    'RequestPasswordReset',
    'ResetPassword'
  ].includes(name))

  assert.equal(routerSource.includes('roles:'), false)
  assert.equal(ROUTE_PERMISSION.Notifications, PERMISSION.POD_VIEW)
  for (const routeName of protectedRouteNames) {
    assert.ok(ROUTE_PERMISSION[routeName], `路由 ${routeName} 未登记权限`)
  }
})

test('权限不足时进入可见的独立提示页，不中止首次导航或依赖 Toast', async () => {
  const routerSource = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const accessDeniedSource = await readFile(new URL('../src/views/AccessDenied.vue', import.meta.url), 'utf8')

  assert.match(routerSource, /path:\s*'\/access-denied',\s*name:\s*'AccessDenied'/)
  assert.match(routerSource, /authorizationFailure:\s*true/)
  assert.match(routerSource, /next\(\{ name:\s*'AccessDenied',\s*query:\s*\{ redirect:\s*to\.fullPath \} \}\)/)
  assert.equal(routerSource.includes('next(false)'), false)
  assert.equal(ROUTE_PERMISSION.AccessDenied, PERMISSION.AUTHENTICATED)
  assert.match(accessDeniedSource, /auth\.no_permission/)
  assert.match(accessDeniedSource, /auth\.access_denied_help/)
})

test('权限不足页的可见文案覆盖八种语言', async () => {
  const localeNames = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  const keys = ['access_denied_back', 'access_denied_help', 'access_denied_profile', 'access_denied_title']

  for (const localeName of localeNames) {
    const source = await readFile(new URL(`../src/locales/${localeName}.json`, import.meta.url), 'utf8')
    const locale = JSON.parse(source)
    for (const key of keys) {
      assert.ok(locale.auth[key], `${localeName} 缺少 auth.${key}`)
    }
  }
})
