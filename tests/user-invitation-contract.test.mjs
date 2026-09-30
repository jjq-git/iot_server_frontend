import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8')

test('admin user creation is invitation-only and never submits a password or assigned scope', () => {
  const api = read('src/api/users.js')
  const view = read('src/views/Users.vue')

  assert.match(api, /createInvitation[\s\S]*post\('\/invitations'/)
  assert.doesNotMatch(api, /createUser[\s\S]*post\('\/users'/)
  assert.match(view, /await createInvitation\(data\)/)
  assert.doesNotMatch(view, /form\.password|data\.assigned_scope|form\.username/)
  assert.match(view, /invitation_pending/)
  assert.doesNotMatch(read('src/api/companies.js'), /createUser[\s\S]*post\('\/users'/)
})

test('public invitation page submits the token and optional self-chosen password', () => {
  const api = read('src/api/users.js')
  const page = read('src/views/AcceptInvitation.vue')
  const router = read('src/router/index.js')

  assert.match(api, /acceptInvitation[\s\S]*\/invitations\/accept/)
  assert.match(page, /this\.\$route\.query\.token/)
  assert.match(page, /await acceptInvitation\(payload\)/)
  assert.match(router, /path: '\/accept-invitation'[\s\S]*public: true/)
  assert.match(router, /isPublicPage = isLoginPage \|\| Boolean/)
})
