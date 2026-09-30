import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const read = file => fs.readFileSync(path.resolve(file), 'utf8')

test('company and user detail controls share the detail row center', () => {
  const companyView = read('src/views/CompanyDetail.vue')
  const userView = read('src/views/UserDetail.vue')
  const styles = read('src/assets/styles/pages.scss')
  const scopedStyles = read('src/assets/styles/pages/company-detail.scss')

  assert.match(companyView, /<b-form-checkbox-group[\s\S]*?:options="companyTypeOptions"/)
  assert.match(companyView, /<base-switch v-model="editValueB"/)
  assert.match(userView, /<base-switch v-model="editValueB"/)
  assert.match(styles, /\.detail-page \.detail-row__content \.custom-control-label[\s\S]*?min-height:\s*var\(--control-height-sm\)/)
  assert.match(styles, /\.detail-page \.detail-row__content \.custom-control-label::before,[\s\S]*?top:\s*calc\(50% - 0\.5rem\)/)
  assert.match(styles, /\.detail-page \.detail-row__content \.custom-switch \.custom-control-label::after\s*\{\s*top:\s*calc\(50% - 0\.5rem \+ 2px\)/)
  assert.doesNotMatch(styles, /\.custom-control-label::after\s*\{[^}]*transform:/)
  assert.doesNotMatch(scopedStyles, /\.custom-control-label::(?:before|after)\s*\{[^}]*(?:top|transform):/)
  assert.match(scopedStyles, /\.custom-control-input:checked:disabled[\s\S]*?background-color:\s*var\(--color-text-muted\)/)
})
