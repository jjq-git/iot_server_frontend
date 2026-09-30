// 节点管理相关 API
import http from './http'

/**
 * 获取节点列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.search - 搜索关键词（序列号或 MAC）
 * @param {string} params.status - 状态（online/offline/maintenance）
 * @param {boolean} params.is_active - 是否在役
 * @param {string} params.sort - 排序字段
 * @returns {Promise}
 */
export const fetchNodes = (params = {}) => http.get('/nodes', { params })

/**
 * 获取节点详情
 * @param {string|number} nodeId - 节点 ID
 * @returns {Promise}
 */
export const fetchNodeDetail = nodeId => http.get(`/nodes/${nodeId}`)

/**
 * 创建节点
 * @param {Object} data - 节点数据
 * @param {string} data.serial_number - 序列号
 * @param {string} data.mac_address - MAC 地址
 * @param {number} data.hn_model_id - 硬件型号 ID
 * @param {number} data.node_type_id - 节点类型 ID
 * @param {string} data.sw_ver - 固件版本
 * @param {string} data.remark - 备注
 * @returns {Promise}
 */
export const createNode = data => http.post('/nodes', data)

/**
 * 更新节点
 * @param {string|number} nodeId - 节点 ID
 * @param {Object} data - 节点数据
 * @returns {Promise}
 */
export const updateNode = (nodeId, data) => http.put(`/nodes/${nodeId}`, data)

export const retireNode = nodeId => http.delete(`/nodes/${nodeId}`)

export const restoreNode = nodeId => http.post(`/nodes/${nodeId}/restore`)

/**
 * 检查固件更新
 * @param {string|number} nodeId - 节点 ID
 * @returns {Promise}
 */
export const checkNodeFirmware = nodeId => http.get(`/nodes/${nodeId}/firmware-check`)

/**
 * 出货节点给厂家
 * @param {string|number} nodeId - 节点 ID
 * @param {Object} data - 出货数据
 * @param {number} data.target_company_id - 目标厂家 ID
 * @param {number} data.manufacturer_id - 制造商 ID（可选）
 * @returns {Promise}
 */
export const shipNode = (nodeId, data) => http.put(`/nodes/${nodeId}/ship`, data)

/**
 * 获取主机关联节点列表
 * @param {string|number} hostId - 主机 ID
 * @returns {Promise}
 */
export const fetchHostNodes = hostId => http.get(`/hosts/${hostId}/nodes`)
