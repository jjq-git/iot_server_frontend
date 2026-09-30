export const COMPANY_TYPES = Object.freeze({
  PF: 'PF',
  MF: 'MF',
  BR: 'BR',
  CP: 'CP',
  EU: 'EU'
})

const COMPANY_TYPE_ALIASES = Object.freeze({
  platform: COMPANY_TYPES.PF,
  manufacturer: COMPANY_TYPES.MF,
  brand: COMPANY_TYPES.BR,
  channel: COMPANY_TYPES.CP,
  channel_partner: COMPANY_TYPES.CP,
  agent: COMPANY_TYPES.CP,
  distributor: COMPANY_TYPES.CP,
  enduser: COMPANY_TYPES.EU,
  PF: COMPANY_TYPES.PF,
  MF: COMPANY_TYPES.MF,
  BR: COMPANY_TYPES.BR,
  CP: COMPANY_TYPES.CP,
  AG: COMPANY_TYPES.CP,
  DS: COMPANY_TYPES.CP,
  EU: COMPANY_TYPES.EU
})

export function normalizeCompanyType (value) {
  if (value === null || value === undefined) return null
  const raw = String(value).trim()
  if (!raw) return null
  return COMPANY_TYPE_ALIASES[raw] || COMPANY_TYPE_ALIASES[raw.toLowerCase()] || null
}

export function normalizeCompanyTypeList (value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(/[,+]/)
  return [...new Set(values.map(normalizeCompanyType).filter(Boolean))]
}
