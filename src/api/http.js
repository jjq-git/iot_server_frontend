// Axios 实例：统一配置 baseURL、超时、拦截器
import axios from 'axios'
import { error as showErrorToast } from '@/services/ui/toast'
import i18n from '@/locales'
import { appConfig } from '@/utils/config'
import { getLoginEntryPath } from '@/utils/loginEntry'
import { isDemoMode } from '@/app-mode/runtime'
import { AppStartupError } from '@/app-mode/errors'
import { clearSessionContext } from '@/utils/sessionContext'

// 默认回退地址（仅在 SSR / appConfig 未初始化时使用）
const DEFAULT_BASE_URL = '/api/v1'

/**
 * 获取 API 基础地址
 * 实际逻辑统一在 utils/config.js 的 appConfig 中维护：
 * 1. config.json 配置（apiBase != "auto"）优先
 * 2. 否则按 hostname 自动映射（含 pods.dengtec.com 等正式环境）
 * 3. 都没匹配返回 /api/v1
 */
export const getApiBaseURL = () => {
  if (typeof window === 'undefined') return DEFAULT_BASE_URL
  return appConfig.getApiBase()
}

/**
 * 加载运行时配置 (public/config.json)
 * 兼容旧调用方式；实际加载已在 main.js 通过 appConfig.load() 完成
 */
export const loadRuntimeConfig = async () => {
  await appConfig.load()
}

let handlingUnauthorized = false

const http = axios.create({
  baseURL: DEFAULT_BASE_URL,
  timeout: 15000
})

// 请求拦截器
http.interceptors.request.use(config => {
  config.baseURL = getApiBaseURL()
  if (isDemoMode() && typeof window !== 'undefined') {
    const requestUrl = new URL(axios.getUri(config), window.location.origin)
    const isAllowedPath = requestUrl.pathname === '/api/v1' || requestUrl.pathname.startsWith('/api/v1/')
    if (requestUrl.origin !== window.location.origin || !isAllowedPath) {
      throw new AppStartupError('E_DEMO_API_UNSAFE', 'Demo request attempted to leave the same-origin API boundary')
    }
  }
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器
http.interceptors.response.use(
  response => response.config?.includeResponseMetadata
    ? {
        data: response.data,
        status: response.status,
        headers: response.headers
      }
    : response.data,
  error => {
    // 登录接口本身的 401（账号/密码错误）不能走"会话过期→踢回登录页"逻辑：
    // 否则会 window.location.replace 重载页面，Login.vue 的 catch 来不及显示错误提示，
    // 表现为"密码错了什么提示都没有、输入框被清空"。让登录接口的错误直接抛给 Login.vue 处理。
    const reqUrl = error?.config?.url || ''
    const isLoginRequest = reqUrl.includes('/auth/login')
    const apiData = error?.response?.data
    const apiDetail = apiData?.detail && typeof apiData.detail === 'object' ? apiData.detail : null
    const apiCode = apiData?.code || apiDetail?.code
    if (error?.response?.status === 401 && typeof window !== 'undefined' && !isLoginRequest) {
      // 后端 must_change_password=true 时，几乎所有业务 API 都返回 401 + code=E2013。
      // 这是"会话有效但需先改密"，不是"登录失效"——必须保留 token 跳改密页，
      // 否则会被原拦截器删 token → 跳登录 → 死循环（厂家账号首次登录的核心 bug）。
      if (apiCode === 'E2013') {
        const currentHash = window.location.hash || ''
        const onProfilePage = currentHash.includes('/user/profile')
        if (!onProfilePage) {
          showErrorToast(i18n.t('auth.must_change_password_first'))
          window.location.replace('/#/user/profile?force_change_password=1')
        }
        return Promise.reject(error)
      }

      if (error.config?.skipUnauthorizedRedirect) {
        return Promise.reject(error)
      }

      if (!handlingUnauthorized) {
        handlingUnauthorized = true
        // 清空所有与会话/用户身份相关的本地缓存,避免下次登录看到旧用户的 UI
        // 清单与 Login.vue / UserProfile.vue / Companies.vue / Sidebar.vue 等 setItem 点保持一致
        clearSessionContext()
        showErrorToast(i18n.t('auth.session_expired'))
        const currentPath = (window.location.hash || '#/').replace(/^#/, '')
        const loginUrl = `/#${getLoginEntryPath()}?redirect=${encodeURIComponent(currentPath)}`
        window.location.replace(loginUrl)
      }
    }
    // i18n 错误码翻译：后端 APIError 标准响应含 code 字段时尝试翻译
    // 仅设置 error.userMessage 供调用方按需使用，不替换原有逻辑
    if (apiData && apiCode) {
      const i18nKey = `errors.${apiCode}`
      // 先检查 key，避免未知 HTTP 状态码触发 vue-i18n 的对象/缺失翻译警告。
      if (i18n.te(i18nKey)) {
        const translated = i18n.t(i18nKey)
        if (typeof translated === 'string') error.userMessage = translated
      }
      if (!error.userMessage && (apiData.message || apiDetail?.message)) {
        error.userMessage = apiData.message || apiDetail.message
      }
    }
    if (error?.response?.status === 403 && !error.userMessage) {
      const detail = apiData?.detail
      error.userMessage = typeof detail === 'string' && detail
        ? detail
        : i18n.t('auth.no_permission')
    }
    if (!error.userMessage && apiData?.detail) {
      if (typeof apiData.detail === 'string') {
        error.userMessage = apiData.detail
      } else if (typeof apiData.detail === 'object') {
        const messages = [
          apiData.detail.message,
          ...(Array.isArray(apiData.detail.errors) ? apiData.detail.errors : [])
        ].filter(Boolean)
        if (messages.length) error.userMessage = messages.join('；')
      }
    }
    return Promise.reject(error)
  }
)

export default http
