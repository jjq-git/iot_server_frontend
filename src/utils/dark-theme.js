/**
 * 深色/浅色主题逻辑（移植自 aliyun/web_components/theme_toggle/theme.html）
 *
 * 责任：
 * - 读写 localStorage 持久化主题与亮度
 * - 切换 <html data-theme="light|dark">
 * - 调整全屏遮罩透明度实现亮度调节
 * - 跨 tab 同步（监听 storage 事件）
 * - auto 模式跟随系统配色（matchMedia('(prefers-color-scheme: dark)')）
 *
 * 三种 mode：
 *   - 'light' 强制浅色
 *   - 'dark'  强制深色
 *   - 'auto'  跟随系统
 *
 * 不负责 UI 渲染。UI 在 src/components/ThemeToggle.vue。
 */

const PREFIX = 'iot_admin'
export const KEY_THEME = `${PREFIX}_theme` // 实际生效主题：light|dark
export const KEY_MODE = `${PREFIX}_mode` // 用户选的 mode：light|dark|auto
export const KEY_BRIGHT_LIGHT = `${PREFIX}_brightness_light`
export const KEY_BRIGHT_DARK = `${PREFIX}_brightness_dark`

const OVERLAY_ID = 'tt-brightness-overlay'

function readInt (key, fallback) {
  const v = parseInt(localStorage.getItem(key), 10)
  return Number.isNaN(v) ? fallback : v
}

/**
 * 是否系统当前是深色（在 SSR 或老浏览器上 fallback false）
 */
export function isSystemDark () {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  } catch (e) {
    return false
  }
}

/**
 * 获取用户选的 mode：'light' | 'dark' | 'auto'
 * 兼容：旧版本只存 KEY_THEME（'light'/'dark'）的，作为 mode 回灌
 */
export function getMode () {
  const m = localStorage.getItem(KEY_MODE)
  if (m === 'light' || m === 'dark' || m === 'auto') return m
  // 兼容旧版本
  const t = localStorage.getItem(KEY_THEME)
  if (t === 'light' || t === 'dark') return t
  return 'light'
}

/**
 * 获取**实际生效**的主题（auto 模式下解析为系统配色）
 */
export function getTheme () {
  const mode = getMode()
  if (mode === 'auto') return isSystemDark() ? 'dark' : 'light'
  return mode
}

export function getBrightness (theme = getTheme()) {
  return theme === 'dark'
    ? readInt(KEY_BRIGHT_DARK, 100)
    : readInt(KEY_BRIGHT_LIGHT, 100)
}

function ensureOverlay () {
  let ov = document.getElementById(OVERLAY_ID)
  if (!ov) {
    ov = document.createElement('div')
    ov.id = OVERLAY_ID
    Object.assign(ov.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '9999',
      background: 'transparent',
      transition: 'background 0.2s ease'
    })
    document.body && document.body.appendChild(ov)
  }
  return ov
}

export function applyBrightness (val) {
  const ov = ensureOverlay()
  if (val >= 100) {
    ov.style.background = 'transparent'
  } else {
    // 30 → 70% 黑遮罩，100 → 0% 黑
    const opacity = ((100 - val) / 100) * 0.7
    ov.style.background = `rgba(0,0,0,${opacity.toFixed(3)})`
  }
}

export function applyTheme () {
  const theme = getTheme()
  const bri = getBrightness(theme)
  document.documentElement.setAttribute('data-theme', theme)
  // mode 单独写一个 attr，组件可读出 auto 状态决定 UI 显示
  document.documentElement.setAttribute('data-theme-mode', getMode())
  applyBrightness(bri)
  return { theme, mode: getMode(), brightness: bri }
}

/**
 * 切换 mode（按钮点击：light ↔ dark 两态切换，仿 ota_manager 原版）
 * 不再轮转到 auto;auto 模式仍可通过 setMode('auto') 直接设置。
 */
export function cycleMode () {
  const cur = getTheme() // 用实际 theme 而不是 mode,这样 auto 也能正确切换
  const next = cur === 'light' ? 'dark' : 'light'
  setMode(next)
  return next
}

/**
 * 直接设置 mode
 * @param {'light'|'dark'|'auto'} mode
 */
export function setMode (mode) {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'auto') return
  localStorage.setItem(KEY_MODE, mode)
  // KEY_THEME 维持兼容：写入实际生效主题（旧逻辑读这个值）
  if (mode === 'auto') {
    localStorage.setItem(KEY_THEME, isSystemDark() ? 'dark' : 'light')
  } else {
    localStorage.setItem(KEY_THEME, mode)
  }
  applyTheme()
}

/**
 * 防闪白：在 Vue 实例化前调用。
 * 此时 <body> 还没有，只能设置 <html data-theme>，遮罩等 body ready 后再加。
 *
 * 注意：必须读 mode 而不是 KEY_THEME，否则 auto 模式刷新时不会跟系统。
 */
export function applyThemeASAP () {
  try {
    const mode = getMode()
    const theme = mode === 'auto'
      ? (isSystemDark() ? 'dark' : 'light')
      : mode
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-theme-mode', mode)
  } catch (e) { /* localStorage 不可用：跳过 */ }
}

/**
 * 监听跨 tab storage 事件，自动同步主题与亮度。
 * 在 main.js 调用一次。
 *
 * 同源限制：localStorage 按 origin 隔离（协议+host+port 完全相同才共享）。
 */
export function bindCrossTabSync (onChange) {
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    if (e.key === KEY_MODE || e.key === KEY_THEME) {
      applyTheme()
      onChange && onChange({ type: 'theme' })
    } else if (
      (e.key === KEY_BRIGHT_LIGHT && getTheme() === 'light') ||
      (e.key === KEY_BRIGHT_DARK && getTheme() === 'dark')
    ) {
      applyBrightness(getBrightness())
      onChange && onChange({ type: 'brightness' })
    }
  })
}

/**
 * 监听系统主题变化（auto 模式时跟随）。
 * 在 main.js 调用一次。
 */
export function bindSystemThemeListener (onChange) {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      // 仅 auto 模式才跟随系统
      if (getMode() === 'auto') {
        // 同步 KEY_THEME 兼容值
        localStorage.setItem(KEY_THEME, mq.matches ? 'dark' : 'light')
        applyTheme()
        onChange && onChange({ type: 'system' })
      }
    }
    if (mq.addEventListener) {
      mq.addEventListener('change', handler)
    } else if (mq.addListener) {
      // 老浏览器 fallback
      mq.addListener(handler)
    }
  } catch (e) {
    // 不支持 matchMedia：静默
  }
}
