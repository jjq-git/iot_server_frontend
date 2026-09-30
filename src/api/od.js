/**
 * OD 远程诊断 API（iot_server/backend 提供）
 *
 * 后端路由：
 *   POST /api/v1/od/dump          {host_uuid, device_id, target, profile, objects?}
 *   GET  /api/v1/od/snapshot      ?host_uuid=&nid=
 *   GET  /api/v1/od/snapshots     ?host_uuid=
 *   GET  /api/v1/od/spec          ?hn_model_id=123 (现行) / ?id=NU0001&ver=V0.0.1 (兼容)
 *   GET  /api/v1/od/catalog
 *   GET  /api/v1/od/device-models ?host_uuid=
 */
import http from './http'

export const triggerOdDump = payload => http.post('/od/dump', payload)

export const fetchOdSnapshot = (hostUuid, nid) =>
  http.get('/od/snapshot', { params: { host_uuid: hostUuid, nid } })

export const fetchOdSnapshots = (hostUuid = null) =>
  http.get('/od/snapshots', { params: hostUuid ? { host_uuid: hostUuid } : {} })

export const fetchOdSpec = (id, ver = 'V0.0.1', hnModelId = null) =>
  http.get('/od/spec', {
    params: hnModelId ? { hn_model_id: hnModelId } : { id, ver }
  })

export const fetchOdCatalog = () => http.get('/od/catalog')

export const fetchOdDeviceModels = hostUuid =>
  http.get('/od/device-models', { params: { host_uuid: hostUuid } })
