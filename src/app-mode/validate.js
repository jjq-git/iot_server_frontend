import { APP_MODES, APP_MODE, DEMO_HOST } from './constants'
import { AppStartupError } from './errors'

const LOCAL_DEMO_HOSTS = Object.freeze(['localhost', '127.0.0.1', '[::1]', '::1'])

const fail = (code, message) => {
  throw new AppStartupError(code, message)
}

function isAllowedDemoApiBase (value) {
  if (value === 'auto') return true
  if (typeof value !== 'string') return false
  return value.trim().replace(/\/+$/, '') === '/api/v1'
}

function isAllowedDemoUploadBase (value) {
  return value === undefined || value === null || value === '' || value === 'auto'
}

export function validateAppStartup ({
  buildAppMode,
  runtimeConfig,
  hostname,
  isDevelopment = false,
  demoDevHosts = []
}) {
  const runtimeAppMode = runtimeConfig?.appMode
  if (!APP_MODES.includes(buildAppMode) || !APP_MODES.includes(runtimeAppMode) || buildAppMode !== runtimeAppMode) {
    fail('E_DEMO_MODE_INVALID', 'Build and runtime application modes must match')
  }

  const normalizedHost = String(hostname || '').trim().toLowerCase()
  if (buildAppMode === APP_MODE.BACKEND && normalizedHost === DEMO_HOST) {
    fail('E_DEMO_HOST_DENIED', 'Backend builds cannot run on the Demo host')
  }

  if (buildAppMode === APP_MODE.DEMO) {
    const allowedDevelopmentHosts = new Set([
      ...LOCAL_DEMO_HOSTS,
      ...demoDevHosts.map(host => String(host).trim().toLowerCase()).filter(Boolean)
    ])
    const hostAllowed = normalizedHost === DEMO_HOST || (isDevelopment && allowedDevelopmentHosts.has(normalizedHost))
    if (!hostAllowed) {
      fail('E_DEMO_HOST_DENIED', 'Demo build host is not allowlisted')
    }
    if (!isAllowedDemoApiBase(runtimeConfig.apiBase) || !isAllowedDemoUploadBase(runtimeConfig.uploadBaseUrl)) {
      fail('E_DEMO_API_UNSAFE', 'Demo API and upload configuration must remain same-origin')
    }
  }

  return buildAppMode
}
