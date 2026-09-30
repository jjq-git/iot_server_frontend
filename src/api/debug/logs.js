/**
 * 调试 - 设备日志文件 / EMCY 日志 / 日志开关
 *
 * 后端契约:
 *   GET  /api/v1/debug/devices/{uuid}/device-log-files ?limit=&since=&nid=&source=&trigger_type=&level=
 *   POST /api/v1/debug/devices/{uuid}/log-control       {enabled, nid}
 *   GET  /api/v1/debug/devices/{uuid}/emcy-logs         ?limit=&since=
 *   GET  /api/v1/debug/devices/{uuid}/alerts             ?limit=&since=&nid=&status=
 */
import http from '../http'

export const fetchDeviceLogFiles = (deviceUuid, params = {}) =>
  http.get(`/debug/devices/${encodeURIComponent(deviceUuid)}/device-log-files`, { params })

export const setLogControl = (deviceUuid, payload) =>
  http.post(`/debug/devices/${encodeURIComponent(deviceUuid)}/log-control`, payload)

export const fetchEmcyLogs = (deviceUuid, params = {}) =>
  http.get(`/debug/devices/${encodeURIComponent(deviceUuid)}/emcy-logs`, { params })

export const clearEmcyLogs = deviceUuid =>
  http.delete(`/debug/devices/${encodeURIComponent(deviceUuid)}/emcy-logs`)

export const fetchAlertEvents = (deviceUuid, params = {}) =>
  http.get(`/debug/devices/${encodeURIComponent(deviceUuid)}/alerts`, { params })
