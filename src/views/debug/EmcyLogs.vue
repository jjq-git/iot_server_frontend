<template>
  <div class="debug-emcy-logs">
    <list-page-card :total-rows="total" :per-page="limit">
      <template #header>
        <div class="interaction-list-heading">
          <span class="interaction-list-heading__mark" aria-hidden="true"></span>
          <h2>{{ $t('debug_emcy_logs.select_host') }}</h2>
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
              v-model.number="nid"
              type="number"
              min="1"
              max="127"
              :placeholder="$t('debug_emcy_logs.filters.node')"
              class="filter-control filter-control--compact" :clearable="false"
            />
            <base-input v-model.number="limit" type="number" min="50" max="1000" class="filter-control filter-control--compact" :clearable="false" />
            <div class="filter-actions">
              <base-button v-if="canLoadMore" variant="outline-secondary" @click="loadMore">
                <app-icon name="arrow-down"  />
                {{ $t('debug_emcy_logs.actions.load_more') }}
              </base-button>
              <base-button v-if="canClear" variant="outline-danger" :disabled="!selectedHost || clearing" @click="confirmClear">
                <b-spinner v-if="clearing" small />
                <app-icon name="trash" v-else />
                {{ $t('debug_emcy_logs.actions.clear') }}
              </base-button>
              <base-button variant="primary" :disabled="!selectedHost || loading" @click="loadLogs">
                <b-spinner v-if="loading" small />
                <app-icon name="arrow-clockwise" v-else />
                {{ $t('debug_emcy_logs.actions.refresh') }}
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
        :empty-text="$t('debug_emcy_logs.table.empty')"
        @retry="loadLogs"
      >
        <template #cell(event_at)="row"><code>{{ formatTime(row.item.event_at) }}</code></template>
        <template #cell(error_code)="row">
          <code>0x{{ formatHex(row.item.error_code, 4) }}</code>
        </template>
        <template #cell(error_register)="row">
          <code>0x{{ formatHex(row.item.error_register, 2) }}</code>
        </template>
        <template #cell(error_bit)="row">
          <code v-if="row.item.error_bit !== null && row.item.error_bit !== undefined">0x{{ formatHex(row.item.error_bit, 2) }}</code>
          <span v-else>-</span>
        </template>
        <template #cell(vendor_data)="row">
          <code v-if="row.item.vendor_data !== null && row.item.vendor_data !== undefined">0x{{ formatHex(row.item.vendor_data, 8) }}</code>
          <span v-else>-</span>
        </template>
      </base-table>
    </list-page-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchHosts } from '@/api/hosts'
import { clearEmcyLogs, fetchEmcyLogs } from '@/api/debug/logs'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import ListPageCard from '@/components/shared/ListPageCard.vue'

// URL query 持久化字段：刷新或后退时还原过滤条件
// 后端 limit 校验上限为 1000(le=1000),超过会 422
const MAX_LOG_LIMIT = 1000

const URL_QUERY_FIELDS = ['host', 'limit', 'since', 'nid']
const URL_QUERY_DEFAULTS = {
  host: '',
  limit: 200
}

export default {
  name: 'DebugEmcyLogs',
  components: { ListPageCard },
  data () {
    return {
      hosts: [],
      selectedHost: '',
      logs: [],
      limit: 200,
      since: '',
      nid: null,
      total: 0,
      liveRefreshTimer: null,
      loading: false,
      clearing: false,
      loadError: ''
    }
  },
  computed: {
    fields () {
      return [
        { key: 'event_at', label: this.$t('debug_emcy_logs.table.time'), thStyle: { width: '180px' } },
        { key: 'nid', label: this.$t('debug_emcy_logs.table.node'), thStyle: { width: '80px' } },
        { key: 'error_code', label: this.$t('debug_emcy_logs.table.error_code'), thStyle: { width: '120px' } },
        { key: 'error_register', label: this.$t('debug_emcy_logs.table.register'), thStyle: { width: '100px' } },
        { key: 'error_bit', label: this.$t('debug_emcy_logs.table.error_bit'), thStyle: { width: '100px' } },
        { key: 'vendor_data', label: this.$t('debug_emcy_logs.table.vendor_data'), thStyle: { width: '140px' } },
        { key: 'message', label: this.$t('debug_emcy_logs.table.description') }
      ]
    },
    canClear () {
      return hasPermission(PERMISSION.PLATFORM_DIAGNOSE, getCurrentUser())
    },
    canLoadMore () {
      return this.logs.length < this.total && this.limit < MAX_LOG_LIMIT
    },
    hostOptions () {
      const opts = (this.hosts || []).map(h => ({
        value: h.uuid,
        text: `${h.uuid}${h.status === 'online' ? this.$t('debug_emcy_logs.host_options.online_suffix') : ''}`
      }))
      return [{ value: '', text: this.$t('debug_emcy_logs.host_options.select_placeholder') }, ...opts]
    }
  },
  watch: {
    selectedHost () { this._syncQueryToUrl() },
    limit () { this._syncQueryToUrl() },
    since () { this._syncQueryToUrl() },
    nid () { this._syncQueryToUrl() },
    // 浏览器前进/后退：URL 变了同步回散列字段并按需重载
    $route (to, from) {
      if (to.path !== from.path) return
      const before = JSON.stringify({ host: this.selectedHost, limit: this.limit, since: this.since, nid: this.nid })
      this._restoreQueryFromUrl()
      const after = JSON.stringify({ host: this.selectedHost, limit: this.limit, since: this.since, nid: this.nid })
      if (before !== after && this.selectedHost) {
        this.loadLogs()
      }
    }
  },
  created () {
    // 进入页面：先把 URL query 写回散列字段，避免刷新丢状态
    this._restoreQueryFromUrl()
  },
  async mounted () {
    await this.loadHosts()
    if (this.selectedHost) {
      this.onHostChange()
    }
  },
  beforeDestroy () {
    wsManager.disconnect()
    if (this.liveRefreshTimer) clearTimeout(this.liveRefreshTimer)
  },
  methods: {
    // 把 URL query 写回散列字段（host / limit）
    _restoreQueryFromUrl () {
      const q = this.$route.query || {}
      if (q.host !== undefined) this.selectedHost = q.host
      if (q.limit !== undefined) {
        const n = parseInt(q.limit, 10)
        if (!Number.isNaN(n)) this.limit = Math.min(MAX_LOG_LIMIT, Math.max(1, n))
      }
      if (q.since !== undefined) this.since = q.since
      const queryNid = q.nid !== undefined ? q.nid : q.device_id
      if (queryNid !== undefined) {
        const n = parseInt(queryNid, 10)
        this.nid = Number.isNaN(n) ? null : n
      }
    },
    // 把散列字段写回 URL（默认值不写入避免污染）
    _syncQueryToUrl () {
      const next = {}
      const cur = {
        host: this.selectedHost,
        limit: this.limit,
        since: this.since,
        nid: this.nid
      }
      URL_QUERY_FIELDS.forEach(field => {
        const v = cur[field]
        if (v === '' || v === null || v === undefined) return
        if (v === URL_QUERY_DEFAULTS[field]) return
        next[field] = String(v)
      })
      const routeQuery = this.$route.query || {}
      const sameKeys = Object.keys(routeQuery).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(k => routeQuery[k] === next[k])
      if (sameValues) return
      this.$router.replace({ query: next }).catch(() => {})
    },
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (e) {
        console.error('加载主机列表失败', e)
      }
    },
    onHostChange () {
      wsManager.disconnect()
      this.logs = []
      this.total = 0
      if (!this.selectedHost) return
      wsManager.connectSingle(this.selectedHost, {
        emcyEvent: this.scheduleLiveRefresh
      })
      this.loadLogs()
    },
    scheduleLiveRefresh () {
      if (this.liveRefreshTimer) return
      this.liveRefreshTimer = setTimeout(() => {
        this.liveRefreshTimer = null
        this.loadLogs()
      }, 500)
    },
    loadMore () {
      this.limit = Math.min(MAX_LOG_LIMIT, this.limit + 200)
      this.loadLogs()
    },
    async loadLogs () {
      if (!this.selectedHost) return
      this.loading = true
      this.loadError = ''
      try {
        const params = { limit: Math.min(MAX_LOG_LIMIT, Math.max(1, Number(this.limit) || 200)) }
        if (this.since) params.since = new Date(this.since).toISOString()
        if (this.nid) params.nid = this.nid
        const data = await fetchEmcyLogs(this.selectedHost, params)
        this.logs = (data && (data.items || data.logs || data.data)) || data || []
        this.total = Number(data?.total ?? this.logs.length)
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('debug_emcy_logs.toast.load_failed')
        this.loadError = msg
        console.error('加载 EMCY 日志失败', e)
        this.$uiToast && this.$uiToast.toast(this.$t('debug_emcy_logs.toast.load_failed'), { variant: 'danger', title: this.$t('debug_emcy_logs.toast.error_title') })
      } finally {
        this.loading = false
      }
    },
    async confirmClear () {
      if (!this.selectedHost || !this.canClear) return
      const confirmed = await this.$uiConfirm(this.$t('debug_emcy_logs.confirm.clear'), {
        title: this.$t('common.confirm'),
        okTitle: this.$t('common.ok'),
        cancelTitle: this.$t('common.cancel'),
        okVariant: 'danger',
        centered: true
      })
      if (!confirmed) return
      this.clearing = true
      try {
        const result = await clearEmcyLogs(this.selectedHost)
        this.$uiToast && this.$uiToast.toast(this.$t('debug_emcy_logs.toast.cleared', { count: result?.deleted_count || 0 }), { variant: 'success' })
        await this.loadLogs()
      } catch (e) {
        const msg = this.$getErrorMessage(e)
        this.$uiToast && this.$uiToast.toast(msg, { variant: 'danger', title: this.$t('debug_emcy_logs.toast.error_title') })
      } finally {
        this.clearing = false
      }
    },
    formatTime (t) {
      if (!t) return '-'
      const ms = typeof t === 'number' ? (t > 1e12 ? t : t * 1000) : Date.parse(t)
      if (isNaN(ms)) return String(t)
      const d = new Date(ms)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    },
    formatHex (n, width = 2) {
      if (n === null || n === undefined) return '0'.repeat(width)
      return Number(n).toString(16).toUpperCase().padStart(width, '0')
    },
    formatBytes (data) {
      if (!data) return ''
      if (Array.isArray(data)) {
        return data.map(b => Number(b).toString(16).toUpperCase().padStart(2, '0')).join(' ')
      }
      return String(data)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/emcy-logs.scss"></style>
