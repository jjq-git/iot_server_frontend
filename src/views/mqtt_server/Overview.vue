<template>
  <div class="mqtt-overview">
    <!-- 顶部标题 + 状态徽章 -->
    <div class="mqtt-overview__toolbar">
      <div class="mqtt-overview__toolbar-actions">
        <b-badge v-if="health && health.status === 'ok'" variant="success" class="mr-2">
          {{ $t('mqtt_overview.status.running', { version: health.version || '' }) }}
        </b-badge>
        <b-badge v-else-if="health && !health.configured" variant="secondary" class="mr-2">
          {{ $t('mqtt_overview.status.not_configured') }}
        </b-badge>
        <b-badge v-else variant="warning" class="mr-2">
          {{ $t('mqtt_overview.status.connection_error') }}
        </b-badge>
        <base-button size="sm" variant="outline-primary" :disabled="loading" @click="loadAll">
          <app-icon name="arrow-clockwise" /> {{ $t('mqtt_overview.actions.refresh') }}
        </base-button>
      </div>
    </div>

    <!-- 未配置:友好降级,不渲染统计 -->
    <base-card v-if="health && !health.configured" class="mqtt-overview__notconfigured">
      <div class="text-center py-4">
        <app-icon name="cloud-slash" font-scale="3" class="text-secondary mb-3" />
        <h5>{{ $t('mqtt_overview.not_configured.title') }}</h5>
        <p class="text-muted mb-0">
          {{ $t('mqtt_overview.not_configured.tip') }} <code>EMQX_DASHBOARD_URL</code> /
          <code>EMQX_DASHBOARD_USERNAME</code> / <code>EMQX_DASHBOARD_PASSWORD</code>。
        </p>
      </div>
    </base-card>

    <template v-else-if="health && health.status === 'ok'">
      <!-- 第一排:4 个核心统计卡片 -->
      <div class="mqtt-overview__row mqtt-overview__row--summary">
        <base-card class="mqtt-stat" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.connections') }}</div>
          <div class="mqtt-stat__value">{{ formatNum(stat('connections_count')) }}</div>
          <small class="text-muted">{{ $t('mqtt_overview.stat.sessions_sub', { count: formatNum(stat('sessions_count')) }) }}</small>
        </base-card>
        <base-card class="mqtt-stat" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.subscriptions') }}</div>
          <div class="mqtt-stat__value">{{ formatNum(stat('subscriptions_count')) }}</div>
          <small class="text-muted">{{ $t('mqtt_overview.stat.shared_subscriptions_sub', { count: formatNum(stat('shared_subscriptions_count')) }) }}</small>
        </base-card>
        <base-card class="mqtt-stat" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.topics') }}</div>
          <div class="mqtt-stat__value">{{ formatNum(stat('topics_count')) }}</div>
          <small class="text-muted">{{ $t('mqtt_overview.stat.routes_sub', { count: formatNum(stat('routes_count')) }) }}</small>
        </base-card>
        <base-card class="mqtt-stat" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.retained') }}</div>
          <div class="mqtt-stat__value">{{ formatNum(stat('retained_msg_count')) }}</div>
          <small class="text-muted">{{ $t('mqtt_overview.stat.retained_sub') }}</small>
        </base-card>
      </div>

      <!-- 第二排:消息速率 -->
      <div class="mqtt-overview__row mqtt-overview__row--rates">
        <base-card class="mqtt-stat mqtt-stat--rate" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.received_rate') }}</div>
          <div class="mqtt-stat__value mqtt-stat__value--rate">
            {{ formatRate(stat('received_msg_rate')) }}
          </div>
          <div class="mqtt-stat__bar">
            <div
              class="mqtt-stat__bar-fill mqtt-stat__bar-fill--in"
              :style="{ width: rateBarPct(stat('received_msg_rate')) + '%' }"
            ></div>
          </div>
        </base-card>
        <base-card class="mqtt-stat mqtt-stat--rate" body-class="mqtt-stat__body">
          <div class="mqtt-stat__label">{{ $t('mqtt_overview.stat.sent_rate') }}</div>
          <div class="mqtt-stat__value mqtt-stat__value--rate">
            {{ formatRate(stat('sent_msg_rate')) }}
          </div>
          <div class="mqtt-stat__bar">
            <div
              class="mqtt-stat__bar-fill mqtt-stat__bar-fill--out"
              :style="{ width: rateBarPct(stat('sent_msg_rate')) + '%' }"
            ></div>
          </div>
        </base-card>
      </div>

      <!-- 第三排:节点列表 -->
      <base-card class="mqtt-overview__nodes" :header="$t('mqtt_overview.nodes_card')">
        <base-table
          :items="overview && overview.nodes ? overview.nodes : []"
          :fields="nodeFields"
          small
          striped
          responsive
          :empty-text="$t('mqtt_overview.node_table.empty')"
          show-empty
        >
          <template #cell(uptime)="row">
            {{ formatUptime(row.item.uptime) }}
          </template>
          <template #cell(role)="row">
            <b-badge variant="info">{{ row.item.role || '-' }}</b-badge>
          </template>
        </base-table>
      </base-card>

      <small class="mqtt-overview__refresh-status text-muted">{{ $t('mqtt_overview.next_refresh', { count: nextRefreshIn }) }}</small>
    </template>

    <!-- 异常状态(已配置但 status != ok) -->
    <base-card v-else-if="health" class="text-center py-4">
      <app-icon name="exclamation-triangle" font-scale="3" class="text-warning mb-3" />
      <h5>{{ $t('mqtt_overview.error.title') }}</h5>
      <p class="text-muted">{{ $t('mqtt_overview.error.tip') }}</p>
      <base-button variant="primary" size="sm" @click="loadAll">{{ $t('mqtt_overview.actions.retry') }}</base-button>
    </base-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchMqttHealth, fetchMqttOverview } from '@/api/mqtt_server'

const REFRESH_INTERVAL_MS = 30000
const MONITOR_CURRENT_ALIASES = Object.freeze({
  connections_count: 'connections',
  sessions_count: 'live_connections',
  subscriptions_count: 'subscriptions',
  shared_subscriptions_count: 'shared_subscriptions',
  topics_count: 'topics',
  routes_count: 'topics'
})

export default {
  name: 'MqttServerOverview',
  data () {
    return {
      loading: false,
      health: null,
      overview: null,
      refreshTimer: null,
      tickTimer: null,
      lastLoadAt: 0,
      nowTs: Date.now()
    }
  },
  computed: {
    nodeFields () {
      return [
        { key: 'node', label: this.$t('mqtt_overview.node_table.node') },
        { key: 'node_status', label: this.$t('mqtt_overview.node_table.status') },
        { key: 'version', label: this.$t('mqtt_overview.node_table.version') },
        { key: 'role', label: this.$t('mqtt_overview.node_table.role') },
        { key: 'uptime', label: this.$t('mqtt_overview.node_table.uptime') },
        { key: 'connections', label: this.$t('mqtt_overview.node_table.connections') }
      ]
    },
    nextRefreshIn () {
      const elapsed = (this.nowTs - this.lastLoadAt) / 1000
      const remain = Math.max(0, Math.round(REFRESH_INTERVAL_MS / 1000 - elapsed))
      return remain
    }
  },
  async mounted () {
    await this.loadHealth()
    if (this.health && this.health.configured) {
      await this.loadOverview()
      this.startTimers()
    }
  },
  beforeDestroy () {
    this.stopTimers()
  },
  methods: {
    async loadHealth () {
      try {
        this.health = await fetchMqttHealth()
      } catch (err) {
        // 503 → 后端代理表示未配置;走友好降级
        if (err && err.response && err.response.status === 503) {
          this.health = { configured: false, status: 'error' }
        } else {
          console.error('MQTT health 获取失败:', err)
          this.health = { configured: true, status: 'error' }
        }
      }
    },
    async loadOverview () {
      this.loading = true
      try {
        this.overview = await fetchMqttOverview()
        this.lastLoadAt = Date.now()
      } catch (err) {
        console.error('MQTT overview 获取失败:', err)
        if (this.$uiToast) {
          this.$uiToast.toast(this.$t('mqtt_overview.toast.fetch_failed'), { title: this.$t('mqtt_overview.toast.title'), variant: 'danger' })
        }
      } finally {
        this.loading = false
      }
    },
    async loadAll () {
      await this.loadHealth()
      if (this.health && this.health.configured) {
        await this.loadOverview()
      }
    },
    startTimers () {
      this.stopTimers()
      this.refreshTimer = setInterval(() => this.loadOverview(), REFRESH_INTERVAL_MS)
      this.tickTimer = setInterval(() => { this.nowTs = Date.now() }, 1000)
    },
    stopTimers () {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
      if (this.tickTimer) clearInterval(this.tickTimer)
      this.refreshTimer = null
      this.tickTimer = null
    },
    stat (key) {
      if (!this.overview) return 0
      const source = this.overview.monitor_current || this.overview
      const fallbackKey = MONITOR_CURRENT_ALIASES[key]
      const v = source[key] ?? (fallbackKey ? source[fallbackKey] : undefined)
      return (v === null || v === undefined) ? 0 : v
    },
    formatNum (n) {
      if (n === null || n === undefined) return '-'
      const num = Number(n)
      if (isNaN(num)) return String(n)
      return num.toLocaleString()
    },
    formatRate (n) {
      const num = Number(n)
      if (isNaN(num)) return '0.00'
      return num.toFixed(2)
    },
    rateBarPct (n) {
      const num = Number(n) || 0
      // 简单线性映射:0~1000 msg/s 映射 0~100%,超过封顶
      return Math.min(100, Math.round(num / 10))
    },
    formatUptime (sec) {
      if (sec === null || sec === undefined) return '-'
      const s = Number(sec)
      if (isNaN(s) || s < 0) return String(sec)
      const days = Math.floor(s / 86400)
      const hours = Math.floor((s % 86400) / 3600)
      const minutes = Math.floor((s % 3600) / 60)
      if (days > 0) return this.$t('mqtt_overview.uptime.days_hours', { days, hours })
      if (hours > 0) return this.$t('mqtt_overview.uptime.hours_minutes', { hours, minutes })
      return this.$t('mqtt_overview.uptime.minutes', { minutes })
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/mqtt-server/overview.scss"></style>
