// 通用格式化工具:与 i18n 联动,目前提供 formatDate
// 后续可扩展 formatNumber / formatCurrency 等
import i18n from '@/locales'

const DEFAULT_DATE_OPTS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
}

/**
 * 按当前 i18n.locale 格式化日期/时间
 * - 入参可以是 Date / 时间戳数字 / ISO 字符串
 * - 解析失败时返回原值(避免破坏表格显示)
 * - opts 默认含到分钟,需要秒/不要时间请显式传 opts
 *
 * @param {Date|string|number} d
 * @param {Intl.DateTimeFormatOptions} [opts]
 * @returns {string}
 */
export function formatDate (d, opts) {
  if (d == null || d === '') return '-'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const finalOpts = opts || DEFAULT_DATE_OPTS
  try {
    return new Intl.DateTimeFormat(i18n.locale, finalOpts).format(date)
  } catch (e) {
    // 极端情况:不支持的 locale,降级到 toLocaleDateString
    return date.toLocaleDateString(i18n.locale, finalOpts)
  }
}

/**
 * 按当前 i18n.locale 拼接字符串列表，分隔符跟随语言
 * - 中/日/韩用「、」，英/德/法/西用「, 」（由 Intl.ListFormat 决定）
 * - 过滤空值；不支持 Intl.ListFormat 的环境降级为「, 」
 *
 * @param {Array<string|number>} items
 * @returns {string}
 */
export function formatList (items) {
  const arr = (Array.isArray(items) ? items : [])
    .filter(v => v !== null && v !== undefined && v !== '')
    .map(String)
  if (!arr.length) return ''
  try {
    return new Intl.ListFormat(i18n.locale, { style: 'short', type: 'unit' }).format(arr)
  } catch (e) {
    return arr.join(', ')
  }
}

export default {
  formatDate,
  formatList
}
