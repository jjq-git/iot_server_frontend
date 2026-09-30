import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('retired handover and relation APIs are absent from the active frontend contract', async () => {
  const api = await readFile(new URL('../src/api/pods.js', import.meta.url), 'utf8')
  const router = await readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  const permission = await readFile(new URL('../src/utils/permission.js', import.meta.url), 'utf8')
  const sidebar = await readFile(new URL('../src/components/Sidebar.vue', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/views/PodDetail.vue', import.meta.url), 'utf8')

  for (const path of ['/pods/handover-inbox', '/handover-requests', '/relations']) {
    assert.equal(api.includes(path), false, `retired API path remains: ${path}`)
  }
  assert.equal(router.includes('PodHandovers'), false)
  assert.ok(router.includes("{ path: 'pods/handovers', redirect: '/pods' }"))
  assert.ok(router.indexOf("path: 'pods/handovers'") < router.indexOf("path: 'pods/:podId'"))
  assert.equal(permission.includes('POD_HANDOVERS'), false)
  assert.equal(sidebar.includes('/pods/handovers'), false)
  assert.equal(detail.includes('PodOwnershipPanel'), false)
})

test('pod ownership changes use the two-stage transfer endpoints', async () => {
  const api = await readFile(new URL('../src/api/pods.js', import.meta.url), 'utf8')
  const pods = await readFile(new URL('../src/views/Pods.vue', import.meta.url), 'utf8')

  assert.equal(api.includes('http.put(`/pods/${podId}/assign`, data)'), false)
  assert.ok(api.includes('http.post(`/pods/${podId}/transfers`, data)'))
  assert.ok(api.includes("http.get('/pods/transfers/incoming'"))
  assert.ok(api.includes('/receive`, data)'))
  assert.ok(api.includes('/reject`, data)'))
  assert.ok(pods.includes('await createPodTransfer(this.currentAssignPod.uuid, transferData)'))
  assert.ok(pods.includes('await fetchIncomingPodTransfers'))
})

test('sidebar probes optional icon library through the non-error availability endpoint', async () => {
  const api = await readFile(new URL('../src/api/iconLibrary.js', import.meta.url), 'utf8')
  const sidebar = await readFile(new URL('../src/components/Sidebar.vue', import.meta.url), 'utf8')

  assert.ok(api.includes("http.get('/icon-library/availability')"))
  assert.ok(sidebar.includes('await getIconLibraryAvailability()'))
  assert.ok(sidebar.includes('data.available === true'))
  assert.equal(sidebar.includes('await getIconLibrary()'), false)
})
