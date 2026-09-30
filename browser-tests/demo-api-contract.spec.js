const { test, expect } = require('@playwright/test')
const { selectScenario } = require('./helpers/demo')

async function api (page, pathname, options = {}) {
  return page.evaluate(async ({ pathname, options }) => {
    const headers = { ...(options.headers || {}) }
    if (options.auth !== false) headers.Authorization = `Bearer ${localStorage.getItem('token') || ''}`
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json'
    const response = await fetch(pathname, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    })
    return { status: response.status, body: await response.json() }
  }, { pathname, options })
}

test('P0 reads use backend-shaped envelopes and stay inside the office scope', async ({ page }) => {
  await selectScenario(page, 'office')

  const dashboard = await api(page, '/api/v1/dashboard/summary?start_date=2026-09-10&end_date=2026-09-17')
  expect(dashboard.status).toBe(200)
  expect(dashboard.body.stats).toMatchObject({ totalDevices: 2, onlineDevices: 1, offlineDevices: 1 })
  expect(dashboard.body.tableData).toHaveLength(8)
  expect(dashboard.body.tableData[0]).toMatchObject({
    date: '2026-09-10',
    total_devices: 2
  })
  expect(dashboard.body.tableData[7].date).toBe('2026-09-17')
  for (const row of dashboard.body.tableData) {
    expect(row).toEqual(expect.objectContaining({
      date: expect.any(String),
      online_devices: expect.any(Number),
      total_devices: expect.any(Number),
      online_rate: expect.any(Number),
      pod_usage: expect.any(Number),
      avg_usage_time: expect.any(Number),
      file_downloads: expect.any(Number),
      alerts_count: expect.any(Number)
    }))
  }

  const companies = await api(page, '/api/v1/companies?page=1&page_size=200')
  expect(companies.status).toBe(200)
  expect(companies.body.items).toHaveLength(1)
  expect(companies.body.items[0]).toMatchObject({ id: 300, company_name: '演示办公客户', company_code: 'DEMO-OFFICE' })

  const pods = await api(page, '/api/v1/pods?page=1&page_size=200')
  expect(pods.status).toBe(200)
  expect(pods.body.total).toBe(2)
  expect(pods.body.limit).toBe(200)
  expect(pods.body.items.every(item => item.company_id === 300 && item.pod_name && item.host)).toBeTruthy()

  const hosts = await api(page, '/api/v1/hosts?page=1&page_size=200')
  expect(hosts.status).toBe(200)
  expect(hosts.body.items.every(item => item.company_id === 300 && item.serial_no && item.presence)).toBeTruthy()

  const podModels = await api(page, '/api/v1/pod-models?page=1&page_size=200')
  expect(podModels.status).toBe(200)
  expect(podModels.body.items).toHaveLength(1)
  expect(podModels.body.items[0]).toMatchObject({ id: 1, code: 'SP-100' })

  const locations = await api(page, '/api/v1/locations/search?page=1&page_size=20')
  expect(locations.status).toBe(200)
  expect(locations.body.items).toHaveLength(1)
  expect(locations.body.items[0]).toMatchObject({ com_id: 300, gps_source: 'manual' })

  for (const path of ['/api/v1/districts/provinces', '/api/v1/districts/cities?province_code=310000', '/api/v1/districts/districts?city_code=310100']) {
    const response = await api(page, path)
    expect(response.status).toBe(200)
    expect(response.body.total).toBe(response.body.items.length)
    expect(response.body.items[0]).toEqual(expect.objectContaining({ id: expect.any(Number), code: expect.any(String), level: expect.any(String) }))
  }

  const bookings = await api(page, '/api/v1/pod-bookings?page=1&page_size=20')
  expect(bookings.status).toBe(200)
  expect(bookings.body.items.every(item => item.owner_company_id === 300 && item.automation_status)).toBeTruthy()
  const bookable = await api(page, '/api/v1/pod-booking-configs/bookable-pods')
  expect(bookable.status).toBe(200)
  expect(bookable.body.every(item => item.owner_company_id === 300 && item.booking_config_uuid && item.booking_capability === 'enabled')).toBeTruthy()
})

test('P0 handlers return stable authentication, scope and validation failures', async ({ page }) => {
  await selectScenario(page, 'office')

  expect((await api(page, '/api/v1/companies?page=0&page_size=20')).status).toBe(422)
  expect((await api(page, '/api/v1/companies/400')).status).toBe(403)
  expect((await api(page, '/api/v1/pods/demo-pod-rental-01')).status).toBe(404)
  expect((await api(page, '/api/v1/pods/demo-pod-office-01/control-schema')).status).toBe(403)
  expect((await api(page, '/api/v1/dashboard/summary?start_date=invalid')).status).toBe(422)
  expect((await api(page, '/api/v1/users/me', { auth: false })).status).toBe(401)
  expect((await api(page, '/api/v1/districts/cities')).status).toBe(422)
  expect((await api(page, '/api/v1/locations', { method: 'POST', body: { location_name: 'Invalid GPS', gps_lat: 91, gps_lng: 121 } })).status).toBe(422)

  const malformedChart = await api(page, '/api/v1/dashboard/chart-data/query', {
    method: 'POST',
    body: { queries: [{ request_id: 'invalid', source_key: 'device_status', metric_key: 'online_rate', aggregation: 'avg', interval: '1day', resource_uuids: 'not-an-array' }] }
  })
  expect(malformedChart.status).toBe(422)

  const outOfScopeChart = await api(page, '/api/v1/dashboard/chart-data/query', {
    method: 'POST',
    body: { queries: [{ request_id: 'scope', source_key: 'device_status', metric_key: 'online_rate', aggregation: 'avg', interval: '1day', resource_uuids: ['demo-pod-rental-01'] }] }
  })
  expect(outOfScopeChart.status).toBe(403)

  const unmatched = await page.evaluate(async () => {
    try {
      await fetch('/api/v1/not-covered-by-demo')
      return false
    } catch (error) {
      return true
    }
  })
  expect(unmatched).toBeTruthy()
})

test('approved location and booking mutations persist with conflict protection', async ({ page }) => {
  await selectScenario(page, 'office')

  const createdLocation = await api(page, '/api/v1/locations', {
    method: 'POST',
    body: { location_name: '演示新增地点', district_id: 3, street: '演示路 1 号', remark: '合成测试数据' }
  })
  expect(createdLocation.status).toBe(201)
  expect(createdLocation.body).toMatchObject({ company_id: 300, com_id: 300, district_code: '310115', gps_source: 'district_baseline' })

  const duplicateLocation = await api(page, '/api/v1/locations', {
    method: 'POST',
    body: { location_name: '演示新增地点', district_id: 3 }
  })
  expect(duplicateLocation.status).toBe(409)

  const toggledLocation = await api(page, `/api/v1/locations/${createdLocation.body.uuid}`, { method: 'PUT', body: { is_active: false } })
  expect(toggledLocation.status).toBe(200)
  expect(toggledLocation.body).toMatchObject({ location_name: '演示新增地点', is_active: false })

  const start = new Date(Date.now() + 48 * 60 * 60 * 1000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const invalidBooking = await api(page, '/api/v1/pod-bookings', {
    method: 'POST',
    body: { pod_uuid: 'demo-pod-office-01', subject: 'Missing timezone offset', start_at: '2026-09-19T10:00:00', end_at: '2026-09-19T11:00:00' }
  })
  expect(invalidBooking.status).toBe(422)
  const bookingPayload = { pod_uuid: 'demo-pod-office-01', subject: 'Demo contract review', start_at: start.toISOString(), end_at: end.toISOString(), timezone: 'Asia/Shanghai', participant_count: 4 }
  const createdBooking = await api(page, '/api/v1/pod-bookings', { method: 'POST', body: bookingPayload })
  expect(createdBooking.status).toBe(201)
  expect(createdBooking.body).toMatchObject({ owner_company_id: 300, lifecycle: 'upcoming', automation_status: 'unconfigured', revision: 1 })

  const conflict = await api(page, '/api/v1/pod-bookings', { method: 'POST', body: bookingPayload })
  expect(conflict.status).toBe(409)

  const updated = await api(page, `/api/v1/pod-bookings/${createdBooking.body.uuid}`, { method: 'PATCH', body: { revision: 1, subject: 'Updated demo contract review' } })
  expect(updated.status).toBe(200)
  expect(updated.body).toMatchObject({ subject: 'Updated demo contract review', revision: 2 })

  const stale = await api(page, `/api/v1/pod-bookings/${createdBooking.body.uuid}`, { method: 'PATCH', body: { revision: 1, subject: 'Stale update' } })
  expect(stale.status).toBe(409)

  const cancelled = await api(page, `/api/v1/pod-bookings/${createdBooking.body.uuid}/cancel`, { method: 'POST' })
  expect(cancelled.status).toBe(200)
  expect(cancelled.body).toMatchObject({ status: 'cancelled', lifecycle: 'cancelled', revision: 3 })
  expect((await api(page, `/api/v1/pod-bookings/${createdBooking.body.uuid}/cancel`, { method: 'POST' })).status).toBe(409)
})

test('approved controls accept online pods and reject offline pods', async ({ page }) => {
  await selectScenario(page, 'manufacturer')
  const schema = await api(page, '/api/v1/pods/demo-pod-office-01/control-schema')
  expect(schema.status).toBe(200)
  expect(schema.body.modules).toHaveLength(3)
  expect(schema.body.modules.map(module => module.control_category)).toEqual(['light', 'fresh_air', 'ac'])

  const control = await api(page, '/api/v1/pods/demo-pod-office-01/control', {
    method: 'POST',
    body: { attr_code: 'brightness', value: 80, target_uuid: 'demo-pod-office-01-light' }
  })
  expect(control.status).toBe(200)
  expect(control.body).toMatchObject({ pod_uuid: 'demo-pod-office-01', command: 'write_attr', published: true })
  const state = await api(page, '/api/v1/pods/demo-pod-office-01/control-state')
  expect(state.body.items.find(item => item.co_index === '0x3001' && item.co_sub_index === '0x02')).toMatchObject({ value: 80 })

  const online = await api(page, '/api/v1/pods/demo-pod-office-01/status/command', { method: 'POST', body: { command: 'restart' } })
  expect(online.status).toBe(200)
  expect(online.body).toMatchObject({ pod_uuid: 'demo-pod-office-01', command: 'restart', status: 'success' })
  const offline = await api(page, '/api/v1/pods/demo-pod-office-02/status/command', { method: 'POST', body: { command: 'restart' } })
  expect(offline.status).toBe(409)
  expect((await api(page, '/api/v1/pods/demo-pod-office-02/control', { method: 'POST', body: { attr_code: 'light_on', value: true } })).status).toBe(409)
})

test('Pods page browser trace matches all implicit P0 option requests', async ({ page }) => {
  const requests = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/v1/')) requests.push(`${request.method()} ${url.pathname}`)
  })
  await selectScenario(page, 'office')
  requests.length = 0
  await page.goto('/#/pods')
  await expect(page.locator('body')).toContainText('DEMO-OFFICE-001')
  await expect.poll(() => requests, { timeout: 15000 }).toEqual(expect.arrayContaining([
    'GET /api/v1/pods',
    'GET /api/v1/pod-models',
    'GET /api/v1/hosts',
    'GET /api/v1/companies'
  ]))
})
