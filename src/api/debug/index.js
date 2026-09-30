/**
 * 调试控制台 - 设备控制 / 维护 / 配置 / 查询 API
 *
 * 后端契约(参考 backend/docs/api/):
 *   POST /api/v1/debug/devices/{uuid}/control       业务控制(灯光/风扇/开关等)
 *   POST /api/v1/debug/devices/{uuid}/maintenance   维护命令(NMT/reboot/紧急停止)
 *   POST /api/v1/debug/devices/{uuid}/config        配置写入
 *   POST /api/v1/debug/devices/{uuid}/query         查询请求
 */
import http from '../http'

export const fetchDeviceState = deviceUuid =>
  http.get(`/debug/devices/${encodeURIComponent(deviceUuid)}`)

export const sendDeviceControl = (deviceUuid, payload) =>
  http.post(`/debug/devices/${encodeURIComponent(deviceUuid)}/control`, payload)

export const sendDeviceMaintenance = (deviceUuid, payload) =>
  http.post(`/debug/devices/${encodeURIComponent(deviceUuid)}/maintenance`, payload)

export const sendDeviceConfig = (deviceUuid, payload) =>
  http.post(`/debug/devices/${encodeURIComponent(deviceUuid)}/config`, payload)

export const sendDeviceQuery = (deviceUuid, payload) =>
  http.post(`/debug/devices/${encodeURIComponent(deviceUuid)}/query`, payload)

/**
 * 实时获取主机物理上听到的节点（不依赖 hn_bindings 业务绑定表）
 * 数据来源：MQTT 内存 ring buffer，最近 windowSeconds 秒内任意类型消息的 device_id 集合
 */
export const fetchOnlineNodes = (hostUuid, windowSeconds = 120) =>
  http.get(`/debug/devices/${encodeURIComponent(hostUuid)}/online-nodes`, {
    params: { window_seconds: windowSeconds }
  })
