import http from './http'
import { fetchCompanyDashboardConfigs } from './company-dashboard-config'

const isContractUnavailable = error => [404, 405, 501].includes(error?.response?.status)

export const fetchDashboardSummary = params => http.get('/dashboard/summary', {
  params,
  skipUnauthorizedRedirect: true
})

export const queryDashboardChartData = payload => http.post('/dashboard/chart-data/query', payload)

const fetchFallbackEffectiveConfig = async () => {
  const response = await fetchCompanyDashboardConfigs({
    page: 1,
    page_size: 100
  })
  const effective = (response?.items || []).find(item => item.is_active)

  if (!effective) return null
  return {
    company_uuid: null,
    config_version: Date.parse(effective.updated_at) || effective.id,
    timezone: 'Asia/Shanghai',
    config_json: effective.config_json || { branding: {}, panels: [] },
    source: 'company-dashboard-config'
  }
}
export const fetchEffectiveDashboardConfig = async () => {
  try {
    return await http.get('/dashboard/config/effective')
  } catch (error) {
    if (!isContractUnavailable(error)) throw error
    return fetchFallbackEffectiveConfig()
  }
}

export const resetDashboardConfig = () => http.post('/dashboard/config/reset')
