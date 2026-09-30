import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('paired labels and values share a vertical center across detail layouts', () => {
  const sharedDetail = read('src/assets/styles/pages.scss')
  const hnModels = read('src/assets/styles/pages/hn-models.scss')
  const podModels = read('src/assets/styles/_pod-models.scss')
  const podDetail = read('src/assets/styles/pages/pod-detail.scss')
  const enrollmentDetail = read('src/assets/styles/pages/device-enrollments/enrollment-detail.scss')
  const claimWizard = read('src/assets/styles/pages/device-enrollments/claim-wizard.scss')
  const factoryRegistry = read('src/assets/styles/pages/device-enrollments/factory-registry.scss')
  const baseSwitch = read('src/components/base/BaseSwitch.vue')
  const formControls = read('src/assets/styles/_form-controls.scss')

  assert.match(sharedDetail, /\.detail-page \.card-style-b \.detail-row__label\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/)
  assert.match(hnModels, /\.model-detail-label\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/)
  assert.match(podModels, /\.model-detail-label\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/)
  assert.match(podDetail, /\.location-field\s*\{[\s\S]*?align-items:\s*center/)
  assert.match(enrollmentDetail, /\.detail-grid dt,[\s\S]*?\.detail-grid dd\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/)
  assert.match(claimWizard, /\.claim-detail-grid dt,[\s\S]*?\.claim-detail-grid dd\s*\{[\s\S]*?display:\s*flex[\s\S]*?align-items:\s*center/)
  assert.match(factoryRegistry, /\.repair-rekey-identity > div\s*\{[\s\S]*?align-items:\s*center/)
  assert.match(baseSwitch, /class="base-switch"/)
  assert.match(formControls, /\.base-switch\.custom-control,[\s\S]*?align-items:\s*center/)
})

test('booking date range reserves enough width to display complete native date values', () => {
  const styles = read('src/assets/styles/pages/pod-bookings.scss')

  assert.match(styles, /\.meeting-date-range\s*\{[\s\S]*grid-template-columns:\s*minmax\(155px, 1fr\)[\s\S]*min-width:\s*380px !important/)
  assert.match(styles, /@media \(width <= 767px\)[\s\S]*\.meeting-date-range\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/)
  assert.match(styles, /\.meeting-date-range__separator\s*\{[\s\S]*display:\s*none/)
})

test('MQTT stream controls wrap instead of forcing page-level horizontal scrolling', () => {
  const source = read('src/views/debug/MqttStream.vue') + read('src/assets/styles/pages/debug/mqtt-stream.scss')

  assert.match(source, /\.debug-mqtt-stream \.filter-row\s*{[\s\S]*?min-width:\s*0/)
  assert.match(source, /\.debug-mqtt-stream \.filter-left\s*{[\s\S]*?flex-wrap:\s*wrap/)
  assert.match(source, /\.debug-mqtt-stream \.filter-actions\s*{[\s\S]*?flex:\s*1 1 100%[\s\S]*?flex-wrap:\s*wrap/)
  assert.doesNotMatch(source, /min-width:\s*1320px/)
})

test('host detail uses a compact two-column flow without websocket diagnostics', () => {
  const source = read('src/views/HostDetail.vue') + read('src/assets/styles/pages/host-detail.scss')

  assert.match(source, /\.section-b:nth-child\(2\)[\s\S]*?grid-row:\s*1 \/ span 2[\s\S]*?align-self:\s*start/)
  assert.match(source, /\.section-b:nth-child\(3\)[\s\S]*?grid-row:\s*2/)
  assert.doesNotMatch(source, /ws-test-area|testWebSocketConnection|simulateStatusUpdate|checkBackendStatus/)
})

test('location filters use BaseSelect option text and addresses prefer region names', () => {
  const source = read('src/views/Locations.vue')
  const styles = read('src/assets/styles/pages/locations.scss')
  const detail = read('src/views/LocationDetail.vue')

  assert.doesNotMatch(source, /value:\s*[pcd]\.code,\s*\n\s*label:\s*[pcd]\.name/)
  assert.match(source, /\{ value:\s*p\.code, text:\s*p\.name \}/)
  assert.match(source, /locations\.filter\.province_placeholder/)
  assert.match(source, /:disabled="!query\.province"/)
  assert.match(source, /gpsFilterOptions[\s\S]*?value: '', text: this\.\$t\('locations\.filter\.gps_all'\)/)
  assert.match(source, /activeFilterOptions[\s\S]*?value: '', text: this\.\$t\('locations\.filter\.active_all'\)/)
  assert.match(source, /regionName\(location\.province_name, location\.province\)/)
  assert.match(source, /regionName\(location\.city_name, location\.city\)/)
  assert.match(source, /regionName\(location\.district_name, location\.district\)/)
  assert.match(source, /part !== values\[index - 1\]/)
  assert.match(detail, /regionName\(location\.province_name, location\.province\)/)
  assert.match(detail, /regionName\(location\.city_name, location\.city\)/)
  assert.match(detail, /regionName\(location\.district_name, location\.district\)/)
  assert.match(styles, /\.locations__filters\s*{[\s\S]*?display:\s*flex[\s\S]*?flex-wrap:\s*wrap/)
  assert.match(styles, /\.locations__filter-field\s*{[\s\S]*?min-width:\s*190px/)
  assert.doesNotMatch(styles, /\.locations__filters \.(form-group|form-control|custom-select|btn)/)
  assert.doesNotMatch(styles, /\.locations__filters form/)
})

test('dense page controls and long credential identifiers keep readable line breaks', () => {
  const dashboardStyles = read('src/assets/styles/_dashboard.scss')
  const credentials = read('src/views/debug/Credentials.vue') + read('src/assets/styles/pages/debug/credentials.scss')
  const hostDetail = read('src/views/HostDetail.vue')
  const nodeDetail = read('src/views/NodeDetail.vue')

  assert.match(dashboardStyles, /\.dashboard-widget__header\s*{[\s\S]*?flex-wrap:\s*wrap/)
  assert.match(dashboardStyles, /\.dashboard-widget__actions\s*{[\s\S]*?white-space:\s*nowrap/)
  assert.match(credentials, /::v-deep \.credential-id-cell,[\s\S]*?white-space:\s*nowrap/)
  assert.match(credentials, /::v-deep \.credential-id-cell\s*{[\s\S]*?min-width:\s*250px/)
  assert.match(credentials, /\.table-responsive \.actions-cell\s*\{[\s\S]*?position:\s*sticky[\s\S]*?right:\s*0[\s\S]*?background:\s*var\(--color-bg-card\)/)
  assert.match(credentials, /\.table-responsive thead \.actions-cell\s*\{[\s\S]*?z-index:\s*3[\s\S]*?background:\s*var\(--color-bg-thead\)/)
  assert.doesNotMatch(credentials, /thStyle:\s*{\s*minWidth:/)
  assert.doesNotMatch(hostDetail, />\(\{\{ getHeartbeatIntervalDesc/)
  assert.doesNotMatch(nodeDetail, />\(\{\{ getHeartbeatIntervalDesc/)
})

test('OTA task stages have distinct localized labels in every locale', () => {
  const source = read('src/views/OtaConsole.vue')
  const stageKeys = ['sent', 'downloading', 'flashing', 'canceling', 'canceled']
  const localeFiles = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']

  for (const key of stageKeys) {
    assert.match(source, new RegExp(`status_options\\.${key}`))
  }
  assert.doesNotMatch(source, /value: 'sent',[^\n]*status_options\.running/)
  assert.doesNotMatch(source, /value: 'canceling',[^\n]*status_options\.cancelled/)

  for (const locale of localeFiles) {
    const messages = JSON.parse(read(`src/locales/${locale}.json`))
    for (const key of stageKeys) {
      assert.equal(typeof messages.ota_console.status_options[key], 'string')
      assert.ok(messages.ota_console.status_options[key].trim())
    }
  }
})

test('MQTT client row actions are named keyboard buttons and offline clients cannot be disconnected', () => {
  const source = read('src/views/mqtt_server/Clients.vue')

  assert.match(source, /<base-action-button[\s\S]*?:aria-label="\$t\('mqtt_clients\.actions\.details'\)"[\s\S]*?@click="openDetail\(row\.item\)"/)
  assert.match(source, /<base-action-button[\s\S]*?:aria-label="\$t\('mqtt_clients\.actions\.kick'\)"[\s\S]*?:disabled="!row\.item\.connected"/)
  assert.doesNotMatch(source, /<span\s+v-if="canWrite"[\s\S]{0,300}@click="confirmDisconnect\(row\.item\)"/)
})

test('meeting settings table actions are keyboard buttons and lock while an action runs', () => {
  const source = read('src/views/PodBookingSettings.vue')

  assert.doesNotMatch(source, /<span[^>]*class="action-icon action-icon--text"/)
  assert.match(source, /:aria-label="\$t\('meeting\.enable_local'\)"/)
  assert.match(source, /:aria-label="\$t\('meeting\.test_connection'\)"/)
  assert.match(source, /:aria-label="\$t\('meeting\.sync_now'\)"/)
  assert.match(source, /:aria-label="\$t\('meeting\.verify'\)"/)
  assert.match(source, /:disabled="Boolean\(actionBusyKey\)"/)
})

test('system monitor routes open the matching tab and tab changes update the URL', () => {
  const source = read('src/views/SystemMonitor.vue')

  assert.match(source, /<b-tabs[^>]*v-model="activeTabIndex"[^>]*@input="handleTabChange"/)
  assert.match(source, /const MONITOR_TAB_PATHS = \['\/monitor\/health', '\/monitor\/metrics', '\/monitor\/mqtt'\]/)
  assert.match(source, /const index = MONITOR_TAB_PATHS\.indexOf\(path\)/)
  assert.match(source, /this\.\$router\.push\(path\)/)
  assert.match(source, /:variant="healthProgressVariant\(data\.item\.health\)"/)
  assert.match(source, /healthProgressVariant \(percentage\)[\s\S]*?percentage >= 90[\s\S]*?return 'success'/)
  assert.doesNotMatch(source, /getProgressColor/)
})

test('configured device-status chart labels are localized before rendering', () => {
  const source = read('src/views/DashboardRuntime.vue')

  assert.match(source, /configuredPointName\(moduleId, point, labels\[pointIndex\]\)/)
  for (const status of ['online', 'offline', 'maintenance', 'inactive']) {
    assert.match(source, new RegExp(`${status}: 'dashboard\\.chart\\.device_status\\.${status}'`))
  }
})
