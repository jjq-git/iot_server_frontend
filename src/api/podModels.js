// 静音仓型号管理相关 API
import http from './http'

/**
 * 获取静音仓型号列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.search - 搜索关键词
 * @param {number} params.company_id - 公司 ID
 * @returns {Promise}
 */
export const fetchPodModels = (params = {}) => http.get('/pod-models', { params })

/**
 * 获取静音仓型号详情
 * @param {string|number} podModelId - 型号 ID
 * @returns {Promise}
 */
export const fetchPodModelDetail = podModelId => http.get(`/pod-models/${podModelId}`)

/**
 * 创建静音仓型号
 * @param {Object} data - 型号数据
 * @returns {Promise}
 */
export const createPodModel = data => http.post('/pod-models', data)

/**
 * 更新静音仓型号
 * @param {string|number} podModelId - 型号 ID
 * @param {Object} data - 型号数据
 * @returns {Promise}
 */
export const updatePodModel = (podModelId, data) => http.put(`/pod-models/${podModelId}`, data)

export const deletePodModel = podModelId => http.delete(`/pod-models/${podModelId}`)

/**
 * 获取主机列表（用于绑定）
 * @returns {Promise}
 */
export const fetchHostsForBinding = (params = {}) => http.get('/hosts', { params })
/**
 * 获取节点列表（用于绑定）
 * @returns {Promise}
 */
export const fetchNodesForBinding = (params = {}) => http.get('/nodes', { params })

/**
 * 获取公司列表（用于选择）
 * @returns {Promise}
 */
export const fetchCompanies = (params = {}) => http.get('/companies', { params })
