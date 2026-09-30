import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const managerSource = fs.readFileSync(new URL('../src/utils/websocket.js', import.meta.url), 'utf8')
const podSource = fs.readFileSync(new URL('../src/services/realtime/podWebSocket.js', import.meta.url), 'utf8')
const mqttSource = fs.readFileSync(new URL('../src/api/debug/mqtt_stream.js', import.meta.url), 'utf8')

test('websocket clients correlate structured diagnostics and stop retrying authorization failures', () => {
  for (const source of [managerSource, podSource, mqttSource]) {
    assert.match(source, /connection_id/)
    assert.match(source, /lastServerDiagnostic/)
    assert.match(source, /4001, 4003/)
  }
})

test('shared manager does not log raw websocket payloads or token-bearing URLs', () => {
  assert.doesNotMatch(managerSource, /收到原始消息/)
  assert.doesNotMatch(managerSource, /正在连接:', wsUrl/)
})
