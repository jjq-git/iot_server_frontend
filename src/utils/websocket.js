/**
 * WebSocket 设备状态推送工具类
 * 用于实时接收设备状态更新，无需轮询
 */
import { appConfig } from '@/utils/config'

class WebSocketManager {
  constructor () {
    this.ws = null
    this.reconnectTimer = null
    this.heartbeatTimer = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.reconnectDelay = 3000
    this.heartbeatInterval = 30000
    this.hostSubscriptions = new Set()
    this.connectionId = null
    this.lastDiagnostic = null
    this.manualDisconnect = false
    this.callbacks = {
      statusUpdate: null,
      commandAck: null,
      odDumpProgress: null,
      emcyEvent: null,
      connected: null,
      error: null,
      close: null
    }
  }

  getWsBaseUrl () {
    return appConfig.getWebSocketApiBase()
  }

  getToken () {
    return localStorage.getItem('token')
  }

  async connectBatch (hostUuids, callbacks = {}) {
    if (!hostUuids || hostUuids.length === 0) {
      console.warn('[WebSocket] 主机列表为空，跳过连接')
      return
    }

    Object.assign(this.callbacks, callbacks)
    this.manualDisconnect = false

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.updateSubscriptions(hostUuids)
      return
    }

    const token = this.getToken()
    if (!token) {
      console.error('[WebSocket] 未找到 Token，无法连接')
      return
    }

    const wsUrl = `${this.getWsBaseUrl()}/ws/hosts/status-batch`
    console.log('[WebSocket] 正在建立批量订阅连接')

    try {
      this.ws = new WebSocket(wsUrl, ['bearer', token])

      this.ws.onopen = () => {
        console.log('[WebSocket] 连接成功')
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('[WebSocket] 消息解析失败', { connectionId: this.connectionId })
        }
      }

      this.ws.onerror = () => {
        const diagnostic = this.transportDiagnostic()
        console.error('[WebSocket] 传输错误', diagnostic)
        if (this.callbacks.error) {
          this.callbacks.error(diagnostic)
        }
      }

      this.ws.onclose = (event) => {
        console.log('[WebSocket] 连接关闭', this.closeDiagnostic(event))
        this.stopHeartbeat()
        if (this.callbacks.close) {
          this.callbacks.close(event)
        }
        if (this.shouldReconnect(event)) this.scheduleReconnect(hostUuids, callbacks)
      }
    } catch (error) {
      console.error('[WebSocket] 连接异常:', error)
      this.scheduleReconnect(hostUuids, callbacks)
    }
  }

  connectSingle (hostUuid, callbacks = {}) {
    if (!hostUuid) {
      console.warn('[WebSocket] 主机 UUID 为空，跳过连接')
      return
    }

    Object.assign(this.callbacks, callbacks)
    this.manualDisconnect = false
    this.hostSubscriptions.add(hostUuid)

    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.hostSubscriptions.has(hostUuid)) {
      return
    }

    const token = this.getToken()
    if (!token) {
      console.error('[WebSocket] 未找到 Token，无法连接')
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 复用现有连接，订阅:', hostUuid)
      return
    }

    const wsUrl = `${this.getWsBaseUrl()}/ws/hosts/${hostUuid}/status`
    console.log('[WebSocket] 正在建立单设备订阅连接')

    try {
      this.ws = new WebSocket(wsUrl, ['bearer', token])

      this.ws.onopen = () => {
        console.log('[WebSocket] 连接成功')
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('[WebSocket] 消息解析失败', { connectionId: this.connectionId })
        }
      }

      this.ws.onerror = () => {
        const diagnostic = this.transportDiagnostic()
        console.error('[WebSocket] 传输错误', diagnostic)
        if (this.callbacks.error) {
          this.callbacks.error(diagnostic)
        }
      }

      this.ws.onclose = (event) => {
        console.log('[WebSocket] 连接关闭', this.closeDiagnostic(event))
        this.stopHeartbeat()
        if (this.callbacks.close) {
          this.callbacks.close(event)
        }
        if (this.shouldReconnect(event)) this.scheduleReconnectSingle(hostUuid, callbacks)
      }
    } catch (error) {
      console.error('[WebSocket] 连接异常:', error)
      this.scheduleReconnectSingle(hostUuid, callbacks)
    }
  }

  handleMessage (data) {
    switch (data.type) {
      case 'connected':
      case 'subscribed':
        this.connectionId = data.connection_id || this.connectionId
        console.log('[WebSocket] 订阅成功', { connectionId: this.connectionId })
        if (this.callbacks.connected) {
          this.callbacks.connected(data)
        }
        break

      case 'status_update':
        if (this.callbacks.statusUpdate) {
          this.callbacks.statusUpdate(data)
        }
        break

      case 'command_ack':
        if (this.callbacks.commandAck) {
          this.callbacks.commandAck(data)
        }
        break

      case 'od_dump_progress':
        if (this.callbacks.odDumpProgress) {
          this.callbacks.odDumpProgress(data)
        }
        break

      case 'emcy_event':
        if (this.callbacks.emcyEvent) {
          this.callbacks.emcyEvent(data)
        }
        break

      case 'pong':
        break

      case 'error':
        this.connectionId = data.connection_id || this.connectionId
        this.lastDiagnostic = {
          type: 'server_error',
          code: data.code || 'ws_server_error',
          stage: data.stage || 'unknown',
          closeCode: data.close_code || null,
          connectionId: this.connectionId,
          message: data.message || ''
        }
        console.error('[WebSocket] 服务端拒绝连接', this.lastDiagnostic)
        if (this.callbacks.error) {
          this.callbacks.error(this.lastDiagnostic)
        }
        break

      default:
        console.warn('[WebSocket] 未知消息类型:', data.type)
    }
  }

  updateSubscriptions (hostUuids) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const oldSubscriptions = Array.from(this.hostSubscriptions)
    const newSubscriptions = hostUuids.filter(uuid => !oldSubscriptions.includes(uuid))
    const removedSubscriptions = oldSubscriptions.filter(uuid => !hostUuids.includes(uuid))

    newSubscriptions.forEach(uuid => {
      this.ws.send(JSON.stringify({ type: 'subscribe', host_uuid: uuid }))
      this.hostSubscriptions.add(uuid)
    })

    removedSubscriptions.forEach(uuid => {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', host_uuid: uuid }))
      this.hostSubscriptions.delete(uuid)
    })

    console.log('[WebSocket] 订阅更新:', { added: newSubscriptions.length, removed: removedSubscriptions.length })
  }

  startHeartbeat () {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, this.heartbeatInterval)
  }

  stopHeartbeat () {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  transportDiagnostic () {
    return {
      type: 'transport_error',
      connectionId: this.connectionId,
      lastServerDiagnostic: this.lastDiagnostic
    }
  }

  closeDiagnostic (event) {
    return {
      type: 'close',
      code: event.code,
      reason: event.reason || '',
      wasClean: event.wasClean,
      connectionId: this.connectionId,
      lastServerDiagnostic: this.lastDiagnostic
    }
  }

  shouldReconnect (event) {
    return !this.manualDisconnect && ![4001, 4003].includes(event.code)
  }

  scheduleReconnect (hostUuids, callbacks) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    console.log(`[WebSocket] ${delay / 1000}秒后第 ${this.reconnectAttempts} 次重连...`)

    this.reconnectTimer = setTimeout(() => {
      this.connectBatch(hostUuids, callbacks)
    }, delay)
  }

  scheduleReconnectSingle (hostUuid, callbacks) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] 达到最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    console.log(`[WebSocket] ${delay / 1000}秒后第 ${this.reconnectAttempts} 次重连...`)

    this.reconnectTimer = setTimeout(() => {
      this.connectSingle(hostUuid, callbacks)
    }, delay)
  }

  disconnect () {
    this.manualDisconnect = true
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      // 主动断开时移除 onclose，避免旧连接按原订阅自动重连。
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.hostSubscriptions.clear()
    this.reconnectAttempts = 0
    this.connectionId = null
    this.lastDiagnostic = null
    this.callbacks = {
      statusUpdate: null,
      commandAck: null,
      odDumpProgress: null,
      emcyEvent: null,
      connected: null,
      error: null,
      close: null
    }
    console.log('[WebSocket] 已断开连接')
  }

  isConnected () {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }
}

export default new WebSocketManager()
