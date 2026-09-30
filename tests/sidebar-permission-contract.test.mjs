import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sidebar = await readFile(new URL('../src/components/Sidebar.vue', import.meta.url), 'utf8')

test('设备菜单复用命名路由权限，无权限入口不会渲染', () => {
  assert.match(sidebar, /v-if="canSeeHnModels"[\s\S]*?navigateTo\('\/devices\/hn-models'\)/)
  assert.match(sidebar, /v-if="canSeeHosts"[\s\S]*?navigateTo\('\/devices\/hosts'\)/)
  assert.match(sidebar, /v-if="canSeeNodes"[\s\S]*?navigateTo\('\/devices\/nodes'\)/)

  assert.match(sidebar, /canSeeHnModels \(\) \{\s*return this\.canAccessRoute\('DevicesHnModels'\)/)
  assert.match(sidebar, /canSeeHosts \(\) \{\s*return this\.canAccessRoute\('DevicesHosts'\)/)
  assert.match(sidebar, /canSeeNodes \(\) \{\s*return this\.canAccessRoute\('DevicesNodes'\)/)
})

test('历史菜单在没有任何历史能力时整体隐藏', () => {
  assert.match(sidebar, /v-if="!collapsed && canSeeHistory" class="sidebar-section-label">DATA<\/div>/)
  assert.match(sidebar, /<div v-if="canSeeHistory" class="sidebar-group">/)
  assert.match(sidebar, /v-if="canSeeSensorHistory"[\s\S]*?navigateTo\('\/history\/sensors'\)/)
  assert.match(sidebar, /canSeeSensorHistory \(\) \{\s*return this\.canAccessRoute\('HistorySensors'\)/)
})

test('侧栏能力判断从统一路由权限表读取并默认拒绝', () => {
  assert.match(sidebar, /import \{[\s\S]*?getRoutePermission,[\s\S]*?\} from '@\/utils\/permission'/)
  assert.match(
    sidebar,
    /canAccessRoute \(routeName\) \{\s*const permission = getRoutePermission\(routeName\)\s*return Boolean\(permission && this\.hasCapability\(permission\)\)/
  )
})
