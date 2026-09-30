const MODEL_CODE_RE = /^(?:[A-Z]{2}\d{4}|[PHN]-[A-Z0-9][A-Z0-9._-]*)$/

export function getCanopenModelCode (device, catalog = null) {
  if (!device) return ''
  const candidates = [
    device.node_model_code,
    device.hn_model_code,
    device.model_code,
    device.node_product_code,
    device.product_code
  ]
  const allowed = catalog
    ? new Set([
      ...(catalog.nodes || []).map(item => item.id || item.product_code),
      ...(catalog.hosts || []).map(item => item.id || item.product_code)
    ].filter(Boolean))
    : null

  return candidates.find(value =>
    typeof value === 'string' &&
    MODEL_CODE_RE.test(value) &&
    (!allowed || allowed.has(value))
  ) || ''
}

export function findOdDeviceResolution (devices, targetType, routeDeviceId = 1) {
  if (!Array.isArray(devices)) return null
  return devices.find(device =>
    device &&
    device.target_type === targetType &&
    Number(device.route_device_id) === Number(routeDeviceId)
  ) || null
}

export function getResolvedOdSpec (resolution) {
  if (!resolution || resolution.resolution_status !== 'resolved') return null
  if (Number.isInteger(Number(resolution.resolved_hn_model_id)) && Number(resolution.resolved_hn_model_id) > 0) {
    return {
      id: resolution.model_code || '',
      version: resolution.od_version || '',
      versions: resolution.od_version ? [resolution.od_version] : [],
      hnModelId: Number(resolution.resolved_hn_model_id),
      source: 'postgresql_hn_model_attrs'
    }
  }
  if (resolution.spec_status !== 'available' || !resolution.spec_id) return null
  const versions = Array.isArray(resolution.spec_versions) ? resolution.spec_versions : []
  const version = resolution.preferred_spec_version || versions[0] || null
  if (!version) return null
  return {
    id: resolution.spec_id,
    version,
    versions,
    hnModelId: null,
    source: 'legacy_yaml'
  }
}

export function isFreshOdSnapshot (snapshot, baseline = null, issuedAtSeconds = 0) {
  if (!snapshot || !snapshot.exists) return false
  if (baseline && baseline.exists) {
    if (snapshot.dump_id !== baseline.dump_id) return true
    const oldStarted = Date.parse(baseline.started_at || '')
    const newStarted = Date.parse(snapshot.started_at || '')
    return Number.isFinite(newStarted) && (!Number.isFinite(oldStarted) || newStarted > oldStarted)
  }
  const startedAt = Date.parse(snapshot.started_at || '')
  if (!Number.isFinite(startedAt)) return false
  return startedAt >= (Number(issuedAtSeconds) * 1000) - 5000
}

export function readCanopenStatusValue (status, entry, deviceId = 1) {
  if (!status || !entry) return { found: false, value: null }
  const keys = [entry.name, entry.attr_code, entry.code].filter(Boolean)
  const containers = [status, status.attributes, status.attrs]
  const nodeContainers = [
    status.nodes && (status.nodes[deviceId] || status.nodes[String(deviceId)]),
    status.devices && (status.devices[deviceId] || status.devices[String(deviceId)]),
    status[deviceId],
    status[String(deviceId)]
  ]
  containers.push(...nodeContainers)

  for (const container of containers) {
    if (!container || typeof container !== 'object') continue
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(container, key)) {
        return { found: true, value: container[key] }
      }
    }
  }

  const seen = new Set()
  const searchNested = value => {
    if (!value || typeof value !== 'object' || seen.has(value)) return { found: false, value: null }
    seen.add(value)
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        return { found: true, value: value[key] }
      }
    }
    for (const nested of Object.values(value)) {
      const match = searchNested(nested)
      if (match.found) return match
    }
    return { found: false, value: null }
  }
  const nestedMatch = searchNested(status)
  if (nestedMatch.found) return nestedMatch
  return { found: false, value: null }
}
