<template>
  <div class="company-dashboard-config-page company-dashboard-config-page--list">
    <list-page-card
      :total-rows="total"
      :page="page"
      :per-page="pageSize"
      :show-footer="!loadError"
    >
      <template #header>
        <div class="company-dashboard-config-page__header">
          <div>
            <h4 class="mb-1">{{ $t('company_dashboard_config.title') }}</h4>
            <p class="text-muted mb-0">{{ $t('company_dashboard_config.description') }}</p>
          </div>
          <div class="company-dashboard-config-page__header-actions">
            <base-button variant="outline-secondary" :disabled="loading" @click="loadData">
              <app-icon name="arrow-clockwise" class="mr-1" />
              {{ $t('common.refresh') }}
            </base-button>
            <base-button v-if="canManage" variant="primary" @click="createConfig">
              <app-icon name="plus-circle" class="mr-1" />
              {{ $t('company_dashboard_config.create') }}
            </base-button>
          </div>
        </div>
      </template>

      <base-table
        :items="items"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        :empty-text="$t('company_dashboard_config.empty')"
        :show-empty="!loadError"
        @retry="loadData"
      >
        <template #cell(company_id)="data">
          <div class="font-weight-semibold">{{ companyLabel(data.item.company_id, data.item.company_name) }}</div>
          <small class="text-muted">ID: {{ data.item.company_id }}</small>
        </template>
        <template #cell(is_active)="data">
          <base-badge :variant="data.item.is_active ? 'success' : 'secondary'">
            {{ data.item.is_active ? $t('common.enabled') : $t('common.disabled') }}
          </base-badge>
        </template>
        <template #cell(panel_count)="data">
          {{ panelCount(data.item) }}
        </template>
        <template #cell(updated_at)="data">
          {{ formatDateTime(data.item.updated_at) }}
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button :title="$t('common.view')" :aria-label="$t('common.view')" @click="viewConfig(data.item)">
              <app-icon name="eye" />
              <span>{{ $t('common.view') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canManage"
              :title="$t('common.edit')"
              :aria-label="$t('common.edit')"
              @click="editConfig(data.item)"
            >
              <app-icon name="pencil" />
              <span>{{ $t('common.edit') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canManage && data.item.is_active"
              class="text-danger"
              :title="$t('common.disable')"
              :aria-label="$t('common.disable')"
              :disabled="deactivatingId !== null"
              @click="deactivateConfig(data.item)"
            >
              <app-icon name="slash-circle" />
              <span>{{ $t('common.disable') }}</span>
            </base-action-button>
          </div>
        </template>
      </base-table>

      <template #footer>
        <base-pagination
          v-if="total > pageSize"
          v-model="page"
          :total-rows="total"
          :per-page="pageSize"
          @input="loadData"
        />
      </template>
    </list-page-card>
  </div>
</template>

<script>
import {
  deactivateCompanyDashboardConfig,
  fetchCompanyDashboardConfigs
} from '@/api/company-dashboard-config'
import { fetchCompanies } from '@/api/companies'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import { hasPermission, PERMISSION } from '@/utils/permission'
import { formatDate } from '@/utils/format'
import { fetchAllPages } from '@/utils/pagination.mjs'

export default {
  name: 'CompanyDashboardConfigs',
  components: { ListPageCard },
  data () {
    return {
      loading: false,
      deactivatingId: null,
      loadError: '',
      items: [],
      companies: [],
      total: 0,
      page: 1,
      pageSize: 20
    }
  },
  computed: {
    canManage () {
      return hasPermission(PERMISSION.PLATFORM_PERMISSION_MANAGE)
    },
    fields () {
      return [
        { key: 'company_id', label: this.$t('company_dashboard_config.fields.company') },
        { key: 'is_active', label: this.$t('company_dashboard_config.fields.status'), thClass: 'text-center', class: 'text-center' },
        { key: 'panel_count', label: this.$t('company_dashboard_config.fields.panels'), thClass: 'text-center', class: 'text-center' },
        { key: 'updated_at', label: this.$t('common.updated_at') },
        { key: 'actions', label: this.$t('common.actions'), thClass: 'actions-cell', class: 'actions-cell' }
      ]
    }
  },
  created () {
    this.loadData()
  },
  methods: {
    async loadData () {
      this.loading = true
      this.loadError = ''
      try {
        const configResponse = await fetchCompanyDashboardConfigs({ page: this.page, page_size: this.pageSize })
        this.items = configResponse?.items || []
        this.total = configResponse?.total || 0
        if (this.canManage && this.companies.length === 0) {
          try {
            this.companies = await fetchAllPages(fetchCompanies)
          } catch (error) {
            this.$uiToast.error(this.$t('company_dashboard_config.messages.companies_failed', {
              message: this.$getErrorMessage(error)
            }))
          }
        }
      } catch (error) {
        this.items = []
        this.total = 0
        this.loadError = this.$t('company_dashboard_config.messages.load_failed', {
          message: this.$getErrorMessage(error)
        })
      } finally {
        this.loading = false
      }
    },
    companyLabel (companyId, companyName = '') {
      if (companyName) return companyName
      const company = this.companies.find(item => Number(item.id) === Number(companyId))
      return company?.short_name || company?.company_name || this.$t('company_dashboard_config.company_id', { id: companyId })
    },
    panelCount (item) {
      return Array.isArray(item?.config_json?.panels) ? item.config_json.panels.length : 0
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    createConfig () {
      this.$router.push('/org/company-dashboard-config/new')
    },
    viewConfig (item) {
      this.$router.push(`/org/company-dashboard-config/${item.company_id}`)
    },
    editConfig (item) {
      this.$router.push(`/org/company-dashboard-config/${item.company_id}/edit`)
    },
    async deactivateConfig (item) {
      if (this.deactivatingId !== null) return
      const confirmed = await this.$uiConfirm(
        this.$t('company_dashboard_config.messages.deactivate_confirm', {
          company: this.companyLabel(item.company_id, item.company_name)
        }),
        {
          title: this.$t('common.confirm'),
          okTitle: this.$t('common.disable'),
          cancelTitle: this.$t('common.cancel'),
          variant: 'danger'
        }
      )
      if (!confirmed) return
      this.deactivatingId = item.company_id
      try {
        await deactivateCompanyDashboardConfig(item.company_id)
        this.$uiToast.success(this.$t('company_dashboard_config.messages.deactivated'))
        await this.loadData()
      } catch (error) {
        this.$uiToast.error(this.$t('company_dashboard_config.messages.deactivate_failed', {
          message: this.$getErrorMessage(error)
        }))
      } finally {
        this.deactivatingId = null
      }
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/company-dashboard-config.scss"></style>
