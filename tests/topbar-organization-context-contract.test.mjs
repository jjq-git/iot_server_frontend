import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/Topbar.vue'), 'utf8')

test('the topbar exposes a membership-bound organization switcher', () => {
  assert.match(source, /topbar__organization-select/)
  assert.match(source, /fetchAuthorizationContexts/)
  assert.match(source, /switchOrganization/)
  assert.match(source, /localStorage\.setItem\('token', response\.access_token\)/)
  assert.match(source, /persistCurrentUser\(response\.user\)/)
})
