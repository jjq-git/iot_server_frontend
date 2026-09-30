/**
 * OTA 升级任务 API（iot_server/backend Phase 2C 提供）
 *
 * 后端路由：
 *   POST   /api/v1/ota/tasks            创建 OTA 任务
 *   GET    /api/v1/ota/tasks            任务列表（支持分页/状态过滤）
 *   GET    /api/v1/ota/tasks/{uuid}     任务详情（含进度/日志）
 *   POST   /api/v1/ota/tasks/{uuid}/cancel 取消进行中的任务
 *
 * WebSocket：复用 /api/v1/ws/hosts/{host_uuid}/status，监听 type=ota_progress
 */
import http from './http'

export const createOtaTask = payload => http.post('/ota/tasks', payload)

export const fetchOtaTasks = (params = {}) => http.get('/ota/tasks', { params })

export const fetchOtaTask = uuid => http.get(`/ota/tasks/${uuid}`)

export const cancelOtaTask = uuid => http.post(`/ota/tasks/${uuid}/cancel`)
