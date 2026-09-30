import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')
const main = read('src/main.js')
const sprite = read('src/assets/icons/icons.svg')
const appIcon = read('src/components/AppIcon.vue')

test('all locales explain that manual device entry is exception-only', () => {
  const localeDir = path.join(projectRoot, 'src/locales')
  const localeFiles = fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))

  assert.equal(localeFiles.length, 8)
  for (const file of localeFiles) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    const notice = messages.device_enrollment?.manual_entry
    assert.ok(notice?.title, `${file} is missing manual entry title`)
    assert.ok(notice?.description, `${file} is missing manual entry description`)
    assert.ok(notice?.open_workbench, `${file} is missing workbench action`)
    assert.ok(notice?.action, `${file} is missing exception entry action`)
  }
})

test('enrollment detail distinguishes MQTT presence from accepted reports', () => {
  const api = read('src/api/deviceEnrollments.js')
  const detail = read('src/views/device-enrollments/EnrollmentDetail.vue')
  const localeDir = path.join(projectRoot, 'src/locales')

  assert.match(api, /device-enrollments\/\$\{uuid\}\/presence/)
  assert.match(detail, /fetchDeviceEnrollmentPresence/)
  assert.match(detail, /presence\.mqtt_connected/)
  assert.match(detail, /connectionLimited/)
  assert.match(detail, /v-if="canRematch"/)
  assert.match(detail, /\['claimed', 'claiming', 'revoked', 'retired', 'quarantined'\]\.includes/)
  assert.match(detail, /setInterval\(\(\) => this\.loadPresence\(\), 15000\)/)

  const list = read('src/views/device-enrollments/EnrollmentList.vue')
  assert.match(api, /device-enrollments\/presence\/batch/)
  assert.match(api, /enrollment_uuids: enrollmentUuids/)
  assert.match(list, /fetchDeviceEnrollmentPresences/)
  assert.match(list, /items\.map\(item => item\.uuid\)/)
  assert.match(list, /device_enrollment\.online_status/)
  assert.match(list, /connectionState/)
  assert.match(list, /device_enrollment\.report_status/)
  assert.match(list, /device_enrollment\.report_recent/)
  assert.match(list, /device_enrollment\.report_stale/)

  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const enrollment = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8')).device_enrollment
    for (const key of [
      'online_limited',
      'connection_unavailable',
      'host_record',
      'host_registered',
      'host_unregistered',
      'mqtt_connected_at',
      'last_processed_report',
      'connection_limited_help',
      'all_report_status',
      'report_status',
      'report_recent',
      'report_stale'
    ]) {
      assert.ok(enrollment?.[key], `${file} is missing ${key}`)
    }
  }
})

test('enrollment errors and risk actions have localized explanations', () => {
  const detail = read('src/views/device-enrollments/EnrollmentDetail.vue')
  const list = read('src/views/device-enrollments/EnrollmentList.vue')
  const localeDir = path.join(projectRoot, 'src/locales')
  const errorCodes = [
    'UNKNOWN_HOST_MODEL',
    'AMBIGUOUS_HOST_MODEL',
    'UNKNOWN_NODE_MODEL',
    'AMBIGUOUS_NODE_MODEL',
    'POD_MODEL_MISMATCH',
    'AMBIGUOUS_POD_MODEL',
    'SLOT_TEMPLATE_MISSING',
    'SLOT_CONFLICT',
    'TOPOLOGY_INCOMPLETE',
    'IDENTITY_CONFLICT',
    'TOPOLOGY_CHANGED',
    'FACTORY_REGISTRY_REVOKED',
    'REPAIR_REKEY_PENDING',
    'MANUAL_QUARANTINE',
    'MANUAL_REVOKE'
  ]

  assert.match(detail, /enrollmentErrorLabel\(enrollment\.error_code\)/)
  assert.match(detail, /device_enrollment\.error_detail/)
  assert.match(detail, /device_enrollment\.risk_actions_help/)
  assert.match(detail, /quarantine_warning/)
  assert.match(detail, /release_warning/)
  assert.match(detail, /revoke_warning/)
  assert.match(detail, /v-if="canQuarantine"/)
  assert.match(detail, /v-if="canRelease"/)
  assert.match(detail, /v-if="canRevoke"/)
  assert.match(detail, /\['claimed', 'retired', 'revoked', 'quarantined'\]\.includes/)
  assert.match(detail, /canRevoke \(\) \{ return this\.enrollment\?\.state !== 'revoked' \}/)
  assert.match(detail, /FACTORY_REGISTRY_REVOKED:\s*'revoked_factory_help'/)
  assert.match(detail, /name: 'DeviceFactoryRegistry'/)
  assert.doesNotMatch(detail, /v-if="enrollment\.state !== 'quarantined'"/)
  assert.match(list, /enrollmentErrorLabel\(data\.item\.error_code\)/)

  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const enrollment = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8')).device_enrollment
    for (const key of [
      'risk_actions_help',
      'quarantine_warning',
      'release_warning',
      'revoke_warning',
      'revoked_help',
      'revoked_factory_help',
      'revoked_manual_help',
      'revoked_rekey_help',
      'open_factory_registry',
      'error_detail',
      'error_fallback'
    ]) {
      assert.ok(enrollment?.[key], `${file} is missing ${key}`)
    }
    for (const code of errorCodes) {
      assert.ok(enrollment?.error_messages?.[code], `${file} is missing ${code}`)
    }
  }
})

test('all legacy manual device pages display the enrollment notice', () => {
  for (const view of ['Hosts.vue', 'Nodes.vue', 'Pods.vue', 'HostNodeBinding.vue']) {
    const source = read(`src/views/${view}`)
    assert.match(source, /<manual-device-entry-notice\s*\/>/)
    assert.match(source, /ManualDeviceEntryNotice/)
  }
})

test('host and node manual creation is labeled as exception entry and platform-gated', () => {
  for (const view of ['Hosts.vue', 'Nodes.vue']) {
    const source = read(`src/views/${view}`)
    assert.match(source, /permissionCapabilities:\s*\{\s*create:\s*PERMISSION\.PLATFORM_DEVICE_MANAGE/)
    assert.match(source, /canCreate\s*\(\)\s*\{[\s\S]*?hasPermission\(PERMISSION\.PLATFORM_DEVICE_MANAGE, this\.permissionUser\)/)
    assert.match(source, /\$t\('device_enrollment\.manual_entry\.action'\)/)
    assert.match(source, /:title="\$t\('device_enrollment\.manual_entry\.action'\)"/)
    assert.match(source, /:ok-title="\$t\('device_enrollment\.manual_entry\.action'\)"/)
    assert.match(source, /\$t\('device_enrollment\.manual_entry\.description'\)/)
  }
})

test('claim wizard recovers lost success responses and topology changes', () => {
  const source = read('src/views/device-enrollments/ClaimWizard.vue')

  assert.match(source, /fetchDeviceEnrollment/)
  assert.match(source, /latest\.state === 'claimed'/)
  assert.match(source, /errorCode === 'TOPOLOGY_CHANGED'/)
  assert.match(source, /this\.step = 2/)
  assert.match(source, /this\.\$emit\('refresh'/)
})

test('claim wizard uses participating companies without forcing every legacy tier', () => {
  const source = read('src/views/device-enrollments/ClaimWizard.vue')
  const localeDir = path.join(projectRoot, 'src/locales')
  const localeFiles = fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))

  assert.match(source, /companyOptions\('is_pod_manufacturer'\)/)
  assert.match(source, /companyOptions\('is_brand'\)/)
  assert.match(source, /companyOptions\('is_channel_partner'\)/)
  assert.match(source, /companyOptions\('is_enduser'\)/)
  assert.match(source, /channel_partner_id: this\.form\.channel_partner_id \|\| null/)
  assert.doesNotMatch(source, /:disabled="!form\.(manufacturer_id|brand_id|channel_partner_id)"/)
  assert.doesNotMatch(source, /clearInvalidCompanyPath/)
  assert.doesNotMatch(source, /parent_com_id|form\.distributor_id|form\.agent_id|is_manufacturer|is_distributor|is_agent/)
  for (const file of localeFiles) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    assert.ok(messages.device_enrollment?.claim?.channel_partner, `${file} is missing the channel partner claim label`)
  }
})

test('claim wizard exposes a failed preflight instead of leaving the next action silent', () => {
  const source = read('src/views/device-enrollments/ClaimWizard.vue')

  assert.match(source, /this\.preflight\.errors \|\| \[\]/)
  assert.match(source, /item\.message \|\| item\.error/)
  assert.match(source, /this\.claimError = details \|\| this\.\$t\('device_enrollment\.claim\.preflight_failed'\)/)
  assert.match(source, /this\.\$uiToast\.error\(this\.claimError\)/)
})

test('device enrollment views register every non-global base component they render', () => {
  const views = [
    'ClaimWizard.vue',
    'EnrollmentDetail.vue',
    'EnrollmentList.vue',
    'FactoryRegistry.vue',
    'OnboardingWorkbench.vue'
  ]

  for (const view of views) {
    const source = read(`src/views/device-enrollments/${view}`)
    const tags = [...source.matchAll(/<base-([a-z-]+)/g)]
      .map(match => `Base${match[1].split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')}`)
    for (const component of new Set(tags)) {
      if (main.includes(`Vue.component('${component}', ${component})`)) continue
      assert.match(source, new RegExp(`import ${component} from '@\\/components\\/base\\/${component}\\.vue'`), `${view} must import ${component}`)
      assert.match(source, new RegExp(`components: \\{[^}]*\\b${component}\\b[^}]*\\}`), `${view} must register ${component}`)
    }
  }
})

test('factory manifest closes the production enrollment setup loop', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const api = read('src/api/deviceEnrollments.js')
  const sidebar = read('src/components/Sidebar.vue')

  assert.match(source, /fetchFactoryRegistryReadiness/)
  assert.match(source, /bulkCreateFactoryRegistry/)
  assert.match(source, /result\.errors/)
  assert.match(api, /device-factory-registry\/readiness/)
  assert.match(source, /activationCompleted \(item\)/)
  assert.match(source, /expected_efuse_chip_id/)
  assert.match(source, /device_pubkey/)
  assert.match(source, /item\.attestation_ready/)
  assert.match(source, /factory_registry\.reactivation_required/)
  assert.match(source, /readiness\.mqtt_attestation_enabled/)
  assert.match(source, /readiness\.bootstrap_master_secret_configured/)
  assert.doesNotMatch(api, /rotate-bootstrap-secret/)
  assert.doesNotMatch(source, /trust_mode|form\.bootstrap_secret|data\.bootstrap_secret|['"]bootstrap_secret['"]|expected_hardware_uid|v2_ready/)
  assert.match(sidebar, /\/devices\/factory-registry/)
  assert.match(sprite, /id="icon-clipboard-check"/)
  assert.match(sprite, /id="icon-shield-check"/)
})

test('factory manifest exposes the audited same-device repair rekey workflow', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const api = read('src/api/deviceEnrollments.js')
  const localeDir = path.join(projectRoot, 'src/locales')

  assert.match(api, /device-factory-registry\/\$\{uuid\}\/confirm-repair-rekey/)
  assert.match(source, /confirmFactoryRegistryRepairRekey/)
  assert.match(source, /repairRekeyItem\.enrollment_lock_version/)
  assert.match(source, /expected_lock_version:\s*this\.repairRekeyItem\.enrollment_lock_version/)
  assert.match(source, /repairRekeyForm\.device_offline_confirmed/)
  assert.match(source, /factory_registry\.repair_rekey_warning/)
  assert.match(source, /factory_registry\.repair_rekey_public_key_help/)
  assert.match(source, /result\.new_public_key_sha256\.slice\(0, 12\)/)
  assert.doesNotMatch(source, /private_key|privateKey/)

  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const registry = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8')).factory_registry
    for (const key of [
      'repair_rekey',
      'repair_rekey_title',
      'repair_rekey_warning_title',
      'repair_rekey_warning',
      'new_device_pubkey',
      'repair_rekey_public_key_help',
      'repair_reason',
      'repair_rekey_offline_confirm',
      'confirm_repair_rekey',
      'repair_rekey_success',
      'repair_rekey_failed'
    ]) {
      assert.ok(registry?.[key], `${file} is missing ${key}`)
    }
  }
})

test('factory manifest atomically recovers only unactivated registry records', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const api = read('src/api/deviceEnrollments.js')
  const localeDir = path.join(projectRoot, 'src/locales')

  assert.match(api, /device-factory-registry\/\$\{uuid\}\/recover-unactivated/)
  assert.match(source, /v-else-if="!data\.item\.enrollment_uuid"/)
  assert.match(source, /recoverUnactivatedFactoryRegistry/)
  assert.match(source, /expected_current_factory_batch_id:\s*this\.recoveryItem\.factory_batch_id/)
  assert.match(source, /expected_current_host_model_id:\s*this\.recoveryItem\.expected_host_model_id/)
  assert.match(source, /expected_public_key_sha256\.toLowerCase\(\)/)
  assert.match(source, /recoveryForm\.bootstrap_material_confirmed/)
  assert.doesNotMatch(source, /recoveryForm\.(?:bootstrap_secret|private_key)/)

  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const registry = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8')).factory_registry
    for (const key of [
      'recover_unactivated',
      'recover_unactivated_title',
      'recover_unactivated_warning_title',
      'recover_unactivated_warning',
      'expected_public_key_sha256',
      'expected_public_key_sha256_help',
      'recovery_reason',
      'bootstrap_material_confirmed',
      'confirm_recovery',
      'recover_unactivated_success',
      'recover_unactivated_failed'
    ]) {
      assert.ok(registry?.[key], `${file} is missing ${key}`)
    }
  }
})

test('device onboarding presents one compact workbench while preserving permission routes', () => {
  const workbench = read('src/views/device-enrollments/OnboardingWorkbench.vue')
  const routes = read('src/router/index.js')
  const sidebar = read('src/components/Sidebar.vue')

  assert.doesNotMatch(workbench, /device_onboarding\.steps\./)
  assert.doesNotMatch(workbench, /device-onboarding__guide/)
  assert.match(workbench, /<device-enrollment-list v-if=/)
  assert.match(workbench, /<device-factory-registry v-else/)
  assert.match(routes, /DeviceEnrollments[^\n]+DeviceOnboardingWorkbench/)
  assert.match(routes, /DeviceFactoryRegistry[^\n]+DeviceOnboardingWorkbench/)
  assert.match(sidebar, /canSeeOnboarding/)
  assert.match(sidebar, /isOnboardingActive/)
  assert.equal((sidebar.match(/device_onboarding\.title/g) || []).length, 3)
})

test('device onboarding tabs follow the register then claim lifecycle', () => {
  const workbench = read('src/views/device-enrollments/OnboardingWorkbench.vue')
  const registeredTab = workbench.indexOf("device_onboarding.tabs.registered')")
  const pendingTab = workbench.indexOf("device_onboarding.tabs.pending')")

  assert.ok(registeredTab >= 0)
  assert.ok(pendingTab >= 0)
  assert.ok(registeredTab < pendingTab)
})

test('device enrollment summary icons are available in the application sprite', () => {
  const source = read('src/views/device-enrollments/EnrollmentList.vue')
  const symbolNames = new Set([...sprite.matchAll(/<symbol\s+id="icon-([^"]+)"/g)].map(match => match[1]))
  const aliases = new Map([...appIcon.matchAll(/^\s*['"]?([a-z0-9-]+)['"]?:\s*['"]([a-z0-9-]+)['"]/gmi)].map(match => [match[1], match[2]]))
  const summaryIcons = [...source.matchAll(/icon:\s*'([^']+)'/g)].map(match => match[1])

  assert.ok(summaryIcons.length > 0)
  for (const icon of summaryIcons) {
    assert.ok(symbolNames.has(aliases.get(icon) || icon), `missing summary icon: ${icon}`)
  }
})

test('identity conflicts can invoke the audited atomic host replacement workflow', () => {
  const api = read('src/api/deviceEnrollments.js')
  const detail = read('src/views/device-enrollments/EnrollmentDetail.vue')

  assert.match(api, /\/confirm-replacement/)
  assert.match(detail, /error_code === 'IDENTITY_CONFLICT'/)
  assert.match(detail, /expected_topology_hash:\s*this\.enrollment\.topology_hash/)
  assert.match(detail, /expected_lock_version:\s*this\.enrollment\.lock_version/)
  assert.match(detail, /isPlatformAdmin\(this\.currentUser\)/)
})

test('factory manifest submits only the current public-attestation contract', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const api = read('src/api/deviceEnrollments.js')

  assert.match(source, /filter\(item => item\.is_pod_manufacturer\)/)
  assert.doesNotMatch(source, /filter\(item => item\.is_manufacturer\)/)
  assert.match(source, /delete data\.manufacturer_id/)
  assert.match(source, /data\.expected_host_model_id = Number\(data\.expected_host_model_id\)/)
  assert.doesNotMatch(source, /form\.bootstrap_secret|data\.bootstrap_secret|['"]bootstrap_secret['"]|expected_hardware_uid|trust_mode/)
  assert.match(source, /copyText\(this\.bootstrapDelivery\.bootstrap_password\)/)
  assert.doesNotMatch(source, /navigator\.clipboard/)
  assert.doesNotMatch(api, /rotateFactoryRegistryBootstrapSecret|rotate-bootstrap-secret/)
})

test('factory manifest labels bootstrap schemes and avoids repeated shared passwords in CSV', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const localeDir = path.join(projectRoot, 'src/locales')

  assert.match(source, /bootstrapDelivery\?\.bootstrap_scheme === 'product-shared-v1'/)
  assert.match(source, /bootstrapSchemeLabel\(data\.item\.bootstrap_scheme\)/)
  assert.match(source, /perDevice = result\.created\.filter\(item => item\.bootstrap_scheme !== 'product-shared-v1'\)/)
  assert.match(source, /shared = result\.created\.filter\(item => item\.bootstrap_scheme === 'product-shared-v1'\)/)
  assert.match(source, /if \(shared\.length\) \{[\s\S]*?this\.showBootstrapDelivery = true/)
  for (const file of ['zh-CN.json', 'zh-TW.json', 'en-US.json', 'de-DE.json', 'ja-JP.json', 'fr-FR.json', 'es-ES.json', 'ko-KR.json']) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8')).factory_registry
    for (const key of ['bootstrap_scheme_shared', 'bootstrap_scheme_efuse', 'bootstrap_help_shared', 'bootstrap_help_efuse', 'shared_device_count']) {
      assert.ok(messages[key], `${file} missing ${key}`)
    }
  }
})

test('factory manifest selects the hardware line used by factory batches', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const localeDir = path.join(projectRoot, 'src/locales')

  assert.match(source, /factory_registry\.host_model_option/)
  for (const field of ['model_code', 'hw_version', 'model_name']) {
    assert.match(source, new RegExp(`item\\.${field}`))
  }
  assert.match(source, /fetchHnModelHardwareLines/)
  assert.doesNotMatch(source, /item\.od_ver|item\.sw_ver/)
  assert.match(source, /value: item\.id/)

  assert.ok(fs.readdirSync(localeDir).some(name => name.endsWith('.json')))
})

test('factory manifest CSV template has localized labels and a compatible machine header', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const csvFields = [
    'serial', 'factory_batch_id', 'expected_host_model_id', 'production_date',
    'expected_mac_address', 'expected_efuse_chip_id', 'expected_vendor_id',
    'expected_product_code', 'device_pubkey'
  ]

  for (const field of csvFields) {
    assert.match(source, new RegExp(`${field}: 'factory_registry\\.`))
  }
  assert.match(source, /const localizedLabels = CSV_FIELDS\.map\(field => this\.\$t\(CSV_LABEL_KEYS\[field\]\)\)/)
  assert.match(source, /`\$\{csvRow\(localizedLabels\)\}\\n\$\{csvRow\(CSV_FIELDS\)\}\\n`/)
  assert.match(source, /rows\.findIndex\(row => CSV_REQUIRED_FIELDS\.every\(field => row\.includes\(field\)\)\)/)
  assert.match(source, /rows\.slice\(headerIndex \+ 1\)/)
  assert.doesNotMatch(source, /'manufacturer_id', 'expected_host_model_id'/)
  assert.doesNotMatch(source, /form\.bootstrap_secret|data\.bootstrap_secret|['"]bootstrap_secret['"]|expected_hardware_uid/)
})

test('factory manifest marks required fields and uses clearable text inputs', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue') + read('src/assets/styles/pages/device-enrollments/factory-registry.scss')

  assert.match(source, /<div class="registry-form-help">[\s\S]*?factory_registry\.form_help/)
  assert.match(source, /\.registry-form-help\s*{[\s\S]*?margin-bottom:\s*24px/)
  for (const field of ['serial', 'batch', 'manufacturer', 'host_model', 'mac', 'assembly', 'efuse_chip_id', 'device_pubkey']) {
    assert.match(source, new RegExp(`factory_registry\\.${field}[^>]+label-class="required-label"`))
  }
  for (const id of ['serial', 'mac', 'production-date', 'efuse-chip-id', 'vendor', 'product']) {
    assert.match(source, new RegExp(`<base-input id="registry-${id}"`))
  }
  assert.match(source, /<base-select id="registry-batch"/)
  assert.match(source, /<b-form-textarea id="registry-device-pubkey"[^>]+\srequired\s*\/>/)
  assert.match(source, /\.required-label::after\s*{[\s\S]*?content:\s*" \*"/)
})

test('factory manifest keeps editor actions in the fixed modal footer', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')

  assert.match(source, /<b-form id="factory-registry-editor-form" @submit\.prevent="submitForm">/)
  assert.match(source, /<template #modal-footer>/)
  assert.match(source, /type="submit" form="factory-registry-editor-form"/)
  assert.doesNotMatch(source, /size="xl" hide-footer/)
})

test('factory manifest action labels follow the global icon button contract', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')

  assert.match(source, /:title="\$t\('common\.edit'\)"[\s\S]*?<app-icon name="pencil"\s*\/><span>\{\{ \$t\('common\.edit'\) \}\}<\/span>/)
  assert.match(source, /class="action-overflow-menu"[\s\S]*?<b-dropdown-item-button v-if="data\.item\.is_active"[\s\S]*?factory_registry\.revoke/)
  assert.match(source, /<b-dropdown-item-button v-else[\s\S]*?factory_registry\.reactivate/)
})

test('factory manifest allocates stable proportional widths to content columns', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue') + read('src/assets/styles/pages/device-enrollments/factory-registry.scss')
  const expectedWidths = {
    identity: ['22%', '240px'],
    production: ['16%', '180px'],
    ownership: ['28%', '260px'],
    readiness: ['14%', '165px'],
    state: ['12%', '130px']
  }

  for (const [key, [width, minWidth]] of Object.entries(expectedWidths)) {
    assert.match(source, new RegExp(`key: '${key}'[^\\n]+width: '${width.replace('%', '\\%')}'[^\\n]+minWidth: '${minWidth}'`))
  }
  assert.match(source, /key: 'actions'[^\n]+class: 'actions-cell', thClass: 'actions-cell'/)
  assert.match(source, /\.identity-uid\s*{[\s\S]*?max-width:\s*100%/)
})

test('production manifest presents only the current enrollment flow', () => {
  const source = read('src/views/device-enrollments/FactoryRegistry.vue')
  const interactionStyles = read('src/assets/styles/_interaction.scss')
  assert.doesNotMatch(source, /configured_v1_batch_count|ready_v1_registry_count/)
  assert.doesNotMatch(source, /data\.item\.v1_ready|>V1\s/)
  assert.doesNotMatch(source, /factory_registry\.(?:v1_batches|v1_ready_count|blocker_batch)/)
  assert.doesNotMatch(source, /legacy_mode|legacy_help|rotate_secret|form\.bootstrap_secret|data\.bootstrap_secret|['"]bootstrap_secret['"]/)
  assert.doesNotMatch(source, /readinessCards|factory-registry__stats/)
  assert.match(source, /v-if="readinessBlockers\.length"/)
  assert.doesNotMatch(source, /<base-button type="submit"[^>]*>[\s\S]*?common\.search/)
  assert.match(source, /<template #footer>[\s\S]*?<base-pagination v-if="total > 0"/)
  assert.doesNotMatch(interactionStyles, /\.interaction-list-card-shell \.pager-right\s*{[\s\S]*?justify-content:\s*space-between/)
})

test('all locales contain production manifest safety guidance', () => {
  const localeDir = path.join(projectRoot, 'src/locales')
  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    assert.ok(messages.factory_registry_current?.form_help, `${file} missing enrollment guidance`)
    assert.ok(messages.factory_registry?.errors?.MAC_REQUIRED, `${file} missing readiness errors`)
    assert.ok(messages.factory_registry?.errors?.EFUSE_CHIP_ID_REQUIRED, `${file} missing eFuse readiness error`)
    assert.ok(messages.factory_registry?.errors?.DEVICE_PUBLIC_KEY_REQUIRED, `${file} missing public-key readiness error`)
    assert.ok(messages.factory_registry?.errors?.MODEL_MANUFACTURER_INVALID, `${file} missing model manufacturer readiness error`)
    assert.ok(messages.factory_registry?.activated, `${file} missing activated readiness label`)
    assert.ok(messages.factory_registry?.reactivation_required, `${file} missing reactivation guidance`)
    assert.ok(messages.factory_registry?.attestation_ready, `${file} missing attestation readiness label`)
    assert.ok(messages.factory_registry?.attestation_help, `${file} missing attestation guidance`)
    assert.ok(messages.factory_registry?.blocker_attestation, `${file} missing attestation blocker`)
    assert.ok(messages.factory_registry?.blocker_bootstrap_secret, `${file} missing bootstrap-secret blocker`)
    assert.ok(messages.factory_registry?.efuse_chip_id, `${file} missing eFuse identity label`)
    assert.ok(messages.factory_registry?.device_pubkey, `${file} missing device public key label`)
  }
})

test('factory station administration is scoped, one-time, and localized', () => {
  const api = read('src/api/deviceEnrollments.js')
  const registry = read('src/views/device-enrollments/FactoryRegistry.vue')
  const panel = read('src/views/device-enrollments/FactoryStationsPanel.vue')
  const permissions = read('src/utils/permission.js')

  assert.match(api, /http\.get\('\/factory-stations'\)/)
  assert.match(api, /http\.post\('\/factory-stations', data\)/)
  assert.match(api, /factory-stations\/\$\{uuid\}\/revoke/)
  assert.match(registry, /v-if="canManageFactoryStations"/)
  assert.match(permissions, /FACTORY_STATION_MANAGE: 'platform\.factory_station\.manage'/)
  assert.match(panel, /tokenRecord\.station_token/)
  assert.match(panel, /factory_stations\.token_help/)
  assert.doesNotMatch(panel, /localStorage|sessionStorage/)

  const localeDir = path.join(projectRoot, 'src/locales')
  for (const file of fs.readdirSync(localeDir).filter(name => name.endsWith('.json'))) {
    const messages = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'))
    assert.ok(messages.factory_stations?.title, `${file} missing station title`)
    assert.ok(messages.factory_stations?.scope_help, `${file} missing station scope guidance`)
    assert.ok(messages.factory_stations?.token_help, `${file} missing one-time token guidance`)
    assert.ok(messages.factory_stations?.revoke_confirm, `${file} missing station revocation guidance`)
  }
})

test('enrollment workflow keeps long identities and controls usable on narrow screens', () => {
  const detail = read('src/views/device-enrollments/EnrollmentDetail.vue') + read('src/assets/styles/pages/device-enrollments/enrollment-detail.scss')
  const wizard = read('src/views/device-enrollments/ClaimWizard.vue') + read('src/assets/styles/pages/device-enrollments/claim-wizard.scss')
  const registry = read('src/views/device-enrollments/FactoryRegistry.vue') + read('src/assets/styles/pages/device-enrollments/factory-registry.scss')

  assert.match(detail, /detail-uuid/)
  assert.match(detail, /overflow-wrap:\s*anywhere/)
  assert.match(wizard, /@media \(width <= 575px\)/)
  assert.match(wizard, /\.claim-steps\s*{[\s\S]*?grid-template-columns:\s*1fr/)
  assert.match(wizard, /\.claim-footer\s*{[\s\S]*?flex-wrap:\s*wrap/)
  assert.match(registry, /\.registry-search\s*{[\s\S]*?max-width:\s*320px/)
})
