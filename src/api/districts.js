// 行政区划管理相关 API
import http from './http'

/**
 * 获取行政区划树形结构（省市区三级联动）
 * @returns {Promise}
 */
export const fetchDistrictsTree = () => http.get('/districts/tree')

/**
 * 获取所有省份
 * @returns {Promise}
 */
export const fetchProvinces = () => http.get('/districts/provinces')

/**
 * 获取指定省份的所有城市
 * @param {string} provinceCode - 省份代码
 * @returns {Promise}
 */
export const fetchCities = (provinceCode) => http.get('/districts/cities', { params: { province_code: provinceCode } })

/**
 * 获取指定城市的所有区县
 * @param {string} cityCode - 城市代码
 * @returns {Promise}
 */
export const fetchDistricts = (cityCode) => http.get('/districts/districts', { params: { city_code: cityCode } })

/**
 * 搜索行政区划
 * @param {Object} params - 查询参数
 * @param {string} params.keyword - 搜索关键词
 * @param {string} params.level - 级别过滤（province/city/district）
 * @returns {Promise}
 */
export const searchDistricts = (params = {}) => http.get('/districts/search', { params })
