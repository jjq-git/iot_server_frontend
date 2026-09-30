const COMPANY_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/

export function normalizeLoginCompanySlug (value) {
  const slug = String(value || '').trim().toLowerCase()
  return COMPANY_SLUG_PATTERN.test(slug) ? slug : ''
}

export function normalizeLoginHostname (value) {
  let hostname = String(value || '').trim().toLowerCase()
  if (!hostname) return ''

  try {
    if (hostname.includes('://')) {
      hostname = new URL(hostname).hostname
    } else {
      hostname = new URL(`https://${hostname}`).hostname
    }
  } catch (error) {
    return ''
  }

  return hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '')
}

export function normalizeCompanyLoginUrl (value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return ''
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, '')
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '')
    return url.toString().replace(/\/$/, '')
  } catch (error) {
    return ''
  }
}

export function buildLoginTemplateLookup ({ companySlug, href, hostname } = {}) {
  const slug = normalizeLoginCompanySlug(companySlug)
  if (slug) return { company_slug: slug }

  const loginUrl = normalizeCompanyLoginUrl(href)
  if (loginUrl) return { domain: loginUrl }

  const domain = normalizeLoginHostname(hostname)
  return domain ? { domain: `https://${domain}` } : {}
}

export function resolveLoginCompanySlug (template, fallbackSlug = '') {
  const candidates = [
    template?.company?.company_slug,
    template?.branding?.company_slug,
    template?.company_slug,
    fallbackSlug
  ]

  for (const candidate of candidates) {
    const slug = normalizeLoginCompanySlug(candidate)
    if (slug) return slug
  }
  return ''
}

export function getCompanyLoginUrl (company) {
  return normalizeCompanyLoginUrl(company?.domain)
}
