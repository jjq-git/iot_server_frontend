// 用户管理相关 API
import http from './http'

/**
 * 获取用户列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词（邮箱/显示名）
 * @param {number} params.company_id - 公司 ID（仅平台管理员可用）
 * @param {string} params.role - 查询角色：admin/operator/data_entry/viewer
 * @param {boolean} params.is_active - 是否启用
 * @returns {Promise}
 */
export const listUsers = (params) => http.get('/users', { params })
export const fetchUsers = listUsers

/** Resolve membership user ids without exposing account credentials or unrelated profile fields. */
export const fetchUserSummaries = (ids) => {
  const params = new URLSearchParams()
  ids.forEach(id => params.append('ids', id))
  return http.get('/users/summaries', { params })
}

/**
 * 获取用户详情
 * @param {string} uuid - 用户 UUID
 * @returns {Promise}
 */
export const getUser = (uuid, companyId) => http.get(`/users/${uuid}`, {
  params: companyId ? { company_id: companyId } : undefined
})
export const fetchUserDetail = getUser

/**
 * 发送组织成员邀请。管理员不设置或接触用户密码。
 * @param {Object} data - 邀请数据
 * @param {string} data.email - 邮箱
 * @param {number} data.company_id - 所属公司 ID
 * @param {string} data.role - 角色
 * @param {string} [data.phone] - 手机号
 * @param {string} [data.display_name] - 显示名称
 * @returns {Promise}
 */
export const createInvitation = (data) => http.post('/invitations', data)

/** Revoke an invitation that has not been accepted yet. */
export const revokeInvitation = invitationUuid => http.delete(`/invitations/${invitationUuid}`)

export const inspectInvitation = token => http.post('/invitations/inspect', { token }, {
  skipUnauthorizedRedirect: true
})

export const listInvitations = () => http.get('/invitations')

export const resendInvitation = invitationUuid => http.post(`/invitations/${invitationUuid}/resend`)

/** Accept an emailed invitation. This endpoint is public and token-bound. */
export const acceptInvitation = (data) => http.post('/invitations/accept', data, {
  skipUnauthorizedRedirect: true
})

/**
 * 更新用户基础信息
 * @param {string} uuid - 用户 UUID
 * @param {Object} data - 用户数据（仅可含 display_name/is_active）
 * @returns {Promise}
 */
export const updateUser = (uuid, data, companyId) => http.put(`/users/${uuid}`, data, {
  params: companyId ? { company_id: companyId } : undefined
})

/**
 * 更新用户角色
 * @param {string} uuid - 用户 UUID
 * @param {string} role - 新角色
 * @returns {Promise}
 */
export const updateUserRole = (uuid, role, companyId) => http.put(`/users/${uuid}/role`, { role }, {
  params: companyId ? { company_id: companyId } : undefined
})
