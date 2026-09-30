import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const realtimePromise = readFile(new URL('../src/demo/realtime.js', import.meta.url), 'utf8')
  .then(source => import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`))

const createFakeClock = () => {
  const timers = new Map()
  let nextId = 1
  return {
    timers,
    options: {
      intervalMs: 10,
      now: () => new Date('2026-09-17T12:00:00.000Z'),
      setInterval: callback => {
        const id = nextId++
        timers.set(id, callback)
        return id
      },
      clearInterval: id => timers.delete(id)
    },
    tick () {
      for (const callback of [...timers.values()]) callback()
    }
  }
}

test('host realtime is deterministic, bounded and fully stops on disconnect', async () => {
  const realtime = await realtimePromise
  const clock = createFakeClock()
  const service = realtime.createDemoHostRealtime(clock.options)
  const connected = []
  const updates = []

  service.connectSingle('demo-host-office-01', {
    connected: event => connected.push(event),
    statusUpdate: event => updates.push(event)
  })
  await Promise.resolve()
  assert.equal(service.isConnected(), true)
  assert.equal(connected.length, 1)

  clock.tick()
  assert.equal(updates.length, 1)
  assert.equal(updates[0].host_uuid, 'demo-host-office-01')
  assert.ok(updates[0].data.temperature >= 22.5 && updates[0].data.temperature <= 24.5)
  assert.ok(updates[0].data.humidity >= 44 && updates[0].data.humidity <= 52)
  assert.ok([0, 1].includes(updates[0].data.occupancy))

  service.disconnect()
  assert.equal(service.isConnected(), false)
  assert.equal(clock.timers.size, 0)
  clock.tick()
  assert.equal(updates.length, 1)
})

test('pod realtime emits status and routes command acknowledgements to the active pod only', async () => {
  const realtime = await realtimePromise
  const clock = createFakeClock()
  const service = realtime.createDemoPodRealtime(clock.options)
  const opened = []
  const statuses = []
  const acknowledgements = []

  service.connect('demo-pod-office-01', {
    onOpen: () => opened.push(true),
    onStatusUpdate: event => statuses.push(event),
    onCommandAck: event => acknowledgements.push(event)
  })
  await Promise.resolve()
  assert.equal(opened.length, 1)
  assert.equal(service.isConnected(), true)

  clock.tick()
  assert.equal(statuses.length, 1)
  assert.equal(statuses[0].status.is_online, true)
  assert.equal(statuses[0].control_values_accepted, true)

  realtime.publishDemoCommandAck('another-pod', { command_id: 'ignored', command: 'restart', status: 'success', sent_at: 'now' })
  realtime.publishDemoCommandAck('demo-pod-office-01', { command_id: 'accepted', command: 'restart', status: 'success', sent_at: 'now' })
  assert.deepEqual(acknowledgements.map(item => item.command_id), ['accepted'])

  service.disconnect()
  realtime.publishDemoCommandAck('demo-pod-office-01', { command_id: 'after-close', command: 'restart', status: 'success', sent_at: 'now' })
  assert.equal(acknowledgements.length, 1)
  assert.equal(clock.timers.size, 0)
})
