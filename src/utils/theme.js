/**
 * 公司品牌主题工具。
 *
 * 后台历史上存在 color / ui / app 三套品牌变量。这里统一从
 * company_branding.primary_color 派生并一次性写入，避免只修改登录页。
 * 页面背景、卡片和文字变量不在这里修改，继续由深色/浅色模式控制。
 */

export const DEFAULT_PRIMARY_COLOR = '#067a7a'
export const DEFAULT_SECONDARY_COLOR = '#0a0a0b'
export const DEFAULT_ACCENT_COLOR = '#28a745'
export const THEME_CHANGE_EVENT = 'company-theme-change'
export const SYSTEM_FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
export const NOTO_FONT_FAMILY = '"Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif'
export const CJK_SYSTEM_FONT_FAMILY = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif'

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function normalizeColor (color, fallback = DEFAULT_PRIMARY_COLOR) {
  if (typeof color !== 'string') return fallback
  const value = color.trim()
  if (!HEX_COLOR_RE.test(value)) return fallback
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
  }
  return value.toLowerCase()
}

function hexToRgb (color) {
  const normalized = normalizeColor(color).slice(1)
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  }
}

function rgbToHex ({ r, g, b }) {
  const toHex = value => Math.round(value).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function mixColor (color, target, weight) {
  const sourceRgb = hexToRgb(color)
  const targetRgb = hexToRgb(target)
  return rgbToHex({
    r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * weight,
    g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * weight,
    b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * weight
  })
}

function rgba (color, alpha) {
  const { r, g, b } = hexToRgb(color)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function relativeLuminance (color) {
  const { r, g, b } = hexToRgb(color)
  const toLinear = channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function whiteContrastRatio (color) {
  return 1.05 / (relativeLuminance(color) + 0.05)
}

function ensureWhiteTextContrast (color, minimumRatio = 4.5) {
  if (whiteContrastRatio(color) >= minimumRatio) return normalizeColor(color)
  for (let weight = 0.02; weight <= 0.8; weight += 0.02) {
    const candidate = mixColor(color, '#000000', weight)
    if (whiteContrastRatio(candidate) >= minimumRatio) return candidate
  }
  return '#000000'
}

export function createThemePalette (color, fallback = DEFAULT_PRIMARY_COLOR) {
  const brand = normalizeColor(color, fallback)
  const solid = ensureWhiteTextContrast(brand)
  return {
    brand,
    solid,
    solidHover: mixColor(solid, '#000000', 0.12),
    bright: mixColor(brand, '#ffffff', 0.18),
    hover: mixColor(brand, '#000000', 0.12),
    dark: mixColor(brand, '#000000', 0.24),
    light: mixColor(brand, '#ffffff', 0.72),
    // 半透明衍生色会分别叠加在浅色白底和深色黑底上，两种模式都适用
    soft: rgba(brand, 0.14),
    tint: rgba(brand, 0.10),
    background: rgba(brand, 0.08),
    disabled: mixColor(brand, '#ffffff', 0.46),
    focus: rgba(brand, 0.20),
    outline: rgba(brand, 0.38),
    // 后台实心主色控件统一使用白字，避免同类按钮因主色明暗产生不一致
    contrast: '#ffffff'
  }
}

/** 从 localStorage 获取当前公司的品牌主色。 */
export function getPrimaryColor () {
  try {
    const brandingStr = localStorage.getItem('company_branding')
    if (!brandingStr) return DEFAULT_PRIMARY_COLOR
    const branding = JSON.parse(brandingStr)
    return normalizeColor(branding.primary_color || branding.primaryColor)
  } catch (error) {
    return DEFAULT_PRIMARY_COLOR
  }
}

export function getCompanyBranding () {
  try {
    const branding = JSON.parse(localStorage.getItem('company_branding') || '{}')
    return {
      primary_color: normalizeColor(branding.primary_color || branding.primaryColor, DEFAULT_PRIMARY_COLOR),
      secondary_color: normalizeColor(branding.secondary_color || branding.secondaryColor, DEFAULT_SECONDARY_COLOR),
      accent_color: normalizeColor(branding.accent_color || branding.accentColor, DEFAULT_ACCENT_COLOR),
      font_family: branding.font_family || branding.fontFamily || SYSTEM_FONT_FAMILY
    }
  } catch (error) {
    return {
      primary_color: DEFAULT_PRIMARY_COLOR,
      secondary_color: DEFAULT_SECONDARY_COLOR,
      accent_color: DEFAULT_ACCENT_COLOR,
      font_family: SYSTEM_FONT_FAMILY
    }
  }
}

export function normalizeFontFamily (fontFamily) {
  if (typeof fontFamily !== 'string' || !fontFamily.trim()) return SYSTEM_FONT_FAMILY
  if (fontFamily === SYSTEM_FONT_FAMILY) return SYSTEM_FONT_FAMILY
  if (fontFamily.includes('Noto Sans')) return NOTO_FONT_FAMILY
  if (fontFamily.includes('PingFang') || fontFamily.includes('Microsoft YaHei')) return CJK_SYSTEM_FONT_FAMILY
  // 旧的 Roboto / Helvetica / Georgia 配置统一迁移到系统默认，避免中文回退不一致
  return SYSTEM_FONT_FAMILY
}

export function updateThemeFont (fontFamily) {
  const normalized = normalizeFontFamily(fontFamily)
  if (typeof document === 'undefined') return normalized
  document.documentElement.style.setProperty('--font-family-brand', normalized)
  return normalized
}

/** 将品牌色同步到整个后台使用的所有变量命名空间。 */
export function updateThemeColor (color) {
  const palette = createThemePalette(color)
  if (typeof document === 'undefined') return palette

  const root = document.documentElement
  if (!root) return palette

  const variables = {
    '--color-primary': palette.brand,
    '--color-primary-dark': palette.dark,
    '--color-primary-light': palette.soft,
    '--color-brand': palette.brand,
    '--color-brand-solid': palette.solid,
    '--color-brand-solid-hover': palette.solidHover,
    '--color-brand-hover': palette.hover,
    '--color-brand-dark': palette.dark,
    '--color-brand-soft': palette.soft,
    '--color-brand-tint': palette.tint,
    '--color-brand-bg': palette.background,
    '--color-brand-disabled': palette.disabled,
    '--color-muted': palette.brand,
    '--color-disabled': palette.disabled,
    '--color-border-focus': palette.brand,
    '--color-bs-primary': palette.brand,
    '--color-bs-primary-hover': palette.hover,
    '--color-on-brand': palette.contrast,
    '--sidebar-active': palette.brand,
    '--sidebar-hover': palette.hover,
    '--el-switch-on-color': palette.brand,
    '--color-brand-light': palette.light,
    '--shadow-focus-brand': `0 0 0 0.2rem ${palette.focus}`,
    '--color-brand-outline': palette.outline,
    '--color-sidebar-bg': palette.brand,
    '--color-sidebar-hover-bg': palette.dark,
    '--color-sidebar-active-bg': palette.dark
  }

  Object.entries(variables).forEach(([name, value]) => root.style.setProperty(name, value))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: palette }))
  }
  return palette
}

export function updateCompanyTheme (branding = {}) {
  const primary = normalizeColor(branding.primary_color || branding.primaryColor, DEFAULT_PRIMARY_COLOR)
  const secondary = normalizeColor(branding.secondary_color || branding.secondaryColor, DEFAULT_SECONDARY_COLOR)
  const accent = normalizeColor(branding.accent_color || branding.accentColor, DEFAULT_ACCENT_COLOR)
  const primaryPalette = updateThemeColor(primary)
  const secondaryPalette = createThemePalette(secondary, DEFAULT_SECONDARY_COLOR)
  const accentPalette = createThemePalette(accent, DEFAULT_ACCENT_COLOR)

  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.style.setProperty('--color-sidebar-bg-secondary', secondaryPalette.brand)
    root.style.setProperty('--color-accent', accentPalette.brand)
    root.style.setProperty('--color-accent-hover', accentPalette.hover)
    root.style.setProperty('--color-accent-bg', accentPalette.background)
  }
  updateThemeFont(branding.font_family || branding.fontFamily)
  return { primary: primaryPalette, secondary: secondaryPalette, accent: accentPalette }
}

export function applyCompanyTheme (company = null) {
  const branding = {
    primary_color: company?.primary_color || null,
    secondary_color: company?.secondary_color || null,
    accent_color: company?.accent_color || null
  }
  localStorage.setItem('company_branding', JSON.stringify(branding))
  return updateCompanyTheme(branding)
}

export function clearCompanyTheme () {
  localStorage.removeItem('company_branding')
  localStorage.removeItem('company_info')
  return updateCompanyTheme()
}

/** 从本地品牌配置恢复主题。 */
export function initTheme () {
  return updateCompanyTheme(getCompanyBranding())
}
