import { IDENTITY_STORAGE_KEYS, SESSION_APP_MODE_KEY } from './constants'
import { AppStartupError } from './errors'

let currentAppMode = null
let demoSessionService = null

export function getAppMode () {
  return currentAppMode
}

export function isDemoMode () {
  return currentAppMode === 'demo'
}

export function registerDemoSessionService (service) {
  demoSessionService = service
}

export function getDemoSessionService () {
  return demoSessionService
}

export function synchronizeSessionAppMode (appMode) {
  try {
    const previousMode = localStorage.getItem(SESSION_APP_MODE_KEY)
    if (previousMode && previousMode !== appMode) {
      IDENTITY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
    }
    localStorage.setItem(SESSION_APP_MODE_KEY, appMode)
    currentAppMode = appMode
  } catch (error) {
    throw new AppStartupError('E_DEMO_IDB_UNAVAILABLE', 'Browser session storage is unavailable', error)
  }
}
