import { applyCompanyTheme, clearCompanyTheme } from '@/utils/theme'

export function persistCurrentUser (user) {
  if (!user) {
    localStorage.removeItem('user')
    clearCompanyTheme()
    return null
  }
  localStorage.setItem('user', JSON.stringify(user))
  applyCompanyTheme(user.company || null)
  return user
}

export function clearSessionContext () {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  localStorage.removeItem('userRole')
  clearCompanyTheme()
}
