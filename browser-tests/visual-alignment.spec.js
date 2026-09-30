const { test, expect } = require('@playwright/test')
const { selectScenario } = require('./helpers/demo')

const routes = [
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
  '/pod-bookings/settings',
  '/locations',
  '/locations/demo-location-office',
  '/history/sensors'
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 }
]

const auditLayout = page => page.evaluate(() => {
  const visible = element => {
    const style = getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0
  }
  const box = element => {
    const rect = element.getBoundingClientRect()
    return {
      selector: element.tagName.toLowerCase() + (element.className ? `.${String(element.className).trim().replace(/\s+/g, '.')}` : ''),
      text: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 60),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  }

  const viewportWidth = document.documentElement.clientWidth
  const bodyOverflow = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - viewportWidth
  const clippedControls = [...document.querySelectorAll('button, input, select, textarea')]
    .filter(visible)
    .filter(element => !element.closest('.table-responsive, .b-table-sticky-header, .app-sidebar'))
    .filter(element => {
      const rect = element.getBoundingClientRect()
      const intersectsViewport = rect.right > 0 && rect.left < viewportWidth
      const hasClippedContent = !element.matches('.close, [aria-label][class*="icon"]') &&
        element.scrollHeight > element.clientHeight + 2
      return intersectsViewport && (rect.left < -1 || rect.right > viewportWidth + 1 || hasClippedContent)
    })
    .map(box)

  const unevenActionButtons = [...document.querySelectorAll('.action-cell, td.actions-cell')]
    .filter(visible)
    .flatMap(group => {
      const buttons = [...group.querySelectorAll('button')].filter(visible)
      if (buttons.length < 2) return []
      const tops = buttons.map(button => Math.round(button.getBoundingClientRect().top))
      const heights = buttons.map(button => Math.round(button.getBoundingClientRect().height))
      return Math.max(...tops) - Math.min(...tops) > 1 || Math.max(...heights) - Math.min(...heights) > 1
        ? buttons.map(box)
        : []
    })

  const unresolvedHeadings = [...document.querySelectorAll('h1, h2, h3, .dashboard-widget__title')]
    .filter(visible)
    .map(element => (element.textContent || '').trim())
    .filter(text => /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)+$/.test(text))

  return { bodyOverflow, clippedControls, unevenActionButtons, unresolvedHeadings }
})

for (const viewport of viewports) {
  test(`visible Demo routes keep controls aligned at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    await selectScenario(page, 'manufacturer')

    for (const route of routes) {
      await page.goto(`/#${route}`)
      await expect(page.locator('main')).toBeVisible()
      const audit = await auditLayout(page)
      expect(audit, `${route} at ${viewport.name}`).toEqual({
        bodyOverflow: 0,
        clippedControls: [],
        unevenActionButtons: [],
        unresolvedHeadings: []
      })
    }
  })
}
