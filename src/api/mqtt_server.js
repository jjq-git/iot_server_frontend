/**
 * MQTT 服务器(EMQX)管理 API
 *
 * 后端 iot_server 代理 EMQX REST API,前端只调 /api/v1/mqtt-server/*
 * EMQX 凭据(EMQX_DASHBOARD_URL/USERNAME/PASSWORD)只在后端配置,
 * 前端任何地方都不接触,也不允许直连 EMQX。
 *
 * /health 返回 {"configured": false} 时,各页面应渲染友好降级提示而非错误。
 */
import http from './http'

// 探活与总览
export const fetchMqttHealth = () => http.get('/mqtt-server/health')
export const fetchMqttOverview = () => http.get('/mqtt-server/overview')

// 客户端
export const fetchMqttClients = (params = {}) =>
  http.get('/mqtt-server/clients', { params })
export const fetchMqttClientDetail = (clientid) =>
  http.get(`/mqtt-server/clients/${encodeURIComponent(clientid)}`)
export const disconnectMqttClient = (clientid) =>
  http.delete(`/mqtt-server/clients/${encodeURIComponent(clientid)}`)

// 订阅
export const fetchMqttSubscriptions = (params = {}) =>
  http.get('/mqtt-server/subscriptions', { params })

// 主题路由 + 指标
export const fetchMqttTopics = (params = {}) =>
  http.get('/mqtt-server/topics', { params })
export const fetchMqttTopicMetrics = () =>
  http.get('/mqtt-server/topic-metrics')

// 监听器
export const fetchMqttListeners = () => http.get('/mqtt-server/listeners')

// 黑名单
export const fetchMqttBanned = () => http.get('/mqtt-server/banned')
export const addMqttBanned = (payload) =>
  http.post('/mqtt-server/banned', payload)
export const removeMqttBanned = (as, who) =>
  http.delete(
    `/mqtt-server/banned/${encodeURIComponent(as)}/${encodeURIComponent(who)}`
  )
