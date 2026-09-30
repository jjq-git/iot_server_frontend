import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('host detail renders only credential status and fingerprint', async () => {
  const detail = await source('src/views/HostDetail.vue')

  assert.match(detail, /detail\.key_configured/)
  assert.match(detail, /detail\.key_fingerprint/)
  assert.doesNotMatch(detail, /detail\.device_key/)
  assert.doesNotMatch(detail, /copyDeviceKey|rotateDeviceKey/)
})
