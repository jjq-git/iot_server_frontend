import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const companyTypeSource = await readFile(new URL('../src/utils/companyType.js', import.meta.url), 'utf8')
const companyTypeModule = await import(`data:text/javascript;base64,${Buffer.from(companyTypeSource).toString('base64')}`)

const { COMPANY_TYPES, normalizeCompanyType, normalizeCompanyTypeList } = companyTypeModule
const localeCodes = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

test('company types expose the current backend contract and normalize legacy channel values', () => {
  assert.deepEqual(Object.values(COMPANY_TYPES), ['PF', 'MF', 'BR', 'CP', 'EU'])
  assert.equal(normalizeCompanyType('CP'), 'CP')
  assert.equal(normalizeCompanyType('AG'), 'CP')
  assert.equal(normalizeCompanyType('DS'), 'CP')
  assert.equal(normalizeCompanyType('agent'), 'CP')
  assert.equal(normalizeCompanyType('distributor'), 'CP')
  assert.equal(normalizeCompanyType('unknown'), null)
  assert.deepEqual(normalizeCompanyTypeList(['MF', 'AG', 'DS', 'EU']), ['MF', 'CP', 'EU'])
})

test('company forms write only current company capability fields', async () => {
  const companies = await readFile(new URL('../src/views/Companies.vue', import.meta.url), 'utf8')
  const detail = await readFile(new URL('../src/views/CompanyDetail.vue', import.meta.url), 'utf8')

  for (const source of [companies, detail]) {
    assert.match(source, /is_channel_partner/)
    assert.match(source, /is_pod_manufacturer/)
    assert.match(source, /is_school/)
  }
  assert.match(companies, /pod_usage:\s*this\.companyForm\.companyAttributes\.includes\('is_enduser'\)\s*\?\s*this\.companyForm\.pod_usage\s*:\s*null/)
  assert.match(companies, /v-model="enduserKind"/)
  assert.match(companies, /value: 'company'/)
  assert.match(companies, /value: 'household'/)
  assert.match(companies, /value: 'school'/)
  assert.match(detail, /updateData\.pod_usage\s*=\s*null/)
  assert.match(detail, /!company\.is_enduser/)
  assert.doesNotMatch(companies, /includes\('is_(?:agent|distributor|manufacturer)'\)/)
  assert.doesNotMatch(detail, /updateData\.is_(?:agent|distributor|manufacturer)\s*=/)
  assert.doesNotMatch(detail, /updateData\.company_type\s*=/)
})

test('all locales display the current CP type and channel capability', async () => {
  for (const code of localeCodes) {
    const locale = JSON.parse(await readFile(new URL(`../src/locales/${code}.json`, import.meta.url), 'utf8'))
    assert.ok(locale.companies.company_type.CP, `${code} companies CP label missing`)
    assert.ok(locale.company_detail.company_type.CP, `${code} company detail CP label missing`)
    assert.ok(locale.user_profile.company_type_label.CP, `${code} user profile CP label missing`)
    assert.ok(locale.companies.company_attribute.is_channel_partner, `${code} channel attribute missing`)
    assert.ok(locale.companies.company_attribute.is_pod_manufacturer, `${code} manufacturer attribute missing`)
    assert.ok(locale.companies.company_attribute.is_school, `${code} school label missing`)
    assert.ok(locale.companies.pod_usage.not_applicable, `${code} non-applicable pod usage missing`)
    assert.ok(locale.companies.validation.pod_usage_required, `${code} pod usage validation missing`)
  }
})

test('demo company data follows nullable usage and retired creation-source contract', async () => {
  const seed = await readFile(new URL('../src/demo/seeds/index.js', import.meta.url), 'utf8')
  assert.doesNotMatch(seed, /created_source/)
  assert.match(seed, /company_type: 'MF'[\s\S]*?pod_usage: null/)
  assert.match(seed, /is_school: false/)
})
