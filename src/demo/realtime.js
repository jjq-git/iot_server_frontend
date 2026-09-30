const DEFAULT_INTERVAL_MS = 4000
const listeners = new Map()

const channelForPod = podUuid => `pod:${podUuid}`
const hashString = value => [...String(value)].reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261)
const boundedWave = (key, tick, minimum, maximum) => {
  const span = maximum - minimum
  const phase = (hashString(key) % 17 + tick) % 17
  const ratio = phase <= 8 ? phase / 8 : (16 - phase) / 8
  return Number((minimum + span * ratio).toFixed(1))
}

const subscribe = (channel, callback) => {
  if (!listeners.has(channel)) listeners.set(channel, new Set())
  listeners.get(channel).add(callback)
  return () => {
    const callbacks = listeners.get(channel)
    if (!callbacks) return
    callbacks.delete(callback)
    if (!callbacks.size) listeners.delete(channel)
  }
}

const publish = (channel, payload) => {
  for (const callback of listeners.get(channel) || []) callback(payload)
}

const createClock = options => ({
  intervalMs: options.intervalMs || DEFAULT_INTERVAL_MS,
  now: options.now || (() => new Date()),
  setInterval: options.setInterval || globalThis.setInterval.bind(globalThis),
  clearInterval: options.clearInterval || globalThis.clearInterval.bind(globalThis)
})

export function publishDemoCommandAck (podUuid, command) {
  publish(channelForPod(podUuid), {
    type: 'command_ack',
    pod_uuid: String(podUuid),
    command_id: command.command_id,
    command: command.command,
    status: command.status,
    acknowledged_at: command.sent_at
  })
}

export function createDemoHostRealtime (options = {}) {
  const clock = createClock(options)
  let callbacks = {}
  let timer = null
  let tick = 0
  let connected = false
  const subscriptions = new Set()

  const emitStatus = () => {
    tick += 1
    for (const hostUuid of subscriptions) {
      callbacks.statusUpdate?.({
        type: 'status_update',
        host_uuid: hostUuid,
        data: {
          is_online: true,
          last_seen: clock.now().toISOString(),
          occupancy: Math.floor(boundedWave(hostUuid, tick, 0, 1)),
          temperature: boundedWave(hostUuid, tick, 22.5, 24.5),
          humidity: boundedWave(`${hostUuid}:humidity`, tick, 44, 52)
        }
      })
    }
  }

  const start = () => {
    if (connected || !subscriptions.size) return
    connected = true
    Promise.resolve().then(() => callbacks.connected?.({ type: 'connected', connection_id: 'demo-host-realtime' }))
    timer = clock.setInterval(emitStatus, clock.intervalMs)
  }

  const connectSingle = (hostUuid, nextCallbacks = {}) => {
    if (!hostUuid) return
    callbacks = { ...callbacks, ...nextCallbacks }
    subscriptions.add(String(hostUuid))
    start()
  }

  const connectBatch = (hostUuids, nextCallbacks = {}) => {
    const requested = (hostUuids || []).filter(Boolean).map(String)
    if (!requested.length) return
    callbacks = { ...callbacks, ...nextCallbacks }
    subscriptions.clear()
    requested.forEach(hostUuid => subscriptions.add(hostUuid))
    start()
  }

  const disconnect = () => {
    if (timer !== null) clock.clearInterval(timer)
    timer = null
    tick = 0
    connected = false
    subscriptions.clear()
    callbacks = {}
  }

  const updateSubscriptions = hostUuids => {
    subscriptions.clear()
    ;(hostUuids || []).filter(Boolean).map(String).forEach(hostUuid => subscriptions.add(hostUuid))
    if (!subscriptions.size) disconnect()
    else start()
  }

  return Object.freeze({
    connect: connectSingle,
    connectSingle,
    connectBatch,
    disconnect,
    isConnected: () => connected,
    updateSubscriptions
  })
}

export function createDemoPodRealtime (options = {}) {
  const clock = createClock(options)
  let callbacks = {}
  let podUuid = null
  let timer = null
  let unsubscribe = null
  let tick = 0

  const disconnect = () => {
    if (timer !== null) clock.clearInterval(timer)
    if (unsubscribe) unsubscribe()
    timer = null
    unsubscribe = null
    podUuid = null
    tick = 0
    callbacks = {}
  }

  const connect = (nextPodUuid, nextCallbacks = {}) => {
    if (!nextPodUuid) return
    disconnect()
    podUuid = String(nextPodUuid)
    callbacks = { ...nextCallbacks }
    unsubscribe = subscribe(channelForPod(podUuid), event => callbacks.onCommandAck?.(event))
    Promise.resolve().then(() => callbacks.onOpen?.())
    timer = clock.setInterval(() => {
      tick += 1
      callbacks.onStatusUpdate?.({
        type: 'status_update',
        pod_uuid: podUuid,
        control_values_accepted: true,
        status: {
          is_online: true,
          last_seen: clock.now().toISOString(),
          occupancy: Math.floor(boundedWave(podUuid, tick, 0, 1))
        },
        data: []
      })
    }, clock.intervalMs)
  }

  return Object.freeze({ connect, disconnect, isConnected: () => Boolean(podUuid) })
}
