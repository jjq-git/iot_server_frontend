import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8')
const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

test('invitation acceptance inspects context and requires existing accounts to sign in', () => {
  const view = read('src/views/AcceptInvitation.vue')

  assert.match(view, /needsPassword: false/)
  assert.match(view, /await inspectInvitation\(this\.token\)/)
  assert.match(view, /requires_login/)
  assert.match(view, /sign_in_to_accept/)
  assert.match(view, /await acceptInvitation\(payload\)/)
  assert.match(view, /passwordCreated/)
  assert.match(view, /\^\(\?=\.\*\[A-Za-z\]\)\(\?=\.\*\\d\)\.\{8,\}\$/)
})

test('the invitation receipt supports safe resend and revoke without granting access early', () => {
  const api = read('src/api/users.js')
  const users = read('src/views/Users.vue')

  assert.match(api, /revokeInvitation[\s\S]*http\.delete\(`\/invitations\/\$\{invitationUuid\}`\)/)
  assert.match(api, /resendInvitation[\s\S]*\/invitations\/\$\{invitationUuid\}\/resend/)
  assert.match(users, /await resendInvitation\(this\.lastInvitation\.uuid\)/)
  assert.match(users, /await revokeInvitation\(this\.lastInvitation\.uuid\)/)
})

test('company access management uses authorization resources and protects the last active admin in the UI', () => {
  const page = read('src/views/OrganizationAccess.vue')
  const permission = read('src/utils/permission.js')
  const router = read('src/router/index.js')

  assert.match(page, /fetchOrganizationRoles/)
  assert.match(page, /fetchOrganizationMemberships/)
  assert.match(page, /createOrganizationRole/)
  assert.match(page, /updateMembershipRole/)
  assert.match(page, /deactivateMembership/)
  assert.match(page, /activeAdminCount <= 1/)
  assert.match(page, /!this\.isCurrentMembership\(membership\)/)
  assert.match(permission, /COMPANY_ROLE_MANAGE: 'company\.role\.manage'/)
  assert.match(router, /name: 'OrganizationAccess'[\s\S]*route\.organization_access\.title/)
})

test('company activation and deactivation explain their scoped impact before saving', () => {
  const detail = read('src/views/CompanyDetail.vue')

  assert.match(detail, /showStatusDialog/)
  assert.match(detail, /company_status_change\.deactivate_impact/)
  assert.match(detail, /submitStatusChange/)
  assert.match(detail, /saveFieldEditDirectB\('is_active', value\)/)
})

test('all locales cover invitation lifecycle, access management, and company status warnings', () => {
  for (const locale of locales) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`))
    assert.equal(typeof messages.invitation.account_detection_help, 'string', locale)
    assert.equal(typeof messages.invitation.accepted_existing_account, 'string', locale)
    assert.equal(typeof messages.invitation.existing_login_required, 'string', locale)
    assert.equal(typeof messages.users.invitation.revoke_action, 'string', locale)
    assert.equal(typeof messages.users.actions.manage_access, 'string', locale)
    assert.equal(typeof messages.organization_access.roles.permissions_label, 'string', locale)
    assert.equal(typeof messages.organization_access.members.last_admin, 'string', locale)
    assert.equal(typeof messages.company_status_change.deactivate_impact, 'string', locale)
    assert.equal(typeof messages.route.organization_access.title, 'string', locale)
  }
})
