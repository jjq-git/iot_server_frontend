// 审计日志 API 接口
import http from './http'

/**
 * 获取审计日志列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.action - 操作类型
 * @param {string} params.start_date - 开始日期
 * @param {string} params.end_date - 结束日期
 * @returns {Promise} 审计日志列表
 */
export const fetchAuditLogs = (params) => {
  const queryParams = { ...params }

  // 处理日期范围
  if (queryParams.dateRange && queryParams.dateRange.length === 2) {
    queryParams.start_date = queryParams.dateRange[0]
    queryParams.end_date = queryParams.dateRange[1]
    delete queryParams.dateRange
  }

  if (queryParams.start_date) {
    queryParams.date_from = queryParams.start_date
    delete queryParams.start_date
  }
  if (queryParams.end_date) {
    queryParams.date_to = queryParams.end_date
    delete queryParams.end_date
  }

  return http.get('/audit-logs', { params: queryParams })
}

/**
 * Fetch one scoped audit log, including redacted before/after snapshots.
 * @param {string} uuid audit log UUID
 * @returns {Promise} audit log detail
 */
export const fetchAuditLogDetail = (uuid) => http.get(`/audit-logs/${encodeURIComponent(uuid)}`)

/**
 * 导出审计日志
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出文件
 */
export const exportAuditLogs = (params) => {
  const queryParams = { ...params }
  if (queryParams.start_date) {
    queryParams.date_from = queryParams.start_date
    delete queryParams.start_date
  }
  if (queryParams.end_date) {
    queryParams.date_to = queryParams.end_date
    delete queryParams.end_date
  }
  return http.get('/audit-logs/export', { params: queryParams })
}
