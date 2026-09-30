import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('pod create distinguishes the pod serial from the controller serial', async () => {
  const pods = await readFile(new URL('../src/views/Pods.vue', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/views/PodDetail.vue', import.meta.url), 'utf8')

  assert.ok(pods.includes('v-model.trim="form.serial_no"'))
  assert.ok(pods.includes('serial_no: this.form.serial_no || null'))
  assert.ok(pods.includes("serial_number: { key: 'serial_number'"))
  assert.ok(pods.includes("key: 'serial_no'"))
  assert.ok(pods.includes("data.item.serial_no || $t('pods.table.serial_no_missing')"))
  assert.ok(pods.includes("data.item.manufacturer_name || '-'"))
  assert.ok(pods.includes('pods.create_dialog.serial_no_hint'))
  assert.ok(detail.includes("startEdit('serial_no', detail.serial_no)"))
  assert.ok(detail.includes('updateData.serial_no ='))
  assert.doesNotMatch(detail, /isPlatformAdmin/)
})

test('receipt confirmation is only offered for hosts because nodes have no receipt endpoint', async () => {
  const api = await readFile(new URL('../src/api/hosts.js', import.meta.url), 'utf8')
  const hosts = await readFile(new URL('../src/views/Hosts.vue', import.meta.url), 'utf8')
  const nodes = await readFile(new URL('../src/views/Nodes.vue', import.meta.url), 'utf8')

  assert.match(api, /http\.post\(`\/hosts\/\$\{hostId\}\/receive`\)/)
  assert.ok(hosts.includes('canConfirmReceipt(data.item)'))
  assert.ok(hosts.includes('await confirmHostReceipt(row.uuid)'))
  assert.ok(hosts.includes('!row?.shipped_at || row?.received_at'))
  assert.doesNotMatch(nodes, /confirmHostReceipt|canConfirmHostReceipt|confirmReceipt/)
  assert.doesNotMatch(nodes, /nodes\.actions\.confirm_receipt/)
})

test('node lifecycle state uses retire and restore endpoints instead of generic update', async () => {
  const detail = await readFile(new URL('../src/views/NodeDetail.vue', import.meta.url), 'utf8')
  const nodes = await readFile(new URL('../src/views/Nodes.vue', import.meta.url), 'utf8')

  assert.doesNotMatch(detail, /saveFieldEdit\('is_active'\)/)
  assert.ok(nodes.includes('await retireNode(row.uuid)'))
  assert.ok(nodes.includes('await restoreNode(row.uuid)'))
})

test('host edits require the company-management capability used by backend administrators', async () => {
  const detail = await readFile(new URL('../src/views/HostDetail.vue', import.meta.url), 'utf8')

  assert.match(detail, /permissionCapabilities:\s*\{\s*edit: PERMISSION\.USER_MANAGE/)
  assert.doesNotMatch(detail, /role\s*===|role\s*!==/)
})

test('duplicate pod model edits preserve the entered name', async () => {
  const models = await readFile(new URL('../src/views/PodModels.vue', import.meta.url), 'utf8')

  assert.equal(models.includes('this.editDetailForm[field] = this.currentModel[field]'), false)
  assert.ok(models.includes("if (saved) this.editingField = ''"))
})
