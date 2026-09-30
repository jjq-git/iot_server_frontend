/**
 * 设备 MAC → 类型/功能 映射表
 *
 * 用途：在调试设备管理页（/debug/devices）展示每台主机和节点的实际芯片型号 + 功能描述
 * 来源：手工维护（数据库未持久化 chip_model 字段，待后端补字段后改为读 API）
 *
 * 维护方式：
 *   - 设备出厂烧录时，把 MAC + 芯片 + 功能添加到下方表
 *   - MAC 大小写不敏感（自动归一化为大写）
 *   - 同时覆盖主机和节点
 *
 * 数据结构：
 *   chip:     芯片型号（用作 badge 着色，建议 'ESP32-P4'/'S3'/'C3'/'C6'）
 *   role:     角色（'host' 主机 / 'node' 节点）
 *   func:     功能描述（一句话，比如"NU0001 智能仓节点"/"P4 主机带屏"）
 */

const RAW_MAP = {
  // ==========================================================================
  // 主机（host）—— 静音仓主机
  // ==========================================================================
  '14:C1:9F:28:BC:CC': { chip: 'ESP32-S3', role: 'host', func: 'S3 主机（开发用）' },
  '02:33:8C:66:49:CF': { chip: 'ESP32-S3', role: 'host', func: 'E2E-SEC-B 测试主机' },
  '02:F8:90:7C:4F:E3': { chip: 'ESP32-S3', role: 'host', func: 'E2E-SEC-A 测试主机' },
  '02:A6:7F:6E:7B:E5': { chip: 'ESP32-S3', role: 'host', func: 'E2E-SEC-B 测试主机' },
  '02:37:06:FE:1E:E4': { chip: 'ESP32-S3', role: 'host', func: 'E2E-SEC-A 测试主机' },

  // ==========================================================================
  // 节点（node）—— 静音仓节点
  // 出厂记录范例：
  //   - C3 节点：LED/风扇/电气/传感器/定时（NU0001 智能仓节点）
  //   - C3 节点：60G 雷达呼吸心率/跌倒/坐姿（NU0003）
  //   - C3 节点：门吸 + 调光玻璃（NU0004）
  //   - C6 节点：升降桌 双 H 桥 + 编码器位置闭环（NU0002）
  //   - C6 节点：协处理器（仅给 P4 主机用，提供 WiFi/BLE）
  // ==========================================================================
  '14:C1:9F:28:BC:CD': { chip: 'ESP32-C3', role: 'node', func: 'NU0001 智能仓节点（LED/风扇/INA3221）' }

  // 后续新增范例：
  // 'AA:BB:CC:DD:EE:01': { chip: 'ESP32-P4', role: 'host', func: 'P4 主机（带屏量产版）' },
  // 'AA:BB:CC:DD:EE:02': { chip: 'ESP32-C6', role: 'node', func: 'NU0002 升降桌节点' },
  // 'AA:BB:CC:DD:EE:03': { chip: 'ESP32-C3', role: 'node', func: 'NU0003 60G 雷达节点' },
}

// 归一化为大写
const DEVICE_MAC_MAP = Object.keys(RAW_MAP).reduce((acc, k) => {
  acc[k.toUpperCase()] = RAW_MAP[k]
  return acc
}, {})

/**
 * 根据 MAC 查完整设备档案（芯片 + 角色 + 功能）
 * @param {string} mac - MAC 地址（大小写均可）
 * @returns {{chip:string, role:string, func:string}|null}
 */
export function getDeviceInfo (mac) {
  if (!mac || typeof mac !== 'string') return null
  return DEVICE_MAC_MAP[mac.toUpperCase()] || null
}

export default DEVICE_MAC_MAP
