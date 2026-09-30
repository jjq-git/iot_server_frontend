import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('pod list shows online status by default', async () => {
  const source = await readFile(new URL('../src/views/Pods.vue', import.meta.url), 'utf8')
  const onlineColumnDefaults = [...source.matchAll(/prop:\s*'is_online',\s*label:[^\n]+visible:\s*(true|false)/g)]

  assert.equal(onlineColumnDefaults.length, 2)
  assert.ok(onlineColumnDefaults.every(match => match[1] === 'true'))
})
