<template>
  <div class="mqtt-clients">
    <!-- 未配置降级 -->
    <base-card v-if="health && !health.configured" class="text-center py-4 mqtt-notconfigured">
      <app-icon name="cloud-slash" font-scale="3" class="text-secondary mb-3" />
      <h5>{{ $t('mqtt_clients.not_configured.title') }}</h5>
      <p class="text-muted mb-0">
        {{ $t('mqtt_clients.not_configured.tip') }} <code>EMQX_DASHBOARD_URL/USERNAME/PASSWORD</code>。
      </p>
    </base-card>

    <list-page-card v-else-if="health" :total-rows="total" :page="pagination.page" :per-page="pagination.limit">
      <template #filters>
        <b-form @submit.prevent="onSearch">
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="filter.clientid"
                class="filter-control"
                :placeholder="$t('mqtt_clients.filter.clientid_placeholder')" :clearable="false"
              />
              <base-input
                v-model.trim="filter.username"
                class="filter-control"
                :placeholder="$t('mqtt_clients.filter.username_placeholder')" :clearable="false"
              />
              <div class="filter-actions">
                <base-button type="submit" variant="primary">
                  <app-icon name="search" /> {{ $t('mqtt_clients.actions.search') }}
                </base-button>
                <base-button variant="outline-secondary" @click="onReset">
                  {{ $t('mqtt_clients.actions.reset') }}
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
          :empty-text="$t('mqtt_clients.table.empty')"
          @retry="loadList"
        >
          <template #table-busy>
            <div class="text-center my-3">
              <b-spinner small /> {{ $t('mqtt_clients.table.loading') }}
            </div>
          </template>
          <template #cell(connected)="row">
            <base-badge :variant="row.item.connected ? 'success' : 'secondary'">
              {{ $t(row.item.connected ? 'mqtt_clients.status.online' : 'mqtt_clients.status.offline') }}
            </base-badge>
          </template>
          <template #cell(clientid)="row">
            <code>{{ row.item.clientid }}</code>
          </template>
          <template #cell(connected_at)="row">
            <small>{{ formatTime(row.item.connected_at) }}</small>
          </template>
          <template #cell(actions)="row">
            <div class="action-cell action-cell--nowrap">
              <base-action-button
                :title="$t('mqtt_clients.actions.details')"
                :aria-label="$t('mqtt_clients.actions.details')"
                @click="openDetail(row.item)"
              >
                <app-icon name="info-circle"  />
                <span>{{ $t('mqtt_clients.actions.details') }}</span>
              </base-action-button>
              <base-action-button
                v-if="canWrite"
                :title="$t('mqtt_clients.actions.kick')"
                :aria-label="$t('mqtt_clients.actions.kick')"
                :disabled="!row.item.connected"
                @click="confirmDisconnect(row.item)"
              >
                <app-icon name="power"  />
                <span>{{ $t('mqtt_clients.actions.kick') }}</span>
              </base-action-button>
            </div>
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

    <!-- 详情 modal -->
    <base-modal
      v-model="detailModal.show"
      :title="$t('mqtt_clients.detail_modal.title', { clientid: detailModal.clientid })"
      size="lg"
      ok-only
      :ok-title="$t('mqtt_clients.detail_modal.close')" :centered="false" :scrollable="false"
    >
      <div v-if="detailModal.loading" class="text-center py-3">
        <b-spinner small /> {{ $t('mqtt_clients.table.loading') }}
      </div>
      <pre v-else class="mqtt-clients__detail-json">{{ stringify(detailModal.data) }}</pre>
    </base-modal>

    <!-- 强制下线 modal -->
    <base-modal
      v-model="kickModal.show"
      :title="$t('mqtt_clients.kick_modal.title')"
      ok-variant="danger"
      :ok-title="$t('mqtt_clients.kick_modal.ok')"
      :cancel-title="$t('mqtt_clients.kick_modal.cancel')"
      :busy="kickModal.busy"
      @ok="doDisconnect" :centered="false" :scrollable="false"
    >
      <p>
        {{ $t('mqtt_clients.kick_modal.body') }} <code>{{ kickModal.clientid }}</code>
      </p>
      <p class="text-muted small mb-0">
        {{ $t('mqtt_clients.kick_modal.tip') }}
      </p>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  fetchMqttHealth,
  fetchMqttClients,
  fetchMqttClientDetail,
  disconnectMqttClient
} from '@/api/mqtt_server'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { createListPageMixin } from '@/mixins/listPage'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'MqttServerClients',
  components: { ListPageCard },
  mixins: [createListPageMixin({
    fetchPage: fetchMqttClients,
    initialFilters: () => ({ clientid: '', username: '' }),
    errorMessageKey: 'mqtt_clients.toast.load_failed',
    toastTitleKey: 'mqtt_clients.toast.title'
  })],
  data () {
    return {
      health: null,
      detailModal: {
        show: false,
        clientid: '',
        loading: false,
        data: null
      },
      kickModal: {
        show: false,
        busy: false,
        clientid: ''
      }
    }
  },
  computed: {
    canWrite () {
      try {
        return hasPermission(PERMISSION.MQTT_ADMIN, getCurrentUser())
      } catch (err) {
        return false
      }
    },
    fields () {
      return [
        { key: 'clientid', label: this.$t('mqtt_clients.table.client_id') },
        { key: 'username', label: this.$t('mqtt_clients.table.username') },
        { key: 'connected', label: this.$t('mqtt_clients.table.status'), thStyle: { width: '80px' } },
        { key: 'proto_ver', label: this.$t('mqtt_clients.table.proto'), thStyle: { width: '70px' } },
        { key: 'ip_address', label: this.$t('mqtt_clients.table.ip'), thStyle: { width: '140px' } },
        { key: 'connected_at', label: this.$t('mqtt_clients.table.connected_at'), thStyle: { width: '180px' } },
        { key: 'actions', label: this.$t('mqtt_clients.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
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
    async openDetail (item) {
      this.detailModal.clientid = item.clientid
      this.detailModal.show = true
      this.detailModal.loading = true
      this.detailModal.data = null
      try {
        this.detailModal.data = await fetchMqttClientDetail(item.clientid)
      } catch (err) {
        console.error('获取客户端详情失败:', err)
        this.detailModal.data = { error: this.$t('mqtt_clients.toast.load_failed') + ': ' + (this.$getErrorMessage(err) || String(err)) }
      } finally {
        this.detailModal.loading = false
      }
    },
    confirmDisconnect (item) {
      this.kickModal.clientid = item.clientid
      this.kickModal.show = true
    },
    async doDisconnect (bvEvt) {
      // 异步提交：先同步阻止默认关闭，成功后再手动关闭，失败保留弹窗允许重试
      if (bvEvt) bvEvt.preventDefault()
      if (this.kickModal.busy || !this.kickModal.clientid) return
      this.kickModal.busy = true
      try {
        await disconnectMqttClient(this.kickModal.clientid)
        if (this.$uiToast) {
          this.$uiToast.toast(this.$t('mqtt_clients.toast.kicked', { clientid: this.kickModal.clientid }), { title: this.$t('mqtt_clients.toast.title'), variant: 'success' })
        }
        this.kickModal.show = false
        await this.loadList()
      } catch (err) {
        console.error('强制下线失败:', err)
        const msg = (err && err.response && err.response.data && err.response.data.error) || this.$getErrorMessage(err) || this.$t('mqtt_clients.toast.kick_failed')
        if (this.$uiToast) {
          this.$uiToast.toast(msg, { title: this.$t('mqtt_clients.toast.title'), variant: 'danger' })
        }
      } finally {
        this.kickModal.busy = false
      }
    },
    formatTime (ts) {
      if (!ts) return '-'
      const d = typeof ts === 'string' ? new Date(ts) : new Date(ts * 1000)
      return isNaN(d.getTime()) ? String(ts) : formatDate(d)
    },
    stringify (obj) {
      try {
        return JSON.stringify(obj, null, 2)
      } catch (err) {
        return String(obj)
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/mqtt-server/clients.scss"></style>
