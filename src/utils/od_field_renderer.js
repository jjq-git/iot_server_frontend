/**
 * OD 字段渲染辅助
 *
 * 把 OD spec 的一个 entry 映射到前端控件类型。
 *
 *   entry: {
 *     index, sub, name, type, dir, default, min, max, unit, summary,
 *     group_summary, group_name, group_index, section_id,
 *     enum?: { 0: 'OFF', 1: 'ON' } | [{value, label}]
 *   }
 *
 * 返回 descriptor:
 *   {
 *     widget: 'switch' | 'range' | 'number' | 'text' | 'enum' | 'json',
 *     min, max, step,
 *     options?: [{ value, text }],
 *     defaultValue,           // 该字段的初始展示值
 *     readonly                // dir === 'ro'
 *   }
 */

const INT_TYPES = new Set([
  'BOOL',
  'BOOLEAN',
  'UINT8', 'UINT16', 'UINT32', 'UINT64',
  'INT8', 'INT16', 'INT32', 'INT64',
  'U8', 'U16', 'U32', 'U64',
  'I8', 'I16', 'I32', 'I64',
  'BIT'
])

const REAL_TYPES = new Set([
  'REAL32', 'REAL64', 'FLOAT', 'DOUBLE'
])

const STRING_TYPES = new Set([
  'STRING', 'VISIBLE_STRING', 'OCTET_STRING', 'UNICODE_STRING'
])

/** 把 entry.default(可能是 hex/十进制字符串)解析成 JS 值。 */
export function parseDefault (raw, type) {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw === 'number' || typeof raw === 'boolean') return raw
  const s = String(raw).trim()
  const upType = (type || '').toUpperCase()
  if (upType === 'BOOL' || upType === 'BOOLEAN') {
    if (/^(true|1)$/i.test(s)) return true
    if (/^(false|0)$/i.test(s)) return false
  }
  if (REAL_TYPES.has(upType)) {
    const f = parseFloat(s)
    return isNaN(f) ? null : f
  }
  if (INT_TYPES.has(upType)) {
    if (/^0x[0-9a-f]+$/i.test(s)) return parseInt(s, 16)
    if (/^-?\d+$/.test(s)) return parseInt(s, 10)
    return null
  }
  if (STRING_TYPES.has(upType)) return s
  // 兜底:尝试 JSON
  try { return JSON.parse(s) } catch (e) { return s }
}

/**
 * 给一个 OD entry 推断它的输入控件描述。
 *
 * 规则:
 *   - dir === 'ro' → readonly = true(仍然返回控件类型,渲染时禁用)
 *   - BOOL → switch
 *   - 整数有 min/max 且范围 ≤ 1024 → range slider
 *   - 整数有 min/max 但范围大 → number input
 *   - 整数无 min/max → number input
 *   - REAL → number step=0.01
 *   - STRING → text input
 *   - 有 enum 字段 → dropdown
 *   - DOMAIN / 其他 → json textarea
 */
export function describeEntry (entry) {
  if (!entry) {
    return { widget: 'json', readonly: true, defaultValue: '' }
  }
  const upType = String(entry.type || '').toUpperCase()
  const readonly = entry.dir === 'ro'

  // 优先级 1:显式 enum
  if (entry.enum) {
    const options = normalizeEnum(entry.enum)
    return {
      widget: 'enum',
      readonly,
      options,
      defaultValue: parseDefault(entry.default, upType)
    }
  }

  // 优先级 2:BOOL
  if (upType === 'BOOL' || upType === 'BOOLEAN' ||
      (upType === 'UINT8' && entry.min === 0 && entry.max === 1)) {
    return {
      widget: 'switch',
      readonly,
      defaultValue: !!parseDefault(entry.default, 'BOOL')
    }
  }

  // 优先级 3:整数
  if (INT_TYPES.has(upType)) {
    const hasRange = entry.min !== null && entry.min !== undefined &&
                     entry.max !== null && entry.max !== undefined
    const min = hasRange ? Number(entry.min) : null
    const max = hasRange ? Number(entry.max) : null
    const span = hasRange ? (max - min) : null
    const useSlider = hasRange && span !== null && span > 0 && span <= 10000
    const def = parseDefault(entry.default, upType)
    return {
      widget: useSlider ? 'range' : 'number',
      readonly,
      min,
      max,
      step: 1,
      defaultValue: def !== null ? def : (hasRange ? min : 0)
    }
  }

  // 优先级 4:浮点
  if (REAL_TYPES.has(upType)) {
    const hasRange = entry.min !== null && entry.min !== undefined &&
                     entry.max !== null && entry.max !== undefined
    return {
      widget: 'number',
      readonly,
      min: hasRange ? Number(entry.min) : null,
      max: hasRange ? Number(entry.max) : null,
      step: 0.01,
      defaultValue: parseDefault(entry.default, upType) ?? 0
    }
  }

  // 优先级 5:字符串
  if (STRING_TYPES.has(upType)) {
    return {
      widget: 'text',
      readonly,
      defaultValue: parseDefault(entry.default, upType) ?? ''
    }
  }

  // 兜底:DOMAIN / 未知
  return {
    widget: 'json',
    readonly,
    defaultValue: entry.default !== undefined && entry.default !== null
      ? (typeof entry.default === 'string' ? entry.default : JSON.stringify(entry.default))
      : ''
  }
}

/** enum 字段统一成 [{value, text}] 形式。 */
function normalizeEnum (raw) {
  if (Array.isArray(raw)) {
    return raw.map(item => {
      if (item && typeof item === 'object') {
        return {
          value: item.value ?? item.val ?? item.code,
          text: String(item.label ?? item.text ?? item.name ?? item.value)
        }
      }
      return { value: item, text: String(item) }
    })
  }
  if (raw && typeof raw === 'object') {
    return Object.keys(raw).map(k => {
      const num = Number(k)
      return {
        value: isNaN(num) ? k : num,
        text: String(raw[k])
      }
    })
  }
  return []
}

/**
 * 按 group_index 分组 entries,保持组内 entry 原有顺序。
 * 返回 [{groupIndex, groupName, groupSummary, entries:[...]}, ...]
 */
export function groupEntries (entries) {
  const map = new Map()
  for (const e of (entries || [])) {
    const key = e.group_index || e.index || ''
    if (!map.has(key)) {
      map.set(key, {
        groupIndex: e.group_index || '',
        groupName: e.group_name || '其他',
        groupSummary: e.group_summary || '',
        entries: []
      })
    }
    map.get(key).entries.push(e)
  }
  return Array.from(map.values())
}
