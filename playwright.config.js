const { defineConfig, devices } = require('@playwright/test')
const demoTestPort = Number(process.env.DEMO_TEST_PORT) || 46944

module.exports = defineConfig({
  testDir: './browser-tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${demoTestPort}`,
    locale: 'zh-CN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: `webpack serve --mode development --env appMode=demo --port ${demoTestPort} --no-open`,
    // Waiting for the document, rather than config.json, ensures the first
    // browser worker never races webpack's initial compilation.
    url: `http://127.0.0.1:${demoTestPort}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
})
