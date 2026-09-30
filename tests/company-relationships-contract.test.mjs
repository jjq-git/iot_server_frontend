import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = relative => fs.readFileSync(path.join(process.cwd(), relative), 'utf8')
const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

test('company relationship API uses the supplier and buyer contract', () => {
  const api = read('src/api/companyRelationships.js')

  assert.match(api, /http\.get\('\/company-relationships'\)/)
  assert.match(api, /buyer_company_code:\s*buyerCompanyCode/)
  assert.match(api, /\.\.\.capabilities/)
  assert.match(api, /\$\{relationshipId\}\/accept/)
  assert.match(api, /\$\{relationshipId\}\/reject/)
  assert.match(api, /\$\{relationshipId\}\/end/)
  assert.match(api, /\$\{relationshipId\}\/capabilities/)
  assert.doesNotMatch(api, /target_company_code|relationship_type|allow_asset_transfer/)
})

test('relationship page enforces tri-state supplier handoff and buyer controls', () => {
  const page = read('src/views/CompanyRelationships.vue')
  const styles = read('src/assets/styles/pages/company-relationships.scss')

  assert.match(page, /<list-page-card\s+:show-footer="false">/)
  assert.doesNotMatch(page, /<base-card/)
  assert.doesNotMatch(page, /\sbordered(?:\s|>)/)
  assert.match(page, /relationship\?\.buyer_company\?\.id/)
  assert.match(page, /canWriteCompany\(this\.currentCompanyId, this\.currentUser\)/)
  assert.match(page, /this\.isBuyer\(relationship\)\s*&&\s*relationship\.status === 'pending'/)
  assert.match(page, /this\.isBuyer\(relationship\)\s*&&\s*relationship\.status === 'active'/)
  assert.match(page, /allow_token_resale/)
  assert.match(page, /this\.isSupplier\(relationship\)\s*&&\s*value === 'fixed_allowed'/)
  assert.match(page, /\['buyer_allowed', 'buyer_denied'\]\.includes\(value\)/)
  assert.match(page, /\[capability\]: value/)
  assert.match(page, /status_view/)
  assert.match(page, /history_view/)
  assert.match(page, /remote_control/)
  assert.match(page, /remote_diagnostics/)
  assert.match(page, /firmware_upgrade/)
  assert.match(page, /responded_at/)
  assert.match(page, /responded_by/)
  assert.doesNotMatch(page, /allow_asset_transfer/)
  assert.match(styles, /grid-template-columns:\s*repeat\(5,/)
  assert.match(styles, /relationship-capabilities-cell/)
})

test('relationship route, permission and all locales are wired', () => {
  const router = read('src/router/index.js')
  const permission = read('src/utils/permission.js')
  const sidebar = read('src/components/Sidebar.vue')

  assert.match(router, /name: 'CompanyRelationships'/)
  assert.match(permission, /COMPANY_RELATIONSHIP_MANAGE: 'company\.relationship\.manage'/)
  assert.match(sidebar, /MENU_KEY\.COMPANY_RELATIONSHIPS/)

  for (const locale of locales) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`))
    assert.equal(typeof messages.route.company_relationships.title, 'string', locale)
    assert.equal(typeof messages.sidebar.menu.company_relationships, 'string', locale)
    assert.equal(typeof messages.company_relationships.request_action, 'string', locale)
    assert.equal(typeof messages.company_relationships.status.pending, 'string', locale)
    assert.equal(typeof messages.company_relationships.allow_token_resale, 'string', locale)
    assert.equal(typeof messages.company_relationships.capability_status_view, 'string', locale)
    assert.equal(typeof messages.company_relationships.capability_state.fixed_allowed, 'string', locale)
  }
})
