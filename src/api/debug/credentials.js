/**
 * 调试 - 设备凭证管理
 *
 * 本模块对接 iot_server 后端 `/api/v1/debug/credentials/*` 路由
 * (见 backend/app/api/debug_credentials.py)。
 *
 * 字段约定 (与 device_credentials 表 / CredentialBase schema 一致):
 *   - 主键叫 `uuid`(不是 `id`),所有路径参数使用该字段
 *   - 用户名/密码字段叫 `mqtt_username` / `mqtt_password`(不是 `username` / `password`)
 *   - `mqtt_password` 为 EMQX 5 plain auth 明文,**仅在 create / rotate-password 响应里回显一次**,
 *     列表/详情/吊销/恢复响应均不含该字段;前端拿到后必须立即让用户保存
 *   - 列表响应形如 `{ total, page, page_size, items: [...] }`
 *
 * 后端 axios 实例 (../http) 的 baseURL 已包含 `/api/v1`,因此此处 path 仅写 `/debug/...`。
 */
import http from '../http'

export const fetchCredentials = (params = {}) =>
  http.get('/debug/credentials', { params })

export const getCredential = uuid =>
  http.get(`/debug/credentials/${encodeURIComponent(uuid)}`)

export const createCredential = payload =>
  http.post('/debug/credentials', payload)

export const rotateCredentialPassword = uuid =>
  http.post(`/debug/credentials/${encodeURIComponent(uuid)}/rotate-password`)

export const revokeCredential = uuid =>
  http.post(`/debug/credentials/${encodeURIComponent(uuid)}/revoke`)

export const restoreCredential = uuid =>
  http.post(`/debug/credentials/${encodeURIComponent(uuid)}/restore`)

export const deleteCredential = uuid =>
  http.delete(`/debug/credentials/${encodeURIComponent(uuid)}`)
