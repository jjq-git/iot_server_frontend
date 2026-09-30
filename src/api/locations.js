// 位置管理相关 API
import http from './http'

/**
 * 获取位置列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.province - 省份
 * @param {string} params.city - 城市
 * @param {boolean} params.has_gps - 是否有 GPS 坐标
 * @returns {Promise}
 */
export const fetchLocations = (params = {}) => http.get('/locations/search', { params })

/**
 * 获取位置详情
 * @param {string|number} locationId - 位置 ID
 * @returns {Promise}
 */
export const fetchLocationDetail = locationId => http.get(`/locations/${locationId}`)

/**
 * 创建位置
 * @param {Object} data - 位置数据
 * @returns {Promise}
 */
export const createLocation = data => http.post('/locations', data)

/**
 * 更新位置
 * @param {string|number} locationId - 位置 ID
 * @param {Object} data - 位置数据
 * @returns {Promise}
 */
export const updateLocation = (locationId, data) => http.put(`/locations/${locationId}`, data)

/**
 * 删除位置
 * @param {string|number} locationId - 位置 ID
 * @returns {Promise}
 */
export const deleteLocation = locationId => http.delete(`/locations/${locationId}`)

export const verifyLocationGps = (locationId, data) => http.put(`/locations/${locationId}/gps-verification`, data)
