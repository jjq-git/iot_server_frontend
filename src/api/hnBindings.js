// 主机节点绑定相关 API
import http from './http'

/**
 * 获取主机的节点绑定列表
 * @param {string|number} hostId - 主机 ID
 * @returns {Promise}
 */
export const fetchHostNodes = hostId => http.get(`/hosts/${hostId}/nodes`)

/**
 * 创建节点绑定
 * @param {Object} data - 绑定数据
 * @param {number} data.host_id - 主机 ID
 * @param {number} data.node_id - 节点 ID
 * @param {number} data.can_node_id - CAN Node ID (1-127)
 * @param {string} data.node_pos - 位置分类 (A/B/C)
 * @returns {Promise}
 */
export const createBinding = data => http.post('/hn-bindings', data)

/**
 * 更新 CAN Node ID
 * @param {string} uuid - 绑定 UUID
 * @param {Object} data - 更新数据
 * @param {number} data.can_node_id - 新的 CAN Node ID
 * @returns {Promise}
 */
export const updateCanNodeId = (uuid, data) => http.put(`/hn-bindings/${uuid}/can-node-id`, data)

/**
 * 更换节点（替换绑定）
 * @param {Object} data - 更换数据
 * @param {string} data.uuid - 绑定 UUID
 * @param {number} data.new_node_id - 新节点 ID
 * @param {number} [data.can_node_id] - 可选的新 CAN Node ID
 * @returns {Promise}
 */
export const replaceNode = (data, params = {}) => http.put('/hn-bindings/replace', data, { params })

/**
 * 删除节点绑定
 * @param {string} uuid - 绑定 UUID
 * @returns {Promise}
 */
export const deleteBinding = (uuid, params = {}) => http.delete('/hn-bindings', { data: { uuid }, params })

/**
 * 获取节点列表（用于选择器）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {boolean} [params.is_active] - 是否激活
 * @returns {Promise}
 */
export const fetchNodes = (params = {}) => http.get('/nodes', { params })
