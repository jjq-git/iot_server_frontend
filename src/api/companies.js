// 公司管理相关 API
import http from './http'

/**
 * 获取公司列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.keyword - 搜索关键词
 * @returns {Promise}
 */
export const fetchCompanies = (params = {}) => http.get('/companies', { params })

/**
 * 获取公司详情
 * @param {string|number} companyId - 公司 ID 或 UUID
 * @returns {Promise}
 */
export const fetchCompanyDetail = companyId => http.get(`/companies/${companyId}`)

/**
 * 创建公司
 * @param {Object} data - 公司数据
 * @param {string} data.company_name - 公司全称
 * @param {string} data.short_name - 简称
 * @param {string} data.domain - 公司完整 HTTPS 入口 URL
 * @param {string} data.slogan - 公司展示标语
 * @param {string} data.contact_person - 联系人
 * @param {string} data.contact_email - 联系邮箱
 * @param {string} data.contact_phone - 联系电话
 * @param {boolean} data.is_pod_manufacturer - 静音舱生产厂家
 * @param {boolean} data.is_brand - 品牌方
 * @param {boolean} data.is_channel_partner - 渠道合作方
 * @param {boolean} data.is_enduser - 最终用户
 * @param {boolean} data.is_household - Whether this is a household organization
 * @param {boolean} data.is_school - Whether this is a school organization
 * @param {'internal'|'rental'|'both'|null} data.pod_usage - Pod usage mode; only end users may set it
 * @returns {Promise}
 */
export const createCompany = data => http.post('/companies', data)

/**
 * 更新公司
 * @param {string|number} companyId - 公司 ID 或 UUID
 * @param {Object} data - 公司数据
 * @returns {Promise}
 */
export const updateCompany = (companyId, data) => http.put(`/companies/${companyId}`, data)
