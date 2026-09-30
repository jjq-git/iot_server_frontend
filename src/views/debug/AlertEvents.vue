<template>
  <div class="debug-emcy-logs">
    <list-page-card :total-rows="total" :per-page="limit">
      <template #header>
        <div class="interaction-list-heading">
          <span class="interaction-list-heading__mark" aria-hidden="true"></span>
          <h2>{{ $t('debug_alert_events.select_host') }}</h2>
        </div>
      </template>
      <template #filters>
        <b-form @submit.stop.prevent="loadEvents">
          <div class="filter-row">
            <div class="filter-left">
              <base-select
                v-model="selectedHost"
                :options="hostOptions"
                class="filter-control debug-filter-host"
                @change="onHostChange"
              />
              <base-input v-model="since" type="datetime-local" class="filter-control filter-control--date" :clearable="false" />
              <base-input
                v-model.number="nid"
                type="number"
                min="1"
                max="127"
                :placeholder="$t('debug_emcy_logs.filters.node')"
                class="filter-control filter-control--compact"
                :clearable="false"
              />
              <base-select v-model="status" :options="statusOptions" class="filter-control" />
              <base-input v-model.number="limit" type="number" min="50" max="1000" class="filter-control filter-control--compact" :clearable="false" />
              <div class="filter-actions">
                <base-button v-if="canLoadMore" variant="outline-secondary" @click="loadMore">
                  <app-icon name="arrow-down" />
                  {{ $t('debug_emcy_logs.actions.load_more') }}
                </base-button>
                <base-button variant="primary" :disabled="!selectedHost || loading" @click="loadEvents">
                  <b-spinner v-if="loading" small />
                  <app-icon v-else name="arrow-clockwise" />
                  {{ $t('debug_emcy_logs.actions.refresh') }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
      </template>

      <base-table
        :items="events"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        small
        striped
        responsive
        sticky-header="60vh"
        :empty-text="$t('debug_alert_events.table.empty')"
        @retry="loadEvents"
      >
        <template #cell(event_at)="row"><code>{{ formatTime(row.item.event_at) }}</code></template>
        <template #cell(severity)="row">
          <base-badge :variant="severityVariant(row.item.severity)">{{ row.item.severity }}</base-badge>
        </template>
        <template #cell(status)="row">
          <base-badge :variant="row.item.status === 'firing' ? 'danger' : 'success'">
            {{ statusLabel(row.item.status) }}
          </base-badge>
        </template>
        <template #cell(value)="row"><code>{{ formatNumber(row.item.value) }}</code></template>
        <template #cell(threshold)="row"><code>{{ formatNumber(row.item.threshold) }}</code></template>
      </base-table>
    </list-page-card>
  </div>
</template>

<script>
import { fetchHosts } from '@/api/hosts'
import { fetchAlertEvents } from '@/api/debug/logs'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import { formatDate } from '@/utils/format'

// 后端 limit 校验上限为 1000(le=1000),超过会 422
const MAX_LOG_LIMIT = 1000

const URL_QUERY_FIELDS = ['host', 'limit', 'since', 'nid', 'status']
const URL_QUERY_DEFAULTS = { host: '', limit: 200, status: '' }

export default {
  name: 'DebugAlertEvents',
  components: { ListPageCard },
  data () {
    return {
      hosts: [],
      selectedHost: '',
      events: [],
      limit: 200,
      since: '',
      nid: null,
      status: '',
      total: 0,
      loading: false,
      loadError: ''
    }
  },
  computed: {
    fields () {
      return [
        { key: 'event_at', label: this.$t('debug_alert_events.table.time') },
        { key: 'nid', label: this.$t('debug_alert_events.table.node') },
        { key: 'rule_key', label: this.$t('debug_alert_events.table.rule') },
        { key: 'severity', label: this.$t('debug_alert_events.table.severity') },
        { key: 'metric', label: this.$t('debug_alert_events.table.metric') },
        { key: 'value', label: this.$t('debug_alert_events.table.value') },
        { key: 'threshold', label: this.$t('debug_alert_events.table.threshold') },
        { key: 'status', label: this.$t('debug_alert_events.table.status') },
        { key: 'message', label: this.$t('debug_alert_events.table.message') }
      ]
    },
    statusOptions () {
      return [
        { value: '', text: this.$t('debug_alert_events.filters.all') },
        { value: 'firing', text: this.$t('debug_alert_events.filters.firing') },
        { value: 'resolved', text: this.$t('debug_alert_events.filters.resolved') }
      ]
    },
    hostOptions () {
      return [
        { value: '', text: this.$t('debug_emcy_logs.host_options.select_placeholder') },
        ...this.hosts.map(host => ({
          value: host.uuid,
          text: `${host.uuid}${host.status === 'online' ? this.$t('debug_emcy_logs.host_options.online_suffix') : ''}`
        }))
      ]
    },
    canLoadMore () {
      return this.events.length < this.total && this.limit < MAX_LOG_LIMIT
    }
  },
  watch: {
    selectedHost () { this.syncQuery() },
    limit () { this.syncQuery() },
    since () { this.syncQuery() },
    nid () { this.syncQuery() },
    status () { this.syncQuery() }
  },
  created () {
    this.restoreQuery()
  },
  async mounted () {
    await this.loadHosts()
    if (this.selectedHost) await this.loadEvents()
  },
  methods: {
    restoreQuery () {
      const query = this.$route.query || {}
      if (query.host !== undefined) this.selectedHost = query.host
      if (query.since !== undefined) this.since = query.since
      if (query.status !== undefined) this.status = query.status
      if (query.limit !== undefined) {
        const value = parseInt(query.limit, 10)
        if (!Number.isNaN(value)) this.limit = Math.min(MAX_LOG_LIMIT, Math.max(1, value))
      }
      if (query.nid !== undefined) {
        const value = parseInt(query.nid, 10)
        this.nid = Number.isNaN(value) ? null : value
      }
    },
    syncQuery () {
      const current = { host: this.selectedHost, limit: this.limit, since: this.since, nid: this.nid, status: this.status }
      const query = {}
      URL_QUERY_FIELDS.forEach(key => {
        const value = current[key]
        if (value === '' || value === null || value === undefined || value === URL_QUERY_DEFAULTS[key]) return
        query[key] = String(value)
      })
      const old = this.$route.query || {}
      const keysMatch = Object.keys(old).sort().join(',') === Object.keys(query).sort().join(',')
      if (keysMatch && Object.keys(query).every(key => old[key] === query[key])) return
      this.$router.replace({ query }).catch(() => {})
    },
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error))
      }
    },
    onHostChange () {
      this.events = []
      this.total = 0
      if (this.selectedHost) this.loadEvents()
    },
    loadMore () {
      this.limit = Math.min(MAX_LOG_LIMIT, this.limit + 200)
      this.loadEvents()
    },
    async loadEvents () {
      if (!this.selectedHost) return
      this.loading = true
      this.loadError = ''
      try {
        const params = { limit: Math.min(MAX_LOG_LIMIT, Math.max(1, Number(this.limit) || 200)) }
        if (this.since) params.since = new Date(this.since).toISOString()
        if (this.nid) params.nid = this.nid
        if (this.status) params.status = this.status
        const data = await fetchAlertEvents(this.selectedHost, params)
        this.events = (data && (data.items || data.data)) || data || []
        this.total = Number(data && data.total) || this.events.length
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('debug_emcy_logs.toast.load_failed')
        this.$uiToast.error(this.loadError)
      } finally {
        this.loading = false
      }
    },
    statusLabel (status) {
      return this.$t(`debug_alert_events.filters.${status}`)
    },
    severityVariant (severity) {
      return severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'info'
    },
    formatNumber (value) {
      return value === null || value === undefined ? '-' : String(value)
    },
    formatTime (value) {
      return formatDate(value, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/emcy-logs.scss"></style>
