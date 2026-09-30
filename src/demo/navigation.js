const SUPPORTED_ROUTE_NAMES = new Set([
  'Login',
  'Dashboard',
  'DashboardStatus',
  'DashboardAlerts',
  'DashboardCharts',
  'OrgCompanies',
  'CompanyDetail',
  'CompanyDashboardConfigs',
  'CompanyDashboardConfigDetail',
  'PodModels',
  'Pods',
  'PodDetail',
  'PodBookings',
  'PodBookingDetail',
  'Locations',
  'LocationDetail',
  'HistorySensors',
  'NotFound'
])

export function isDemoRouteSupported (routeName) {
  return SUPPORTED_ROUTE_NAMES.has(routeName)
}
