<template>
  <!-- 系统监控：健康检查 + 指标监控 -->
  <div class="system-monitor">
    <div class="page-head">
      <div>
        <h2>{{ $t('system_monitor.title') }}</h2>
        <p>{{ $t('system_monitor.subtitle') }}</p>
      </div>
      <div>
        <base-button @click="refreshAll" :title="$t('system_monitor.actions.refresh_all')">
          <app-icon name="arrow-clockwise" class="mr-1" />
          {{ $t('system_monitor.actions.refresh_all') }}
        </base-button>
      </div>
    </div>

    <b-tabs v-model="activeTabIndex" pills card class="system-monitor__tabs" @input="handleTabChange">
      <b-tab :title="$t('system_monitor.tabs.health')">
        <base-card>
          <template #header>
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ $t('system_monitor.health.card_title') }}</span>
              <base-button variant="outline-primary" size="sm" class="system-monitor__card-action" @click="checkHealth">
                <app-icon name="arrow-clockwise" />
                {{ $t('system_monitor.actions.check_now') }}
              </base-button>
            </div>
          </template>
          <div>
            <div v-if="healthLoading" class="text-center py-3 text-muted">
              <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
              {{ $t('system_monitor.health.loading') }}
            </div>
            <b-row class="health-grid">
              <b-col cols="12" md="6" xl="4" v-for="check in healthChecks" :key="check.key">
                <base-card class="health-card" :class="check.status">
                  <div class="health-card-content">
                    <div class="health-icon">
                      <app-icon :name="check.icon" />
                    </div>
                    <div class="health-info">
                      <div class="health-label">{{ check.label }}</div>
                      <div class="health-status">{{ check.statusText }}</div>
                      <div class="health-detail">{{ check.detail }}</div>
                    </div>
                  </div>
                </base-card>
              </b-col>
            </b-row>

            <div class="health-summary">
              <h4>{{ $t('system_monitor.health.summary_title') }}</h4>
              <base-alert :variant="alertVariant(readyStatus.type)" :dismissible="false">
                <strong>{{ readyStatus.title }}</strong>
                <div>{{ readyStatus.description }}</div>
              </base-alert>
            </div>
          </div>
        </base-card>
      </b-tab>

      <b-tab :title="$t('system_monitor.tabs.metrics')">
        <base-card>
          <template #header>
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ $t('system_monitor.metrics.card_title') }}</span>
              <base-button variant="outline-primary" size="sm" class="system-monitor__card-action" @click="fetchMetrics">
                <app-icon name="arrow-clockwise" />
                {{ $t('system_monitor.actions.refresh') }}
              </base-button>
            </div>
          </template>
          <div>
            <div v-if="metricsLoading" class="text-center py-3 text-muted">
              <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
              {{ $t('system_monitor.metrics.loading') }}
            </div>
            <div class="metrics-section">
              <h4>{{ $t('system_monitor.metrics.section_resource') }}</h4>
              <b-row>
                <b-col cols="12" md="6" xl="3">
                  <div class="metric-item">
                    <div class="metric-title">{{ $t('system_monitor.metrics.cpu') }}</div>
                    <div class="metric-value">{{ displayPercent(systemMetrics.cpu) }}</div>
                    <b-progress height="8px" :max="100">
                      <b-progress-bar :value="metricProgress(systemMetrics.cpu)" :variant="progressVariant(metricProgress(systemMetrics.cpu))" />
                    </b-progress>
                  </div>
                </b-col>
                <b-col cols="12" md="6" xl="3">
                  <div class="metric-item">
                    <div class="metric-title">{{ $t('system_monitor.metrics.memory') }}</div>
                    <div class="metric-value">{{ displayPercent(systemMetrics.memory) }}</div>
                    <b-progress height="8px" :max="100">
                      <b-progress-bar :value="metricProgress(systemMetrics.memory)" :variant="progressVariant(metricProgress(systemMetrics.memory))" />
                    </b-progress>
                  </div>
                </b-col>
                <b-col cols="12" md="6" xl="3">
                  <div class="metric-item">
                    <div class="metric-title">{{ $t('system_monitor.metrics.disk') }}</div>
                    <div class="metric-value">{{ displayPercent(systemMetrics.disk) }}</div>
                    <b-progress height="8px" :max="100">
                      <b-progress-bar :value="metricProgress(systemMetrics.disk)" :variant="progressVariant(metricProgress(systemMetrics.disk))" />
                    </b-progress>
                  </div>
                </b-col>
                <b-col cols="12" md="6" xl="3">
                  <div class="metric-item">
                    <div class="metric-title">{{ $t('system_monitor.metrics.db_conn') }}</div>
                    <div class="metric-value">{{ systemMetrics.db_connections }}</div>
                    <div class="metric-sub">{{ $t('system_monitor.metrics.db_active_max', { active: systemMetrics.db_active, max: systemMetrics.db_max }) }}</div>
                  </div>
                </b-col>
              </b-row>
            </div>

            <div class="metrics-section monitor-services">
              <h4>{{ $t('system_monitor.metrics.section_services') }}</h4>
              <base-table :items="serviceStatus" :fields="serviceStatusFields" bordered>
                <template #cell(status)="data">
                  <base-badge :variant="serviceStatusVariant(data.item.status)">
                    {{ serviceStatusLabel(data.item.status) }}
                  </base-badge>
                </template>
                <template #cell(health)="data">
                  <b-progress height="8px" :max="100">
                    <b-progress-bar :value="data.item.health" :variant="healthProgressVariant(data.item.health)" />
                  </b-progress>
                </template>
              </base-table>
            </div>
          </div>
        </base-card>
      </b-tab>

      <b-tab :title="$t('system_monitor.tabs.mqtt')">
        <base-card>
          <template #header>
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ $t('system_monitor.mqtt.card_title') }}</span>
              <base-button variant="outline-primary" size="sm" class="system-monitor__card-action" @click="refreshMqtt">
                <app-icon name="arrow-clockwise" />
                {{ $t('system_monitor.actions.refresh') }}
              </base-button>
            </div>
          </template>
          <div>
            <base-alert variant="info" class="mb-3">
              {{ $t('system_monitor.mqtt.scope_notice') }}
            </base-alert>
            <div v-if="mqttLoading" class="text-center py-3 text-muted">
              <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
              {{ $t('system_monitor.mqtt.loading') }}
            </div>
            <b-row class="mqtt-stats-grid">
              <b-col cols="12" md="6">
                <base-card class="mqtt-stats" :header="$t('system_monitor.mqtt.stats_title')">
                  <div class="stats-list">
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.backend_consumer_connections') }}</span><strong>{{ displayMetric(mqttStats.backend_consumer_connections) }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.debug_stream_subscribers') }}</span><strong>{{ displayMetric(mqttStats.debug_stream_subscribers) }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.buffer_messages') }}</span><strong>{{ displayMetric(mqttStats.buffer_messages) }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.buffer_topics') }}</span><strong>{{ displayMetric(mqttStats.buffer_topics) }}</strong></div>
                  </div>
                </base-card>
              </b-col>
              <b-col cols="12" md="6">
                <base-card class="mqtt-stats" :header="$t('system_monitor.mqtt.buffer_title')">
                  <div class="stats-list">
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.buffer_capacity') }}</span><strong>{{ displayMetric(mqttStats.buffer_capacity) }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.buffer_full') }}</span><strong>{{ mqttStats.buffer_full ? $t('common.yes') : $t('common.no') }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.oldest_buffered_at') }}</span><strong>{{ formatDateTime(mqttStats.oldest_buffered_at) }}</strong></div>
                    <div class="stats-item"><span>{{ $t('system_monitor.mqtt.newest_buffered_at') }}</span><strong>{{ formatDateTime(mqttStats.newest_buffered_at) }}</strong></div>
                  </div>
                </base-card>
              </b-col>
            </b-row>

            <div class="metrics-section monitor-topics">
              <h4>{{ $t('system_monitor.mqtt.topics_title') }}</h4>
              <base-table :items="topicTraffic" :fields="topicTrafficFields" bordered>
                <template #cell(last_active)="data">
                  {{ formatDateTime(data.item.last_active) }}
                </template>
              </base-table>
            </div>
          </div>
        </base-card>
      </b-tab>
    </b-tabs>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import { fetchSystemHealth, fetchSystemMetrics, fetchSystemMqtt } from '@/api/systemMonitor'
import { formatDate } from '@/utils/format'

const MONITOR_TAB_PATHS = ['/monitor/health', '/monitor/metrics', '/monitor/mqtt']

export default {
  name: 'SystemMonitor',
  components: {
    BaseAlert,
    BaseButton,
    BaseCard,
    BaseTable
  },
  data () {
    return {
      activeTabIndex: 0,
      healthLoading: false,
      metricsLoading: false,
      mqttLoading: false,
      healthChecks: [],
      readyStatus: {},
      systemMetrics: {},
      serviceStatus: [],
      mqttStats: {},
      topicTraffic: []
    }
  },
  computed: {
    serviceStatusFields () {
      return [
        { key: 'service', label: this.$t('system_monitor.service_table.service'), thStyle: { width: '180px' } },
        { key: 'status', label: this.$t('system_monitor.service_table.status'), thStyle: { width: '100px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'uptime', label: this.$t('system_monitor.service_table.uptime'), thStyle: { width: '120px' } },
        { key: 'version', label: this.$t('system_monitor.service_table.version'), thStyle: { width: '120px' } },
        { key: 'health', label: this.$t('system_monitor.service_table.health'), thStyle: { width: '120px' } }
      ]
    },
    topicTrafficFields () {
      return [
        { key: 'topic', label: this.$t('system_monitor.topic_table.topic'), thStyle: { minWidth: '200px' } },
        { key: 'observed_messages', label: this.$t('system_monitor.topic_table.observed_messages'), thStyle: { width: '150px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'scope', label: this.$t('system_monitor.topic_table.scope'), thStyle: { width: '180px' } },
        { key: 'last_active', label: this.$t('system_monitor.topic_table.last_active'), thStyle: { width: '180px' } }
      ]
    }
  },
  watch: {
    '$route.path': {
      immediate: true,
      handler (path) {
        const index = MONITOR_TAB_PATHS.indexOf(path)
        this.activeTabIndex = index >= 0 ? index : 0
      }
    }
  },
  created () {
    this.checkHealth()
    this.fetchMetrics()
    this.fetchMqttStats()
  },
  methods: {
    handleTabChange (index) {
      const path = MONITOR_TAB_PATHS[index]
      if (path && this.$route.path !== path) this.$router.push(path)
    },
    async checkHealth () {
      this.healthLoading = true
      try {
        const response = await fetchSystemHealth()
        const checks = response?.checks || {}
        const labels = {
          db: this.$t('system_monitor.health.label.db'),
          mqtt: this.$t('system_monitor.health.label.mqtt'),
          stats_scheduler: 'Stats Scheduler',
          retention_scheduler: 'Retention Scheduler'
        }
        const icons = {
          db: 'hdd-stack',
          mqtt: 'link-45deg',
          stats_scheduler: 'clock',
          retention_scheduler: 'archive'
        }
        this.healthChecks = Object.entries(checks).map(([key, check]) => {
          const status = check.status
          return {
            key,
            label: labels[key] || key,
            status,
            statusText: this.$t(`system_monitor.health.status_text.${['healthy', 'disabled'].includes(status) ? status : 'warning'}`),
            icon: icons[key] || 'activity',
            detail: this.formatCheckDetail(check.detail)
          }
        })
        const isReady = response?.status === 'ready'
        this.readyStatus = {
          title: isReady ? this.$t('system_monitor.health.ready_title') : this.$t('system_monitor.health.status_text.warning'),
          type: isReady ? 'success' : 'warning',
          description: isReady ? this.$t('system_monitor.health.ready_desc') : (response?.status || '-')
        }
      } catch (error) {
        this.healthChecks = []
        this.readyStatus = {
          title: this.$t('system_monitor.toast.health_failed'),
          type: 'danger',
          description: this.$getErrorMessage(error) || ''
        }
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('system_monitor.toast.health_failed'))
      } finally {
        this.healthLoading = false
      }
    },
    async fetchMetrics () {
      this.metricsLoading = true
      try {
        const response = await fetchSystemMetrics()
        this.systemMetrics = response?.system || {}
        this.serviceStatus = (response?.services || []).map(service => ({
          ...service,
          uptime: this.formatUptime(service.uptime_seconds)
        }))
      } catch (error) {
        this.systemMetrics = {}
        this.serviceStatus = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('system_monitor.toast.metrics_failed'))
      } finally {
        this.metricsLoading = false
      }
    },
    async fetchMqttStats () {
      this.mqttLoading = true
      try {
        const response = await fetchSystemMqtt()
        this.mqttStats = response?.stats || {}
        this.topicTraffic = response?.topics || []
      } catch (error) {
        this.mqttStats = {}
        this.topicTraffic = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('system_monitor.toast.mqtt_failed'))
      } finally {
        this.mqttLoading = false
      }
    },
    async refreshAll () {
      await Promise.all([this.checkHealth(), this.fetchMetrics(), this.fetchMqttStats()])
      this.$uiToast.success(this.$t('system_monitor.toast.refresh_all_success'))
    },
    refreshMqtt () {
      this.fetchMqttStats()
    },
    progressVariant (percentage) {
      if (percentage < 70) return 'success'
      if (percentage < 85) return 'warning'
      return 'danger'
    },
    healthProgressVariant (percentage) {
      if (percentage >= 90) return 'success'
      if (percentage >= 70) return 'warning'
      return 'danger'
    },
    metricProgress (value) {
      return Number.isFinite(Number(value)) ? Number(value) : 0
    },
    displayPercent (value) {
      return Number.isFinite(Number(value)) ? `${Number(value)}%` : '-'
    },
    alertVariant (type) {
      if (type === 'error') return 'danger'
      return type || 'info'
    },
    formatDateTime (dateString) {
      return dateString ? formatDate(dateString) : '-'
    },
    formatCheckDetail (detail) {
      // 后端健康检查 detail 可能是 ISO 时间戳，也可能是自由文本（postgresql / disabled by config / host:port），
      // 仅对 ISO 时间戳做本地化，其余原样展示
      if (!detail) return '-'
      const text = String(detail)
      return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(text) ? formatDate(text) : text
    },
    displayMetric (value) {
      return value === null || value === undefined ? '-' : value
    },
    serviceStatusVariant (status) {
      return { running: 'success', disabled: 'secondary', failed: 'warning', stopped: 'danger' }[status] || 'secondary'
    },
    serviceStatusLabel (status) {
      const key = ['running', 'disabled', 'failed', 'stopped'].includes(status) ? status : 'stopped'
      return this.$t(`system_monitor.service_table.${key}`)
    },
    formatUptime (seconds) {
      const total = Number(seconds) || 0
      const days = Math.floor(total / 86400)
      const hours = Math.floor((total % 86400) / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      return days ? `${days}d ${hours}h` : `${hours}h ${minutes}m`
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/system-monitor.scss"></style>
