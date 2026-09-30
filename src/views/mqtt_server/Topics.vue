<template>
  <div class="mqtt-topics">
    <base-card v-if="health && !health.configured" class="text-center py-4 mqtt-notconfigured">
      <app-icon name="cloud-slash" font-scale="3" class="text-secondary mb-3" />
      <h5>{{ $t('mqtt_topics.not_configured_title') }}</h5>
      <p class="text-muted mb-0">
        {{ $t('mqtt_topics.not_configured_desc_prefix') }}<code>EMQX_DASHBOARD_URL/USERNAME/PASSWORD</code>{{ $t('mqtt_topics.not_configured_desc_suffix') }}
      </p>
    </base-card>

    <div v-else-if="health">
      <!-- 上半:路由表 -->
      <list-page-card :total-rows="total" :page="pagination.page" :per-page="pagination.limit">
        <template #header>
          <div class="interaction-list-heading">
            <span class="interaction-list-heading__mark" aria-hidden="true"></span>
            <h2>{{ $t('mqtt_topics.routes_card_header') }}</h2>
          </div>
        </template>
        <template #filters>
          <b-form @submit.prevent="onSearch">
            <div class="filter-row">
              <div class="filter-left">
                <base-input
                  v-model.trim="filter.topic"
                  class="filter-control"
                  :placeholder="$t('mqtt_topics.topic_filter_placeholder')" :clearable="false"
                />
                <div class="filter-actions">
                  <base-button type="submit" variant="primary">
                    <app-icon name="search" /> {{ $t('mqtt_topics.search') }}
                  </base-button>
                  <base-button variant="outline-secondary" @click="onReset">
                    {{ $t('mqtt_topics.reset') }}
                  </base-button>
                </div>
              </div>
            </div>
          </b-form>
        </template>
        <base-table
            :items="rows"
            :fields="topicFields"
            :loading="loading"
            :load-error="loadError"
            small
            striped
            responsive
            :empty-text="$t('mqtt_topics.empty_routes')"
            @retry="loadList"
          >
            <template #table-busy>
              <div class="text-center my-3">
                <b-spinner small /> {{ $t('mqtt_topics.loading') }}
              </div>
            </template>
            <template #cell(topic)="row">
              <code>{{ row.item.topic }}</code>
            </template>
        </base-table>
        <template #footer>
          <base-pagination
            v-model="pagination.page"
            :total-rows="total"
            :per-page="pagination.limit"
            :show-per-page="true"
            @input="onPageChange"
            @update:perPage="onPageSizeChange"
          />
        </template>
      </list-page-card>

      <!-- 下半:主题指标 -->
      <base-card class="mqtt-topics__metrics" :header="$t('mqtt_topics.metrics_card_header')">
        <base-table
          :items="metricRows"
          :fields="metricFields"
          :loading="loadingMetrics"
          :load-error="metricsLoadError"
          small
          striped
          responsive
          :empty-text="$t('mqtt_topics.empty_metrics')"
          @retry="loadMetrics"
        >
          <template #table-busy>
            <div class="text-center my-3">
              <b-spinner small /> {{ $t('mqtt_topics.loading') }}
            </div>
          </template>
          <template #cell(metric)="row">
            <code>{{ row.item.metric }}</code>
          </template>
          <template #cell(value)="row">
            <strong>{{ formatNum(row.item.value) }}</strong>
          </template>
        </base-table>
      </base-card>
    </div>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  fetchMqttHealth,
  fetchMqttTopics,
  fetchMqttTopicMetrics
} from '@/api/mqtt_server'
import { createListPageMixin } from '@/mixins/listPage'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'MqttServerTopics',
  components: { ListPageCard },
  mixins: [createListPageMixin({
    fetchPage: fetchMqttTopics,
    initialFilters: () => ({ topic: '' }),
    errorMessageKey: 'mqtt_topics.toast.fetch_failed',
    toastTitleKey: 'mqtt_topics.toast.title'
  })],
  data () {
    return {
      health: null,
      loadingMetrics: false,
      metricsLoadError: '',
      metricRows: []
    }
  },
  computed: {
    topicFields () {
      return [
        { key: 'topic', label: this.$t('mqtt_topics.fields.topic') },
        { key: 'node', label: this.$t('mqtt_topics.fields.node'), thStyle: { width: '180px' } },
        { key: 'clientid_count', label: this.$t('mqtt_topics.fields.clientid_count'), thStyle: { width: '100px' } }
      ]
    },
    metricFields () {
      return [
        { key: 'metric', label: this.$t('mqtt_topics.fields.metric') },
        { key: 'value', label: this.$t('mqtt_topics.fields.value'), thStyle: { width: '180px' } }
      ]
    }
  },
  async mounted () {
    await this.loadHealth()
    if (this.health && this.health.configured) {
      await Promise.all([this.loadList(), this.loadMetrics()])
    }
  },
  methods: {
    async loadHealth () {
      try {
        this.health = await fetchMqttHealth()
      } catch (err) {
        if (err && err.response && err.response.status === 503) {
          this.health = { configured: false, status: 'error' }
        } else {
          console.error(this.$t('mqtt_topics.log.health_failed'), err)
          this.health = { configured: true, status: 'error' }
        }
      }
    },
    async loadMetrics () {
      this.loadingMetrics = true
      this.metricsLoadError = ''
      try {
        const res = await fetchMqttTopicMetrics()
        // 后端返回可能是 [{topic, metrics:{...}}, ...] 或 {key: value} 平铺
        // 这里两种都接,统一拍扁成 [{metric, value}, ...]
        this.metricRows = this.flattenMetrics(res)
      } catch (err) {
        const msg = this.$getErrorMessage(err) || ''
        this.metricsLoadError = msg
        console.error(this.$t('mqtt_topics.log.metrics_failed'), err)
        this.metricRows = []
      } finally {
        this.loadingMetrics = false
      }
    },
    flattenMetrics (data) {
      const rows = []
      if (!data) return rows
      if (Array.isArray(data)) {
        // [{topic, metrics:{...}}, ...]
        for (const item of data) {
          const topic = item.topic || ''
          const m = item.metrics || {}
          for (const k of Object.keys(m)) {
            rows.push({ metric: topic ? `${topic} :: ${k}` : k, value: m[k] })
          }
        }
      } else if (typeof data === 'object') {
        if (Array.isArray(data.data)) return this.flattenMetrics(data.data)
        // 平铺 {key: value}
        for (const k of Object.keys(data)) {
          const v = data[k]
          if (typeof v === 'object' && v !== null) {
            for (const sk of Object.keys(v)) {
              rows.push({ metric: `${k}.${sk}`, value: v[sk] })
            }
          } else {
            rows.push({ metric: k, value: v })
          }
        }
      }
      return rows
    },
    formatNum (n) {
      if (n === null || n === undefined) return '-'
      const num = Number(n)
      if (isNaN(num)) return String(n)
      return num.toLocaleString()
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/mqtt-server/topics.scss"></style>
