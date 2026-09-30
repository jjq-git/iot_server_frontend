import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('login links to the token-bound password recovery flow', () => {
  const api = read('src/api/passwordReset.js')
  const login = read('src/views/Login.vue')
  const requestView = read('src/views/RequestPasswordReset.vue')
  const resetView = read('src/views/ResetPassword.vue')

  assert.match(api, /\/auth\/password-reset\/request/)
  assert.match(api, /\/auth\/password-reset\/inspect/)
  assert.match(api, /\/auth\/password-reset\/complete/)
  assert.match(login, /to="\/forgot-password"/)
  assert.match(requestView, /requestPasswordReset/)
  assert.match(resetView, /inspectPasswordReset/)
  assert.match(resetView, /completePasswordReset/)
})

test('all supported locales include password recovery and admin fallback copy', () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

  for (const locale of locales) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`))
    assert.equal(typeof messages.auth.password_reset.title, 'string', locale)
    assert.equal(typeof messages.auth.password_reset.request_accepted, 'string', locale)
    assert.equal(typeof messages.auth.password_reset.unavailable_help, 'string', locale)
    assert.equal(typeof messages.users.password_reset.confirm_message, 'string', locale)
    assert.equal(typeof messages.users.password_reset.force_change_hint, 'string', locale)
  }
})

test('admin reset sends an email without seeing or setting the password', () => {
  const resetApi = read('src/api/passwordReset.js')
  const usersView = read('src/views/Users.vue')

  assert.match(resetApi, /sendUserPasswordResetEmail[\s\S]*\/users\/\$\{uuid\}\/password-reset-email/)
  assert.match(usersView, /hasPermission\(PERMISSION\.USER_MANAGE, this\.currentUser\)/)
  assert.match(usersView, /canWriteRow\(row, 'user', this\.currentUser\)/)
  assert.match(usersView, /sendUserPasswordResetEmail\([\s\S]*this\.passwordResetUser\.uuid,[\s\S]*this\.passwordResetUser\.company_id/)
  assert.match(resetApi, /params: companyId \? \{ company_id: companyId \} : undefined/)
  assert.doesNotMatch(usersView, /newPassword|confirmPassword/)
})
