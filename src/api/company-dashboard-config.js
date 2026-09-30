import http from './http'

const BASE_URL = '/company-dashboard-config'

export const fetchCompanyDashboardConfigs = (params = {}) => http.get(BASE_URL, { params })

export const fetchDashboardModules = () => http.get(`${BASE_URL}/dashboard-modules`)

export const fetchCompanyDashboardConfig = companyId => http.get(`${BASE_URL}/${companyId}`)

export const upsertCompanyDashboardConfig = (companyId, payload) => http.put(
  `${BASE_URL}/${companyId}`,
  payload
)

export const deactivateCompanyDashboardConfig = companyId => http.delete(
  `${BASE_URL}/${companyId}`
)

export const previewCompanyDashboardConfig = companyId => http.get(
  `${BASE_URL}/${companyId}/preview`
)

export const validateCompanyDashboardConfig = (companyId, configJson) => http.post(
  `${BASE_URL}/${companyId}/validate`,
  { config_json: configJson }
)

export const previewCompanyDashboardData = (companyId, configJson) => http.post(
  `${BASE_URL}/${companyId}/preview-data`,
  { config_json: configJson }
)

export const fetchBrandingConfig = () => http.get(`${BASE_URL}/branding`)

export const fetchPublicCompanyDashboardConfig = (params = {}) => http.get(
  `${BASE_URL}/public`,
  { params }
)
