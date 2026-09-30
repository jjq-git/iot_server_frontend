import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

test('company creation invites the first administrator without accepting a password', () => {
  const source = read('src/views/Companies.vue')

  assert.match(source, /import \{ createInvitation \} from '@\/api\/users'/)
  assert.match(source, /createdCompany = await createCompany\(submitData\)/)
  assert.match(source, /this\.createdCompanyPendingInvite = createdCompany/)
  assert.match(source, /await createInvitation\(\{[\s\S]*company_id: createdCompany\.id,[\s\S]*role: 'admin'/)
  assert.doesNotMatch(source, /admin_password|temporary_password/)
})

test('an invitation retry reuses the created company instead of creating a duplicate', () => {
  const source = read('src/views/Companies.vue')

  assert.match(source, /let createdCompany = this\.createdCompanyPendingInvite/)
  assert.match(source, /if \(!createdCompany\) \{[\s\S]*createdCompany = await createCompany/)
  assert.match(source, /company_created_invite_failed/)
  assert.match(source, /invite_retry_action/)
})

test('all locales describe the company bootstrap invitation flow', () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  const keys = [
    'first_admin_title',
    'first_admin_help',
    'admin_email_label',
    'admin_name_label',
    'create_and_invite_action',
    'create_and_invite_success',
    'invite_retry_action',
    'company_created_invite_pending',
    'company_created_invite_failed'
  ]

  for (const locale of locales) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`))
    for (const key of keys) {
      assert.equal(typeof messages.companies.create_dialog[key], 'string', `${locale}:${key}`)
    }
  }
})
