import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('active company context drives theme, organization wording and suspended notice', async () => {
  const [theme, session, login, layout, topbar] = await Promise.all([
    read('src/utils/theme.js'),
    read('src/utils/sessionContext.js'),
    read('src/views/Login.vue'),
    read('src/layouts/AdminLayout.vue'),
    read('src/components/Topbar.vue')
  ])

  assert.match(theme, /primary_color/)
  assert.match(theme, /secondary_color/)
  assert.match(theme, /accent_color/)
  assert.match(theme, /clearCompanyTheme/)
  assert.match(session, /applyCompanyTheme\(user\.company \|\| null\)/)
  assert.match(login, /persistCurrentUser\(userInfo\)/)
  assert.match(layout, /company\?\.status === 'suspended'/)
  assert.match(topbar, /company\?\.is_household/)
  assert.match(topbar, /company\?\.is_school/)
})

test('all locales explain suspended mode and organization wording', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  for (const locale of locales) {
    const messages = JSON.parse(await read(`src/locales/${locale}.json`))
    for (const value of [
      messages.layout.suspended_title,
      messages.layout.suspended_message,
      messages.topbar.user_menu.household,
      messages.topbar.user_menu.school
    ]) {
      assert.equal(typeof value, 'string')
      assert.ok(value.trim())
    }
  }
})
