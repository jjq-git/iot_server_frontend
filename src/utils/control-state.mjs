function normalizeIndex (value) {
  const parsed = Number.parseInt(String(value || ''), 16)
  return Number.isFinite(parsed) ? `0x${parsed.toString(16).toUpperCase().padStart(4, '0')}` : null
}

function normalizeSubIndex (value) {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value || '0'), 16)
  return Number.isFinite(parsed) ? parsed : 0
}

export function controlAddressKey (nid, idx, sidx) {
  const normalizedIndex = normalizeIndex(idx)
  const normalizedNid = Number(nid)
  if (!Number.isInteger(normalizedNid) || !normalizedIndex) return null
  return `${normalizedNid}:${normalizedIndex}:${normalizeSubIndex(sidx)}`
}

export function buildControlAddressIndex (modules = []) {
  const index = new Map()
  for (const module of modules || []) {
    const fieldLists = [module.fields || []]
    for (const widget of module.widgets || []) fieldLists.push(widget.fields || [])
    for (const instance of module.instances || []) {
      const nid = module.device_type === 'host' ? 1 : instance.can_node_id
      for (const fields of fieldLists) {
        for (const field of fields) {
          const key = controlAddressKey(nid, field.co_index, field.co_sub_index)
          if (!key) continue
          if (!index.has(key)) index.set(key, [])
          index.get(key).push({ module, field, targetUuid: instance.device_uuid })
        }
      }
    }
  }
  return index
}

export function statusMessageUpdates (message, addressIndex) {
  if (!message || message.control_values_accepted === false || !(addressIndex instanceof Map)) return []
  if (!Array.isArray(message.data)) return []
  const updates = []
  for (const node of message.data) {
    if (!node || typeof node !== 'object' || !Array.isArray(node.objs)) continue
    for (const object of node.objs) {
      if (!object || typeof object !== 'object' || !Object.prototype.hasOwnProperty.call(object, 'val')) continue
      const key = controlAddressKey(node.nid, object.idx, object.sidx)
      for (const target of (key && addressIndex.get(key)) || []) {
        updates.push({ ...target, value: object.val, shadow: null, hasShadow: false })
      }
    }
  }
  return updates
}

export function stateSnapshotUpdates (state, addressIndex) {
  if (!state || !Array.isArray(state.items) || !(addressIndex instanceof Map)) return []
  const updates = []
  for (const item of state.items) {
    const key = controlAddressKey(item.nid, item.co_index, item.co_sub_index)
    const matches = (key && addressIndex.get(key)) || []
    for (const target of matches) {
      if (target.targetUuid !== item.target_uuid) continue
      updates.push({ ...target, value: item.value, shadow: item.shadow || null, hasShadow: true })
    }
  }
  return updates
}

export function hasActiveControlShadows (modules = []) {
  for (const module of modules || []) {
    for (const field of module.fields || []) {
      for (const shadow of Object.values(field.shadows || {})) {
        if (shadow && ['pending', 'acknowledged'].includes(shadow.state)) return true
      }
    }
  }
  return false
}
