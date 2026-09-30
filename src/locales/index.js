// vue-i18n 实例配置 - 8 种语言
// 语言初始化优先级：localStorage 用户偏好 > 浏览器语言 > 默认 zh-CN
//
// 加载策略（动态分包，2026-05-09 优化）：
// - zh-CN 同步 import：作为 fallbackLocale 必须在所有翻译前可用，且体量约 152KB 也是兜底基础
// - zh-TW / en-US / de-DE / ja-JP / fr-FR / es-ES / ko-KR 走 webpack 动态 import：
//   每种语言生成独立 chunk（locale-<code>.[hash].js），按需异步加载
// - setLocale() 切语言时若目标尚未加载，先 await import + setLocaleMessage()，再切 i18n.locale
// - 配合 splitChunks: { chunks: 'all' } 把 7 份非中文 JSON 从 main bundle 中拆出（预计减 ~600KB）
import Vue from 'vue'
import VueI18n from 'vue-i18n'
import zhCN from './zh-CN.json'

Vue.use(VueI18n)

// 8 种语言：中（简）/ 中（繁）/ 英 / 德 / 日 / 法 / 西 / 韩
export const SUPPORTED_LOCALES = [
  { code: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
  { code: 'zh-TW', name: '繁體中文', nativeName: '繁體中文' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'de-DE', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'ja-JP', name: '日本語', nativeName: '日本語' },
  { code: 'fr-FR', name: 'Français', nativeName: 'Français' },
  { code: 'es-ES', name: 'Español', nativeName: 'Español' },
  { code: 'ko-KR', name: '한국어', nativeName: '한국어' }
]

const SUPPORTED_CODES = SUPPORTED_LOCALES.map(l => l.code)
const DEFAULT_LOCALE = 'zh-CN'

// 浏览器语言 → locale code 映射
function matchBrowserLocale (browserLang) {
  const lang = (browserLang || '').toLowerCase()
  // 完整匹配（如 zh-cn → zh-CN）
  for (const code of SUPPORTED_CODES) {
    if (lang === code.toLowerCase()) return code
  }
  // 前缀匹配（如 zh-hk → zh-TW，de-at → de-DE）
  if (lang.startsWith('zh')) {
    if (lang.includes('tw') || lang.includes('hk') || lang.includes('hant')) return 'zh-TW'
    return 'zh-CN'
  }
  if (lang.startsWith('en')) return 'en-US'
  if (lang.startsWith('de')) return 'de-DE'
  if (lang.startsWith('ja')) return 'ja-JP'
  if (lang.startsWith('fr')) return 'fr-FR'
  if (lang.startsWith('es')) return 'es-ES'
  if (lang.startsWith('ko')) return 'ko-KR'
  return null
}

function getInitialLocale () {
  // 优先级：1. localStorage 用户偏好  2. 浏览器语言  3. 默认
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem('locale')
    if (saved && SUPPORTED_CODES.includes(saved)) return saved
  }
  if (typeof navigator !== 'undefined') {
    const matched = matchBrowserLocale(navigator.language)
    if (matched) return matched
  }
  return DEFAULT_LOCALE
}

const initialLocale = getInitialLocale()

// 仅注入 zh-CN（兜底）和 messages，初始 locale 先用 fallback。
// 由 main.js bootstrap 阶段 await ensureLocaleLoaded(initialLocale) 后，
// 把 i18n.locale 切到目标语言；这样首屏不会出现"目标语言未加载 → 渲染中文 → 切换"的闪烁。
const i18n = new VueI18n({
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN
  },
  // 生产环境抑制 missing key 警告
  silentTranslationWarn: process.env.NODE_ENV === 'production',
  silentFallbackWarn: process.env.NODE_ENV === 'production'
})

// 已发起的加载 promise 缓存：避免同一 locale 并发触发多次 import
const _loadingPromises = Object.create(null)

/**
 * 确保某 locale 的 messages 已加载完毕（zh-CN 同步内建，直接 resolve）
 * @param {string} locale
 * @returns {Promise<void>}
 */
export function ensureLocaleLoaded (locale) {
  if (!SUPPORTED_CODES.includes(locale)) {
    return Promise.reject(new Error(`[i18n] unsupported locale: ${locale}`))
  }
  // 已加载（zh-CN 在初始化时已注入；其他切过一次后留在 i18n.availableLocales）
  if (i18n.availableLocales.includes(locale)) {
    return Promise.resolve()
  }
  // 复用进行中的请求
  if (_loadingPromises[locale]) {
    return _loadingPromises[locale]
  }
  // webpackChunkName 用 locale-[request] 让产物文件名为 locale-zh-TW.<hash>.js
  const p = import(/* webpackChunkName: "locale-[request]" */ `./${locale}.json`)
    .then(mod => {
      const messages = mod && mod.default ? mod.default : mod
      i18n.setLocaleMessage(locale, messages)
    })
    .catch(err => {
      // 加载失败时清缓存，下次切换可重试；并把错误抛给调用方
      delete _loadingPromises[locale]
      throw err
    })
  _loadingPromises[locale] = p
  return p
}

/**
 * 切换当前语言（异步：若 messages 未加载会先动态 import）
 * @param {string} locale - 目标语言代码，必须在 SUPPORTED_LOCALES 中
 * @returns {Promise<void>}
 */
export async function setLocale (locale) {
  if (!SUPPORTED_CODES.includes(locale)) {
    console.warn(`[i18n] unsupported locale: ${locale}, ignored`)
    return
  }
  await ensureLocaleLoaded(locale)
  i18n.locale = locale
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('locale', locale)
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
  }
}

// 启动时需要的 locale，由 main.js bootstrap 阶段调用
export const initialLocaleCode = initialLocale

export default i18n
