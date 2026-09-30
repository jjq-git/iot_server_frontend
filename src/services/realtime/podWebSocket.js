/**
 * Pod 事件 WebSocket 服务
 * 连接 /ws/pods/{podUuid}/events，实时接收 status_update 和 command_ack
 */
import { appConfig } from '@/utils/config'

class PodWebSocket {
  constructor () {
    this.ws = null
    this.podUuid = null
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.callbacks = { onOpen: null, onStatusUpdate: null, onCommandAck: null, onError: null }
    this._destroyed = false
    this._reconnectAttempts = 0
    this.connectionId = null
    this.lastDiagnostic = null
  }

  _getToken () {
    return localStorage.getItem('token')
  }

  _deriveWsBaseUrl () {
    return appConfig.getWebSocketApiBase()
  }

  connect (podUuid, callbacks = {}) {
    if (this.podUuid === podUuid && this.ws && this.ws.readyState === WebSocket.OPEN) {
      return // 已连接，不用重复
    }
    this.disconnect()
    this._destroyed = false
    this.podUuid = podUuid
    Object.assign(this.callbacks, callbacks)

    const token = this._getToken()
    if (!token) {
      console.warn('[PodWS] 无 token')
      return
    }

    const url = `${this._deriveWsBaseUrl()}/ws/pods/${podUuid}/events`
    console.log('[PodWS] 正在建立单元事件连接')

    try {
      this.ws = new WebSocket(url, ['bearer', token])
      this.ws.onopen = () => {
        console.log('[PodWS] 已连接', podUuid)
        this._reconnectAttempts = 0
        this._startHeartbeat()
        if (this.callbacks.onOpen) this.callbacks.onOpen()
      }
      this.ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data)
          this._handleMessage(msg)
        } catch (e) {
          console.error('[PodWS] 消息解析失败', e)
        }
      }
      this.ws.onerror = () => {
        const diagnostic = {
          type: 'transport_error',
          connectionId: this.connectionId,
          lastServerDiagnostic: this.lastDiagnostic
        }
        console.error('[PodWS] 传输错误', diagnostic)
        if (this.callbacks.onError) this.callbacks.onError(diagnostic)
      }
      this.ws.onclose = event => {
        console.log('[PodWS] 连接关闭', {
          code: event.code,
          reason: event.reason || '',
          connectionId: this.connectionId,
          lastServerDiagnostic: this.lastDiagnostic
        })
        this._stopHeartbeat()
        if (!this._destroyed && ![4001, 4003].includes(event.code)) this._scheduleReconnect()
      }
    } catch (e) {
      console.error('[PodWS] 连接异常', e)
      if (!this._destroyed) this._scheduleReconnect()
    }
  }

  disconnect () {
    this._destroyed = true
    this.podUuid = null
    this._stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this._reconnectAttempts = 0
    this.connectionId = null
    this.lastDiagnostic = null
  }

  isConnected () {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  _handleMessage (msg) {
    if (msg.type === 'connected') {
      this.connectionId = msg.connection_id || this.connectionId
    } else if (msg.type === 'status_update' && this.callbacks.onStatusUpdate) {
      this.callbacks.onStatusUpdate(msg)
    } else if (msg.type === 'command_ack' && this.callbacks.onCommandAck) {
      this.callbacks.onCommandAck(msg)
    } else if (msg.type === 'pong') {
      // 心跳响应，无需处理
    } else if (msg.type === 'error') {
      this.connectionId = msg.connection_id || this.connectionId
      this.lastDiagnostic = {
        type: 'server_error',
        code: msg.code || 'ws_server_error',
        stage: msg.stage || 'unknown',
        closeCode: msg.close_code || null,
        connectionId: this.connectionId,
        message: msg.message || ''
      }
      console.error('[PodWS] 服务端拒绝连接', this.lastDiagnostic)
      if (this.callbacks.onError) this.callbacks.onError(this.lastDiagnostic)
    } else {
      console.warn('[PodWS] 未知消息:', msg.type)
    }
  }

  _startHeartbeat () {
    this._stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
  }

  _stopHeartbeat () {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  _scheduleReconnect () {
    if (this._reconnectAttempts >= 10) return
    this._reconnectAttempts++
    const delay = Math.min(3000 * Math.pow(2, this._reconnectAttempts - 1), 30000)
    console.log(`[PodWS] ${delay / 1000}s 后重连 (#${this._reconnectAttempts})`)
    this.reconnectTimer = setTimeout(() => {
      if (!this._destroyed && this.podUuid) {
        this.connect(this.podUuid, this.callbacks)
      }
    }, delay)
  }
}

export default new PodWebSocket()
