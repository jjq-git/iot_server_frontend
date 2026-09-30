import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('pod history API exposes topology, lifecycle, and host replacement operations', async () => {
  const source = await readFile(new URL('../src/api/pods.js', import.meta.url), 'utf8')
  for (const path of ['/topology-history', '/lifecycle-events', '/host']) {
    assert.ok(source.includes(path), `missing pod history API path ${path}`)
  }
})

test('pod detail renders the read-only history panel with server resource permissions', async () => {
  const detail = await readFile(new URL('../src/views/PodDetail.vue', import.meta.url), 'utf8')
  const panel = await readFile(new URL('../src/components/PodHistoryPanel.vue', import.meta.url), 'utf8')

  assert.ok(detail.includes('<pod-history-panel'))
  assert.ok(detail.includes(':current-topology-version="detail.current_topology_version"'))
  assert.ok(detail.includes(':resource-permissions="detail.resource_permissions || []"'))
  assert.ok(panel.includes('fetchPodTopologyVersion'))
  assert.ok(panel.includes('this.resourcePermissions.includes(PERMISSION.POD_MAINTAIN)'))
  assert.equal(/http\.(post|put|delete)\([^\n]*topology-history/.test(panel), false)
})

test('node replacement records a mandatory reason', async () => {
  const binding = await readFile(new URL('../src/views/HostNodeBinding.vue', import.meta.url), 'utf8')
  assert.ok(binding.includes('errors.reason'))
  assert.ok(binding.includes('reason: this.form.reason.trim()'))
})

test('history pagers keep clear spacing from their tables', async () => {
  const panel = await readFile(new URL('../src/components/PodHistoryPanel.vue', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/assets/styles/_pod-history-panel.scss', import.meta.url), 'utf8')

  assert.equal((panel.match(/class="pod-history-panel__pager"/g) || []).length, 2)
  assert.match(styles, /&__pager\s*{[\s\S]*?padding:\s*20px 0 12px/)
  assert.doesNotMatch(panel, /<style/)
})

test('all locales declare the pod history namespace', async () => {
  const localeNames = ['de-DE', 'en-US', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']
  for (const localeName of localeNames) {
    const source = await readFile(new URL(`../src/locales/${localeName}.json`, import.meta.url), 'utf8')
    const locale = JSON.parse(source)
    assert.equal(typeof locale.pod_history?.topology_title, 'string', `${localeName} misses pod_history`)
    assert.equal(typeof locale.pod_history?.events?.host_replace, 'string', `${localeName} misses pod history events`)
  }
})
