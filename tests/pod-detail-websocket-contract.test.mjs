import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/views/PodDetail.vue', import.meta.url), 'utf8')
const backendRealtimeSource = readFileSync(new URL('../src/realtime-mode-entries/backend.js', import.meta.url), 'utf8')

test('pod detail subscribes to host status with the host UUID', () => {
  assert.match(source, /const hostUuid = this\.detail\.host && this\.detail\.host\.uuid/)
  assert.match(source, /podDetailRealtime\.connect\(hostUuid,/)
  assert.doesNotMatch(source, /podDetailRealtime\.connect\(podId,/)
  assert.match(backendRealtimeSource, /wsManager\.connectSingle\(hostUuid, callbacks\)/)
})
