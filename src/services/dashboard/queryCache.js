const responseCache = new Map()
const inflightRequests = new Map()

const stableValue = value => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableValue(value[key])
      return result
    }, {})
  }
  return value
}
const getScopeFingerprint = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const companies = (user.allowed_companies || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
    return JSON.stringify({ id: user.id || user.uuid || '', role: user.role || '', companies })
  } catch (error) {
    return 'anonymous'
  }
}

export const createDashboardQueryKey = payload => JSON.stringify({
  scope: getScopeFingerprint(),
  payload: stableValue(payload)
})

export const runCachedDashboardQuery = async (payload, request, options = {}) => {
  const ttl = Number(options.ttl || 30000)
  const key = createDashboardQueryKey(payload)
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.createdAt < ttl) return cached.value
  if (inflightRequests.has(key)) return inflightRequests.get(key)

  const pending = request(payload)
    .then(value => {
      responseCache.set(key, { createdAt: Date.now(), value })
      return value
    })
    .finally(() => inflightRequests.delete(key))
  inflightRequests.set(key, pending)
  return pending
}

export const clearDashboardQueryCache = () => {
  responseCache.clear()
  inflightRequests.clear()
}
