/**
 * 调试 - MQTT 消息流 WebSocket
 *
 * 后端契约:
 *   GET ws://<host>/api/v1/ws/debug/mqtt-stream?host_uuid=<uuid>&topic=<filter>
 *   JWT 通过 Sec-WebSocket-Protocol: bearer, <token> 传递。
 *
 * 推送结构(由后端约定):
 *   { type: 'mqtt', ts: 1730000000.123, host_uuid: '...', topic: '...', payload: {...}, qos: 0 }
 *   { type: 'ping' } / { type: 'pong' }    心跳
 *
 * 重连策略:指数退避 1s -> 2s -> 4s ... 上限 30s,任意 onopen 后归零
 */
import { appConfig } from '@/utils/config'

/**
 * 计算 ws baseURL
 * 优先取 appConfig 的 apiBase,把 http(s) 替换为 ws(s),保留 path 前缀(/api/v1)。
 */
function resolveWsBase () {
  try {
    return appConfig.getWebSocketApiBase()
  } catch (e) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/v1`
  }
}

/**
 * 创建 MQTT 消息流连接
 * @param {Object} options
 * @param {string} [options.hostUuid]   按主机过滤
 * @param {string} [options.topic]      按 topic 过滤(包含匹配)
 * @param {Function} options.onMessage  收到消息回调
 * @param {Function} [options.onOpen]
 * @param {Function} [options.onClose]
 * @param {Function} [options.onError]
 * @returns {{ close: Function, send: Function }}
 */
export function createMqttStream ({ hostUuid = '', topic = '', onMessage, onOpen, onClose, onError }) {
  const token = localStorage.getItem('token') || ''
  const wsBase = resolveWsBase()
  const url = new URL(`${wsBase}/ws/debug/mqtt-stream`)
  if (hostUuid) url.searchParams.set('host_uuid', hostUuid)
  if (topic) url.searchParams.set('topic', topic)

  let ws = null
  let reconnectAttempts = 0
  let heartbeatTimer = null
  let reconnectTimer = null
  let manualClosed = false
  let connectionId = null
  let lastServerDiagnostic = null

  function clearTimers () {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function connect () {
    if (manualClosed) return
    try {
      ws = new WebSocket(url.toString(), token ? ['bearer', token] : [])
    } catch (e) {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      reconnectAttempts = 0
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000)
      onOpen && onOpen()
    }
    ws.onmessage = ev => {
      let data = ev.data
      try {
        data = JSON.parse(ev.data)
      } catch (e) { /* 透传 */ }
      if (data && typeof data === 'object') {
        connectionId = data.connection_id || connectionId
        if (data.type === 'error') {
          lastServerDiagnostic = {
            type: 'server_error',
            code: data.code || 'ws_server_error',
            stage: data.stage || 'unknown',
            closeCode: data.close_code || null,
            connectionId,
            message: data.message || ''
          }
          onError && onError(lastServerDiagnostic)
        }
      }
      onMessage && onMessage(data)
    }
    ws.onerror = () => {
      onError && onError({
        type: 'transport_error',
        connectionId,
        lastServerDiagnostic
      })
    }
    ws.onclose = ev => {
      clearTimers()
      onClose && onClose(ev, { connectionId, lastServerDiagnostic })
      if (!manualClosed && ![4001, 4003].includes(ev.code)) scheduleReconnect()
    }
  }

  function scheduleReconnect () {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(connect, delay)
  }

  connect()

  return {
    close () {
      manualClosed = true
      clearTimers()
      if (ws) {
        try { ws.close() } catch (e) { /* ignore */ }
      }
    },
    send (payload) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload))
      }
    }
  }
}
