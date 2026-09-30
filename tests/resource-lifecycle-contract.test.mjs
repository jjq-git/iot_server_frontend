import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('retire and restore API paths remain paired', async () => {
  const [hosts, nodes, pods] = await Promise.all([
    source('src/api/hosts.js'),
    source('src/api/nodes.js'),
    source('src/api/pods.js')
  ])

  assert.match(hosts, /http\.delete\(`\/hosts\/\$\{hostId\}`\)/)
  assert.match(hosts, /http\.post\(`\/hosts\/\$\{hostId\}\/restore`\)/)
  assert.match(nodes, /http\.delete\(`\/nodes\/\$\{nodeId\}`\)/)
  assert.match(nodes, /http\.post\(`\/nodes\/\$\{nodeId\}\/restore`\)/)
  assert.match(pods, /http\.delete\(`\/pods\/\$\{podId\}`\)/)
  assert.match(pods, /http\.post\(`\/pods\/\$\{podId\}\/restore`\)/)
})

test('lifecycle buttons are permission and active-state gated', async () => {
  const [hosts, nodes, pods] = await Promise.all([
    source('src/views/Hosts.vue'),
    source('src/views/Nodes.vue'),
    source('src/views/Pods.vue')
  ])

  assert.match(hosts, /hasPermission\(PERMISSION\.PLATFORM_DEVICE_MANAGE, this\.permissionUser\).*is_active === false/s)
  assert.match(nodes, /hasPermission\(PERMISSION\.PLATFORM_DEVICE_MANAGE, this\.permissionUser\).*is_active === false/s)
  // 后端 pods 退役/恢复 require_permission("pod.maintain") + ensure_pod_scope（pods.py），
  // 对应前端 POD_MAINTAIN；旧断言用 USER_MANAGE 与后端契约不符
  assert.match(pods, /hasPermission\(PERMISSION\.POD_MAINTAIN, user\).*canWriteRow\(row, 'pod', user\)/s)
  assert.match(pods, /data\.item\.is_active && canAssignPod\(\)/)
})

test('retired pod details remain auditable while write operations are disabled', async () => {
  const [detail, control, history] = await Promise.all([
    source('src/views/PodDetail.vue'),
    source('src/components/PodControlPanel.vue'),
    source('src/components/PodHistoryPanel.vue')
  ])

  assert.match(detail, /tabs\.control'\)" :disabled="isRetired"/)
  assert.match(detail, /isRetired \(\)[\s\S]*lifecycle_state === 'retired'/)
  assert.match(detail, /canEdit \(\)[\s\S]*return !this\.isRetired/)
  assert.match(detail, /pod-control-panel[^>]+:read-only="isRetired"/)
  assert.match(detail, /pod-history-panel[\s\S]*?:read-only="isRetired"/)
  assert.match(control, /canSendCommands \(\)[\s\S]*return !this\.readOnly/)
  assert.match(history, /canReplaceHost \(\)[\s\S]*!this\.readOnly[\s\S]*lifecycleState !== 'retired'/)
  assert.match(history, /submitHostReplacement \(\)[\s\S]*if \(!this\.canReplaceHost\) return/)
})

test('archive icon used by retirement is available through the app sprite', async () => {
  const [sprite, hosts, nodes, pods] = await Promise.all([
    source('src/assets/icons/icons.svg'),
    source('src/views/Hosts.vue'),
    source('src/views/Nodes.vue'),
    source('src/views/Pods.vue')
  ])
  assert.match(sprite, /id="icon-archive"/)
  for (const view of [hosts, nodes, pods]) {
    assert.match(view, /<app-icon name="archive"/)
  }
})

test('generic edit actions cannot bypass lifecycle endpoints', async () => {
  const views = await Promise.all([
    source('src/views/Hosts.vue'),
    source('src/views/Nodes.vue'),
    source('src/views/Pods.vue')
  ])

  for (const view of views) {
    assert.doesNotMatch(view, /update(?:Host|Node|Pod)\([^\n]+\{\s*is_active:/)
  }
})

test('device creation model options follow lifecycle and role policy', async () => {
  const [hostApi, hosts, nodes] = await Promise.all([
    source('src/api/hosts.js'),
    source('src/views/Hosts.vue'),
    source('src/views/Nodes.vue')
  ])

  assert.match(hostApi, /includeSample[\s\S]*\['sample', 'active'\][\s\S]*\['active'\]/)
  assert.match(hosts, /@click="openCreateDialog"/)
  assert.match(hosts, /await this\.fetchModelOptions\(\)[\s\S]*this\.showCreateDialog = true/)
  assert.match(hosts, /includeSample: this\.isPlatformAdmin\(\)/)
  assert.match(nodes, /@click="openCreateDialog"/)
  assert.match(nodes, /await this\.loadOptions\(\)[\s\S]*this\.showCreateDialog = true/)
  assert.match(nodes, /this\.isPlatformAdmin\(\)[\s\S]*\['sample', 'active'\][\s\S]*\.filter\(model => allowedStatuses\.includes\(model\.status\)\)/)
})

test('host creation sends only fields accepted by the backend contract', async () => {
  const hosts = await source('src/views/Hosts.vue')

  assert.match(hosts, /\['serial_no', 'remark'\]/)
  assert.doesNotMatch(hosts, /createForm\.device_key|hosts-create-device-key/)
  assert.match(hosts, /!payload\[field\]\.trim\(\)[\s\S]*delete payload\[field\][\s\S]*await createHost\(payload\)/)
})

test('device shipment and pod transfer options use current company capability fields', async () => {
  const [hosts, nodes, pods] = await Promise.all([
    source('src/views/Hosts.vue'),
    source('src/views/Nodes.vue'),
    source('src/views/Pods.vue')
  ])

  assert.match(hosts, /filter\(item => item\.is_pod_manufacturer/)
  assert.match(nodes, /filter\(item => item\.is_pod_manufacturer/)
  assert.match(pods, /distributor: 'is_channel_partner'/)
  assert.match(pods, /agent: 'is_channel_partner'/)
})
