const isObject = value => value !== null && typeof value === 'object'

function extractDetail (detail) {
  if (typeof detail === 'string') return detail
  if (!isObject(detail)) return ''
  return detail.userMessage || detail.message || detail.detail || detail.msg || ''
}

/**
 * Convert transport and application errors to a stable user-facing message.
 * Callers provide an already translated fallback.
 */
export function getErrorMessage (error, fallback = '') {
  if (!error) return fallback
  return error.userMessage ||
    extractDetail(error.response && error.response.data && error.response.data.detail) ||
    extractDetail(error.response && error.response.data) ||
    error.message ||
    fallback
}

export default getErrorMessage
