export const APP_MODE = Object.freeze({
  BACKEND: 'backend',
  DEMO: 'demo'
})

export const APP_MODES = Object.freeze(Object.values(APP_MODE))
export const SESSION_APP_MODE_KEY = 'sessionAppMode'
export const DEMO_SESSION_KEYS = Object.freeze([
  'demoScenario',
  'demoSessionRevision'
])
export const IDENTITY_STORAGE_KEYS = Object.freeze([
  'token',
  'user',
  'company_info',
  'company_branding',
  'userRole',
  ...DEMO_SESSION_KEYS
])
export const DEMO_HOST = 'demo.podsc.com'
export const DEMO_WORKER_QUERY = 'app=podsc-demo'
