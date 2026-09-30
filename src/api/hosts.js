// 主机管理相关 API
import http from './http'

/**
 * 获取主机列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.search - 搜索关键词（MAC 或序列号）
 * @param {string} params.status - 状态（online/offline/maintenance）
 * @param {string} params.sort - 排序字段
 * @returns {Promise}
 */
export const fetchHosts = (params = {}) => http.get('/hosts', { params })

/**
 * 获取主机详情
 * @param {string|number} hostId - 主机 ID（MAC 地址或 device_id）
 * @returns {Promise}
 */
export const fetchHostDetail = hostId => http.get(`/hosts/${encodeURIComponent(hostId)}`)

/**
 * 创建主机
 * @param {Object} data - 主机数据
 * @param {string} data.hw_ver - 硬件版本
 * @param {string} data.sw_ver - 软件版本
 * @param {string} data.product_code - 产品代码
 * @param {string} data.serial_no - 序列号
 * @param {string} data.mac_address - MAC 地址
 * @param {number} data.hn_model_id - 主机型号 ID
 * @param {string} data.remark - 备注
 * @returns {Promise}
 */
export const createHost = data => http.post('/hosts', data)

/**
 * 更新主机
 * @param {string|number} hostId - 主机 ID
 * @param {Object} data - 主机数据
 * @returns {Promise}
 */
export const updateHost = (hostId, data) => http.put(`/hosts/${hostId}`, data)

export const retireHost = hostId => http.delete(`/hosts/${hostId}`)

export const restoreHost = hostId => http.post(`/hosts/${hostId}/restore`)

/**
 * 出货主机给厂家
 * @param {string|number} hostId - 主机 ID
 * @param {Object} data - 出货数据
 * @returns {Promise}
 */
export const shipHost = (hostId, data) => http.put(`/hosts/${hostId}/ship`, data)

export const confirmHostReceipt = hostId => http.post(`/hosts/${hostId}/receive`)

/**
 * 检查固件更新
 * @param {string|number} hostId - 主机 ID
 * @returns {Promise}
 */
export const checkFirmwareUpdate = hostId => http.get(`/hosts/${hostId}/firmware-check`)

/**
 * 获取主机型号选项
 * @returns {Promise}
 */
export const fetchHnModelOptions = async ({ includeSample = false } = {}) => {
  const response = await http.get('/hn-models', {
    params: {
      page: 1,
      page_size: 200,
      is_host: true,
      status: includeSample ? undefined : 'active'
    }
  })
  const items = response.items || response.data || response || []
  const allowedStatuses = includeSample ? ['sample', 'active'] : ['active']
  return items
    .filter(item => allowedStatuses.includes(item.status))
    .map(item => ({
      id: item.uuid || item.id,
      name: item.model_name,
      code: item.model_code,
      status: item.status
    }))
}
