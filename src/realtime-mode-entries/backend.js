import wsManager from '@/utils/websocket.js'
import podWebSocket from '@/services/realtime/podWebSocket'

export const legacyRealtimeManager = wsManager

export const podDetailRealtime = Object.freeze({
  connect: (hostUuid, callbacks) => wsManager.connectSingle(hostUuid, callbacks),
  disconnect: () => wsManager.disconnect()
})

export const podControlRealtime = Object.freeze({
  connect: (podUuid, callbacks) => podWebSocket.connect(podUuid, callbacks),
  disconnect: () => podWebSocket.disconnect()
})
