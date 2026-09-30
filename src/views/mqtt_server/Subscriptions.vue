<template>
  <div class="mqtt-subs">
    <base-card v-if="health && !health.configured" class="text-center py-4 mqtt-notconfigured">
      <app-icon name="cloud-slash" font-scale="3" class="text-secondary mb-3" />
      <h5>{{ $t('mqtt_subscriptions.not_configured.title') }}</h5>
      <p class="text-muted mb-0">
        {{ $t('mqtt_subscriptions.not_configured.tip') }} <code>EMQX_DASHBOARD_URL/USERNAME/PASSWORD</code>。
      </p>
    </base-card>

    <list-page-card v-else-if="health" :total-rows="total" :page="pagination.page" :per-page="pagination.limit">
      <template #filters>
        <b-form @submit.prevent="onSearch">
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="filter.topic"
                class="filter-control"
                :placeholder="$t('mqtt_subscriptions.filter.topic_placeholder')" :clearable="false"
              />
              <base-input
                v-model.trim="filter.clientid"
                class="filter-control"
                :placeholder="$t('mqtt_subscriptions.filter.clientid_placeholder')" :clearable="false"
              />
              <div class="filter-actions">
                <base-button type="submit" variant="primary">
                  <app-icon name="search" /> {{ $t('mqtt_subscriptions.actions.search') }}
                </base-button>
                <base-button variant="outline-secondary" @click="onReset">
                  {{ $t('mqtt_subscriptions.actions.reset') }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
      </template>

      <base-table
          :items="rows"
          :fields="fields"
          :loading="loading"
          :load-error="loadError"
          small
          striped
          responsive
          :empty-text="$t('mqtt_subscriptions.table.empty')"
          @retry="loadList"
        >
          <template #table-busy>
            <div class="text-center my-3">
              <b-spinner small /> {{ $t('mqtt_subscriptions.table.loading') }}
            </div>
          </template>
          <template #cell(topic)="row">
            <code>{{ row.item.topic }}</code>
          </template>
          <template #cell(clientid)="row">
            <code>{{ row.item.clientid }}</code>
          </template>
          <template #cell(qos)="row">
            <base-badge :variant="qosVariant(row.item.qos)">QoS {{ row.item.qos }}</base-badge>
          </template>
          <template #cell(shared)="row">
            <base-badge v-if="isShared(row.item.topic)" variant="info">{{ $t('mqtt_subscriptions.table.shared_value') }}</base-badge>
            <span v-else class="text-muted">-</span>
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
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchMqttHealth, fetchMqttSubscriptions } from '@/api/mqtt_server'
import { createListPageMixin } from '@/mixins/listPage'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'MqttServerSubscriptions',
  components: { ListPageCard },
  mixins: [createListPageMixin({
    fetchPage: fetchMqttSubscriptions,
    initialFilters: () => ({ topic: '', clientid: '' }),
    errorMessageKey: 'mqtt_subscriptions.toast.load_failed',
    toastTitleKey: 'mqtt_subscriptions.toast.title'
  })],
  data () {
    return {
      health: null
    }
  },
  computed: {
    fields () {
      return [
        { key: 'clientid', label: this.$t('mqtt_subscriptions.table.client_id') },
        { key: 'topic', label: this.$t('mqtt_subscriptions.table.topic') },
        { key: 'qos', label: this.$t('mqtt_subscriptions.table.qos'), thStyle: { width: '90px' } },
        { key: 'shared', label: this.$t('mqtt_subscriptions.table.shared'), thStyle: { width: '100px' } },
        { key: 'node', label: this.$t('mqtt_subscriptions.table.node'), thStyle: { width: '160px' } }
      ]
    }
  },
  async mounted () {
    await this.loadHealth()
    if (this.health && this.health.configured) {
      await this.loadList()
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
          console.error('MQTT health 获取失败:', err)
          this.health = { configured: true, status: 'error' }
        }
      }
    },
    qosVariant (q) {
      if (q === 0) return 'secondary'
      if (q === 1) return 'primary'
      if (q === 2) return 'warning'
      return 'light'
    },
    isShared (topic) {
      // EMQX 共享订阅:$share/<group>/<topic> 或 $queue/<topic>
      return typeof topic === 'string' && (topic.startsWith('$share/') || topic.startsWith('$queue/'))
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/mqtt-server/subscriptions.scss"></style>
