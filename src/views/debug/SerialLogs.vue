<template>
  <div class="debug-serial-logs">
    <list-page-card :total-rows="total" :per-page="limit">
      <template #header>
        <div class="interaction-list-heading">
          <span class="interaction-list-heading__mark" aria-hidden="true"></span>
          <h2>{{ $t('debug_serial_logs.card_select_host') }}</h2>
        </div>
      </template>
      <template #filters>
        <b-form @submit.stop.prevent="loadLogs">
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
              v-model.number="nidFilter"
              type="number"
              min="1"
              max="127"
              class="filter-control filter-control--compact debug-filter-nid"
              :placeholder="$t('debug_serial_logs.filters.nid')"
            />
            <base-select v-model="sourceFilter" :options="sourceOptions" class="filter-control" />
            <base-select v-model="triggerFilter" :options="triggerOptions" class="filter-control" />
            <base-select v-model="levelFilter" :options="levelOptions" class="filter-control" />
            <base-input v-model.number="limit" type="number" min="1" max="1000" class="filter-control filter-control--compact debug-filter-limit" :clearable="false" />
            <div class="filter-actions">
              <base-button v-if="canLoadMore" variant="outline-secondary" @click="loadMore">
                <app-icon name="arrow-down" />
                {{ $t('debug_serial_logs.actions.load_more') }}
              </base-button>
              <base-button variant="primary" :disabled="!selectedHost || loading" @click="loadLogs">
                <b-spinner v-if="loading" small />
                <app-icon name="arrow-clockwise" v-else />
                {{ $t('debug_serial_logs.actions.refresh') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="logs"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        small
        striped
        responsive
        sticky-header="60vh"
        :empty-text="$t('debug_serial_logs.empty_text')"
        @retry="loadLogs"
      >
        <template #cell(started_at)="row">
          <code>{{ formatTime(row.item.started_at) }}</code>
        </template>
        <template #cell(ended_at)="row">
          <code>{{ formatTime(row.item.ended_at) }}</code>
        </template>
        <template #cell(level)="row">
          <base-badge :variant="levelVariant(row.item.level)">{{ row.item.level || '-' }}</base-badge>
        </template>
        <template #cell(file_name)="row">
          <span class="debug-serial-logs__file" :title="row.item.file_name">{{ row.item.file_name }}</span>
        </template>
        <template #cell(size)="row">
          {{ formatSize(row.item.size) }}
        </template>
        <template #cell(actions)="row">
          <base-button
            size="sm"
            variant="outline-primary"
            :disabled="downloadingId === row.item.id"
            @click="downloadLog(row.item)"
          >
            <b-spinner v-if="downloadingId === row.item.id" small />
            <app-icon name="download" v-else />
            {{ $t('debug_serial_logs.actions.download') }}
          </base-button>
        </template>
      </base-table>
    </list-page-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchHosts } from '@/api/hosts'
import { fetchDeviceLogFiles } from '@/api/debug/logs'
import { downloadFile } from '@/api/files'
import ListPageCard from '@/components/shared/ListPageCard.vue'

// 后端 limit 校验上限为 1000(le=1000),超过会 422
const MAX_LOG_LIMIT = 1000

const URL_QUERY_FIELDS = ['host', 'nid', 'source', 'trigger', 'level', 'limit', 'since']
const URL_QUERY_DEFAULTS = {
  host: '',
  nid: null,
  source: 'all',
  trigger: 'all',
  level: 'all',
  limit: 200,
  since: ''
}

export default {
  name: 'DebugSerialLogs',
  components: { ListPageCard },
  data () {
    return {
      hosts: [],
      selectedHost: '',
      loading: false,
      loadError: '',
      downloadingId: null,
      limit: 200,
      since: '',
      total: 0,
      logs: [],
      nidFilter: null,
      sourceFilter: 'all',
      triggerFilter: 'all',
      levelFilter: 'all'
    }
  },
  computed: {
    sourceOptions () {
      return [
        { value: 'all', text: this.$t('debug_serial_logs.source_options.all') },
        { value: 'esp_log', text: 'ESP_LOG' },
        { value: 'crash', text: 'CRASH' },
        { value: 'ota', text: 'OTA' },
        { value: 'can', text: 'CAN' }
      ]
    },
    triggerOptions () {
      return [
        { value: 'all', text: this.$t('debug_serial_logs.trigger_options.all') },
        { value: 'manual', text: this.$t('debug_serial_logs.trigger_options.manual') },
        { value: 'crash', text: this.$t('debug_serial_logs.trigger_options.crash') },
        { value: 'ota_failed', text: this.$t('debug_serial_logs.trigger_options.ota_failed') },
        { value: 'watchdog', text: this.$t('debug_serial_logs.trigger_options.watchdog') }
      ]
    },
    levelOptions () {
      return [
        { value: 'all', text: this.$t('debug_serial_logs.level_options.all') },
        { value: 'E', text: 'E' },
        { value: 'W', text: 'W' },
        { value: 'I', text: 'I' },
        { value: 'D', text: 'D' },
        { value: 'V', text: 'V' }
      ]
    },
    fields () {
      return [
        { key: 'started_at', label: this.$t('debug_serial_logs.fields.started_at'), thStyle: { width: '170px' } },
        { key: 'ended_at', label: this.$t('debug_serial_logs.fields.ended_at'), thStyle: { width: '170px' } },
        { key: 'nid', label: 'NID', thStyle: { width: '70px' } },
        { key: 'source', label: this.$t('debug_serial_logs.fields.source'), thStyle: { width: '90px' } },
        { key: 'trigger_type', label: this.$t('debug_serial_logs.fields.trigger_type'), thStyle: { width: '110px' } },
        { key: 'level', label: this.$t('debug_serial_logs.fields.level'), thStyle: { width: '70px' } },
        { key: 'line_count', label: this.$t('debug_serial_logs.fields.line_count'), thStyle: { width: '90px' } },
        { key: 'file_name', label: this.$t('debug_serial_logs.fields.file_name'), thStyle: { minWidth: '180px' } },
        { key: 'size', label: this.$t('debug_serial_logs.fields.size'), thStyle: { width: '100px' } },
        { key: 'actions', label: this.$t('debug_serial_logs.fields.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    hostOptions () {
      const options = (this.hosts || []).map(host => ({
        value: host.uuid,
        text: `${host.uuid}${host.status === 'online' ? this.$t('debug_serial_logs.host_status_online') : ''}`
      }))
      return [{ value: '', text: this.$t('debug_serial_logs.host_select_placeholder') }, ...options]
    },
    canLoadMore () {
      return this.logs.length < this.total && this.limit < MAX_LOG_LIMIT
    }
  },
  watch: {
    selectedHost () { this._syncQueryToUrl() },
    nidFilter () { this._syncQueryToUrl() },
    sourceFilter () { this._syncQueryToUrl() },
    triggerFilter () { this._syncQueryToUrl() },
    levelFilter () { this._syncQueryToUrl() },
    limit () { this._syncQueryToUrl() },
    since () { this._syncQueryToUrl() },
    $route (to, from) {
      if (to.path !== from.path) return
      const before = this._filterSnapshot()
      this._restoreQueryFromUrl()
      if (before !== this._filterSnapshot() && this.selectedHost) this.loadLogs()
    }
  },
  created () {
    this._restoreQueryFromUrl()
  },
  async mounted () {
    await this.loadHosts()
    if (this.selectedHost) this.loadLogs()
  },
  methods: {
    _filterSnapshot () {
      return JSON.stringify({
        host: this.selectedHost,
        nid: this.nidFilter,
        source: this.sourceFilter,
        trigger: this.triggerFilter,
        level: this.levelFilter,
        limit: this.limit,
        since: this.since
      })
    },
    _restoreQueryFromUrl () {
      const query = this.$route.query || {}
      if (query.host !== undefined) this.selectedHost = query.host
      if (query.nid !== undefined) {
        const nid = parseInt(query.nid, 10)
        this.nidFilter = Number.isNaN(nid) ? null : nid
      }
      if (query.source !== undefined) this.sourceFilter = query.source
      if (query.trigger !== undefined) this.triggerFilter = query.trigger
      if (query.level !== undefined) this.levelFilter = query.level
      if (query.since !== undefined) this.since = query.since
      if (query.limit !== undefined) {
        const limit = parseInt(query.limit, 10)
        if (!Number.isNaN(limit)) this.limit = Math.min(MAX_LOG_LIMIT, Math.max(1, limit))
      }
    },
    _syncQueryToUrl () {
      const next = {}
      const current = {
        host: this.selectedHost,
        nid: this.nidFilter,
        source: this.sourceFilter,
        trigger: this.triggerFilter,
        level: this.levelFilter,
        limit: this.limit,
        since: this.since
      }
      URL_QUERY_FIELDS.forEach(field => {
        const value = current[field]
        if (value === '' || value === null || value === undefined) return
        if (value === URL_QUERY_DEFAULTS[field]) return
        next[field] = String(value)
      })
      const routeQuery = this.$route.query || {}
      const sameKeys = Object.keys(routeQuery).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(key => routeQuery[key] === next[key])
      if (!sameValues) this.$router.replace({ query: next }).catch(() => {})
    },
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (error) {
        console.error(this.$t('debug_serial_logs.log.load_hosts_failed'), error)
      }
    },
    onHostChange () {
      this.logs = []
      this.total = 0
      if (this.selectedHost) this.loadLogs()
    },
    loadMore () {
      this.limit = Math.min(MAX_LOG_LIMIT, this.limit + 200)
      this.loadLogs()
    },
    async loadLogs () {
      if (!this.selectedHost) return
      this.loading = true
      this.loadError = ''
      const params = { limit: Math.min(MAX_LOG_LIMIT, Math.max(1, Number(this.limit) || 200)) }
      if (this.since) params.since = new Date(this.since).toISOString()
      if (this.nidFilter !== null && this.nidFilter !== '') params.nid = this.nidFilter
      if (this.sourceFilter !== 'all') params.source = this.sourceFilter
      if (this.triggerFilter !== 'all') params.trigger_type = this.triggerFilter
      if (this.levelFilter !== 'all') params.level = this.levelFilter
      try {
        const data = await fetchDeviceLogFiles(this.selectedHost, params)
        this.logs = (data && (data.items || data.data)) || []
        this.total = Number(data?.total ?? this.logs.length)
      } catch (error) {
        this.logs = []
        this.total = 0
        const message = this.$getErrorMessage(error) || this.$t('debug_serial_logs.log.load_logs_failed')
        this.loadError = message
        this.$uiToast && this.$uiToast.toast(message, { variant: 'danger', title: this.$t('debug_serial_logs.toast.error_title') })
      } finally {
        this.loading = false
      }
    },
    async downloadLog (item) {
      this.downloadingId = item.id
      try {
        const blob = await downloadFile(item.file_uuid)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = item.file_name || `device-log-${item.id}.log`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (error) {
        const message = this.$getErrorMessage(error) || this.$t('debug_serial_logs.log.download_failed')
        this.$uiToast && this.$uiToast.toast(message, { variant: 'danger', title: this.$t('debug_serial_logs.toast.error_title') })
      } finally {
        this.downloadingId = null
      }
    },
    formatTime (value) {
      if (!value) return '-'
      const milliseconds = typeof value === 'number' ? (value > 1e12 ? value : value * 1000) : Date.parse(value)
      if (Number.isNaN(milliseconds)) return String(value)
      const date = new Date(milliseconds)
      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    formatSize (bytes) {
      const value = Number(bytes)
      if (!Number.isFinite(value) || value < 0) return '-'
      if (value < 1024) return `${value} B`
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
      return `${(value / (1024 * 1024)).toFixed(1)} MB`
    },
    levelVariant (level) {
      const value = (level || '').toUpperCase()
      if (value === 'E') return 'danger'
      if (value === 'W') return 'warning'
      if (value === 'I') return 'info'
      if (value === 'D') return 'secondary'
      return 'light'
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/serial-logs.scss"></style>
