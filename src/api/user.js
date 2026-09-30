// 用户管理相关 API
import http from './http'

/**
 * 获取当前用户信息
 * @returns {Promise}
 */
export const getCurrentUser = () => http.get('/users/me')

/**
 * 调用刷新 token API
 * @returns {Promise}
 */
export const getRefreshToken = () => http.post('/auth/refresh-token')

/**
 * 更新当前用户信息
 * @param {Object} data - 用户数据
 * @returns {Promise}
 */
export const updateCurrentUser = data => http.put('/users/me', data)

/**
 * 修改密码
 * @param {Object} data - 密码数据
 * @param {string} data.old_password - 当前密码
 * @param {string} data.new_password - 新密码
 * @returns {Promise}
 */
export const updatePassword = data => http.post('/users/me/change-password', data)

/**
 * 获取登录日志
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @returns {Promise}
 */
export const fetchLoginLogs = (params = {}) => http.get('/users/me/login-logs', { params })

/**
 * 上传用户头像
 * @param {FormData} formData - 包含头像文件的 FormData
 * @returns {Promise}
 */
export const uploadAvatar = (formData) => http.post('/users/me/avatar', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  }
})

/**
 * 删除用户头像
 * @returns {Promise}
 */
export const deleteAvatar = () => http.delete('/users/me/avatar')
