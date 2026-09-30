// 控制器(WF2P ESP32-S3 主机 + CH32 从机)接入相关 API。
// 复用 pods 既有的状态/命令历史接口,唯一新增 raw-command 透传命令。
import http from './http'
export {
  fetchPodStatus as fetchControllerStatus,
  fetchPodCommands as fetchControllerCommands,
  fetchPodControlSchema as fetchControllerSchema
} from './pods'

/**
 * 透传控制器本地 Web 协议命令到设备端。
 * @param {string} podId  静音仓 UUID
 * @param {object} payload  形如 {op:'radar.cfg', sens:8, dist:4, hold:2000}
 *   op 取值: radar.cfg / radar.read / fan / led / ws2811 /
 *            sys.wdt / sys.save / sys.reset / sys.factory / ping
 */
export const sendRawCommand = (podId, payload) =>
  http.post(`/pods/${podId}/raw-command`, payload)
