// 静音仓管理相关 API
import http from './http'

/**
 * 获取静音仓列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.search - 搜索关键词
 * @param {boolean} params.is_online - 在线状态
 * @returns {Promise}
 */
export const fetchPods = (params = {}) => http.get('/pods', { params })

/**
 * 获取静音仓详情
 * @param {string|number} podId - 静音仓 ID
 * @returns {Promise}
 */
export const fetchPodDetail = podId => http.get(`/pods/${podId}`)

/**
 * 创建静音仓
 * @param {Object} data - 静音仓数据
 * @returns {Promise}
 */
export const createPod = data => http.post('/pods', data)

/** 创建前校验所选主机的已绑定节点是否满足静音仓型号要求。 */
export const validatePodDevicesPreview = params => http.post('/pods/validate-devices-preview', null, { params })

/**
 * 更新静音仓
 * @param {string|number} podId - 静音仓 ID
 * @param {Object} data - 静音仓数据
 * @returns {Promise}
 */
export const updatePod = (podId, data) => http.put(`/pods/${podId}`, data)

export const retirePod = podId => http.delete(`/pods/${podId}`)

export const restorePod = podId => http.post(`/pods/${podId}/restore`)

export const fetchPodTopologyHistory = (podId, params = {}) => http.get(`/pods/${podId}/topology-history`, { params })

export const fetchPodTopologyVersion = (podId, version) => http.get(`/pods/${podId}/topology-history/${version}`)

export const fetchPodLifecycleEvents = (podId, params = {}) => http.get(`/pods/${podId}/lifecycle-events`, { params })

export const replacePodHost = (podId, data, params = {}) => http.put(`/pods/${podId}/host`, data, { params })

/**
 * 获取静音仓型号选项
 * @returns {Promise}
 */
export const fetchPodModelOptions = (params = {}) => http.get('/pod-models', { params })
/**
 * 获取公司列表
 * @returns {Promise}
 */
export const fetchCompanies = (params = {}) => http.get('/companies', { params })

/**
 * 获取位置列表
 * @returns {Promise}
 */
export const fetchLocations = () => http.get('/locations/search')

/**
 * 获取主机列表（用于创建静音仓时选择）
 * @returns {Promise}
 */
export const fetchHosts = (params = {}) => http.get('/hosts', { params })

/**
 * 获取静音仓动态控制面板结构
 * @param {string|number} podId - 静音仓 ID
 * @returns {Promise}
 */
export const fetchPodControlSchema = podId => http.get(`/pods/${podId}/control-schema`)

/**
 * 获取静音仓控制面板运行态（当前值、在线状态和 desired/reported shadow）
 * @param {string|number} podId - 静音仓 ID
 * @returns {Promise}
 */
export const fetchPodControlState = podId => http.get(`/pods/${podId}/control-state`)

/**
 * 获取静音仓状态
 * @param {string|number} podId - 静音仓 ID
 * @returns {Promise}
 */
export const fetchPodStatus = podId => http.get(`/pods/${podId}/status`)

/**
 * 获取静音仓记录
 * @param {string|number} podId - 静音仓 ID
 * @param {Object} params - 查询参数
 * @returns {Promise}
 */
export const fetchPodRecords = (podId, params = {}) => http.get(`/pods/${podId}/records`, { params })

/**
 * 发送控制命令到静音仓
 * @param {string|number} podId - 静音仓 ID
 * @param {Object} data - 命令数据
 * @param {string} data.command - 命令类型 (start/pause/stop/reset)
 * @returns {Promise}
 */
export const sendPodCommand = (podId, data) => http.post(`/pods/${podId}/status/command`, data)

/**
 * 按属性下发单条设备控制（走 /control，后端会做权限、值域校验 + QoS=2 下发）
 * @param {string|number} podId - 静音仓 UUID
 * @param {Object} data
 * @param {string} data.attr_code - 属性代码，例如 "N-12"
 * @param {number|string|boolean} data.value - 要写入的值
 * @param {string} [data.command_id] - 可选命令ID
 * @param {number} [data.timeout] - 超时（秒）
 * @returns {Promise}
 */
export const sendDeviceControl = (podId, data) => http.post(`/pods/${podId}/control`, data)

/** Address-authoritative WF2 widget operation (3-level MQTT topic). */
export const sendWidgetOperation = (podId, data) => http.post(`/pods/${podId}/widgets/operate`, data)

/**
 * 导出静音仓历史记录
 * @param {string|number} podId - 静音仓 ID
 * @param {Object} params - 查询参数
 * @param {string} params.start_date - 开始日期
 * @param {string} params.end_date - 结束日期
 * @returns {Promise} 返回 Blob 数据用于下载
 */
export const exportPodRecords = (podId, params = {}) => http.get(`/pods/${podId}/records/export`, { params })

/**
 * 分配静音仓给下一级公司
 * @param {string|number} podId - 静音仓 ID
 * @param {Object} data - 分配数据
 * @param {string|number} data.company_id - 目标公司 ID
 * @param {string} data.company_role - 公司角色 (user/admin/maintainer/owner)
 * @param {string} data.reason - 分配原因/备注
 * @returns {Promise}
 */
export const createPodTransfer = (podId, data) => http.post(`/pods/${podId}/transfers`, data)

export const fetchIncomingPodTransfers = (params = {}) => http.get('/pods/transfers/incoming', { params })

export const fetchPodTransfers = podId => http.get(`/pods/${podId}/transfers`)

export const receivePodTransfer = (podId, transferId, data = {}) => http.post(`/pods/${podId}/transfers/${transferId}/receive`, data)

export const rejectPodTransfer = (podId, transferId, data = {}) => http.post(`/pods/${podId}/transfers/${transferId}/reject`, data)

export const cancelPodTransfer = (podId, transferId, data = {}) => http.post(`/pods/${podId}/transfers/${transferId}/cancel`, data)

/**
 * 获取设备命令历史（指令下发记录 + 回执结果）
 * @param {string|number} podId - 静音仓 UUID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.status - 按状态筛选 (queued/sent/success/failed/timeout)
 * @returns {Promise}
 */
export const fetchPodCommands = (podId, params = {}) => http.get(`/pods/${podId}/commands`, { params })
