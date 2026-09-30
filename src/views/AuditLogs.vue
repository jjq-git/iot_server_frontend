<template>
  <div class="audit-logs">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="audit-filters-form" @submit.prevent>
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              v-model="query.action"
              class="filter-control"
              :options="actionOptions"
              @input="handleSearch"
            />
            <div class="filter-control filter-control--date">
              <div class="date-range-controls">
                <base-input
                  v-model="query.start_date"
                  class="date-range-input"
                  type="date"
                  @change="handleSearch"
                />
                <span class="date-range-separator">-</span>
                <base-input
                  v-model="query.end_date"
                  class="date-range-input"
                  type="date"
                  @change="handleSearch"
                />
              </div>
            </div>
            <div class="filter-actions">
              <base-button class="audit-export-button" variant="outline-primary" :disabled="exporting" @click="handleExport">
                <app-icon name="download"  />
                {{ exporting ? $t('common.loading') : $t('common.export') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <!-- 审计日志列表 -->
      <base-table :items="tableData" :fields="visibleTableFields" :loading="loading" :load-error="loadError" :key="auditTableKey" bordered @retry="fetchData">
          <template #cell(uuid)="data">
            <span>{{ data.item.uuid }}</span>
          </template>

          <template #cell(operator_info)="data">
            <div v-if="auditOperator(data.item)">
              <div class="operator-name">{{ auditOperator(data.item).display_name || auditOperator(data.item).name || $t('audit_logs.unknown') }}</div>
              <div class="operator-email">{{ auditOperator(data.item).email }}</div>
            </div>
            <span v-else class="text-muted">{{ $t('audit_logs.system_op') }}</span>
          </template>

          <template #cell(action)="data">
            <base-badge :variant="getActionTag(data.item.action)">
              {{ getActionLabel(data.item.action) }}
            </base-badge>
          </template>

          <template #cell(target_type)="data">
            <base-badge :variant="getTargetTypeTag(data.item.target_type)">
              {{ getTargetTypeLabel(data.item.target_type) }}
            </base-badge>
          </template>

          <template #cell(target_id)="data">
            <span>{{ data.item.target_id }}</span>
          </template>

          <template #cell(result)="data">
            <base-badge :variant="data.item.result === 'success' ? 'success' : 'danger'">
              {{ $t(data.item.result === 'success' ? 'audit_logs.result.success' : 'audit_logs.result.failure') }}
            </base-badge>
          </template>

          <template #cell(ip)="data">
            <code>{{ data.item.ip || '-' }}</code>
          </template>

          <template #cell(event_at)="data">
            {{ formatDateTime(data.item.event_at) }}
          </template>

          <template #head(actions)>
            <div class="column-visibility-header">
              <column-visibility
                :columns="auditColumns"
                :table-key="'audit-logs-table'"
                @update:columns="handleAuditColumnsUpdate"
              />
            </div>
          </template>

          <template #cell(actions)="data">
            <base-action-button @click="viewDetail(data.item)" :title="$t('common.detail')">
              <app-icon name="eye"  /> <span>{{ $t('common.detail') }}</span>
            </base-action-button>
          </template>
      </base-table>

      <template #footer>
        <base-pagination
          v-model="query.page"
          :total-rows="total"
          :per-page.sync="query.page_size"
          :show-per-page="true"
          @input="handlePageChange"
        />
      </template>
    </list-page-card>

    <!-- 日志详情对话框 -->
    <base-modal
      id="audit-log-detail-modal"
      v-model="showDetailDialog"
      :title="$t('audit_logs.detail.title')"
      size="lg"
      ok-only
      :ok-title="$t('common.close')"
    >
      <div v-if="currentLog" class="audit-detail">
        <b-row>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('audit_logs.detail.log_id')">
              <div class="detail-value">{{ currentLog.uuid }}</div>
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('audit_logs.detail.created_at')">
              <div class="detail-value">{{ formatDateTime(currentLog.created_at) }}</div>
            </base-form-group>
          </b-col>
        </b-row>

        <base-form-group :label="$t('audit_logs.detail.operator')">
          <div v-if="auditOperator(currentLog)" class="detail-stack">
            <div>{{ $t('audit_logs.detail.name') }}: {{ auditOperator(currentLog).display_name || auditOperator(currentLog).name || $t('audit_logs.unknown') }}</div>
            <div>{{ $t('audit_logs.detail.email') }}: {{ auditOperator(currentLog).email }}</div>
            <div>{{ $t('audit_logs.detail.user_id') }}: {{ currentLog.operator_id }}</div>
          </div>
          <div v-else class="text-muted">{{ $t('audit_logs.system_op') }}</div>
        </base-form-group>

        <base-form-group :label="$t('audit_logs.detail.action_info')">
          <div class="detail-stack">
            <div>
              {{ $t('audit_logs.column.action') }}:
              <base-badge :variant="getActionTag(currentLog.action)">{{ getActionLabel(currentLog.action) }}</base-badge>
            </div>
            <div>
              {{ $t('audit_logs.column.target_type') }}:
              <base-badge :variant="getTargetTypeTag(currentLog.target_type)">{{ getTargetTypeLabel(currentLog.target_type) }}</base-badge>
            </div>
            <div>{{ $t('audit_logs.detail.target_id') }}: {{ currentLog.target_id }}</div>
            <div>
              {{ $t('audit_logs.detail.result') }}:
              <base-badge :variant="currentLog.result === 'success' ? 'success' : 'danger'">
                {{ $t(currentLog.result === 'success' ? 'audit_logs.result.success' : 'audit_logs.result.failure') }}
              </base-badge>
            </div>
          </div>
        </base-form-group>

        <base-form-group :label="$t('audit_logs.detail.environment')">
          <div class="detail-stack">
            <div>{{ $t('audit_logs.detail.ip') }}: {{ currentLog.ip || '-' }}</div>
            <div>{{ $t('audit_logs.column.event_at') }}: {{ formatDateTime(currentLog.event_at) }}</div>
            <div>{{ $t('audit_logs.detail.user_agent') }}: {{ currentLog.user_agent || '-' }}</div>
          </div>
        </base-form-group>

        <base-form-group :label="$t('audit_logs.detail.change_data')">
          <div v-if="detailLoading" class="text-muted detail-loading">
            {{ $t('common.loading') }}
          </div>
          <div v-else class="audit-diff">
            <section class="audit-diff__side">
              <h4>{{ $t('audit_logs.detail.before_data') }}</h4>
              <pre class="log-details">{{ formatAuditData(currentLog.before_data) }}</pre>
            </section>
            <section class="audit-diff__side">
              <h4>{{ $t('audit_logs.detail.after_data') }}</h4>
              <pre class="log-details">{{ formatAuditData(currentLog.after_data) }}</pre>
            </section>
          </div>
        </base-form-group>
      </div>
    </base-modal>
  </div>
</template>

<script>
import { exportAuditLogs, fetchAuditLogDetail, fetchAuditLogs } from '@/api'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import localizedColumns from '@/mixins/localizedColumns'
import { formatDate } from '@/utils/format'

// URL query 持久化字段（与 query 对象同名）。默认值不写 URL。
const URL_QUERY_FIELDS = ['page', 'page_size', 'action', 'start_date', 'end_date']
const URL_QUERY_DEFAULTS = {
  page: 1,
  page_size: 10,
  action: '',
  start_date: '',
  end_date: ''
}

export default {
  name: 'AuditLogs',
  mixins: [localizedColumns],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { auditColumns: 'buildAuditColumns' },
  components: {
    BaseFormGroup,
    BaseInput,
    BasePagination,
    BaseModal,
    BaseSelect,
    ColumnVisibility,
    ListPageCard
  },
  computed: {
    actionOptions () {
      const actions = new Set(['create', 'update', 'delete', 'login', 'logout', 'login_failure'])
      if (this.query.action) actions.add(this.query.action)
      this.tableData.forEach(item => {
        if (item?.action) actions.add(item.action)
      })
      return [
        { value: '', text: this.$t('common.all') },
        ...Array.from(actions).map(value => ({
          value,
          text: this.getActionLabel(value)
        }))
      ]
    },
    visibleTableFields () {
      const fieldConfig = {
        uuid: { key: 'uuid', label: this.$t('audit_logs.column.uuid'), thStyle: { minWidth: '200px' } },
        operator_info: { key: 'operator_info', label: this.$t('audit_logs.column.operator'), thStyle: { minWidth: '180px' } },
        action: { key: 'action', label: this.$t('audit_logs.column.action'), thStyle: { minWidth: '120px' } },
        target_type: { key: 'target_type', label: this.$t('audit_logs.column.target_type'), thStyle: { minWidth: '120px' } },
        target_id: { key: 'target_id', label: this.$t('audit_logs.column.target_id'), thStyle: { minWidth: '200px' } },
        result: { key: 'result', label: this.$t('audit_logs.column.result'), thStyle: { width: '80px' } },
        ip: { key: 'ip', label: this.$t('audit_logs.column.ip'), thStyle: { width: '140px' } },
        event_at: { key: 'event_at', label: this.$t('audit_logs.column.event_at'), thStyle: { width: '180px' } }
      }

      const visibleFields = this.auditColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])

      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    }
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
    }
  },
  data () {
    return {
      loading: false,
      loadError: '',
      tableData: [],
      total: 0,
      showDetailDialog: false,
      currentLog: null,
      detailLoading: false,
      exporting: false,
      auditTableKey: 0,
      auditColumns: this.buildAuditColumns(),
      query: {
        page: 1,
        page_size: 10,
        action: '',
        start_date: '',
        end_date: ''
      }
    }
  },
  created () {
    this._restoreFromUrl()
    this.fetchData()
  },
  methods: {
    auditOperator (log) {
      return log?.operator || log?.operator_info || null
    },
    buildAuditColumns () {
      return [
        { prop: 'uuid', label: this.$t('audit_logs.column.uuid'), visible: true },
        { prop: 'operator_info', label: this.$t('audit_logs.column.operator'), visible: true },
        { prop: 'action', label: this.$t('audit_logs.column.action'), visible: true },
        { prop: 'target_type', label: this.$t('audit_logs.column.target_type'), visible: true },
        { prop: 'target_id', label: this.$t('audit_logs.column.target_id'), visible: true },
        { prop: 'result', label: this.$t('audit_logs.column.result'), visible: true },
        { prop: 'ip', label: this.$t('audit_logs.column.ip'), visible: false },
        { prop: 'event_at', label: this.$t('audit_logs.column.event_at'), visible: true }
      ]
    },
    async fetchData () {
      this._syncToUrl()
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }

        if (this.query.action) params.action = this.query.action
        if (this.query.start_date) params.start_date = this.query.start_date
        if (this.query.end_date) params.end_date = this.query.end_date

        const res = await fetchAuditLogs(params)
        this.tableData = res?.list || res?.items || res?.data || []
        this.total = res?.total || this.tableData.length
      } catch (error) {
        this.tableData = []
        this.total = 0
        const msg = this.$getErrorMessage(error) || this.$t('audit_logs.toast.try_again')
        this.loadError = msg
        this.$uiToast.error(this.$t('audit_logs.toast.load_failed') + (this.$getErrorMessage(error) || this.$t('audit_logs.toast.try_again')))
      } finally {
        this.loading = false
      }
    },

    getActionLabel (action) {
      const map = {
        create: this.$t('audit_logs.action.create'),
        update: this.$t('audit_logs.action.update'),
        delete: this.$t('audit_logs.action.delete'),
        login: this.$t('audit_logs.action.login'),
        logout: this.$t('audit_logs.action.logout'),
        login_failure: this.$t('audit_logs.action.login_failure')
      }
      return map[action] || action
    },

    getActionTag (action) {
      const map = {
        create: 'success',
        update: 'warning',
        delete: 'danger',
        login: 'info',
        logout: '',
        login_failure: 'danger'
      }
      return map[action] || ''
    },

    getTargetTypeLabel (targetType) {
      const map = {
        user: this.$t('audit_logs.target.user'),
        company: this.$t('audit_logs.target.company'),
        pod: this.$t('audit_logs.target.pod'),
        host: this.$t('audit_logs.target.host'),
        node: this.$t('audit_logs.target.node'),
        file: this.$t('audit_logs.target.file'),
        auth: this.$t('audit_logs.target.auth')
      }
      return map[targetType] || targetType
    },

    getTargetTypeTag (targetType) {
      const map = {
        user: 'primary',
        company: 'info',
        pod: 'success',
        host: 'warning',
        node: '',
        file: ''
      }
      return map[targetType] || ''
    },

    // 接入统一 formatDate 工具(随 i18n.locale 自动切换);审计日志保留秒级精度
    formatDateTime (dateString) {
      return formatDate(dateString, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },

    handleSearch () {
      this.query.page = 1
      this.fetchData()
    },
    // 从 URL query 恢复筛选条件，进入页面/前进后退时调用
    _restoreFromUrl () {
      const q = this.$route.query || {}
      URL_QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const def = URL_QUERY_DEFAULTS[field]
        if (typeof def === 'number') {
          const n = parseInt(v, 10)
          this.query[field] = Number.isNaN(n) ? def : n
        } else {
          this.query[field] = v
        }
      })
    },
    // 把当前 query 写回 URL（默认值不写）
    _syncToUrl () {
      const next = {}
      URL_QUERY_FIELDS.forEach(field => {
        const v = this.query[field]
        const def = URL_QUERY_DEFAULTS[field]
        if (v === '' || v === null || v === undefined) return
        if (v === def) return
        next[field] = String(v)
      })
      const cur = this.$route.query || {}
      const sameKeys = Object.keys(cur).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(k => cur[k] === next[k])
      if (sameValues) return
      this.$router.replace({ query: next }).catch(() => {})
    },

    resetFilters () {
      this.query = {
        page: 1,
        page_size: 10,
        action: '',
        start_date: '',
        end_date: ''
      }
      this.fetchData()
    },

    handlePageChange (page) {
      this.query.page = page
      this.fetchData()
    },

    handleSizeChange (size) {
      this.query.page_size = size
      this.query.page = 1
      this.fetchData()
    },

    async viewDetail (log) {
      const requestedUuid = log.uuid
      this.currentLog = { ...log, before_data: null, after_data: null }
      this.showDetailDialog = true
      this.detailLoading = true
      try {
        const detail = await fetchAuditLogDetail(requestedUuid)
        if (this.currentLog?.uuid === requestedUuid) {
          this.currentLog = { ...this.currentLog, ...detail }
        }
      } catch (error) {
        const msg = this.$getErrorMessage(error) || this.$t('audit_logs.toast.try_again')
        this.$uiToast.error(this.$t('audit_logs.toast.detail_load_failed', { msg }))
      } finally {
        if (this.currentLog?.uuid === requestedUuid) this.detailLoading = false
      }
    },

    formatAuditData (value) {
      return value == null ? this.$t('common.no_data') : JSON.stringify(value, null, 2)
    },

    handleAuditColumnsUpdate (updatedColumns) {
      this.auditColumns = updatedColumns
      // 强制表格重新渲染以更新列显示
      this.auditTableKey += 1
    },

    buildExportParams () {
      const params = { format: 'csv' }
      if (this.query.action) params.action = this.query.action
      if (this.query.start_date) params.start_date = this.query.start_date
      if (this.query.end_date) params.end_date = this.query.end_date
      return params
    },

    async handleExport () {
      this.exporting = true
      try {
        const res = await exportAuditLogs(this.buildExportParams())
        const content = res?.content || JSON.stringify(res, null, 2)
        const ext = res?.format === 'csv' ? 'csv' : 'json'
        const type = res?.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
        const blob = new Blob([content], { type })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.${ext}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        if (res?.truncated) {
          this.$uiToast.warning(this.$t('audit_logs.toast.export_truncated', {
            exported: res.exported,
            total: res.total
          }))
        } else {
          this.$uiToast.success(this.$t('audit_logs.toast.export_success'))
        }
      } catch (error) {
        const msg = this.$getErrorMessage(error) || this.$t('audit_logs.toast.try_again')
        this.$uiToast.error(this.$t('audit_logs.toast.export_failed', { msg }))
      } finally {
        this.exporting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/audit-logs.scss"></style>
