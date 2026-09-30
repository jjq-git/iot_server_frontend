<template>
  <div class="company-dashboard-config-page company-dashboard-config-page--editor">
    <base-card class="company-dashboard-config-editor-card">
      <div class="company-dashboard-config-page__header">
        <div>
          <h4 class="mb-1">{{ pageTitle }}</h4>
          <p class="text-muted mb-0">{{ $t('company_dashboard_config.editor_description') }}</p>
        </div>
        <base-button variant="outline-secondary" :disabled="saving || previewing" @click="goBack">
          <app-icon name="arrow-left" class="mr-1" />
          {{ $t('common.back') }}
        </base-button>
      </div>

      <base-loading v-if="loading" />
      <base-alert v-else-if="loadError" variant="danger" class="company-dashboard-config-load-error" role="alert">
        <div>
          <strong>{{ $t('common.load_failed') }}</strong>
          <span>{{ loadError }}</span>
        </div>
        <div class="company-dashboard-config-page__header-actions">
          <base-button variant="outline-danger" @click="loadConfig">
            <app-icon name="arrow-clockwise" class="mr-1" />
            {{ $t('common.retry') }}
          </base-button>
          <base-button variant="outline-secondary" @click="goBack">
            <app-icon name="arrow-left" class="mr-1" />
            {{ $t('common.back') }}
          </base-button>
        </div>
      </base-alert>
      <b-form v-else @submit.prevent="save">
        <fieldset class="company-dashboard-config-editor-fieldset" :disabled="saving || previewing">
        <section class="company-dashboard-config-editor-section company-dashboard-config-editor-section--ownership">
          <div class="company-dashboard-config-editor-section__heading">
            <span class="company-dashboard-config-editor-section__icon"><app-icon name="building" /></span>
            <div>
              <h5>{{ $t('company_dashboard_config.sections.ownership') }}</h5>
              <p>{{ $t('company_dashboard_config.ownership_help') }}</p>
            </div>
          </div>
          <div class="company-dashboard-config-ownership-grid">
            <base-form-group
              label-for="dashboard-config-company"
              :label="$t('company_dashboard_config.fields.company')"
              :description="companySelectHelp"
              required
            >
              <base-select
                id="dashboard-config-company"
                v-model="companyId"
                :options="companyOptions"
                :disabled="!isNew"
                :clearable="isNew"
              />
            </base-form-group>
            <div class="company-dashboard-config-status">
              <span class="company-dashboard-config-status__label">{{ $t('company_dashboard_config.fields.status') }}</span>
              <div class="company-dashboard-config-status__control">
                <base-switch v-model="form.is_active">
                  {{ $t('company_dashboard_config.fields.active') }}
                </base-switch>
                <small>{{ $t(form.is_active ? 'company_dashboard_config.active_help' : 'company_dashboard_config.inactive_help') }}</small>
              </div>
            </div>
          </div>
          <base-alert
            v-if="companyOptionsError"
            variant="warning"
            class="company-dashboard-config-load-error mt-3"
            role="alert"
          >
            <span>{{ companyOptionsError }}</span>
            <base-button
              variant="outline-secondary"
              size="sm"
              :loading="loadingCompanyOptions"
              :disabled="loadingCompanyOptions"
              @click="retryCompanyOptions"
            >
              <app-icon name="arrow-clockwise" class="mr-1" />
              {{ $t('common.retry') }}
            </base-button>
          </base-alert>
        </section>

        <div class="company-dashboard-config-editor-layout">
          <section class="company-dashboard-config-editor-section">
            <div class="company-dashboard-config-editor-section__heading">
              <span class="company-dashboard-config-editor-section__icon"><app-icon name="brush" /></span>
              <div>
                <h5>{{ $t('company_dashboard_config.sections.branding') }}</h5>
                <p>{{ $t('company_dashboard_config.branding_help') }}</p>
              </div>
            </div>

            <div class="company-dashboard-config-grid">
              <base-form-group label-for="dashboard-brand-title" :label="$t('company_dashboard_config.fields.title')">
                <base-input id="dashboard-brand-title" v-model.trim="form.branding.title" maxlength="255" />
              </base-form-group>
              <base-form-group label-for="dashboard-brand-font" :label="$t('company_dashboard_config.fields.font_family')">
                <base-select id="dashboard-brand-font" v-model="form.branding.font_family" :options="fontOptions" />
              </base-form-group>
            </div>

            <div class="company-dashboard-config-color-grid">
              <base-form-group
                v-for="color in brandColors"
                :key="color.field"
                :label-for="`dashboard-brand-${color.field}`"
                :label="$t(color.label)"
                :state="colorFieldState(color.field)"
                :invalid-feedback="$t('company_dashboard_config.messages.invalid_color')"
              >
                <div class="company-dashboard-config-color-control">
                  <base-input
                    :value="colorValue(color.field, color.fallback)"
                    type="color"
                    :clearable="false"
                    :aria-label="$t(color.label)"
                    @input="setBrandColor(color.field, $event)"
                  />
                  <base-input
                    :id="`dashboard-brand-${color.field}`"
                    v-model.trim="form.branding[color.field]"
                    :placeholder="color.fallback"
                    maxlength="7"
                    :clearable="false"
                    :state="colorFieldState(color.field)"
                  />
                </div>
              </base-form-group>
            </div>

            <div class="company-dashboard-config-logo-block">
              <div class="company-dashboard-config-logo-preview">
                <img v-if="logoPreviewUrl" :src="logoPreviewUrl" :alt="$t('company_dashboard_config.fields.logo')">
                <app-icon v-else name="image" />
              </div>
              <div class="company-dashboard-config-logo-copy">
                <strong>{{ $t('company_dashboard_config.fields.logo') }}</strong>
                <span>{{ $t(logoStatusKey) }}</span>
                <small>{{ $t('company_dashboard_config.logo_help') }}</small>
              </div>
              <div class="company-dashboard-config-logo-actions">
                <input
                  ref="logoInput"
                  class="d-none"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  @change="uploadLogo"
                >
                <base-button
                  variant="outline-secondary"
                  :disabled="uploadingLogo || !companyId"
                  :loading="uploadingLogo"
                  @click="$refs.logoInput.click()"
                >
                  <app-icon name="upload" class="mr-1" />
                  {{ $t(hasLogo ? 'company_dashboard_config.replace_logo' : 'company_dashboard_config.upload_logo') }}
                </base-button>
                <base-button v-if="hasLogo" variant="outline-danger" :disabled="uploadingLogo" @click="clearLogo">
                  <app-icon name="trash" class="mr-1" />
                  {{ $t('company_dashboard_config.remove_logo') }}
                </base-button>
              </div>
            </div>

            <div class="company-dashboard-config-grid company-dashboard-config-grid--metadata">
              <base-form-group
                label-for="dashboard-brand-favicon"
                :label="$t('company_dashboard_config.fields.favicon')"
                :state="urlFieldState('favicon')"
                :invalid-feedback="$t('company_dashboard_config.messages.invalid_url')"
              >
                <base-input
                  id="dashboard-brand-favicon"
                  v-model.trim="form.branding.favicon"
                  type="url"
                  maxlength="512"
                  placeholder="https://"
                  :state="urlFieldState('favicon')"
                />
              </base-form-group>
              <base-form-group
                label-for="dashboard-brand-website"
                :label="$t('company_dashboard_config.fields.company_website')"
                :state="urlFieldState('company_website')"
                :invalid-feedback="$t('company_dashboard_config.messages.invalid_url')"
              >
                <base-input
                  id="dashboard-brand-website"
                  v-model.trim="form.branding.company_website"
                  type="url"
                  maxlength="512"
                  placeholder="https://"
                  :state="urlFieldState('company_website')"
                />
              </base-form-group>
              <base-form-group
                class="company-dashboard-config-grid__full"
                label-for="dashboard-brand-copyright"
                :label="$t('company_dashboard_config.fields.copyright_text')"
              >
                <base-input id="dashboard-brand-copyright" v-model.trim="form.branding.copyright_text" maxlength="255" />
              </base-form-group>
            </div>
          </section>

          <aside class="company-dashboard-config-preview" :style="previewStyle">
            <div class="company-dashboard-config-preview__heading">
              <span><app-icon name="eye" /> {{ $t('company_dashboard_config.preview.title') }}</span>
              <base-badge variant="light">
                {{ $t(hasLivePreviewData ? 'company_dashboard_config.preview.live' : 'company_dashboard_config.preview.sample') }}
              </base-badge>
            </div>
            <div class="company-dashboard-config-preview__window">
              <div class="company-dashboard-config-preview__topbar">
                <div class="company-dashboard-config-preview__mark">
                  <img v-if="logoPreviewUrl" :src="logoPreviewUrl" alt="">
                  <app-icon v-else-if="!companyId" name="building" />
                  <span v-else>{{ companyInitial }}</span>
                </div>
                <div>
                  <strong>{{ previewTitle }}</strong>
                  <small>{{ form.branding.title ? selectedCompanyName : $t('company_dashboard_config.preview.dashboard') }}</small>
                </div>
              </div>
              <div class="company-dashboard-config-preview__body">
                <span class="company-dashboard-config-preview__eyebrow">{{ $t('company_dashboard_config.preview.dashboard') }}</span>
                <div class="company-dashboard-config-preview__metrics">
                  <div><small>{{ $t('company_dashboard_config.preview.online') }}</small><strong>{{ previewMetricLabel('onlineDevices') }}</strong></div>
                  <div><small>{{ $t('company_dashboard_config.preview.usage') }}</small><strong>{{ previewMetricLabel('podUsageRate', '%') }}</strong></div>
                  <div><small>{{ $t('company_dashboard_config.preview.alerts') }}</small><strong>{{ previewMetricLabel('alertsToday') }}</strong></div>
                </div>
                <div class="company-dashboard-config-preview__chart">
                  <span v-for="bar in 7" :key="bar" />
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section class="company-dashboard-config-advanced">
          <button
            type="button"
            class="company-dashboard-config-advanced__toggle"
            :aria-expanded="advancedOpen ? 'true' : 'false'"
            aria-controls="company-dashboard-config-advanced-body"
            @click="advancedOpen = !advancedOpen"
          >
            <span class="company-dashboard-config-editor-section__icon"><app-icon name="web-interface" /></span>
            <span>
              <strong>{{ $t('company_dashboard_config.sections.advanced') }}</strong>
              <small>{{ $t('company_dashboard_config.advanced_help') }}</small>
            </span>
            <span class="company-dashboard-config-advanced__action">
              {{ $t(advancedOpen ? 'company_dashboard_config.hide_advanced' : 'company_dashboard_config.show_advanced') }}
              <app-icon name="chevron-down" :rotate="advancedOpen ? 180 : 0" />
            </span>
          </button>

          <div
            v-show="advancedOpen"
            id="company-dashboard-config-advanced-body"
            class="company-dashboard-config-advanced__body"
          >
            <section class="company-dashboard-config-section">
              <div class="company-dashboard-config-panel-editor__heading">
                <div>
                  <h5>{{ $t('company_dashboard_config.sections.panels') }}</h5>
                  <p class="text-muted mb-0">{{ $t('company_dashboard_config.panels_help') }}</p>
                </div>
                <div class="company-dashboard-config-page__header-actions">
                  <input ref="jsonImport" type="file" accept="application/json,.json" hidden @change="importJson">
                  <base-button variant="outline-secondary" @click="$refs.jsonImport.click()">
                    <app-icon name="upload" class="mr-1" />{{ $t('company_dashboard_config.import_json') }}
                  </base-button>
                  <base-button variant="outline-secondary" @click="exportJson">
                    <app-icon name="download" class="mr-1" />{{ $t('company_dashboard_config.export_json') }}
                  </base-button>
                  <base-button variant="outline-secondary" @click="downloadExample">
                    <app-icon name="file-earmark-code" class="mr-1" />{{ $t('company_dashboard_config.download_example') }}
                  </base-button>
                  <base-button
                    variant="outline-primary"
                    :disabled="!companyId || previewing"
                    :loading="previewing"
                    @click="previewData"
                  >
                    <app-icon name="eye" class="mr-1" />{{ $t('company_dashboard_config.preview_data') }}
                  </base-button>
                  <base-badge variant="light">{{ $t('company_dashboard_config.panel_count', { count: panels.length }) }}</base-badge>
                </div>
              </div>

              <div class="company-dashboard-config-panel-add">
                <base-select
                  id="dashboard-panel-add"
                  v-model="panelToAdd"
                  :options="availablePanelOptions"
                  :clearable="false"
                  :disabled="availablePanelOptions.length <= 1"
                  :aria-label="$t('company_dashboard_config.select_panel')"
                />
                <base-button
                  variant="outline-primary"
                  :disabled="!panelToAdd"
                  @click="addPanel"
                >
                  <app-icon name="plus" class="mr-1" />
                  {{ $t('company_dashboard_config.add_panel') }}
                </base-button>
              </div>

              <div v-if="panels.length" class="company-dashboard-config-panel-editor">
                <article
                  v-for="(panel, index) in panels"
                  :key="`${panel.id}-${index}`"
                  class="company-dashboard-config-panel-editor__item"
                >
                  <div class="company-dashboard-config-panel-editor__summary">
                    <span class="company-dashboard-config-panel-editor__icon">
                      <app-icon :name="panelIcon(panel)" />
                    </span>
                    <div>
                      <strong>{{ panelDisplayName(panel) }}</strong>
                      <small>{{ panel.id }}</small>
                    </div>
                    <base-badge variant="light">{{ chartLabel(panel.chart) }}</base-badge>
                  </div>

                  <div class="company-dashboard-config-panel-editor__fields">
                    <base-form-group
                      :label-for="`dashboard-panel-title-${index}`"
                      :label="$t('company_dashboard_config.fields.title')"
                    >
                      <base-input :id="`dashboard-panel-title-${index}`" v-model.trim="panel.title" maxlength="120" />
                    </base-form-group>
                    <base-form-group
                      :label-for="`dashboard-panel-width-${index}`"
                      :label="$t('company_dashboard_config.fields.panel_width')"
                    >
                      <base-select
                        :id="`dashboard-panel-width-${index}`"
                        :value="panel.grid && panel.grid.w"
                        :options="panelWidthOptions"
                        :clearable="false"
                        @input="updatePanelWidth(index, $event)"
                      />
                    </base-form-group>
                    <div class="company-dashboard-config-panel-editor__actions">
                      <span>{{ $t('company_dashboard_config.panel_order', { order: index + 1 }) }}</span>
                      <div>
                        <base-icon-button
                          :label="$t('company_dashboard_config.move_up')"
                          :disabled="index === 0"
                          @click="movePanel(index, -1)"
                        ><app-icon name="arrow-down" :rotate="180" /></base-icon-button>
                        <base-icon-button
                          :label="$t('company_dashboard_config.move_down')"
                          :disabled="index === panels.length - 1"
                          @click="movePanel(index, 1)"
                        ><app-icon name="arrow-down" /></base-icon-button>
                        <base-icon-button
                          tone="danger"
                          :label="$t('company_dashboard_config.remove_panel')"
                          @click="removePanel(index)"
                        ><app-icon name="trash" /></base-icon-button>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
              <div v-else class="company-dashboard-config-empty company-dashboard-config-panel-editor__empty">
                <app-icon name="grid" />
                <span>{{ $t('company_dashboard_config.no_panels') }}</span>
              </div>
            </section>

          </div>
        </section>
        </fieldset>

        <div class="company-dashboard-config-page__footer">
          <base-button variant="outline-secondary" :disabled="saving || previewing" @click="goBack">
            <app-icon name="x" class="mr-1" />
            {{ $t('common.cancel') }}
          </base-button>
          <base-button
            variant="primary"
            type="submit"
            :disabled="!companyId || !isLocalFormValid() || previewing"
            :loading="saving"
          >
            <app-icon name="save" class="mr-1" />
            {{ $t('common.save') }}
          </base-button>
        </div>
      </b-form>
    </base-card>

  </div>
</template>

<script>
import { fetchCompanies } from '@/api/companies'
import { deleteFile, fetchFileDetail, uploadImage } from '@/api/files'
import { normalizeImageUrl } from '@/utils/imageUrlHelper'
import unsavedGuard from '@/mixins/unsavedGuard'
import { fetchAllPages } from '@/utils/pagination.mjs'
import {
  fetchDashboardModules,
  fetchCompanyDashboardConfigs,
  fetchCompanyDashboardConfig,
  previewCompanyDashboardData,
  validateCompanyDashboardConfig,
  upsertCompanyDashboardConfig
} from '@/api/company-dashboard-config'
import {
  CJK_SYSTEM_FONT_FAMILY,
  DEFAULT_PRIMARY_COLOR,
  NOTO_FONT_FAMILY,
  SYSTEM_FONT_FAMILY,
  normalizeFontFamily
} from '@/utils/theme'

const DEFAULT_SECONDARY_COLOR = '#6c757d'
const DEFAULT_ACCENT_COLOR = '#198754'
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
const MAX_JSON_FILE_SIZE = 1024 * 1024
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024
const VALID_LOGO_TYPES = Object.freeze(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const PANEL_CATALOG = Object.freeze([
  { id: 'stats_preview', titleKey: 'company_dashboard_config.panel_names.stats_preview', chart: 'number', icon: 'speedometer2', grid: { x: 0, y: 0, w: 12, h: 2 } },
  { id: 'device_online_rate', titleKey: 'company_dashboard_config.panel_names.device_online_rate', chart: 'line', icon: 'graph-up', grid: { x: 0, y: 2, w: 8, h: 4 } },
  { id: 'device_online_rate_gauge', titleKey: 'company_dashboard_config.panel_names.device_online_rate_gauge', chart: 'gauge', icon: 'speedometer2', grid: { x: 0, y: 2, w: 4, h: 4 } },
  { id: 'pod_usage_rate_gauge', titleKey: 'company_dashboard_config.panel_names.pod_usage_rate_gauge', chart: 'gauge', icon: 'speedometer2', grid: { x: 4, y: 2, w: 4, h: 4 } },
  { id: 'device_status_distribution', titleKey: 'company_dashboard_config.panel_names.device_status_distribution', chart: 'pie', icon: 'pie-chart', grid: { x: 8, y: 2, w: 4, h: 4 } },
  { id: 'pod_usage_trend', titleKey: 'company_dashboard_config.panel_names.pod_usage_trend', chart: 'bar', icon: 'bar-chart', grid: { x: 0, y: 7, w: 8, h: 4 } },
  { id: 'pod_usage_distribution', titleKey: 'company_dashboard_config.panel_names.pod_usage_distribution', chart: 'pie', icon: 'pie-chart', grid: { x: 8, y: 7, w: 4, h: 4 } },
  { id: 'alert_trend', titleKey: 'company_dashboard_config.panel_names.alert_trend', chart: 'line', icon: 'graph-up', grid: { x: 0, y: 11, w: 8, h: 4 } },
  { id: 'alert_stats', titleKey: 'company_dashboard_config.panel_names.alert_stats', chart: 'pie', icon: 'bell', grid: { x: 8, y: 11, w: 4, h: 4 } },
  { id: 'file_usage_stats', titleKey: 'company_dashboard_config.panel_names.file_usage_stats', chart: 'bar', icon: 'folder', grid: { x: 0, y: 15, w: 12, h: 4 } },
  { id: 'pod_environment_trend', titleKey: 'company_dashboard_config.panel_names.pod_environment_trend', chart: 'line', icon: 'thermometer-half', grid: { x: 0, y: 19, w: 6, h: 4 } },
  { id: 'pod_occupancy_trend', titleKey: 'company_dashboard_config.panel_names.pod_occupancy_trend', chart: 'line', icon: 'people', grid: { x: 6, y: 19, w: 6, h: 4 } },
  { id: 'pod_noise_trend', titleKey: 'company_dashboard_config.panel_names.pod_noise_trend', chart: 'line', icon: 'soundwave', grid: { x: 0, y: 23, w: 6, h: 4 } },
  { id: 'pod_power_trend', titleKey: 'company_dashboard_config.panel_names.pod_power_trend', chart: 'line', icon: 'lightning', grid: { x: 6, y: 23, w: 6, h: 4 } },
  { id: 'pod_fan_trend', titleKey: 'company_dashboard_config.panel_names.pod_fan_trend', chart: 'line', icon: 'fan', grid: { x: 0, y: 27, w: 6, h: 4 } },
  { id: 'pod_light_trend', titleKey: 'company_dashboard_config.panel_names.pod_light_trend', chart: 'line', icon: 'lightbulb', grid: { x: 6, y: 27, w: 6, h: 4 } },
  { id: 'pod_network_signal_trend', titleKey: 'company_dashboard_config.panel_names.pod_network_signal_trend', chart: 'line', icon: 'wifi', grid: { x: 0, y: 31, w: 6, h: 4 } },
  { id: 'pod_desk_height_trend', titleKey: 'company_dashboard_config.panel_names.pod_desk_height_trend', chart: 'line', icon: 'arrows-expand', grid: { x: 6, y: 31, w: 6, h: 4 } },
  { id: 'detailed_stats', titleKey: 'company_dashboard_config.panel_names.detailed_stats', chart: 'table', icon: 'list', grid: { x: 0, y: 35, w: 12, h: 5 } }
])

const emptyForm = () => ({
  is_active: true,
  branding: {
    primary_color: '',
    secondary_color: '',
    accent_color: '',
    font_family: '',
    logo_file_id: '',
    title: '',
    favicon: '',
    copyright_text: '',
    company_website: ''
  },
  html_content: '',
  css_content: '',
  js_content: ''
})

export default {
  name: 'CompanyDashboardConfigEditor',
  mixins: [unsavedGuard],
  data () {
    return {
      loading: true,
      saving: false,
      uploadingLogo: false,
      previewing: false,
      loadingCompanyOptions: false,
      loadError: '',
      advancedOpen: false,
      panelToAdd: '',
      dashboardCatalog: PANEL_CATALOG.map(item => ({ ...item })),
      companyId: this.$route.params.companyId || '',
      companies: [],
      companiesError: '',
      configCompanyName: '',
      form: emptyForm(),
      panels: [],
      previewItems: [],
      logoPreviewUrl: '',
      pendingLogoFile: null,
      existingCompanyIds: [],
      existingConfigsLoaded: false,
      existingConfigsError: ''
    }
  },
  computed: {
    isNew () {
      return !this.$route.params.companyId
    },
    pageTitle () {
      return this.$t(this.isNew
        ? 'company_dashboard_config.create_title'
        : 'company_dashboard_config.edit_title')
    },
    companyOptions () {
      let companies = this.companies
      if (this.isNew) {
        companies = this.existingConfigsLoaded
          ? this.companies.filter(company => !this.existingCompanyIds.includes(Number(company.id)))
          : []
      } else if (this.companyId && !companies.some(company => Number(company.id) === Number(this.companyId))) {
        companies = [
          ...companies,
          { id: this.companyId, short_name: this.$t('company_dashboard_config.company_id', { id: this.companyId }) }
        ]
      }
      return [
        { value: '', text: this.$t('common.please_select_company') },
        ...companies.map(company => ({
          // Route params are strings. Keep option values in the same type so
          // BootstrapVue does not clear the selected company while options load.
          value: String(company.id),
          text: company.short_name || company.company_name || `ID ${company.id}`
        }))
      ]
    },
    companySelectHelp () {
      if (!this.isNew) return ''
      if (this.companyOptionsError) return ''
      if (this.existingConfigsLoaded && this.companyOptions.length === 1) {
        return this.$t('company_dashboard_config.all_companies_configured')
      }
      return this.$t('company_dashboard_config.select_unconfigured_company')
    },
    companyOptionsError () {
      return [this.companiesError, this.existingConfigsError].filter(Boolean).join('\n')
    },
    selectedCompanyName () {
      return this.selectedCompany?.short_name ||
        this.selectedCompany?.company_name ||
        this.configCompanyName ||
        (this.companyId
          ? this.$t('company_dashboard_config.company_id', { id: this.companyId })
          : this.$t('company_dashboard_config.preview.company_fallback'))
    },
    selectedCompany () {
      return this.companies.find(item => Number(item.id) === Number(this.companyId))
    },
    previewTitle () {
      return this.form.branding.title || this.selectedCompanyName
    },
    companyInitial () {
      return String(this.previewTitle || '?').trim().slice(0, 1).toUpperCase()
    },
    hasLogo () {
      return Boolean(this.pendingLogoFile || this.form.branding.logo_file_id)
    },
    logoStatusKey () {
      if (this.pendingLogoFile) return 'company_dashboard_config.logo_selected'
      return this.hasLogo ? 'company_dashboard_config.logo_ready' : 'company_dashboard_config.logo_empty'
    },
    hasLivePreviewData () {
      return this.previewItems.some(item => {
        const isSummary = item?.module_key === 'stats_preview' || item?.panel_id === 'stats_preview'
        return isSummary && Array.isArray(item?.series) && item.series.some(series => Array.isArray(series?.points) && series.points.length)
      })
    },
    availablePanelOptions () {
      const selectedIds = new Set(this.panels.map(panel => panel.id))
      return [
        { value: '', text: this.$t('company_dashboard_config.select_panel') },
        ...this.dashboardCatalog
          .filter(panel => !selectedIds.has(panel.id))
          .map(panel => ({ value: panel.id, text: this.$t(panel.titleKey) }))
      ]
    },
    panelWidthOptions () {
      return [4, 6, 8, 12].map(value => ({
        value,
        text: this.$t('company_dashboard_config.panel_width', { count: value })
      }))
    },
    fontOptions () {
      return [
        { value: '', text: this.$t('company_dashboard_config.font_options.default') },
        { value: SYSTEM_FONT_FAMILY, text: this.$t('company_dashboard_config.font_options.system') },
        { value: CJK_SYSTEM_FONT_FAMILY, text: this.$t('company_dashboard_config.font_options.cjk') },
        { value: NOTO_FONT_FAMILY, text: this.$t('company_dashboard_config.font_options.noto') }
      ]
    },
    brandColors () {
      return [
        { field: 'primary_color', label: 'company_dashboard_config.fields.primary_color', fallback: DEFAULT_PRIMARY_COLOR },
        { field: 'secondary_color', label: 'company_dashboard_config.fields.secondary_color', fallback: DEFAULT_SECONDARY_COLOR },
        { field: 'accent_color', label: 'company_dashboard_config.fields.accent_color', fallback: DEFAULT_ACCENT_COLOR }
      ]
    },
    previewStyle () {
      return {
        '--config-preview-primary': this.colorValue('primary_color', DEFAULT_PRIMARY_COLOR),
        '--config-preview-secondary': this.colorValue('secondary_color', DEFAULT_SECONDARY_COLOR),
        '--config-preview-accent': this.colorValue('accent_color', DEFAULT_ACCENT_COLOR),
        fontFamily: normalizeFontFamily(this.form.branding.font_family)
      }
    }
  },
  watch: {
    companyId (next, previous) {
      if (this.isNew && previous && String(next) !== String(previous)) this.clearLogo()
    }
  },
  async created () {
    try {
      await Promise.all([
        this.loadCompanies(),
        this.loadDashboardCatalog(),
        this.isNew ? this.loadExistingConfigs() : Promise.resolve()
      ])
      if (!this.isNew) await this.loadConfig()
    } finally {
      this.loading = false
      // 记录加载后的基线快照，供 unsavedGuard 判断是否有未保存改动
      this._savedSnapshot = this._serializeEditableState()
    }
  },
  beforeDestroy () {
    this.revokeLogoPreview()
  },
  methods: {
    async loadCompanies () {
      this.companiesError = ''
      try {
        this.companies = await fetchAllPages(fetchCompanies)
      } catch (error) {
        this.companies = []
        this.companiesError = this.$t('company_dashboard_config.messages.companies_failed', {
          message: this.$getErrorMessage(error)
        })
      }
    },
    async loadExistingConfigs () {
      this.existingConfigsError = ''
      this.existingConfigsLoaded = false
      try {
        const configs = await fetchAllPages(fetchCompanyDashboardConfigs)
        this.existingCompanyIds = configs.map(item => Number(item.company_id))
        this.existingConfigsLoaded = true
      } catch (error) {
        this.existingCompanyIds = []
        this.existingConfigsError = this.$t('company_dashboard_config.messages.existing_configs_failed', {
          message: this.$getErrorMessage(error)
        })
      }
    },
    async retryCompanyOptions () {
      if (this.loadingCompanyOptions) return
      this.loadingCompanyOptions = true
      try {
        await Promise.all([
          this.loadCompanies(),
          this.isNew ? this.loadExistingConfigs() : Promise.resolve()
        ])
      } finally {
        this.loadingCompanyOptions = false
      }
    },
    async loadDashboardCatalog () {
      try {
        const response = await fetchDashboardModules()
        const modules = response?.modules || response?.data?.modules || []
        if (!modules.length) return
        this.dashboardCatalog = modules.map(module => {
          const fallback = PANEL_CATALOG.find(item => item.id === module.module_key) || {}
          return {
            ...fallback,
            id: module.module_key,
            title: fallback.titleKey ? this.$t(fallback.titleKey) : module.name,
            chart: module.default_chart,
            allowedCharts: module.allowed_charts,
            resultShape: module.result_shape,
            grid: fallback.grid || { x: 0, y: 0, w: 6, h: 4 }
          }
        })
      } catch {
        this.dashboardCatalog = PANEL_CATALOG.map(item => ({ ...item }))
      }
    },
    async loadConfig () {
      this.loading = true
      this.loadError = ''
      try {
        const item = await fetchCompanyDashboardConfig(this.companyId)
        this.configCompanyName = item.short_name || item.company_name || ''
        const config = item.config_json || {}
        const branding = { ...emptyForm().branding, ...(config.branding || {}) }
        Object.keys(branding).forEach(key => {
          if (branding[key] === null || branding[key] === undefined) branding[key] = ''
        })
        if (branding.font_family) branding.font_family = normalizeFontFamily(branding.font_family)
        this.form = {
          ...emptyForm(),
          is_active: Boolean(item.is_active),
          branding,
          html_content: item.html_content || '',
          css_content: item.css_content || '',
          js_content: item.js_content || ''
        }
        this.panels = Array.isArray(config.panels)
          ? config.panels.map(panel => ({
            ...panel,
            module_key: panel.module_key || panel.id,
            grid: { ...(this.panelCatalogEntry(panel.module_key || panel.id)?.grid || {}), ...(panel.grid || {}) }
          }))
          : []
        await this.loadStoredLogoPreview()
        if (this._savedSnapshot !== undefined) this._savedSnapshot = this._serializeEditableState()
      } catch (error) {
        this.loadError = this.$t('company_dashboard_config.messages.load_failed', {
          message: this.$getErrorMessage(error)
        })
      } finally {
        this.loading = false
      }
    },
    normalizedBranding () {
      return Object.entries(this.form.branding).reduce((result, [key, value]) => {
        if (value === '' || value === null || value === undefined) return result
        result[key] = key === 'logo_file_id' ? Number(value) : value
        return result
      }, {})
    },
    colorValue (field, fallback) {
      const value = String(this.form.branding[field] || '').trim()
      return HEX_COLOR_RE.test(value) ? value : fallback
    },
    colorFieldState (field) {
      const value = String(this.form.branding[field] || '').trim()
      return value ? HEX_COLOR_RE.test(value) : null
    },
    urlFieldState (field) {
      const value = String(this.form.branding[field] || '').trim()
      if (!value) return null
      try {
        const parsed = new URL(value)
        return ['http:', 'https:'].includes(parsed.protocol)
      } catch (error) {
        return false
      }
    },
    isLocalFormValid () {
      return this.brandColors.every(color => this.colorFieldState(color.field) !== false) &&
        ['favicon', 'company_website'].every(field => this.urlFieldState(field) !== false)
    },
    chartLabel (chart) {
      const supported = ['line', 'bar', 'pie', 'gauge', 'number', 'table']
      const key = supported.includes(chart) ? chart : 'unknown'
      return this.$t(`company_dashboard_config.chart_types.${key}`)
    },
    setBrandColor (field, value) {
      this.form.branding[field] = value
    },
    revokeLogoPreview () {
      if (this.logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.logoPreviewUrl)
      this.logoPreviewUrl = ''
    },
    clearLogo () {
      this.revokeLogoPreview()
      this.pendingLogoFile = null
      this.form.branding.logo_file_id = ''
    },
    async loadStoredLogoPreview () {
      this.revokeLogoPreview()
      this.pendingLogoFile = null
      const fileId = this.form.branding.logo_file_id
      if (!fileId) return
      let logoUrl = Number(fileId) === Number(this.selectedCompany?.logo_file_id)
        ? this.selectedCompany?.logo_url
        : ''
      if (!logoUrl) {
        try {
          const response = await fetchFileDetail(fileId)
          const file = response?.data || response || {}
          logoUrl = file.url || file.download_url || file.file_url || file.path || ''
        } catch (error) {
          logoUrl = ''
        }
      }
      if (logoUrl) this.logoPreviewUrl = normalizeImageUrl(logoUrl)
    },
    uploadLogo (event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !this.companyId) return
      if (!VALID_LOGO_TYPES.includes(file.type)) {
        this.$uiToast.error(this.$t('company_dashboard_config.messages.logo_type_invalid'))
        return
      }
      if (file.size > MAX_LOGO_FILE_SIZE) {
        this.$uiToast.error(this.$t('company_dashboard_config.messages.logo_too_large'))
        return
      }
      this.revokeLogoPreview()
      this.pendingLogoFile = file
      this.logoPreviewUrl = URL.createObjectURL(file)
      this.$uiToast.success(this.$t('company_dashboard_config.messages.logo_uploaded'))
    },
    panelCatalogEntry (id) {
      return this.dashboardCatalog.find(panel => panel.id === id)
    },
    panelDisplayName (panel) {
      const catalog = this.panelCatalogEntry(panel.module_key || panel.id)
      return panel.title || catalog?.title || (catalog?.titleKey ? this.$t(catalog.titleKey) : panel.module_key || panel.id)
    },
    panelIcon (panel) {
      return this.panelCatalogEntry(panel.module_key || panel.id)?.icon || 'grid'
    },
    addPanel () {
      const catalog = this.panelCatalogEntry(this.panelToAdd)
      if (!catalog) return
      this.panels.push({
        id: catalog.id,
        module_key: catalog.id,
        title: catalog.title || this.$t(catalog.titleKey),
        chart: catalog.chart,
        query: { interval: '1day', default_range: '7d', resource_uuids: [] },
        display: { legend: true, show_summary: true, decimal_places: 1, refresh_seconds: 60 },
        grid: { ...catalog.grid }
      })
      this.panelToAdd = ''
      this.reflowPanels()
    },
    removePanel (index) {
      this.panels.splice(index, 1)
      this.reflowPanels()
    },
    movePanel (index, direction) {
      const target = index + direction
      if (target < 0 || target >= this.panels.length) return
      const [panel] = this.panels.splice(index, 1)
      this.panels.splice(target, 0, panel)
      this.reflowPanels()
    },
    updatePanelWidth (index, value) {
      const panel = this.panels[index]
      if (!panel) return
      this.$set(panel, 'grid', { ...(panel.grid || {}), w: Number(value) || 12 })
      this.reflowPanels()
    },
    reflowPanels () {
      let x = 0
      let y = 0
      let rowHeight = 0
      this.panels.forEach(panel => {
        const width = [4, 6, 8, 12].includes(Number(panel.grid?.w)) ? Number(panel.grid.w) : 12
        const height = Math.max(1, Math.min(12, Number(panel.grid?.h) || 4))
        if (x + width > 12) {
          y += rowHeight
          x = 0
          rowHeight = 0
        }
        this.$set(panel, 'grid', { ...(panel.grid || {}), x, y, w: width, h: height })
        x += width
        rowHeight = Math.max(rowHeight, height)
        if (x >= 12) {
          y += rowHeight
          x = 0
          rowHeight = 0
        }
      })
    },
    buildPayload () {
      return {
        config_json: {
          schema_version: 1,
          branding: this.normalizedBranding(),
          panels: this.panels.map(panel => ({
            id: panel.id,
            module_key: panel.module_key || panel.id,
            title: panel.title,
            chart: panel.chart,
            query: { interval: '1day', default_range: '7d', resource_uuids: [], ...(panel.query || {}) },
            display: { legend: true, show_summary: true, decimal_places: 1, refresh_seconds: 60, ...(panel.display || {}) },
            grid: { ...(panel.grid || {}) }
          }))
        },
        html_content: this.form.html_content || null,
        css_content: this.form.css_content || null,
        js_content: this.form.js_content || null,
        is_active: Boolean(this.form.is_active)
      }
    },
    // 序列化可编辑状态（公司、品牌、面板、HTML/CSS/JS），供未保存检测比对
    _serializeEditableState () {
      return JSON.stringify({
        companyId: String(this.companyId || ''),
        form: this.form,
        panels: this.panels,
        pendingLogo: this.pendingLogoFile
          ? {
              name: this.pendingLogoFile.name,
              size: this.pendingLogoFile.size,
              type: this.pendingLogoFile.type,
              lastModified: this.pendingLogoFile.lastModified
            }
          : null
      })
    },
    isFormDirty () {
      // 保存成功会先刷新快照；请求进行中仍保留离开保护，避免中断未完成的保存。
      if (this._savedSnapshot === undefined) return false
      return this._serializeEditableState() !== this._savedSnapshot
    },
    async save () {
      if (!this.companyId || !this.isLocalFormValid()) {
        this.$uiToast.error(this.$t('company_dashboard_config.messages.invalid_form'))
        return
      }
      this.saving = true
      let uploadedLogoId = null
      const previousLogoFileId = this.form.branding.logo_file_id
      try {
        if (this.isNew) await this.assertNoExistingConfig()
        const payload = this.buildPayload()
        const validation = await validateCompanyDashboardConfig(this.companyId, payload.config_json)
        if (!validation?.valid) throw new Error(this.validationMessage(validation?.errors))
        payload.config_json = validation.normalized_config
        if (this.pendingLogoFile) {
          this.uploadingLogo = true
          const formData = new FormData()
          formData.append('file', this.pendingLogoFile)
          formData.append('owner_company_id', String(this.companyId))
          formData.append('is_public', 'true')
          const result = await uploadImage(formData)
          if (!result?.id) throw new Error(this.$t('company_dashboard_config.messages.upload_logo_failed'))
          uploadedLogoId = String(result.id)
          this.form.branding.logo_file_id = uploadedLogoId
          payload.config_json = {
            ...payload.config_json,
            branding: {
              ...(payload.config_json?.branding || {}),
              logo_file_id: Number(uploadedLogoId)
            }
          }
        }
        if (this.isNew) await this.assertNoExistingConfig()
        const item = await upsertCompanyDashboardConfig(this.companyId, payload)
        this.pendingLogoFile = null
        // 保存成功：刷新基线快照，避免随后的路由跳转触发未保存拦截
        this._savedSnapshot = this._serializeEditableState()
        this.$uiToast.success(this.$t('company_dashboard_config.messages.saved'))
        this.$router.replace(`/org/company-dashboard-config/${item.company_id}`)
      } catch (error) {
        if (uploadedLogoId) {
          try {
            await deleteFile(uploadedLogoId)
          } catch (cleanupError) {
            // 保存失败时尽力清理本次新上传文件；清理失败不覆盖原始错误。
          }
          this.form.branding.logo_file_id = previousLogoFileId
        }
        if (error.code === 'DASHBOARD_CONFIG_ALREADY_EXISTS') {
          this.$uiToast.error(error.message)
        } else {
          this.$uiToast.error(this.$t('company_dashboard_config.messages.save_failed', {
            message: this.$getErrorMessage(error) || error.message
          }))
        }
      } finally {
        this.uploadingLogo = false
        this.saving = false
      }
    },
    async assertNoExistingConfig () {
      try {
        await fetchCompanyDashboardConfig(this.companyId)
      } catch (error) {
        if (error?.response?.status === 404) return
        throw error
      }
      const error = new Error(this.$t('company_dashboard_config.messages.config_already_exists'))
      error.code = 'DASHBOARD_CONFIG_ALREADY_EXISTS'
      throw error
    },
    validationMessage (errors = []) {
      if (!errors.length) return this.$t('company_dashboard_config.messages.invalid_json')
      return errors.map(error => {
        const path = this.validationPath(error.loc)
        const context = error.context || {}
        if (error.code === 'UNSUPPORTED_MODULE') {
          return this.$t('company_dashboard_config.messages.unsupported_module', {
            path,
            module: context.module_key || this.valueFromMessage(error.msg)
          })
        }
        if (error.code === 'UNSUPPORTED_CHART') {
          return this.$t('company_dashboard_config.messages.unsupported_chart', {
            path,
            chart: String(context.chart || '').replace(/^ChartType\./, ''),
            module: context.module_key || ''
          })
        }
        if (error.code === 'UNSUPPORTED_FIELD') {
          return this.$t('company_dashboard_config.messages.unsupported_field', {
            path,
            field: context.field || error.loc?.[error.loc.length - 1] || ''
          })
        }
        return this.$t('company_dashboard_config.messages.invalid_config_at', {
          path,
          message: error.msg || this.$t('company_dashboard_config.messages.invalid_json')
        })
      }).join('; ')
    },
    validationPath (loc = []) {
      return loc.reduce((path, segment) => (
        typeof segment === 'number' ? `${path}[${segment}]` : `${path}${path ? '.' : ''}${segment}`
      ), '') || '$'
    },
    valueFromMessage (message = '') {
      const separator = message.lastIndexOf(':')
      return separator >= 0 ? message.slice(separator + 1).trim() : message
    },
    async importJson (event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file || !this.companyId) return
      try {
        if (file.size > MAX_JSON_FILE_SIZE) throw new Error(this.$t('company_dashboard_config.messages.json_too_large'))
        let source
        try {
          const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
          source = JSON.parse(text)
        } catch (error) {
          throw new Error(this.$t('company_dashboard_config.messages.invalid_json'))
        }
        const configJson = source.config_json || source
        const validation = await validateCompanyDashboardConfig(this.companyId, configJson)
        if (!validation?.valid) throw new Error(this.validationMessage(validation?.errors))
        const normalized = validation.normalized_config
        this.form.branding = { ...emptyForm().branding, ...(normalized.branding || {}) }
        await this.loadStoredLogoPreview()
        this.panels = normalized.panels || []
        this.reflowPanels()
        this.$uiToast.success(this.$t('company_dashboard_config.messages.json_imported'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || error.message)
      }
    },
    exportJson () {
      this.downloadJson(this.buildPayload().config_json, `company-dashboard-${this.companyId || 'config'}.json`)
    },
    downloadExample () {
      const example = {
        schema_version: 1,
        branding: {},
        panels: [{
          id: 'online-rate-main',
          module_key: 'device_online_rate',
          title: this.$t('company_dashboard_config.panel_names.device_online_rate'),
          chart: 'line',
          query: { interval: '1day', default_range: '7d', resource_uuids: [] },
          display: { legend: true, show_summary: true, unit: '%', decimal_places: 1, refresh_seconds: 60 },
          grid: { x: 0, y: 0, w: 12, h: 4 }
        }]
      }
      this.downloadJson(example, 'company-dashboard-example.json')
    },
    downloadJson (config, filename) {
      const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = filename
      link.click()
      URL.revokeObjectURL(link.href)
    },
    async previewData () {
      if (this.previewing || !this.companyId) return
      this.previewing = true
      this.previewItems = []
      try {
        const result = await previewCompanyDashboardData(this.companyId, this.buildPayload().config_json)
        const items = result?.items || result?.data?.items || []
        const failedItems = items.filter(item => item?.status === 'error' || item?.error)
        if (failedItems.length) throw new Error(this.previewFailureMessage(failedItems))
        this.previewItems = items
        this.$uiToast.success(this.$t('company_dashboard_config.messages.preview_ready', { count: items.length }))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || error.message)
      } finally {
        this.previewing = false
      }
    },
    previewFailureMessage (items) {
      const failures = items.map(item => {
        const panelId = item.panel_id || String(item.request_id || '').replace(/^preview-/, '')
        const panel = this.panels.find(candidate => candidate.id === panelId)
        const label = panel?.title || panelId || this.$t('company_dashboard_config.messages.unknown_panel')
        const reasonKey = item.error?.code === 'RESOURCE_OUT_OF_SCOPE'
          ? 'company_dashboard_config.messages.preview_resource_out_of_scope'
          : item.error?.code === 'UNSUPPORTED_DASHBOARD_QUERY'
            ? 'company_dashboard_config.messages.preview_query_unsupported'
            : null
        const reason = reasonKey ? this.$t(reasonKey) : (item.error?.message || this.$t('common.unknown_error'))
        return `${label}（${reason}）`
      })
      return this.$t('company_dashboard_config.messages.preview_query_failed', { panels: failures.join('；') })
    },
    previewMetric (key) {
      const cards = this.previewItems.find(item => item.module_key === 'stats_preview' || item.panel_id === 'stats_preview')
      const point = cards?.series?.[0]?.points?.find(item => item.label === key)
      return point?.value ?? null
    },
    previewMetricLabel (key, suffix = '') {
      const value = this.previewMetric(key)
      return value === null || value === undefined ? '—' : `${value}${suffix}`
    },
    goBack () {
      this.$router.push('/org/company-dashboard-config')
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/company-dashboard-config.scss"></style>
