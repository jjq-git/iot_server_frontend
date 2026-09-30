// 文件管理相关 API
import http from './http'

/**
 * 获取文件列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.file_type - 文件类型
 * @returns {Promise}
 */
export const fetchFiles = (params = {}) => http.get('/files', { params })

/**
 * 获取文件详情
 * @param {string|number} fileId - 文件 ID
 * @returns {Promise}
 */
export const fetchFileDetail = fileId => http.get(`/files/${fileId}`)

/**
 * 上传文件（文件管理）
 * axios 检测到 FormData 会自动设置带 boundary 的 Content-Type，无需手设
 * @param {FormData} formData - 包含文件的 FormData 对象
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - 上传进度回调，透传给 axios onUploadProgress
 * @returns {Promise}
 */
export const uploadFile = (formData, { onProgress } = {}) =>
  http.post('/files/upload', formData, {
    onUploadProgress: onProgress
  })

/**
 * 上传图片（头像/产品图片等通用图片上传，路由 POST /upload）
 * 不同于文件管理的 /files/upload，本接口面向静音仓/产品/型号头像场景
 * @param {FormData} formData - 包含 file 字段的 FormData
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - 上传进度回调
 * @returns {Promise}
 */
export const uploadImage = async (formData, { onProgress } = {}) => {
  const response = await http.post('/upload', formData, {
    onUploadProgress: onProgress
  })
  const payload = response?.data && typeof response.data === 'object'
    ? response.data
    : response

  return {
    ...payload,
    url: payload?.url || payload?.download_url || payload?.file_url || payload?.path || ''
  }
}

/**
 * 获取需要鉴权的图片/文件 Blob
 * 走 axios 实例自动带 Authorization，401 触发统一登录跳转
 * @param {string} path - 相对 baseURL 的路径，或绝对 URL
 * @returns {Promise<Blob>}
 */
export const fetchAuthenticatedImage = (path) => {
  // 去掉路径中已有的 /api/v1 前缀，避免与 axios baseURL 重复拼接
  const cleanPath = path.replace(/^\/api\/v1\//, '/')
  return http.get(cleanPath, { responseType: 'blob' })
}

/**
 * 删除文件
 * @param {string|number} fileId - 文件 ID
 * @returns {Promise}
 */
export const deleteFile = fileId => http.delete(`/files/${fileId}`)

/**
 * 下载文件
 * @param {string|number} fileId - 文件 ID
 * @returns {Promise} 返回 Blob 数据
 */
export const downloadFile = async fileId => {
  const meta = await http.get(`/files/${fileId}/download`)
  const downloadPath = meta?.download_url
  if (!downloadPath) {
    throw new Error('Missing download URL')
  }

  const cleanPath = typeof downloadPath === 'string'
    ? downloadPath.replace(/^\/api\/v1\//, '/')
    : downloadPath

  return http.get(cleanPath, { responseType: 'blob' })
}

/**
 * 获取文件关联列表
 * @param {string|number} fileId - 文件 ID
 * @returns {Promise}
 */
export const fetchFileRelations = fileId => http.get(`/files/${fileId}/relations`)

/**
 * 创建文件关联
 * @param {string|number} fileId - 文件 ID
 * @param {Object} data - 关联数据
 * @returns {Promise}
 */
export const createFileRelation = (fileId, data) => http.post(`/files/${fileId}/relations`, data)

/**
 * 更新文件关联
 * @param {string|number} fileId - 文件 ID
 * @param {string|number} relationId - 关联 ID
 * @param {Object} data - 关联数据
 * @returns {Promise}
 */
export const updateFileRelation = (fileId, relationId, data) =>
  // http.post(`/files/${fileId}/relations`, data)
  http.put(`/files/${fileId}/relations/${relationId}`, data)

/**
 * 删除文件关联
 * @param {string|number} fileId - 文件 ID
 * @param {string|number} relationId - 关联 ID
 * @returns {Promise}
 */
export const deleteFileRelation = (fileId, relationId) =>
  http.delete(`/files/${fileId}/relations/${relationId}`)

export const publishFileRelation = (fileId, relationId) =>
  http.post(`/files/${fileId}/relations/${relationId}/publish`)

export const disableFileRelation = (fileId, relationId) =>
  http.post(`/files/${fileId}/relations/${relationId}/disable`)

/**
 * 获取文件统计信息
 * @returns {Promise}
 */
export const fetchFileStats = () => http.get('/files/stats')
