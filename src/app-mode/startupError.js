import { asStartupError } from './errors'

const DEFAULT_LOCALE = 'zh-CN'
const SUPPORTED_LOCALES = Object.freeze(['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR'])

const MESSAGES = Object.freeze({
  'zh-CN': { title: '应用无法启动', action: '请刷新页面；问题持续时请联系站点管理员。' },
  'zh-TW': { title: '應用程式無法啟動', action: '請重新整理頁面；問題持續時請聯絡網站管理員。' },
  'en-US': { title: 'Application could not start', action: 'Refresh the page. If the problem continues, contact the site administrator.' },
  'de-DE': { title: 'Die Anwendung konnte nicht gestartet werden', action: 'Laden Sie die Seite neu. Wenden Sie sich bei anhaltendem Problem an den Administrator.' },
  'ja-JP': { title: 'アプリを起動できません', action: 'ページを再読み込みしてください。解決しない場合はサイト管理者に連絡してください。' },
  'fr-FR': { title: 'L’application n’a pas pu démarrer', action: 'Actualisez la page. Si le problème persiste, contactez l’administrateur du site.' },
  'es-ES': { title: 'No se pudo iniciar la aplicación', action: 'Actualice la página. Si el problema continúa, contacte con el administrador del sitio.' },
  'ko-KR': { title: '애플리케이션을 시작할 수 없습니다', action: '페이지를 새로 고치세요. 문제가 계속되면 사이트 관리자에게 문의하세요.' }
})

function matchLocale (value) {
  const language = String(value || '').toLowerCase()
  const exact = SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === language)
  if (exact) return exact
  if (language.startsWith('zh')) return /(?:tw|hk|hant)/.test(language) ? 'zh-TW' : 'zh-CN'
  return SUPPORTED_LOCALES.find(locale => locale.toLowerCase().startsWith(`${language.split('-')[0]}-`)) || null
}

export function resolveStartupLocale () {
  try {
    const stored = localStorage.getItem('locale')
    const matched = matchLocale(stored)
    if (matched) return matched
  } catch (error) {
    // The startup error page must still render when storage itself is unavailable.
  }
  const browserLanguages = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : []
  for (const language of browserLanguages) {
    const matched = matchLocale(language)
    if (matched) return matched
  }
  return DEFAULT_LOCALE
}

export function renderStartupError (error, details = {}) {
  if (typeof document === 'undefined') return
  const startupError = asStartupError(error)
  const locale = resolveStartupLocale()
  const message = MESSAGES[locale] || MESSAGES[DEFAULT_LOCALE]
  document.documentElement.lang = locale

  const root = document.getElementById('app') || document.body
  const panel = document.createElement('main')
  panel.setAttribute('role', 'alert')
  panel.style.cssText = 'max-width:44rem;margin:10vh auto;padding:2rem;border:1px solid GrayText;background:Canvas;color:CanvasText;font-family:system-ui,sans-serif'

  const title = document.createElement('h1')
  title.textContent = message.title
  const action = document.createElement('p')
  action.textContent = message.action
  const diagnostics = document.createElement('pre')
  diagnostics.style.cssText = 'overflow:auto;padding:1rem;background:ButtonFace;color:ButtonText'
  diagnostics.textContent = [
    `code: ${startupError.code}`,
    `buildAppMode: ${details.buildAppMode || '-'}`,
    `runtimeAppMode: ${details.runtimeAppMode || '-'}`,
    `host: ${details.host || '-'}`
  ].join('\n')
  panel.append(title, action, diagnostics)
  root.replaceChildren(panel)
}
