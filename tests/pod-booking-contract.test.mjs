import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = relativePath => readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const locales = ['de-DE', 'en-US', 'es-ES', 'fr-FR', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW']

test('pod booking pages use the renamed backend resource contract', () => {
  const api = read('src/api/podBookings.js')
  const list = read('src/views/PodBookings.vue')
  const detail = read('src/views/PodBookingDetail.vue')
  const settings = read('src/views/PodBookingSettings.vue')
  const permissions = read('src/utils/permission.js')

  for (const path of [
    '/pod-bookings',
    '/pod-booking-configs/bookable-pods',
    '/pod-booking-configs/pod-capabilities'
  ]) assert.match(api, new RegExp(path.replaceAll('/', '\\/')))
  assert.doesNotMatch(api, /meeting-bookings|meeting-room-configs/)
  assert.match(list, /pod_uuid/)
  assert.doesNotMatch(list, /unit_uuid|unit_name/)
  assert.match(detail, /fetchPodBookingLogs/)
  assert.match(detail, /fetchPodBookingDeliveries/)
  assert.match(detail, /retryPodBookingDelivery/)
  assert.match(list, /PERMISSION\.POD_RECEIVE/)
  assert.match(list, /calendarScale/)
  assert.match(list, /delivery_status/)
  assert.match(detail, /PERMISSION\.POD_MAINTAIN/)
  assert.match(permissions, /PodBookingSettings: PERMISSION\.POD_MAINTAIN/)
  assert.match(settings, /createPodBookingConfig/)
})

test('pod booking mutations require the backend receiving and control capabilities', () => {
  for (const source of [read('src/views/PodBookings.vue'), read('src/views/PodBookingDetail.vue')]) {
    assert.match(source, /hasPermission\(PERMISSION\.POD_RECEIVE, user\)\s*&&\s*hasPermission\(PERMISSION\.POD_CONTROL, user\)/)
  }
})

test('pod booking routes are canonical and old meeting bookmarks redirect', () => {
  const router = read('src/router/index.js')
  const sidebar = read('src/components/Sidebar.vue')

  assert.match(router, /path: 'pod-bookings', name: 'PodBookings'/)
  assert.match(router, /path: 'meetings', redirect: '\/pod-bookings'/)
  assert.match(sidebar, /navigateTo\('\/pod-bookings'\)/)
})

test('all locales describe pod booking delivery states and retry', () => {
  for (const locale of locales) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`)).meeting
    for (const key of ['dispatch_title', 'dispatch_retry', 'dispatch_retry_success', 'dispatch_status_pending', 'dispatch_status_sent', 'dispatch_status_acked', 'dispatch_status_superseded', 'dispatch_status_failed', 'dispatch_summary', 'calendar_day', 'calendar_week', 'calendar_today', 'calendar_day_empty']) assert.equal(typeof messages[key], 'string', `${locale}: ${key}`)
  }
})
