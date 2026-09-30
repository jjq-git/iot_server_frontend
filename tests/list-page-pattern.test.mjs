import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = path.resolve('.')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

test('representative resource lists use one shared list-page container', () => {
  for (const view of ['Hosts.vue', 'Nodes.vue', 'Users.vue']) {
    const source = read(`src/views/${view}`)
    assert.match(source, /<list-page-card\b/)
    assert.doesNotMatch(source, /<page-section-card\b[^>]*class="search_card"/)
    assert.match(source, /class="action-overflow-menu"/)
  }

  const component = read('src/components/shared/ListPageCard.vue')
  assert.match(component, /<slot name="filters"/)
  assert.match(component, /class="list-page-card__table"/)
  assert.match(component, /class="list-page-card__footer"/)
})

test('all catalogued resource lists use the shared list-page container', () => {
  const resourceLists = [
    'src/components/file/FileListSection.vue',
    'src/components/hn-model/HnModelListSection.vue',
    'src/components/pod-model/PodModelListSection.vue',
    'src/views/ApiKeys.vue',
    'src/views/AuditLogs.vue',
    'src/views/Companies.vue',
    'src/views/FirmwareManager.vue',
    'src/views/Hosts.vue',
    'src/views/Locations.vue',
    'src/views/Nodes.vue',
    'src/views/Notifications.vue',
    'src/views/OtaConsole.vue',
    'src/views/PodBookings.vue',
    'src/views/Pods.vue',
    'src/views/Users.vue',
    'src/views/debug/Credentials.vue',
    'src/views/debug/Devices.vue',
    'src/views/debug/EmcyLogs.vue',
    'src/views/debug/SerialLogs.vue',
    'src/views/device-enrollments/EnrollmentList.vue',
    'src/views/device-enrollments/FactoryRegistry.vue',
    'src/views/mqtt_server/Clients.vue',
    'src/views/mqtt_server/Subscriptions.vue',
    'src/views/mqtt_server/Topics.vue'
  ]

  for (const file of resourceLists) {
    assert.match(read(file), /<list-page-card\b/, file)
  }

  for (const workbench of [
    'src/views/ControllerWebConsole.vue',
    'src/views/OdManager.vue',
    'src/views/debug/DeviceControl.vue',
    'src/views/debug/MqttStream.vue',
    'src/views/debug/SensorHistory.vue'
  ]) {
    assert.match(read(workbench), /<page-section-card\b[^>]*class="[^"]*filter-card/, workbench)
    assert.doesNotMatch(read(workbench), /search_card/, workbench)
  }
})

test('resource rows with secondary actions use the shared overflow menu', () => {
  for (const file of [
    'src/components/file/FileListSection.vue',
    'src/components/hn-model/HnModelListSection.vue',
    'src/components/pod-model/PodModelListSection.vue',
    'src/views/ApiKeys.vue',
    'src/views/Hosts.vue',
    'src/views/Locations.vue',
    'src/views/Nodes.vue',
    'src/views/PodBookings.vue',
    'src/views/Pods.vue',
    'src/views/Users.vue',
    'src/views/debug/Devices.vue',
    'src/views/device-enrollments/FactoryRegistry.vue'
  ]) {
    const source = read(file)
    assert.match(source, /class="action-overflow-menu"/, file)
    assert.match(source, /toggle-class="action-overflow-menu__toggle"/, file)
    assert.match(source, /<b-dropdown-item-button\b/, file)
  }
})

test('list filter actions do not add utility margins that break vertical alignment', () => {
  const source = read('src/components/file/FileListSection.vue')

  assert.doesNotMatch(source, /<base-button[^>]*class="[^"]*mb-/)
})

test('shared filters keep actions in the natural flow at medium widths', () => {
  const styles = read('src/assets/styles/_interaction.scss')

  assert.match(styles, /@media \(width >= 769px\) and \(width <= 1200px\)/)
  assert.match(styles, /\.filter-left\s*\{[\s\S]*?display:\s*grid !important[\s\S]*?grid-template-columns:\s*repeat\(auto-fit, minmax\(160px, 1fr\)\)/)
  assert.match(styles, /\.filter-control--date\s*\{[\s\S]*?width:\s*100% !important[\s\S]*?min-width:\s*0 !important/)
  assert.match(styles, /\.filter-actions\s*\{[\s\S]*?justify-content:\s*flex-start[\s\S]*?margin-left:\s*0 !important/)
})

test('file manager does not override the shared pagination treatment', () => {
  const styles = read('src/assets/styles/pages/file-manager.scss')

  assert.doesNotMatch(styles, /\.pagination\s+\.page-item/)
  assert.doesNotMatch(styles, /\.files__pager/)
})

test('location list keeps its labelled filter actions in the shared action group', () => {
  const source = read('src/views/Locations.vue')

  assert.match(source, /class="filter-actions locations__filter-actions"/)
  assert.match(source, /variant="outline-secondary" @click="resetFilters"/)
})

test('disclosure columns have a visible and accessible header cue', () => {
  const podSource = read('src/views/Pods.vue')
  const debugSource = read('src/views/debug/Devices.vue')

  assert.match(podSource, /#head\(show_details\)/)
  assert.match(podSource, /class="table-disclosure-heading"/)
  assert.match(podSource, /label: this\.\$t\('common\.expand'\)/)
  assert.match(debugSource, /#head\(expand\)/)
  assert.match(debugSource, /label: this\.\$t\('debug_devices\.actions\.expand'\)/)
})

test('debug device query uses the primary action treatment', () => {
  const source = read('src/views/debug/Devices.vue')

  assert.match(source, /<base-button size="sm" variant="primary" @click="handleSearch">/)
  assert.match(source, /<base-button size="sm" variant="outline-secondary" @click="reload">/)
})

test('production styles expose and consume the canonical list density tokens', () => {
  const variables = read('src/assets/styles/_theme-vars.scss')
  const styles = read('src/assets/styles/_interaction.scss')

  for (const token of [
    '--list-header-min-height',
    '--list-filter-min-height',
    '--list-content-padding',
    '--list-control-height',
    '--table-action-size',
    '--list-table-header-height',
    '--list-table-row-height',
    '--list-footer-min-height'
  ]) {
    assert.match(variables, new RegExp(`${token}:`))
    assert.match(styles, new RegExp(`var\\(${token}\\)`))
  }
})

test('list table surfaces span the card while edge cells align with surrounding content', () => {
  const styles = read('src/assets/styles/_interaction.scss')
  const columnVisibility = read('src/components/ColumnVisibility.vue')

  assert.match(styles, /\.base-table-wrapper \.table thead th\s*\{[\s\S]*?height:\s*var\(--list-table-header-height\)[\s\S]*?padding:\s*8px 16px/)
  assert.match(columnVisibility, /\.column-toggle-button\s*\{[\s\S]*?width:\s*var\(--table-action-size\)[\s\S]*?height:\s*var\(--table-action-size\)/)
  assert.match(styles, /\.list-page-card__table > \.base-table-wrapper > \.table-responsive,[\s\S]*?padding:\s*0/)
  assert.match(styles, /\.list-page-card__table > \.base-table-wrapper > \.table-responsive > \.table th:first-child,[\s\S]*?padding-left:\s*var\(--list-content-padding\)/)
  assert.match(styles, /\.list-page-card__table > \.base-table-wrapper > \.table-responsive > \.table th:last-child,[\s\S]*?padding-right:\s*var\(--list-content-padding\)/)
  assert.match(styles, /@media \(width <= 768px\)[\s\S]*?\.list-page-card__table > \.base-table-wrapper > \.table-responsive,[\s\S]*?padding-inline:\s*0/)
})

test('list load errors stay attached to the table instead of opening a visual gap', () => {
  const styles = read('src/assets/styles/_interaction.scss')

  assert.match(styles, /\.list-page-card__table > \.base-table-wrapper > \.base-table-load-error\s*\{[\s\S]*?margin:\s*0/)
  assert.match(styles, /\.list-page-card__table > \.base-table-wrapper > \.base-table-load-error\s*\{[\s\S]*?border-radius:\s*var\(--radius-surface\)/)
  assert.match(styles, /\.base-table-load-error-message\s*\{[\s\S]*?text-overflow:\s*ellipsis/)
})

test('list range and pagination accessibility copy exists in all locales', () => {
  const localeDirectory = path.join(projectRoot, 'src/locales')
  const localeFiles = fs.readdirSync(localeDirectory).filter(file => file.endsWith('.json'))
  assert.equal(localeFiles.length, 8)

  for (const file of localeFiles) {
    const locale = JSON.parse(fs.readFileSync(path.join(localeDirectory, file), 'utf8'))
    assert.equal(typeof locale.common.pagination_range, 'string', file)
    assert.equal(typeof locale.base_pagination.previous_page, 'string', file)
    assert.equal(typeof locale.base_pagination.next_page, 'string', file)
  }
})

test('breadcrumbs derive leaf labels from route metadata', () => {
  const source = read('src/components/AppBreadcrumb.vue')
  assert.match(source, /matchedRoute\.meta && matchedRoute\.meta\.title/)
  assert.match(source, /routeMatchesPath/)
  assert.doesNotMatch(source, /const pageMap/)
})
