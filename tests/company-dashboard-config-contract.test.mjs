import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('company dashboard config uses the renamed API and routes', async () => {
  const [apiSource, routerSource, permissionSource] = await Promise.all([
    read('src/api/company-dashboard-config.js'),
    read('src/router/index.js'),
    read('src/utils/permission.js')
  ])

  assert.match(apiSource, /BASE_URL = '\/company-dashboard-config'/)
  assert.match(apiSource, /\/validate/)
  assert.match(apiSource, /\/preview-data/)
  assert.doesNotMatch(apiSource, /submit|rollback|versions|toggle/)
  assert.match(routerSource, /org\/company-dashboard-config/)
  assert.match(routerSource, /name: 'CompanyDashboardConfigEdit'/)
  assert.match(permissionSource, /COMPANY_DASHBOARD_CONFIG_MANAGE: 'platform\.permission\.manage'/)
  await assert.rejects(access(new URL('src/api/company-templates.js', root)))
})

test('all locales expose the company dashboard config copy', async () => {
  const locales = ['zh-CN', 'zh-TW', 'en-US', 'de-DE', 'ja-JP', 'fr-FR', 'es-ES', 'ko-KR']
  for (const locale of locales) {
    const messages = JSON.parse(await read(`src/locales/${locale}.json`))
    assert.equal(typeof messages.company_dashboard_config.title, 'string')
    assert.equal(typeof messages.company_dashboard_config.fields.logo, 'string')
    assert.equal(typeof messages.company_dashboard_config.sections.advanced, 'string')
    assert.equal(typeof messages.company_dashboard_config.preview.title, 'string')
    assert.equal(typeof messages.company_dashboard_config.preview.sample, 'string')
    assert.equal(typeof messages.company_dashboard_config.select_unconfigured_company, 'string')
    assert.equal(typeof messages.company_dashboard_config.all_companies_configured, 'string')
    assert.equal(typeof messages.company_dashboard_config.font_options.default, 'string')
    assert.equal(typeof messages.company_dashboard_config.panel_names.stats_preview, 'string')
    assert.equal(typeof messages.company_dashboard_config.custom_page_editor_title, 'string')
    assert.equal(typeof messages.company_dashboard_config.apply_custom_page, 'string')
    assert.equal(typeof messages.company_dashboard_config.fields.panel_width, 'string')
    assert.equal(typeof messages.company_dashboard_config.messages.saved, 'string')
    assert.equal(typeof messages.company_dashboard_config.import_json, 'string')
    assert.equal(typeof messages.company_dashboard_config.export_json, 'string')
    assert.equal(typeof messages.company_dashboard_config.preview_data, 'string')
    assert.equal(typeof messages.company_dashboard_config.panel_names.device_online_rate_gauge, 'string')
    assert.equal(typeof messages.company_dashboard_config.panel_names.pod_environment_trend, 'string')
    assert.equal(typeof messages.company_dashboard_config.panel_names.pod_network_signal_trend, 'string')
    assert.equal(typeof messages.company_dashboard_config.panel_names.pod_desk_height_trend, 'string')
    assert.equal(typeof messages.dashboard.dynamic.series.temperature, 'string')
    assert.equal(typeof messages.dashboard.dynamic.series.fan_rpm, 'string')
    assert.equal(typeof messages.company_dashboard_config.chart_types.number, 'string')
    assert.equal(typeof messages.company_dashboard_config.chart_types.bar, 'string')
    const addedDashboardCopy = [
      messages.company_dashboard_config.panel_names.device_online_rate_gauge,
      messages.company_dashboard_config.panel_names.pod_usage_rate_gauge,
      messages.company_dashboard_config.messages.json_imported,
      messages.company_dashboard_config.messages.preview_ready,
      messages.company_dashboard_config.messages.unsupported_module,
      messages.company_dashboard_config.messages.unsupported_chart,
      messages.company_dashboard_config.messages.unsupported_field,
      messages.company_dashboard_config.messages.preview_query_failed,
      messages.company_dashboard_config.messages.json_too_large,
      messages.company_dashboard_config.messages.existing_configs_failed,
      messages.company_dashboard_config.messages.config_already_exists,
      messages.company_dashboard_config.messages.invalid_color,
      messages.company_dashboard_config.messages.invalid_url,
      messages.company_dashboard_config.messages.invalid_form,
      messages.company_dashboard_config.messages.deactivate_failed,
      messages.company_dashboard_config.messages.logo_type_invalid,
      messages.company_dashboard_config.messages.logo_too_large,
      messages.company_dashboard_config.logo_selected,
      messages.company_dashboard_config.import_json,
      messages.company_dashboard_config.export_json,
      messages.company_dashboard_config.preview_data,
      messages.company_dashboard_config.download_example,
      messages.dashboard.dynamic.current_value
    ]
    for (const copy of addedDashboardCopy) {
      assert.equal(typeof copy, 'string')
      assert.doesNotMatch(copy, /[?\uFFFD]/, `${locale} contains corrupted dashboard copy: ${copy}`)
    }
    assert.match(messages.company_dashboard_config.messages.deactivate_confirm, /\{company\}/)
    assert.equal(typeof messages.route.company_dashboard_config.title, 'string')
    assert.equal(typeof messages.breadcrumb.pages.org_company_dashboard_config, 'string')
    assert.equal(typeof messages.topbar.page_descriptions.company_dashboard_config, 'string')
  }
})

test('company dashboard editor presents guided brand and panel workflows without raw configuration fields', async () => {
  const editor = await read('src/views/company-dashboard-config/DashboardConfigEditor.vue')

  assert.match(editor, /company-dashboard-config-preview/)
  assert.match(editor, /type="color"/)
  assert.match(editor, /advancedOpen/)
  assert.match(editor, /PANEL_CATALOG/)
  assert.match(editor, /validateCompanyDashboardConfig/)
  assert.match(editor, /previewCompanyDashboardData/)
  assert.match(editor, /UNSUPPORTED_MODULE/)
  assert.match(editor, /UNSUPPORTED_CHART/)
  assert.match(editor, /UNSUPPORTED_FIELD/)
  assert.match(editor, /failedItems\.length/)
  assert.match(editor, /previewFailureMessage/)
  assert.match(editor, /schema_version: 1/)
  assert.match(editor, /module_key/)
  assert.match(editor, /company-dashboard-config-panel-editor/)
  assert.match(editor, /chartLabel\(panel\.chart\)/)
  assert.match(editor, /icon: 'speedometer2'/)
  assert.doesNotMatch(editor, /icon: 'speedometer'/)
  assert.match(editor, /URL\.createObjectURL\(file\)/)
  assert.match(editor, /loadStoredLogoPreview/)
  assert.doesNotMatch(editor, /openCustomPageEditor/)
  assert.doesNotMatch(editor, /customPageDraft/)
  assert.doesNotMatch(editor, /configure_custom_page/)
  assert.doesNotMatch(editor, /panelsJson/)
  assert.doesNotMatch(editor, /v-model="form\.(?:html_content|css_content|js_content)"/)
  assert.doesNotMatch(editor, /v-model(?:\.trim)?="form\.branding\.logo_file_id"/)
})

test('company dashboard editor guards unsaved brand and panel edits before leaving', async () => {
  const editor = await read('src/views/company-dashboard-config/DashboardConfigEditor.vue')

  assert.match(editor, /import unsavedGuard from '@\/mixins\/unsavedGuard'/)
  assert.match(editor, /mixins:\s*\[unsavedGuard\]/)
  assert.match(editor, /isFormDirty \(\)/)
  assert.doesNotMatch(editor, /this\.saving \|\| this\._savedSnapshot/)
  // 保存成功后必须刷新基线快照，否则保存后的跳转会误触未保存拦截
  assert.match(editor, /_savedSnapshot = this\._serializeEditableState\(\)[\s\S]*\$router\.replace/)
})

test('company dashboard editor prevents duplicate creation and defers logo upload until save', async () => {
  const editor = await read('src/views/company-dashboard-config/DashboardConfigEditor.vue')

  assert.match(editor, /existingCompanyIds/)
  assert.match(editor, /existingConfigsLoaded/)
  assert.match(editor, /fetchCompanyDashboardConfig\(this\.companyId\)/)
  assert.match(editor, /messages\.config_already_exists/)
  assert.match(editor, /pendingLogoFile = file/)
  assert.match(editor, /if \(this\.pendingLogoFile\)[\s\S]*uploadImage\(formData\)[\s\S]*upsertCompanyDashboardConfig/)
  assert.match(editor, /await deleteFile\(uploadedLogoId\)/)
  assert.match(editor, /fetchFileDetail\(fileId\)/)
  assert.equal((editor.match(/await this\.assertNoExistingConfig\(\)/g) || []).length, 2)
  assert.match(editor, /DASHBOARD_CONFIG_ALREADY_EXISTS/)
  assert.match(editor, /fetchAllPages\(fetchCompanies\)/)
  assert.match(editor, /fetchAllPages\(fetchCompanyDashboardConfigs\)/)
  assert.match(editor, /value: String\(company\.id\)/)
  assert.match(editor, /branding\[key\] === null \|\| branding\[key\] === undefined/)
})

test('company dashboard list exposes a persistent retry state and avoids page-local sorting', async () => {
  const list = await read('src/views/company-dashboard-config/DashboardConfigs.vue')

  assert.match(list, /:load-error="loadError"/)
  assert.match(list, /:show-empty="!loadError"/)
  assert.match(list, /:show-footer="!loadError"/)
  assert.match(list, /@retry="loadData"/)
  assert.match(list, /:disabled="deactivatingId !== null"/)
  assert.match(list, /messages\.deactivate_failed/)
  assert.doesNotMatch(list, /key: 'company_id'[^\n]*sortable: true/)
})

test('company dashboard editor has responsive panel and status layouts', async () => {
  const styles = await read('src/assets/styles/pages/company-dashboard-config.scss')

  assert.match(styles, /@media \(width <= 1199\.98px\)[\s\S]*company-dashboard-config-panel-editor/)
  assert.match(styles, /company-dashboard-config-status__control[\s\S]*flex-direction: column/)
  assert.match(styles, /company-dashboard-config-panel-editor__heading[\s\S]*flex-wrap: wrap/)
})

test('company dashboard editor blocks conflicting async actions and validates logo files', async () => {
  const editor = await read('src/views/company-dashboard-config/DashboardConfigEditor.vue')

  assert.match(editor, /<fieldset[^>]*:disabled="saving \|\| previewing"/)
  assert.match(editor, /:loading="previewing"/)
  assert.match(editor, /if \(this\.previewing \|\| !this\.companyId\) return/)
  assert.match(editor, /VALID_LOGO_TYPES\.includes\(file\.type\)/)
  assert.match(editor, /file\.size > MAX_LOGO_FILE_SIZE/)
  assert.match(editor, /companyOptionsError/)
  assert.match(editor, /retryCompanyOptions/)
})

test('renamed views do not reference removed template lifecycle fields', async () => {
  const sources = await Promise.all([
    read('src/views/company-dashboard-config/DashboardConfigs.vue'),
    read('src/views/company-dashboard-config/DashboardConfigDetail.vue'),
    read('src/views/company-dashboard-config/DashboardConfigEditor.vue')
  ])
  const source = sources.join('\n')
  for (const removed of ['template_type', 'is_enabled', 'submitForReview', 'rollbackToVersion']) {
    assert.equal(source.includes(removed), false, `removed lifecycle field remains: ${removed}`)
  }
})

test('company dashboard detail uses company identity and hides retired custom-page metadata', async () => {
  const [detail, list] = await Promise.all([
    read('src/views/company-dashboard-config/DashboardConfigDetail.vue'),
    read('src/views/company-dashboard-config/DashboardConfigs.vue')
  ])
  assert.match(detail, /fetchCompanyDetail/)
  assert.match(detail, /company\.company_name/)
  assert.match(detail, /chartLabel\(panel\.chart\)/)
  assert.match(detail, /name="arrow-left"/)
  assert.match(detail, /name="pencil"/)
  assert.doesNotMatch(detail, /branding\.company_name|hasCustomPage|fields\.custom_page/)
  assert.doesNotMatch(list, /cell\(custom_page\)|key: 'custom_page'/)
})

test('dashboard branding title is published to the application topbar', async () => {
  const [runtime, topbar] = await Promise.all([
    read('src/views/DashboardRuntime.vue'),
    read('src/components/Topbar.vue')
  ])
  assert.match(runtime, /effectiveDashboardConfig\.branding\?\.title/)
  assert.match(runtime, /\$emit\('page-title-updated'/)
  assert.match(topbar, /\$on\('page-title-updated'/)
  assert.match(topbar, /pageTitleOverride \|\| this\.pagePresentation\.title/)
})

test('dashboard gauges reserve the center for the value without repeating the panel title', async () => {
  const runtime = await read('src/views/DashboardRuntime.vue')
  assert.match(runtime, /title: \{ show: false \}/)
  assert.match(runtime, /startAngle: 90/)
  assert.match(runtime, /pointer: \{ show: false \}/)
  assert.match(runtime, /offsetCenter: \[0, 0\]/)
  assert.match(runtime, /if \(chartType === 'gauge'\) return \[\]/)
})
