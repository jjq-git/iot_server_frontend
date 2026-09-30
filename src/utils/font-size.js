/**
 * 全局字体大小（小/中/大）逻辑
 *
 * 责任：
 * - 读写 localStorage 持久化用户选择
 * - 给 <html> 加 data-font-size="small|medium|large" 属性 + 设置 html font-size px
 * - 跨 tab 同步（监听 storage 事件）
 *
 * 实现策略：
 * 1. 样式侧：postcss-pxtorem(见 postcss.config.js)在构建期把所有 `font-size: Npx`
 *    转成 rem，因此只要调 <html> 的 font-size，全站字号（含各页面 scoped 样式、
 *    Bootstrap/BootstrapVue 自带样式）都会等比缩放，无需再注入覆盖 CSS。
 * 2. 画布侧：ECharts 等用 JS 画的文字不受 CSS 影响，需自行读取 getFontScale()
 *    换算字号，并监听 <html data-font-size> 变化重绘（见 src/views/Dashboard.vue）。
 * 3. UI 在 src/components/FontSizeToggle.vue
 */

const PREFIX = 'iot_admin'
export const KEY_FONT_SIZE = `${PREFIX}_font_size` // small | medium | large

// 未选择过时的默认档位（与 i18n font_size_toggle.medium 的「默认」标注保持一致）
export const DEFAULT_FONT_SIZE = 'medium'

// 旧版本曾把 small 作为默认值写入本地缓存。升级后只迁移一次，避免历史默认值
// 长期覆盖当前的 medium 默认值；迁移完成后用户仍可主动选择并保留 small。
const KEY_MEDIUM_DEFAULT_MIGRATED = `${PREFIX}_font_size_medium_default_migrated`

// 历史版本注入过的 px 覆盖样式，改用 rem 方案后不再需要，加载时顺带清理
const LEGACY_STYLE_TAG_ID = 'dynamic-font-size-overrides'

// rem 基准，需与 postcss.config.js 的 rootValue 保持一致
const ROOT_FONT_PX_BASE = 16

/**
 * 三档配置（2026-05-08 调整：整体放大，最小档 = 旧中号）：
 * - small：基准 × 1.00（即旧 medium 字号，避免太小看不清）
 * - medium：基准 × 1.12（之前 large 字号）——【默认档】
 * - large：基准 × 1.28（更大，适合远距离/大屏）
 */
const SCALE_MAP = {
  small: 1.0,
  medium: 1.12,
  large: 1.28
}

export function getFontSize () {
  let v = localStorage.getItem(KEY_FONT_SIZE)
  const migrated = localStorage.getItem(KEY_MEDIUM_DEFAULT_MIGRATED) === '1'
  if (!migrated) {
    localStorage.setItem(KEY_MEDIUM_DEFAULT_MIGRATED, '1')
    if (v === 'small') {
      v = DEFAULT_FONT_SIZE
      localStorage.setItem(KEY_FONT_SIZE, v)
    }
  }
  if (v === 'small' || v === 'medium' || v === 'large') return v
  return DEFAULT_FONT_SIZE
}

/**
 * 当前档位对应的缩放系数，供 ECharts 等 canvas 文字换算字号使用
 * 用法：fontSize: Math.round(12 * getFontScale())
 */
export function getFontScale (size = getFontSize()) {
  return SCALE_MAP[size] || SCALE_MAP[DEFAULT_FONT_SIZE]
}

/**
 * 应用字体大小：
 * - 设置 <html data-font-size="...">（页面/图表可据此监听变化）
 * - 设置 html { font-size: 16 × scale px }，全站 rem 字号随之缩放
 */
export function applyFontSize (size = getFontSize()) {
  if (!SCALE_MAP[size]) size = DEFAULT_FONT_SIZE

  const scale = SCALE_MAP[size]
  document.documentElement.setAttribute('data-font-size', size)
  document.documentElement.style.fontSize = `${Math.round(ROOT_FONT_PX_BASE * scale * 100) / 100}px`

  // 清理旧版本遗留的 px 覆盖样式，避免把 rem 字号又钉回固定 px
  const legacy = document.getElementById(LEGACY_STYLE_TAG_ID)
  if (legacy && legacy.parentNode) legacy.parentNode.removeChild(legacy)

  return size
}

export function setFontSize (size) {
  if (!SCALE_MAP[size]) return getFontSize()
  localStorage.setItem(KEY_FONT_SIZE, size)
  applyFontSize(size)
  return size
}

/**
 * 启动期同步应用，避免 Vue 渲染后还是默认大小造成闪烁
 */
export function applyFontSizeASAP () {
  try {
    applyFontSize(getFontSize())
  } catch (e) { /* localStorage 不可用：跳过 */ }
}

/**
 * 跨 tab 同步
 */
export function bindFontSizeCrossTabSync (onChange) {
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    if (e.key === KEY_FONT_SIZE) {
      applyFontSize()
      onChange && onChange({ size: getFontSize() })
    }
  })
}
