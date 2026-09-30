const { test, expect } = require('@playwright/test')
const { selectScenario } = require('./helpers/demo')

const apiFailures = page => {
  const failures = []
  page.on('requestfailed', request => {
    const url = new URL(request.url())
    const errorText = request.failure()?.errorText || ''
    if (/aborted|cancelled|canceled/i.test(errorText)) return
    if (url.pathname.startsWith('/api/v1/')) failures.push(`${request.method()} ${url.pathname}`)
  })
  return failures
}

const visit = async (page, route) => {
  await page.goto(`/#${route}`)
  await page.waitForTimeout(500)
  await expect(page.locator('body')).not.toContainText('Network Error')
}

test('every manufacturer Demo route stays inside the implemented API surface', async ({ page }) => {
  const failures = apiFailures(page)
  await selectScenario(page, 'manufacturer')

  for (const route of [
    '/dashboard',
    '/org/companies',
    '/org/companies/100',
    '/org/companies/demo-company-mf',
    '/org/company-dashboard-config',
    '/org/company-dashboard-config/100',
    '/pods/pod-models',
    '/pods',
    '/pods/demo-pod-office-01',
    '/pod-bookings',
    '/pod-bookings/demo-booking-office-01',
    '/locations',
    '/locations/demo-location-office',
    '/history/sensors'
  ]) await visit(page, route)

  await visit(page, '/org/company-dashboard-config')
  await expect(page.locator('body')).toContainText('演示制造商')
  expect(failures).toEqual([])
})

test('manufacturer Demo presents a complete dashboard, controls and readable configuration detail', async ({ page }) => {
  await selectScenario(page, 'manufacturer')

  await page.goto('/#/dashboard')
  await expect(page.locator('.dashboard-grid__item')).toHaveCount(17)
  await expect(page.locator('.dashboard-widget--chart')).toHaveCount(15)
  const detailTable = page.locator('.dashboard-grid__item--detailed_stats')
  await expect(detailTable.locator('tbody tr')).toHaveCount(7)
  await expect(detailTable).toContainText(/2026-09-\d{2}/)
  await expect(detailTable).toContainText(/\d+%/)

  await page.goto('/#/pods')
  await expect(page.locator('tbody tr').filter({ hasText: 'DEMO-OFFICE-001' })).toBeVisible()
  await page.locator('tbody tr').filter({ hasText: 'DEMO-OFFICE-001' }).locator('button').first().click()
  await expect(page.locator('.control-card')).toHaveCount(3)
  await expect(page.locator('.pod-control-panel')).toContainText('舱内照明')

  await page.goto('/#/org/companies/demo-company-mf')
  await expect(page.locator('body')).toContainText('DEMO-MF')
  await expect(page.locator('body')).not.toContainText('请求的资源不存在')

  await page.goto('/#/org/company-dashboard-config/100')
  await expect(page.locator('.company-dashboard-config-panel')).toHaveCount(17)
  await expect(page.locator('.company-dashboard-config-branding')).toContainText('演示制造商')
  await expect(page.locator('.company-dashboard-config-section pre')).toHaveCount(0)
})

test('unsupported Demo routes redirect before their pages can issue API requests', async ({ page }) => {
  const failures = apiFailures(page)
  await selectScenario(page, 'manufacturer')

  for (const route of ['/debug/firmwares', '/debug/ota-console', '/notifications', '/user/profile']) {
    await page.goto(`/#${route}`)
    await expect(page).toHaveURL(/#\/dashboard$/)
  }

  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  })
  await selectScenario(page, 'office')
  await page.goto('/#/devices/enrollments')
  await expect(page).toHaveURL(/#\/dashboard$/)
  expect(failures).toEqual([])
})
