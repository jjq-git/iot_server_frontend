/**
 * API Key 管理 API
 *
 * 后端路由:
 *   GET    /api/v1/api-keys                列表(masked)
 *   GET    /api/v1/api-keys/providers      支持的 provider 列表 + 默认 base_url/model
 *   GET    /api/v1/api-keys/{uuid}         详情(masked)
 *   POST   /api/v1/api-keys                创建（平台管理权限）
 *   PATCH  /api/v1/api-keys/{uuid}         更新
 *   DELETE /api/v1/api-keys/{uuid}         删除（平台管理权限）
 *   POST   /api/v1/api-keys/{uuid}/activate  激活
 *   POST   /api/v1/api-keys/{uuid}/test      联通性测试
 */
import http from './http'

export const fetchApiKeys = (params = {}) => http.get('/api-keys', { params })

export const fetchApiKeyProviders = () => http.get('/api-keys/providers')

export const fetchApiKey = uuid => http.get(`/api-keys/${uuid}`)

export const createApiKey = payload => http.post('/api-keys', payload)

export const updateApiKey = (uuid, payload) => http.patch(`/api-keys/${uuid}`, payload)

export const deleteApiKey = uuid => http.delete(`/api-keys/${uuid}`)

export const activateApiKey = uuid => http.post(`/api-keys/${uuid}/activate`)

export const testApiKey = uuid => http.post(`/api-keys/${uuid}/test`)
