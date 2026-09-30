const { test, expect } = require('@playwright/test')
const { openScenarioPicker, selectScenario, sessionSnapshot } = require('./helpers/demo')

const scenarios = [
  { id: 'manufacturer', companyId: 100, podSerial: 'DEMO-OFFICE-001' },
  { id: 'channel', companyId: 200, podSerial: 'DEMO-OFFICE-001' },
  { id: 'office', companyId: 300, podSerial: 'DEMO-OFFICE-001' },
  { id: 'rental', companyId: 400, podSerial: 'DEMO-RENTAL-001' }
]

for (const scenario of scenarios) {
  test(`${scenario.id} scenario keeps its identity and scoped pod list`, async ({ page }) => {
    await selectScenario(page, scenario.id)

    const session = await sessionSnapshot(page)
    expect(session.scenario).toBe(scenario.id)
    expect(session.token).toMatch(new RegExp(`^demo-session:${scenario.id}:`))
    expect(session.user.company_id).toBe(scenario.companyId)

    await page.goto('/#/pods')
    await expect(page.locator('body')).toContainText(scenario.podSerial)
    await expect(page.locator('.demo-toolbar select')).toHaveValue(scenario.id)
  })
}

test('control capability is rendered only for an approved scenario', async ({ page }) => {
  await selectScenario(page, 'manufacturer')
  await page.goto('/#/pods/demo-pod-office-01')
  await expect(page.getByRole('tab', { name: '控制面板', exact: true })).toBeVisible()

  await page.locator('.demo-toolbar select').selectOption('office')
  await expect(page.locator('.demo-toolbar select')).toHaveValue('office')
  await page.goto('/#/pods/demo-pod-office-01')
  await expect(page.getByRole('tab', { name: '控制面板', exact: true })).toHaveCount(0)
})

test('scenario switch and reset synchronize across tabs', async ({ browserName, context, page }) => {
  test.skip(browserName !== 'chromium', 'Playwright Firefox/WebKit can report a null ServiceWorker controller in additional tabs; verify this flow in real release browsers')
  test.setTimeout(120000)
  await openScenarioPicker(page)
  const secondPage = await context.newPage()
  await openScenarioPicker(secondPage)

  await page.locator('.demo-role-picker__option').nth(2).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect(page.locator('.demo-toolbar select')).toHaveValue('office', { timeout: 45000 })
  await expect(secondPage.locator('.demo-toolbar select')).toHaveValue('office', { timeout: 45000 })

  await secondPage.locator('.demo-toolbar select').selectOption('rental')
  await expect(secondPage.locator('.demo-toolbar select')).toHaveValue('rental', { timeout: 45000 })
  await expect(page.locator('.demo-toolbar select')).toHaveValue('rental', { timeout: 45000 })

  let nativeConfirmation = null
  secondPage.once('dialog', async dialog => {
    nativeConfirmation = dialog.message()
    await dialog.accept()
  })
  await secondPage.getByRole('button', { name: '重置演示数据' }).click()
  const confirmation = secondPage.getByRole('dialog')
  if (await confirmation.isVisible().catch(() => false)) {
    await expect(confirmation).toContainText('这会清除当前浏览器中的所有演示修改')
    await confirmation.getByRole('button', { name: '确认', exact: true }).click()
  } else {
    expect(nativeConfirmation).toContain('这会清除当前浏览器中的所有演示修改')
  }
  await expect(secondPage.locator('.demo-role-picker')).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.demo-role-picker')).toBeVisible({ timeout: 45000 })
  expect((await sessionSnapshot(page)).token).toBeNull()
})
