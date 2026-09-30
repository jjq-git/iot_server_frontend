import http from './http'

const publicOptions = { skipUnauthorizedRedirect: true }

export const requestPasswordReset = email => http.post('/auth/password-reset/request', { email }, publicOptions)
export const inspectPasswordReset = token => http.post('/auth/password-reset/inspect', { token }, publicOptions)
export const completePasswordReset = (token, newPassword) => http.post('/auth/password-reset/complete', {
  token,
  new_password: newPassword
}, publicOptions)

export const sendUserPasswordResetEmail = (uuid, companyId) => http.post(
  `/users/${uuid}/password-reset-email`,
  undefined,
  { params: companyId ? { company_id: companyId } : undefined }
)
