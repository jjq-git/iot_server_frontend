<template>
  <div class="company-dashboard-config-page">
    <base-card>
      <div class="company-dashboard-config-page__header">
        <div>
          <h4 class="mb-1">{{ $t('company_dashboard_config.detail_title') }}</h4>
          <p class="text-muted mb-0">
            {{ $t('company_dashboard_config.company_id', { id: companyId }) }}
          </p>
        </div>
        <div class="company-dashboard-config-page__header-actions">
          <base-button variant="outline-secondary" @click="goBack">
            <app-icon name="arrow-left" class="mr-1" />
            {{ $t('common.back') }}
          </base-button>
          <base-button v-if="canManage" variant="primary" @click="editConfig">
            <app-icon name="pencil" class="mr-1" />
            {{ $t('common.edit') }}
          </base-button>
        </div>
      </div>

      <base-loading v-if="loading" />
      <template v-else-if="item">
        <section class="company-dashboard-config-section">
          <h5>{{ $t('company_dashboard_config.sections.summary') }}</h5>
          <div class="company-dashboard-config-overview">
            <article class="company-dashboard-config-overview__item">
              <span>{{ $t('company_dashboard_config.fields.status') }}</span>
              <base-badge :variant="item.is_active ? 'success' : 'secondary'">
                {{ item.is_active ? $t('common.enabled') : $t('common.disabled') }}
              </base-badge>
            </article>
            <article class="company-dashboard-config-overview__item">
              <span>{{ $t('company_dashboard_config.fields.panels') }}</span>
              <strong>{{ panels.length }}</strong>
            </article>
            <article class="company-dashboard-config-overview__item">
              <span>{{ $t('common.updated_at') }}</span>
              <strong>{{ formatDateTime(item.updated_at) }}</strong>
            </article>
          </div>
        </section>

        <section class="company-dashboard-config-section">
          <h5>{{ $t('company_dashboard_config.sections.branding') }}</h5>
          <dl class="company-dashboard-config-branding">
            <div>
              <dt>{{ $t('company_detail.field.company_name') }}</dt>
              <dd>{{ displayValue(company.company_name) }}</dd>
            </div>
            <div>
              <dt>{{ $t('company_detail.field.short_name') }}</dt>
              <dd>{{ displayValue(company.short_name) }}</dd>
            </div>
            <div>
              <dt>{{ $t('company_detail.field.slogan') }}</dt>
              <dd>{{ displayValue(company.slogan) }}</dd>
            </div>
          </dl>
        </section>

        <section class="company-dashboard-config-section">
          <h5>{{ $t('company_dashboard_config.sections.panels') }}</h5>
          <div v-if="panels.length" class="company-dashboard-config-panels">
            <article v-for="(panel, index) in panels" :key="panel.id" class="company-dashboard-config-panel">
              <div class="company-dashboard-config-panel__header">
                <span class="company-dashboard-config-panel__icon"><app-icon :name="panelIcon(panel.chart)" /></span>
                <div>
                  <h6>{{ panel.title || panel.id }}</h6>
                </div>
                <base-badge variant="info">{{ chartLabel(panel.chart) }}</base-badge>
              </div>
              <dl class="company-dashboard-config-panel__meta">
                <div>
                  <dt>{{ $t('company_dashboard_config.fields.grid') }}</dt>
                  <dd>{{ gridLabel(panel.grid, index) }}</dd>
                </div>
              </dl>
            </article>
          </div>
          <div v-else class="company-dashboard-config-empty">{{ $t('company_dashboard_config.no_panels') }}</div>
        </section>

      </template>
    </base-card>
  </div>
</template>

<script>
import { fetchCompanyDashboardConfig } from '@/api/company-dashboard-config'
import { fetchCompanyDetail } from '@/api/companies'
import { hasPermission, PERMISSION } from '@/utils/permission'
import { formatDate } from '@/utils/format'

export default {
  name: 'CompanyDashboardConfigDetail',
  data () {
    return {
      loading: false,
      item: null,
      company: {}
    }
  },
  computed: {
    companyId () {
      return this.$route.params.companyId
    },
    canManage () {
      return hasPermission(PERMISSION.PLATFORM_PERMISSION_MANAGE)
    },
    panels () {
      return Array.isArray(this.item?.config_json?.panels) ? this.item.config_json.panels : []
    }
  },
  created () {
    this.loadConfig()
  },
  methods: {
    async loadConfig () {
      this.loading = true
      try {
        const [item, company] = await Promise.all([
          fetchCompanyDashboardConfig(this.companyId),
          fetchCompanyDetail(this.companyId)
        ])
        this.item = item
        this.company = company?.data || company || {}
      } catch (error) {
        this.$uiToast.error(this.$t('company_dashboard_config.messages.load_failed', {
          message: this.$getErrorMessage(error)
        }))
      } finally {
        this.loading = false
      }
    },
    displayValue (value) {
      return value || '-'
    },
    panelIcon (chart) {
      return ({
        line: 'graph-up',
        area: 'graph-up',
        bar: 'bar-chart',
        pie: 'pie-chart',
        gauge: 'speedometer2',
        number: 'speedometer2',
        table: 'journal-text',
        stat: 'speedometer2'
      })[chart] || 'web-interface'
    },
    chartLabel (chart) {
      const supported = ['line', 'bar', 'pie', 'gauge', 'number', 'table']
      const key = supported.includes(chart) ? chart : 'unknown'
      return this.$t(`company_dashboard_config.chart_types.${key}`)
    },
    gridLabel (grid, index) {
      if (!grid) return '-'
      return `${this.$t('company_dashboard_config.panel_width', { count: grid.w })} · ${this.$t('company_dashboard_config.panel_order', { order: index + 1 })}`
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    goBack () {
      this.$router.push('/org/company-dashboard-config')
    },
    editConfig () {
      this.$router.push(`/org/company-dashboard-config/${this.companyId}/edit`)
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/company-dashboard-config.scss"></style>
