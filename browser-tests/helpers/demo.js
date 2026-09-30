const { expect } = require('@playwright/test')

const scenarioIndex = Object.freeze({
  manufacturer: 0,
  channel: 1,
  office: 2,
  rental: 3
})
const demoOrigin = `http://127.0.0.1:${Number(process.env.DEMO_TEST_PORT) || 46944}`

async function openScenarioPicker (page) {
  await page.goto('/#/login')
  await expect(page.locator('.demo-role-picker')).toBeVisible()
  await expect(page.locator('.demo-role-picker__option')).toHaveCount(4)
}

async function selectScenario (page, scenarioId) {
  await openScenarioPicker(page)
  await page.locator('.demo-role-picker__option').nth(scenarioIndex[scenarioId]).click()
  await expect(page).toHaveURL(/#\/dashboard$/)
  await expect(page.locator('.demo-toolbar')).toBeVisible()
  await expect(page.locator('.demo-toolbar select')).toHaveValue(scenarioId)
}

async function sessionSnapshot (page) {
  return page.evaluate(() => ({
    scenario: localStorage.getItem('demoScenario'),
    token: localStorage.getItem('token'),
    user: JSON.parse(localStorage.getItem('user') || 'null')
  }))
}

function observeBrowserBoundary (page) {
  const pageErrors = []
  const consoleErrors = []
  const failedRequests = []
  const externalRequests = []
  const webSockets = []

  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.origin !== demoOrigin) externalRequests.push(request.url())
    }
  })
  page.on('websocket', socket => {
    const url = new URL(socket.url())
    // webpack-dev-server owns /ws during browser tests. Any application
    // WebSocket uses a different path and must remain absent in Demo mode.
    if (url.pathname !== '/ws') webSockets.push(socket.url())
  })

  return { pageErrors, consoleErrors, failedRequests, externalRequests, webSockets }
}

module.exports = { observeBrowserBoundary, openScenarioPicker, selectScenario, sessionSnapshot }
