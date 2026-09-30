// 型号管理相关 API
import http from './http'
import { groupHnModelHardwareLines } from '@/utils/hn-model-catalog.mjs'

const LEGACY_MODEL_PAGE_SIZE = 200

const responseItems = response => response.items || response.data || (Array.isArray(response) ? response : [])

const fetchLegacyHardwareLines = async params => {
  const legacyParams = {
    page: 1,
    page_size: LEGACY_MODEL_PAGE_SIZE
  }
  for (const key of ['keyword', 'is_host', 'model_type', 'company_id']) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      legacyParams[key] = params[key]
    }
  }

  const first = await http.get('/hn-models', { params: legacyParams })
  const versions = [...responseItems(first)]
  const totalVersions = Number(first.total || versions.length)
  const pageCount = Math.ceil(totalVersions / LEGACY_MODEL_PAGE_SIZE)
  if (pageCount > 1) {
    const remaining = await Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        http.get('/hn-models', {
          params: { ...legacyParams, page: index + 2 }
        })
      )
    )
    remaining.forEach(response => versions.push(...responseItems(response)))
  }

  const lines = groupHnModelHardwareLines(versions, params.status)
  const page = Number(params.page || 1)
  const pageSize = Number(params.page_size || 20)
  const offset = (page - 1) * pageSize
  return {
    total: lines.length,
    page,
    page_size: pageSize,
    items: lines.slice(offset, offset + pageSize)
  }
}

/**
 * 获取型号列表
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.page_size - 每页数量
 * @param {string} params.search - 搜索关键词（型号编码或名称）
 * @param {boolean} params.is_host - 类型（true=主机，false=节点）
 * @param {string} params.status - 状态（active/frozen）
 * @returns {Promise}
 */
export const fetchHnModels = (params = {}) => http.get('/hn-models', { params })

/** 获取按型号编码和硬件版本聚合的型号线列表。 */
export const fetchHnModelHardwareLines = async (params = {}) => {
  try {
    return await http.get('/hn-model-catalog/hardware-lines', { params })
  } catch (error) {
    if (error?.response?.status !== 404) throw error
    return fetchLegacyHardwareLines(params)
  }
}

/** Read the Product OD composition anchored by an HN model revision. */
export const fetchHnModelSlots = revisionId =>
  http.get('/hn-model-catalog/slots', { params: { revision_id: revisionId } })

/** 获取一个硬件版本下的 OD 版本。 */
export const fetchHnModelRevisions = hardwareId =>
  http.get('/hn-model-catalog/revisions', { params: { hn_model_id: hardwareId } })

/** 获取一个 OD 版本下的具体软件版本。 */
export const fetchHnModelVersions = revisionId =>
  http.get('/hn-model-catalog/versions', { params: { revision_id: revisionId } })

/**
 * 获取型号详情
 * @param {string|number} modelId - 型号 ID
 * @returns {Promise}
 */
export const fetchHnModelDetail = modelId => http.get(`/hn-models/${modelId}`)

/**
 * 登记型号和第一条硬件版本，不创建 OD 或软件版本
 * @param {Object} data - 型号和硬件身份
 * @param {number} data.company_id - 生产厂家 ID
 * @param {string} data.model_code - 型号编码
 * @param {string} data.part_number - 物料号
 * @param {string} data.model_name - 型号名称
 * @param {'product'|'node'} data.model_type - 主机或节点
 * @param {string} data.vendor_id - 协议厂商 ID
 * @param {string} data.product_code - 协议产品代码
 * @param {string} data.hw_version - 硬件版本
 * @param {string|null} data.desc - 描述
 * @param {string} data.url - 产品链接
 * @returns {Promise}
 */
export const createHnModel = data => http.post('/hn-model-catalog/hardware-lines', data)

/**
 * 更新型号
 * @param {string|number} modelId - 型号 ID
 * @param {Object} data - 型号数据
 * @returns {Promise}
 */
export const updateHnModel = (modelId, data) => http.put(`/hn-models/${modelId}`, data)

/**
 * 删除型号
 * @param {string|number} modelId - 型号 ID
 * @returns {Promise}
 */
export const deleteHnModel = modelId => http.delete(`/hn-models/${modelId}`)

/**
 * 读取型号当前生效的属性及 Configs 发布元数据。
 * 兼容旧响应的数组格式，新响应应使用 { items, publication }。
 * @param {string|number} modelId - 型号 UUID
 * @returns {Promise<Array|Object>}
 */
export const fetchModelIndexes = modelId => http.get(`/hn-models/${modelId}/indexes`)
