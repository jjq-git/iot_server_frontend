const { test, expect } = require('@playwright/test')
const { openScenarioPicker } = require('./helpers/demo')

test('Demo starts only after the matching service worker is active', async ({ page }) => {
  await openScenarioPicker(page)

  const registration = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    const active = registrations.find(item => item.active?.scriptURL.includes('mockServiceWorker.js'))
    return active ? { scope: active.scope, scriptURL: active.active.scriptURL } : null
  })

  expect(registration).not.toBeNull()
  expect(registration.scope).toBe(`${await page.evaluate(() => window.location.origin)}/`)
  expect(registration.scriptURL).toContain('mockServiceWorker.js?app=podsc-demo')

  const metadata = await page.request.get('/build-info.json')
  const config = await page.request.get('/config.json')
  expect(metadata.ok()).toBeTruthy()
  expect(config.ok()).toBeTruthy()
  expect((await metadata.json()).appMode).toBe('demo')
  expect(await config.json()).toMatchObject({ appMode: 'demo', apiBase: 'auto', uploadBaseUrl: 'auto' })
})

test('Demo stops with a diagnostic when worker metadata does not match', async ({ page }) => {
  await page.route('**/build-info.json', async route => {
    const response = await route.fetch()
    const metadata = await response.json()
    await route.fulfill({ response, json: { ...metadata, mockWorkerSha256: 'mismatched-worker-digest' } })
  })

  await page.goto('/#/login')
  await expect(page.getByRole('alert')).toContainText('E_DEMO_SW_VERSION')
  await expect(page.locator('.demo-role-picker')).toHaveCount(0)
})

test('Demo stops with a diagnostic when IndexedDB is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined })
  })

  await page.goto('/#/login')
  await expect(page.getByRole('alert')).toContainText('E_DEMO_IDB_UNAVAILABLE')
  await expect(page.locator('.demo-role-picker')).toHaveCount(0)
})
