import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('host list and detail show topology completion independently from connectivity', async () => {
  const [list, detail] = await Promise.all([
    source('src/views/Hosts.vue'),
    source('src/views/HostDetail.vue')
  ])

  for (const view of [list, detail]) {
    assert.match(view, /topology_pending/)
    assert.match(view, /hosts\.status\.topology_pending/)
    assert.match(view, /statusLabel/)
  }

  assert.match(list, /statusData\.enrollment_state/)
  assert.match(detail, /statusData\.enrollment_state/)
})
