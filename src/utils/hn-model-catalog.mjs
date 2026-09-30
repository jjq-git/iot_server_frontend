const earlier = (left, right) => {
  if (!left) return right
  if (!right) return left
  return left < right ? left : right
}

const later = (left, right) => {
  if (!left) return right
  if (!right) return left
  return left > right ? left : right
}

/**
 * Adapt legacy exact-version rows to the hardware-line response shape.
 * This keeps rolling frontend/backend deployments usable while the dedicated
 * hardware-line endpoint is not yet present.
 */
export const groupHnModelHardwareLines = (versions, status = '') => {
  const grouped = new Map()

  for (const version of versions || []) {
    const key = `${version.model_code}\u0000${version.hw_version}`
    const current = grouped.get(key) || {
      anchor: version,
      odVersions: new Set(),
      versionCount: 0,
      hasActiveVersion: false,
      createdAt: null,
      updatedAt: null
    }
    if (Number(version.id) < Number(current.anchor.id)) current.anchor = version
    current.odVersions.add(version.od_ver)
    current.versionCount += 1
    current.hasActiveVersion ||= version.status === 'active'
    current.createdAt = earlier(current.createdAt, version.created_at)
    current.updatedAt = later(current.updatedAt, version.updated_at)
    grouped.set(key, current)
  }

  return [...grouped.values()]
    .map(group => ({
      ...group.anchor,
      hn_model_id: group.anchor.id,
      status: group.hasActiveVersion ? 'active' : 'frozen',
      revision_count: group.odVersions.size,
      version_count: group.versionCount,
      created_at: group.createdAt,
      updated_at: group.updatedAt
    }))
    .filter(line => !status || line.status === status)
    .sort((left, right) => String(right.created_at || '').localeCompare(String(left.created_at || '')))
}
