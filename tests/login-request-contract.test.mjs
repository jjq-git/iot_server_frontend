import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('login submits the strict backend email contract', () => {
  const login = read('src/views/Login.vue')
  const submitBlock = login.match(/const res = await login\(\{[\s\S]*?\n\s*\}\)/)?.[0] || ''

  assert.match(submitBlock, /email:\s*data\.email/)
  assert.match(submitBlock, /password:\s*data\.password/)
  assert.doesNotMatch(submitBlock, /username|company_slug/)
})

test('default and visual-template login fields identify email input', () => {
  for (const file of ['src/views/Login.vue', 'src/components/customization/LoginPageTemplate.vue']) {
    const source = read(file)
    assert.match(source, /type="email"/)
    assert.match(source, /autocomplete="email"/)
    assert.doesNotMatch(source, /autocomplete="username"/)
  }
})

test('development test-account helper uses email identities without a source password', () => {
  const login = read('src/views/Login.vue')
  const accounts = read('src/components/customization/LoginTestAccounts.vue')
  const webpack = read('webpack.config.js')

  assert.match(login, /const DEV_TEST_ACCOUNTS = Object\.freeze/)
  assert.match(login, /email: 'admin@example\.com'/)
  assert.match(login, /typeof account\.email === 'string'/)
  assert.doesNotMatch(login, /typeof account\.username === 'string'/)
  assert.match(login, /const testAccounts = isDevelopment/)
  assert.match(login, /if \(this\.testAccountPassword\)/)
  assert.doesNotMatch(login, /const testAccountPassword = isDevelopment/)
  assert.match(accounts, /account\.email/)
  assert.doesNotMatch(accounts, /account\.username/)
  assert.match(webpack, /process\.env\.VUE_APP_TEST_ACCOUNT_PASSWORD/)
  assert.match(webpack, /devServer\.app\.get\('\/config\.json'/)
  assert.doesNotMatch(webpack, /defineEnv\[`process\.env\.VUE_APP_TEST_ACCOUNT_PASSWORD/)
})
