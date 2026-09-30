import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('list pages consume the exact BasePagination page-size event', () => {
  for (const file of ['src/views/FirmwareManager.vue', 'src/views/OtaConsole.vue']) {
    const source = read(file)
    assert.match(source, /@update:perPage="handlePageSizeChange"/, file)
    assert.doesNotMatch(source, /@update:per-page=/, file)
  }
})

test('firmware rows keep compact values readable and expose full truncated content', () => {
  const view = read('src/views/FirmwareManager.vue')
  const styles = read('src/assets/styles/pages/firmware-manager.scss')

  assert.match(view, /class="firmware-table__filename"[^>]*:title="row\.item\.file_name \|\| ''"/)
  assert.match(view, /class="firmware-table__checksum"[^>]*:title="firmwareChecksum\(row\.item\)"/)
  assert.match(view, /class="firmware-table__nowrap"/)
  assert.match(styles, /\.firmware-table__filename\s*\{[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/)
})

test('table row actions have visible hover and keyboard-focus affordances', () => {
  const styles = read('src/assets/styles/_interaction.scss')
  const finalStyles = read('src/assets/styles/_admin-system.scss')

  assert.match(styles, /\.actions-cell \.action-icon--text:hover,[\s\S]*?background:\s*var\(--color-brand-soft\);/)
  assert.match(styles, /\.actions-cell \.action-icon--text:focus-visible,[\s\S]*?outline:\s*2px solid var\(--color-brand\);/)
  assert.match(finalStyles, /\.action-icon--text\s*\{[\s\S]*?color:\s*var\(--color-text-secondary\) !important;/)
})

test('user detail renders a placeholder when locale is unavailable', () => {
  const source = read('src/views/UserDetail.vue')
  assert.match(source, /return map\[locale\] \|\| locale \|\| '-'/)
})

test('dynamic dashboard modules localize catalog titles instead of exposing internal keys', () => {
  const source = read('src/views/DashboardRuntime.vue')

  assert.match(source, /title:\s*this\.moduleDisplayTitle\(module\)/)
  assert.match(source, /const translationKey = `company_dashboard_config\.panel_names\.\$\{moduleKey\}`/)
  assert.match(source, /this\.\$te\(translationKey\) \? this\.\$t\(translationKey\) : moduleKey/)
})

test('MQTT stream toolbar stays compact on wide screens and wraps as a group when needed', () => {
  const styles = read('src/assets/styles/pages/debug/mqtt-stream.scss')

  assert.match(styles, /\.debug-mqtt-stream \.filter-actions\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?justify-content:\s*flex-start;/)
  assert.match(styles, /@media \(width <= 1700px\)[\s\S]*?\.debug-mqtt-stream \.filter-actions\s*\{[\s\S]*?flex:\s*1 1 100%;/)
  assert.match(styles, /\.mqtt-toolbar-status\s*\{[\s\S]*?margin-right:\s*4px;/)
  assert.doesNotMatch(styles, /\.mqtt-toolbar-status\s*\{[\s\S]*?margin-right:\s*auto;/)
})

test('short numeric filters do not consume full text-field widths', () => {
  const interactions = read('src/assets/styles/_interaction.scss')
  const serialLogs = read('src/views/debug/SerialLogs.vue')
  const emcyLogs = read('src/views/debug/EmcyLogs.vue')
  const alertEvents = read('src/views/debug/AlertEvents.vue')
  const deviceLanguage = read('src/views/DeviceLanguage.vue')
  const deviceLanguageStyles = read('src/assets/styles/pages/device-language.scss')

  assert.match(interactions, /\.filter-control--compact\s*\{[\s\S]*?flex:\s*0 0 110px !important;[\s\S]*?max-width:\s*110px;/)
  for (const source of [serialLogs, emcyLogs, alertEvents]) {
    assert.equal((source.match(/filter-control--compact/g) || []).length, 2)
  }
  assert.match(read('src/assets/styles/pages/debug/serial-logs.scss'), /\.debug-serial-logs \.filter-actions\s*\{[\s\S]*?margin-left:\s*0 !important;/)
  assert.match(read('src/assets/styles/pages/debug/emcy-logs.scss'), /\.debug-emcy-logs \.filter-actions\s*\{[\s\S]*?margin-left:\s*0 !important;/)
  assert.match(deviceLanguage, /class="dlm-form-cell dlm-form-cell--device"[\s\S]*?<label class="dlm-label">device_id<\/label>/)
  assert.match(deviceLanguageStyles, /&--device\s*\{[\s\S]*?flex:\s*0 0 140px;[\s\S]*?min-width:\s*120px;/)
})

test('mobile toolbars wrap controls instead of clipping actions off-screen', () => {
  const interactions = read('src/assets/styles/_interaction.scss')
  const mqttStyles = read('src/assets/styles/pages/debug/mqtt-stream.scss')
  const deviceControlStyles = read('src/assets/styles/pages/debug/device-control.scss')

  assert.match(interactions, /\.filter-actions\s*\{[\s\S]*?flex-wrap:\s*wrap;/)
  assert.match(interactions, /@media \(width <= 768px\)[\s\S]*?\.base-pagination-wrapper\s*\{[\s\S]*?flex-wrap:\s*wrap;/)
  assert.match(mqttStyles, /@media \(width <= 768px\)[\s\S]*?\.debug-filter-host,[\s\S]*?\.mqtt-filter-topic\s*\{[\s\S]*?width:\s*100% !important;/)
  assert.match(deviceControlStyles, /@media \(width <= 768px\)[\s\S]*?\.debug-device-control \.filter-left\s*\{[\s\S]*?flex-wrap:\s*wrap;/)
  assert.match(deviceControlStyles, /\.ddc-maint-row\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?overflow:\s*visible;/)
})

test('empty booking tables stay readable inside the mobile viewport', () => {
  const bookings = read('src/views/PodBookings.vue')
  const bookingStyles = read('src/assets/styles/pages/pod-bookings.scss')
  const settings = read('src/views/PodBookingSettings.vue')
  const settingsStyles = read('src/assets/styles/pages/pod-booking-settings.scss')

  assert.match(bookings, /:class="\{ 'meeting-results-table--empty': !items\.length \}"/)
  assert.match(bookingStyles, /@media \(width <= 767px\)[\s\S]*?\.meeting-results-table--empty ::v-deep \.table\s*\{[\s\S]*?min-width:\s*100%;/)
  assert.equal((settings.match(/'booking-settings-table--empty'/g) || []).length, 3)
  assert.match(settingsStyles, /@media \(width <= 767px\)[\s\S]*?\.booking-settings-table--empty ::v-deep \.table\s*\{[\s\S]*?min-width:\s*100%;/)
})

test('enrollment risk actions use the full card width without leaving a half-empty action block', () => {
  const detail = read('src/views/device-enrollments/EnrollmentDetail.vue')
  const styles = read('src/assets/styles/pages/device-enrollments/enrollment-detail.scss')

  assert.match(detail, /class="risk-panel__content"[\s\S]*?class="risk-panel__help small text-muted"[\s\S]*?class="detail-actions risk-panel__actions"/)
  assert.match(styles, /\.risk-panel__content\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto;[\s\S]*?align-items:\s*center;/)
  assert.match(styles, /@media \(width <= 575px\)[\s\S]*?\.risk-panel__content\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\);/)
})

test('system health checks use a balanced responsive grid', () => {
  const monitor = read('src/views/SystemMonitor.vue')
  const styles = read('src/assets/styles/pages/system-monitor.scss')

  assert.match(monitor, /<b-col cols="12" md="6" xl="4" v-for="check in healthChecks"/)
  assert.equal((monitor.match(/<b-col cols="12" md="6" xl="3">/g) || []).length, 4)
  assert.match(styles, /\.health-grid\s*\{[\s\S]*?row-gap:\s*var\(--space-md\);/)
  assert.match(styles, /\.health-grid > \[class\*='col-'\]\s*\{[\s\S]*?display:\s*flex;/)
  assert.match(styles, /\.health-card\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/)
  assert.match(styles, /\.metrics-section > \.row\s*\{[\s\S]*?row-gap:\s*var\(--space-md\);/)
  assert.match(styles, /\.metric-item\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;/)
})

test('system monitor keeps panels and tables on consistent horizontal edges', () => {
  const monitor = read('src/views/SystemMonitor.vue')
  const styles = read('src/assets/styles/pages/system-monitor.scss')

  assert.match(monitor, /<b-tabs[^>]*class="system-monitor__tabs"/)
  assert.match(styles, /\.system-monitor ::v-deep \.system-monitor__tabs > \.tab-content > \.tab-pane\.card-body\s*\{[\s\S]*?padding-inline:\s*0;/)
  assert.match(styles, /\.system-monitor ::v-deep \.base-table-wrapper \.table-responsive,[\s\S]*?padding-inline:\s*0;/)
})

test('card tables do not receive a second horizontal gutter', () => {
  const sharedStyles = read('src/assets/styles/_interaction.scss')
  const podStyles = read('src/assets/styles/pages/pod-detail.scss')
  const controller = read('src/views/ControllerWebConsole.vue')
  const controllerStyles = read('src/assets/styles/pages/controller-web-console.scss')

  assert.match(sharedStyles, /\.card-body > \.base-table-wrapper > \.table-responsive,[\s\S]*?padding-inline:\s*0;/)
  assert.match(podStyles, /::v-deep \.tab-content \.base-table-wrapper \.table-responsive,[\s\S]*?padding-inline:\s*0;/)
  assert.match(controller, /<style lang="scss" scoped src="@\/assets\/styles\/pages\/controller-web-console\.scss"><\/style>/)
  assert.match(controllerStyles, /\.controller-console ::v-deep \.base-table-wrapper \.table-responsive,[\s\S]*?padding-inline:\s*0;/)
})

test('MQTT monitor cards separate labels from values and use compact header actions', () => {
  const monitor = read('src/views/SystemMonitor.vue')
  const styles = read('src/assets/styles/pages/system-monitor.scss')

  assert.equal((monitor.match(/class="system-monitor__card-action"/g) || []).length, 3)
  assert.match(monitor, /<b-row class="mqtt-stats-grid">/)
  assert.match(styles, /\.mqtt-stats-grid > \[class\*='col-'\]\s*\{[\s\S]*?display:\s*flex;/)
  assert.match(styles, /\.stats-item\s*\{[\s\S]*?display:\s*flex;[\s\S]*?justify-content:\s*space-between;[\s\S]*?gap:\s*var\(--space-md\);/)
  assert.match(styles, /\.stats-item strong\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums;/)
})
