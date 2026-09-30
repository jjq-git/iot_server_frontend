import { normalizeLoginCompanySlug } from './login-entry-contract.mjs'

export {
  buildLoginTemplateLookup,
  getCompanyLoginUrl,
  normalizeCompanyLoginUrl,
  normalizeLoginCompanySlug,
  normalizeLoginHostname,
  resolveLoginCompanySlug
} from './login-entry-contract.mjs'

const LOGIN_COMPANY_SLUG_KEY = 'login_company_slug'

export function rememberLoginEntry (companySlug) {
  const slug = normalizeLoginCompanySlug(companySlug)
  if (slug) {
    localStorage.setItem(LOGIN_COMPANY_SLUG_KEY, slug)
  } else {
    localStorage.removeItem(LOGIN_COMPANY_SLUG_KEY)
  }
  return slug
}

export function getLoginEntryPath () {
  const slug = normalizeLoginCompanySlug(localStorage.getItem(LOGIN_COMPANY_SLUG_KEY))
  return slug ? `/login/${slug}` : '/login'
}
