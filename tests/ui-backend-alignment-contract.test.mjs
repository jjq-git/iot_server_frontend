import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('company screens follow the current writable company contract', async () => {
  const [list, detail, api] = await Promise.all([
    read('src/views/Companies.vue'),
    read('src/views/CompanyDetail.vue'),
    read('src/api/companies.js')
  ])

  assert.doesNotMatch(list, /v-model="companyForm\.address"/)
  assert.doesNotMatch(list, /submitData\.address/)
  assert.match(list, /is_household: this\.companyForm\.is_household/)
  assert.match(list, /is_school: this\.companyForm\.is_school/)
  assert.match(list, /pod_usage: this\.companyForm\.companyAttributes\.includes\('is_enduser'\) \? this\.companyForm\.pod_usage : null/)
  assert.match(detail, /saveFieldEditDirectB\('is_household'/)
  assert.match(detail, /saveFieldEditDirectB\('is_school'/)
  assert.match(detail, /saveFieldEditDirectB\('pod_usage'/)
  assert.doesNotMatch(detail, /startEditB\('address'/)
  assert.match(api, /data\.is_household/)
  assert.match(api, /data\.pod_usage/)
})

test('new organization and pagination copy exists in all eight locales', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  for (const locale of locales) {
    const messages = JSON.parse(await read(`src/locales/${locale}.json`))
    const copy = [
      messages.base_pagination.per_page_label,
      messages.companies.company_attribute.enterprise,
      messages.companies.company_attribute.is_household,
      messages.companies.create_dialog.household_label,
      messages.companies.create_dialog.household_help,
      messages.companies.create_dialog.pod_usage_label,
      messages.companies.pod_usage.internal,
      messages.companies.pod_usage.rental,
      messages.companies.pod_usage.both
    ]
    for (const value of copy) {
      assert.equal(typeof value, 'string')
      assert.ok(value.trim().length > 0)
      assert.doesNotMatch(value, /[?\uFFFD]/, `${locale} contains corrupted UI copy: ${value}`)
    }
  }
})

test('shared controls and dashboard keep accessible, meaningful UI semantics', async () => {
  const [input, select, pagination, styles, layout, runtime] = await Promise.all([
    read('src/components/base/BaseInput.vue'),
    read('src/components/base/BaseSelect.vue'),
    read('src/components/base/BasePagination.vue'),
    read('src/assets/styles/_interaction.scss'),
    read('src/assets/styles/layout.scss'),
    read('src/views/DashboardRuntime.vue')
  ])

  assert.match(input, /:aria-label="accessibleLabel"/)
  assert.match(select, /:aria-label="accessibleLabel"/)
  assert.match(pagination, /base_pagination\.per_page_label/)
  assert.match(styles, /\.base-pagination-wrapper \.page-link[\s\S]*?min-height: var\(--list-control-height\)/)
  assert.match(styles, /\.expand-cell \.action-icon--text[\s\S]*?min-width: var\(--list-control-height\)/)
  assert.match(layout, /@media \(width <= 480px\)[\s\S]*?\.topbar--demo \.topbar__page-heading/)
  assert.match(runtime, /point\.label \|\| point\.name \|\| point\.timestamp/)
  assert.match(runtime, /configuredSummary \(module, resultSeries, points, values, fallback, chartType\)/)
  assert.match(runtime, /configuredSeriesName \(name\)/)
})
