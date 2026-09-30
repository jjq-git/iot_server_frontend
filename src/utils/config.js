import { AppStartupError } from '@/app-mode/errors'

const DEFAULT_API_BASE = '/api/v1'

const trimTrailingSlash = (value) => {
  if (!value || value === '/') return ''
  return value.replace(/\/+$/, '')
}

const runtimeConfigUrls = () => {
  if (typeof document === 'undefined') return ['/config.json']
  return [...new Set([
    new URL('config.json', document.baseURI).toString(),
    new URL('/config.json', document.baseURI).toString()
  ])]
}

/**
 * 运行时地址配置。
 *
 * 默认使用同源 /api/v1：开发环境交给 webpack-dev-server 代理，生产环境
 * 交给 Nginx 代理。只有 config.json 显式填写绝对地址时才跨域直连后端。
 */
class AppConfig {
  constructor () {
    this.config = {
      appMode: null,
      apiBase: 'auto',
      uploadBaseUrl: 'auto'
    }
    this.loaded = false
  }

  async load () {
    if (this.loaded) return this.config

    let loadError = null
    let loaded = false
    for (const configUrl of runtimeConfigUrls()) {
      try {
        const response = await fetch(configUrl)
        if (!response.ok) {
          loadError = new Error(`config.json request failed with ${response.status}`)
          continue
        }
        const runtimeConfig = await response.json()
        if (!runtimeConfig || typeof runtimeConfig !== 'object' || Array.isArray(runtimeConfig)) {
          loadError = new Error('config.json must contain an object')
          continue
        }
        this.config = { ...this.config, ...runtimeConfig }
        loadError = null
        loaded = true
        break
      } catch (error) {
        loadError = error
      }
    }
    if (!loaded) {
      throw new AppStartupError('E_DEMO_CONFIG_LOAD', 'Unable to load config.json', loadError)
    }

    this.loaded = true
    return this.config
  }

  getAppMode () {
    return this.config.appMode
  }

  getApiBase () {
    const configured = this.config.apiBase
    if (typeof configured !== 'string' || !configured || configured === 'auto') return DEFAULT_API_BASE
    return trimTrailingSlash(configured.trim()) || DEFAULT_API_BASE
  }

  getUploadBase () {
    const configured = this.config.uploadBaseUrl
    if (typeof configured === 'string' && configured && configured !== 'auto') {
      return trimTrailingSlash(configured.trim())
    }

    // /api/v1/upload/{uuid} 与 API 同源；这里只保留 API 前缀之前的部分。
    return this.getApiBase().replace(/\/api\/v1\/?$/, '')
  }

  getWebSocketApiBase () {
    const apiBase = this.getApiBase()
    if (typeof window === 'undefined') {
      return apiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
    }

    const absoluteApiUrl = new URL(apiBase, window.location.origin).toString()
    return trimTrailingSlash(absoluteApiUrl)
      .replace(/^http:/, 'ws:')
      .replace(/^https:/, 'wss:')
  }
}

export const appConfig = new AppConfig()
