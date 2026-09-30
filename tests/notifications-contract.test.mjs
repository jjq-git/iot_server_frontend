import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = path.resolve('.')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('notifications page consumes lifecycle notification list and acknowledgement APIs', () => {
  const api = read('src/api/notifications.js')
  const view = read('src/views/Notifications.vue')

  assert.match(api, /http\.get\('\/notifications'/)
  assert.match(api, /http\.post\(`\/notifications\/\$\{encodeURIComponent\(uuid\)\}\/ack`\)/)
  assert.match(view, /const params = \{ limit: 500 \}/)
  assert.match(view, /params\.phase = this\.query\.phase/)
  assert.match(view, /params\.status = this\.query\.status/)
  assert.match(view, /fetchNotifications\(params\)/)
  assert.match(view, /this\.total = Number\(response\?\.total \?\? this\.items\.length\)/)
  assert.doesNotMatch(view, /query\.keyword|filteredItems/)
  assert.match(view, /acknowledgeNotification\(item\.uuid\)/)
  assert.match(view, /row\.item\.status !== 'acked'/)
  assert.match(view, /status_labels\.\$\{row\.item\.status\}/)
  assert.match(view, /await acknowledgeNotification\(item\.uuid\)[\s\S]*await this\.loadNotifications\(\)/)
  assert.doesNotMatch(view, /read: item\.status === 'acked'/)
  assert.match(view, /hasPermission\(PERMISSION\.POD_VIEW, getCurrentUser\(\)\)/)
})

test('notification phase and delivery status labels are localized in every locale', () => {
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']) {
    const notifications = JSON.parse(read(`src/locales/${locale}.json`)).route.notifications
    for (const phase of ['pre_start', 'start', 'end', 'overstay', 'vacated', 'cleaning', 'cleaned']) {
      assert.ok(notifications.phase_labels[phase]?.trim(), `${locale} missing notification phase ${phase}`)
    }
    for (const status of ['pending', 'sent', 'failed', 'acked']) {
      assert.ok(notifications.status_labels[status]?.trim(), `${locale} missing notification status ${status}`)
    }
    assert.ok(notifications.acknowledge?.trim(), `${locale} missing notification acknowledge action`)
  }
})

test('booking settings edits defaults, cleaning, and the strict lifecycle contract', () => {
  const view = read('src/views/PodBookingSettings.vue')

  assert.match(view, /default_scene_key: this\.defaultSceneKey \|\| null/)
  assert.match(view, /cleaning_config: cleaningConfig/)
  assert.match(view, /windows: this\.cleaningForm\.scheduled\.windows\.map/)
  assert.match(view, /'pre_start', 'start', 'end', 'overstay', 'vacated', 'cleaning', 'cleaned'/)
  assert.match(view, /'dashboard', 'pod_screen'/)
  assert.match(view, /phase\.notify = \{ to: row\.audience, template: row\.template, channel: row\.channel \}/)
})

test('booking policy modal uses a responsive layout and localized labels', () => {
  const view = read('src/views/PodBookingSettings.vue')
  const pageStyles = read('src/assets/styles/pages/pod-booking-settings.scss')
  const modalStyles = read('src/assets/styles/_modal-workflows.scss')

  assert.match(view, /modal-class="booking-policy-modal"/)
  assert.match(view, /size="lg"/)
  assert.match(view, /class="booking-policy-cleaning-window"/)
  assert.match(view, /class="booking-policy-phase-list"/)
  assert.match(view, /class="booking-policy-phase-card__notify-toggle"/)
  assert.match(view, /class="booking-policy-phase-card__notify-grid"/)
  assert.match(view, /lifecyclePhaseLabel\(row\.phase\)/)
  assert.doesNotMatch(view, /label="(?:offset_minutes|grace_minutes|audience|channel|template)"/)
  assert.match(pageStyles, /\.booking-policy-cleaning-window\s*\{[\s\S]*grid-template-columns:/)
  assert.match(pageStyles, /\.booking-policy-phase-card\s*\{[\s\S]*grid-template-columns:/)
  assert.match(pageStyles, /\.booking-policy-form ::v-deep \.custom-control-label::before,[\s\S]*top:\s*50%;[\s\S]*transform:\s*translateY\(-50%\);/)
  assert.match(pageStyles, /@media \(width <= 575px\)[\s\S]*\.booking-policy-cleaning-window/)
  assert.match(modalStyles, /\.booking-policy-modal\s*\{[\s\S]*max-width: 760px/)

  const requiredKeys = [
    'title', 'default_scene', 'default_scene_help', 'cleaning_policy',
    'clean_after_session', 'cleaning_buffer_minutes', 'scheduled_cleaning',
    'start_time', 'cleaning_duration_minutes', 'iso_weekdays',
    'iso_weekdays_placeholder', 'add_cleaning_window', 'remove_cleaning_window',
    'lifecycle_actions', 'scene_action', 'offset_minutes', 'grace_minutes',
    'notify', 'audience', 'channel', 'template', 'none_option',
    'audience_occupant', 'audience_organizer', 'audience_guest',
    'audience_cleaner', 'audience_staff', 'channel_dashboard',
    'channel_pod_screen', 'invalid_iso_weekdays'
  ]
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']) {
    const policy = JSON.parse(read(`src/locales/${locale}.json`)).meeting.booking_policy
    for (const key of requiredKeys) assert.ok(policy[key]?.trim(), `${locale} missing booking policy label ${key}`)
  }
})

test('booking settings uses an explicit source action instead of an icon-only power control', () => {
  const view = read('src/views/PodBookingSettings.vue')
  const styles = read('src/assets/styles/pages/pod-booking-settings.scss')

  assert.match(view, /class="booking-settings-actions"/)
  assert.match(view, /variant="outline-primary"[\s\S]*meeting\.enable_local/)
  assert.match(view, /'outline-danger' : 'outline-primary'/)
  assert.match(view, /variant="outline-secondary"[\s\S]*meeting\.booking_policy\.title/)
  assert.doesNotMatch(view, /class="action-icon action-icon--text"[\s\S]{0,300}name="power"/)
  assert.match(styles, /\.booking-settings-actions\s*\{[\s\S]*display: inline-flex/)
})
