import { DEMO_SESSION_KEYS, IDENTITY_STORAGE_KEYS } from '@/app-mode/constants'
import { createDemoUser, DEMO_COMPANIES, DEMO_SCENARIOS } from './seeds'

export { DEMO_SCENARIOS }

const CHANNEL_NAME = 'podsc-demo-session'
let channel = null

const broadcast = type => {
  const revision = `${Date.now()}:${Math.random().toString(36).slice(2)}`
  localStorage.setItem('demoSessionRevision', revision)
  if ('BroadcastChannel' in window) {
    channel = channel || new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage({ type, revision })
  }
}

export function getDemoScenario (scenarioId) {
  return DEMO_SCENARIOS.find(item => item.id === scenarioId) || null
}

export function getCurrentDemoScenario () {
  return getDemoScenario(localStorage.getItem('demoScenario'))
}

export function resolveDemoToken (authorization = '') {
  const token = String(authorization).replace(/^Bearer\s+/i, '')
  const match = /^demo-session:([a-z]+):/.exec(token)
  return match ? getDemoScenario(match[1]) : null
}

export function selectDemoScenario (scenarioId) {
  const selected = getDemoScenario(scenarioId)
  if (!selected) throw new Error(`Unknown Demo scenario: ${scenarioId}`)
  const user = createDemoUser(selected)
  const company = DEMO_COMPANIES.find(item => item.id === selected.companyId)
  const token = `demo-session:${selected.id}:${Math.random().toString(36).slice(2)}`

  localStorage.setItem('demoScenario', selected.id)
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('company_info', JSON.stringify(company))
  localStorage.setItem('company_branding', JSON.stringify({ company_name: company.name }))
  broadcast('SCENARIO_CHANGED')
  return { access_token: token, user }
}

export function clearDemoSession () {
  IDENTITY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key))
  DEMO_SESSION_KEYS.forEach(key => localStorage.removeItem(key))
  broadcast('SESSION_CLEARED')
}

export function bindDemoSessionSync () {
  const reload = () => window.location.reload()
  if ('BroadcastChannel' in window) {
    channel = channel || new BroadcastChannel(CHANNEL_NAME)
    channel.addEventListener('message', reload)
  } else {
    window.addEventListener('storage', event => {
      if (event.key === 'demoSessionRevision') reload()
    })
  }
}

export const demoSessionService = Object.freeze({
  scenarios: DEMO_SCENARIOS,
  selectScenario: selectDemoScenario,
  clearSession: clearDemoSession,
  getCurrentScenario: getCurrentDemoScenario
})
