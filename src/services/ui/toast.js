const DEFAULT_DURATION = 2500
const variantMap = {
  success: 'success',
  error: 'danger',
  warning: 'warning',
  info: 'info'
}

let bvToast = null

/**
 * 初始化 Toast 服务（必须在 Vue 实例创建后调用）
 * @param {Vue} app - Vue 根实例
 */
export function init (app) {
  if (app && app.$bvToast) {
    bvToast = app.$bvToast
  }
}

function show (type, message, options = {}) {
  const text = message == null ? '' : String(message)
  if (!text) {
    return null
  }
  const variant = variantMap[type] || 'secondary'

  if (bvToast && typeof bvToast.toast === 'function') {
    bvToast.toast(text, {
      title: options.title || '',
      variant,
      solid: true,
      toaster: options.toaster || 'b-toaster-top-center',
      autoHideDelay: options.duration || DEFAULT_DURATION,
      noCloseButton: options.showClose === false,
      appendToast: true
    })
    return true
  }

  // 回退方案：使用 console 输出避免静默失败
  console.warn('[Toast] $bvToast 未初始化，使用 console 输出')
  if (type === 'error') {
    console.error(`[Toast] ${text}`)
  } else {
    console.log(`[Toast ${type}] ${text}`)
  }
  return true
}

// BootstrapVue-compatible adapter for incremental migrations. Business code
// still enters through this service instead of reaching for $bvToast.
export function toast (message, options = {}) {
  const type = options.variant === 'danger' ? 'error' : options.variant
  return show(type || 'info', message, {
    title: options.title,
    duration: options.autoHideDelay,
    showClose: options.noCloseButton !== true,
    toaster: options.toaster
  })
}

export function success (message, options) {
  return show('success', message, options)
}

export function error (message, options) {
  return show('error', message, options)
}

export function warning (message, options) {
  return show('warning', message, options)
}

export function info (message, options) {
  return show('info', message, options)
}

export default {
  toast,
  success,
  error,
  warning,
  info
}
