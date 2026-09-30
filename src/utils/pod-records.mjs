import { controlAddressKey } from './control-state.mjs'

function optionLabel (options, value) {
  if (Array.isArray(options)) {
    const match = options.find(item => item && String(item.value ?? item.key) === String(value))
    return match ? (match.label ?? match.text ?? match.name) : null
  }
  if (options && typeof options === 'object') {
    const candidate = options[String(value)]
    if (candidate != null && typeof candidate !== 'object') return candidate
    if (candidate && typeof candidate === 'object') {
      return candidate.label ?? candidate.text ?? candidate.name ?? null
    }
  }
  return null
}

function displayValue (value, field, labels) {
  const option = optionLabel(field?.options, value)
  if (option != null) return String(option)

  const booleanField = field && (
    field.data_type === 'BOOLEAN' ||
    field.widget === 'switch' ||
    field.widget_role === 'state_idx'
  )
  if (typeof value === 'boolean' || (booleanField && (value === 0 || value === 1))) {
    return Boolean(value) ? labels.on : labels.off
  }
  if (value == null) return '-'
  const rendered = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return field?.unit ? `${rendered} ${field.unit}` : rendered
}

function formatAddressedData (items, addressIndex, labels) {
  const nodes = []
  for (const node of items) {
    if (!node || typeof node !== 'object' || !Array.isArray(node.objs)) continue
    const values = []
    for (const object of node.objs) {
      if (!object || typeof object !== 'object' || !Object.prototype.hasOwnProperty.call(object, 'val')) continue
      const key = controlAddressKey(node.nid, object.idx, object.sidx)
      const matches = (key && addressIndex instanceof Map && addressIndex.get(key)) || []
      const uniqueMatches = matches.filter((match, index, all) => {
        const identity = match.field?.attr_uuid || match.field?.attr_code || match.field?.attr_name
        return all.findIndex(item => (item.field?.attr_uuid || item.field?.attr_code || item.field?.attr_name) === identity) === index
      })
      if (uniqueMatches.length) {
        for (const match of uniqueMatches) {
          const field = match.field || {}
          values.push(`${field.attr_name || field.attr_code}: ${displayValue(object.val, field, labels)}`)
        }
      } else {
        const address = `${object.idx || '?'}:${object.sidx ?? 0}`
        values.push(`${address}: ${displayValue(object.val, null, labels)}`)
      }
    }
    if (!values.length) continue
    const firstMatch = node.objs
      .map(object => {
        const key = controlAddressKey(node.nid, object?.idx, object?.sidx)
        return key && addressIndex instanceof Map ? addressIndex.get(key)?.[0] : null
      })
      .find(Boolean)
    const nodeName = firstMatch?.module?.title || `${labels.node} ${node.nid}`
    nodes.push(`${nodeName}｜${values.join('，')}`)
  }
  return nodes.join('；')
}

function flattenLegacyData (value, prefix = '', result = []) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      if (['message_id', 'msg_id', 'timestamp'].includes(key)) continue
      flattenLegacyData(nested, prefix ? `${prefix}.${key}` : key, result)
    }
    return result
  }
  result.push([prefix || 'value', value])
  return result
}

export function formatPodRecordDescription (recordData, addressIndex = new Map(), labels = {}) {
  const resolvedLabels = {
    on: labels.on || 'On',
    off: labels.off || 'Off',
    node: labels.node || 'NID'
  }
  const payload = recordData && typeof recordData === 'object' ? recordData : {}
  const data = Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload
  if (Array.isArray(data)) {
    return formatAddressedData(data, addressIndex, resolvedLabels) || '-'
  }
  const labelMap = labels.fields || {}
  const parts = flattenLegacyData(data).map(([key, value]) => {
    const leaf = key.split('.').pop()
    return `${labelMap[key] || labelMap[leaf] || key}: ${displayValue(value, null, resolvedLabels)}`
  })
  return parts.join('；') || '-'
}
