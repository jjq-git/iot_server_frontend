const { test, expect } = require('@playwright/test')
const { observeBrowserBoundary, selectScenario } = require('./helpers/demo')

test('Dashboard requests stay same-origin and are handled by the Demo worker', async ({ page }) => {
  const boundary = observeBrowserBoundary(page)
  const apiResponses = []
  page.on('response', response => {
    const url = new URL(response.url())
    if (url.pathname.startsWith('/api/v1/')) {
      apiResponses.push({
        method: response.request().method(),
        pathname: url.pathname,
        status: response.status(),
        fromServiceWorker: response.fromServiceWorker()
      })
    }
  })

  await selectScenario(page, 'office')

  await expect.poll(() => apiResponses.map(item => `${item.method} ${item.pathname}`), { timeout: 15000 }).toEqual(expect.arrayContaining([
    'GET /api/v1/users/me',
    'GET /api/v1/dashboard/summary',
    'GET /api/v1/dashboard/config/effective',
    'POST /api/v1/dashboard/chart-data/query'
  ]))

  expect(apiResponses.every(item => item.status < 400)).toBeTruthy()
  expect(apiResponses.every(item => item.fromServiceWorker)).toBeTruthy()
  expect(boundary.externalRequests).toEqual([])
  expect(boundary.webSockets).toEqual([])
  expect(boundary.failedRequests).toEqual([])
  expect(boundary.pageErrors).toEqual([])
  expect(boundary.consoleErrors).toEqual([])
})
