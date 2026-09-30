<template>
  <div class="enrollment-list">
    <section class="interaction-stats" :aria-label="$t('device_enrollment.title')">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        :class="['interaction-stat', `interaction-stat--${card.variant}`]"
      >
        <span class="interaction-stat__icon"><app-icon :name="card.icon" /></span>
        <span class="interaction-stat__label">{{ card.label }}</span>
        <strong class="interaction-stat__value">{{ card.value }}</strong>
      </article>
    </section>

    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="enrollment-list__filters" @submit.prevent="applyFilters">
        <div class="filter-row">
          <div class="filter-left">
            <base-input
              v-model.trim="query.search"
              class="filter-control enrollment-search"
              :placeholder="$t('device_enrollment.search')"
              @keyup.enter="applyFilters"
            />
            <base-select
              v-model="query.state"
              class="filter-control"
              :options="stateOptions"
              @input="applyFilters"
            />
            <base-select
              v-model="query.online"
              class="filter-control"
              :options="onlineOptions"
              @input="applyFilters"
            />
            <div class="filter-actions">
              <base-button type="submit">
                <app-icon name="search"  />
                {{ $t('common.search') }}
              </base-button>
              <base-button variant="outline-secondary" @click="resetFilters">
                <app-icon name="arrow-counterclockwise"  />
                {{ $t('common.reset') }}
              </base-button>
              <base-button variant="outline-secondary" :disabled="loading" @click="refresh">
                <app-icon name="arrow-clockwise"  />
                {{ $t('common.refresh') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-alert v-if="disabled" variant="warning" show>{{ $t('device_enrollment.disabled') }}</base-alert>
      <base-table
        :items="items"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        :empty-text="$t('device_enrollment.empty')"
        show-empty
        bordered
        @retry="refresh"
      >
        <template #cell(first_seen_at)="data">{{ formatDate(data.item.first_seen_at) }}</template>
        <template #cell(device)="data">
          <div class="font-weight-bold">{{ data.item.serial }}</div>
          <div class="small text-muted text-monospace text-truncate enrollment-uuid">{{ data.item.host_uuid }}</div>
        </template>
        <template #cell(topology)="data">
          <div>{{ $t('device_enrollment.node_count', { count: data.item.node_count }) }}</div>
          <div class="small text-muted">H: {{ data.item.matched_host_model_id || '-' }} · P: {{ data.item.matched_pod_model_id || '-' }}</div>
        </template>
        <template #cell(state)="data">
          <base-badge :variant="stateVariant(data.item.state)">{{ stateLabel(data.item.state) }}</base-badge>
          <div v-if="data.item.error_code" class="small text-danger mt-1">
            {{ data.item.error_code }} · {{ enrollmentErrorLabel(data.item.error_code) }}
          </div>
        </template>
        <template #cell(mqtt_connection)="data">
          <base-badge :variant="connectionVariant(data.item)">
            {{ connectionLabel(data.item) }}
          </base-badge>
        </template>
        <template #cell(online)="data">
          <base-badge :variant="data.item.online ? 'info' : 'secondary'">
            {{ $t(data.item.online ? 'device_enrollment.report_recent' : 'device_enrollment.report_stale') }}
          </base-badge>
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button :title="$t('common.detail')" @click="openDetail(data.item)">
              <app-icon name="eye"  /><span>{{ $t('common.detail') }}</span>
            </base-action-button>
          </div>
        </template>
      </base-table>

      <template #footer>
        <base-pagination
          v-model="query.page"
          :total-rows="total"
          :per-page.sync="query.page_size"
          :show-per-page="true"
          @input="refresh"
        />
      </template>
    </list-page-card>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import {
  fetchDeviceEnrollments,
  fetchDeviceEnrollmentPresences,
  fetchDeviceEnrollmentSummary
} from '@/api/deviceEnrollments'
import { formatDate as formatDateUtil } from '@/utils/format'

export default {
  name: 'DeviceEnrollmentList',
  components: { BaseAlert, ListPageCard },
  data () {
    return {
      loading: false,
      loadError: '',
      disabled: false,
      items: [],
      presenceByEnrollment: {},
      total: 0,
      summary: { counts: {}, actionable: 0 },
      refreshTimer: null,
      query: {
        page: 1,
        page_size: 20,
        search: '',
        state: null,
        online: null
      }
    }
  },
  computed: {
    fields () {
      return [
        { key: 'first_seen_at', label: this.$t('device_enrollment.first_seen'), thStyle: { width: '170px' } },
        { key: 'device', label: this.$t('device_enrollment.device'), thStyle: { width: '270px' } },
        { key: 'topology', label: this.$t('device_enrollment.topology') },
        { key: 'state', label: this.$t('device_enrollment.state'), thStyle: { width: '160px' } },
        { key: 'mqtt_connection', label: this.$t('device_enrollment.online_status'), thStyle: { width: '130px' } },
        { key: 'online', label: this.$t('device_enrollment.report_status'), thStyle: { width: '120px' } },
        { key: 'actions', label: this.$t('common.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    stateOptions () {
      const states = ['activated', 'topology_pending', 'ready_to_claim', 'claimed', 'conflict', 'quarantined', 'revoked']
      return [
        { value: null, text: this.$t('device_enrollment.all_states') },
        ...states.map(value => ({ value, text: this.stateLabel(value) }))
      ]
    },
    onlineOptions () {
      return [
        { value: null, text: this.$t('device_enrollment.all_report_status') },
        { value: true, text: this.$t('device_enrollment.report_recent') },
        { value: false, text: this.$t('device_enrollment.report_stale') }
      ]
    },
    summaryCards () {
      const counts = this.summary.counts || {}
      return [
        { key: 'activated', label: this.$t('device_enrollment.summary.waiting_inventory'), value: (counts.activated || 0) + (counts.topology_pending || 0), icon: 'diagram-3', variant: 'brand' },
        { key: 'ready', label: this.$t('device_enrollment.summary.ready'), value: counts.ready_to_claim || 0, icon: 'inbox', variant: 'info' },
        { key: 'attention', label: this.$t('device_enrollment.summary.attention'), value: (counts.conflict || 0) + (counts.quarantined || 0), icon: 'exclamation-triangle', variant: 'muted' },
        { key: 'claimed', label: this.$t('device_enrollment.summary.claimed'), value: counts.claimed || 0, icon: 'check2-square', variant: 'success' }
      ]
    }
  },
  created () {
    document.addEventListener('visibilitychange', this.handleVisibility)
    this.refresh()
    this.startAutoRefresh()
  },
  beforeDestroy () {
    document.removeEventListener('visibilitychange', this.handleVisibility)
    this.stopAutoRefresh()
  },
  methods: {
    enrollmentErrorLabel (code) {
      const key = `device_enrollment.error_messages.${code}`
      return this.$te(key) ? this.$t(key) : this.$t('device_enrollment.error_fallback')
    },
    requestParams () {
      const params = { ...this.query }
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === '') delete params[key]
      })
      return params
    },
    async refresh () {
      if (this.loading) return
      this.loading = true
      this.loadError = ''
      try {
        const [list, summary] = await Promise.all([
          fetchDeviceEnrollments(this.requestParams()),
          fetchDeviceEnrollmentSummary()
        ])
        this.items = list.items || []
        this.total = list.total || 0
        this.summary = summary || { counts: {}, actionable: 0 }
        await this.loadPresences(this.items)
        this.disabled = false
      } catch (error) {
        this.disabled = error.response?.status === 404 && error.response?.data?.detail === 'device_enrollment_disabled'
        this.loadError = this.disabled ? '' : (this.$getErrorMessage(error) || this.$t('device_enrollment.load_failed'))
        this.items = []
        this.presenceByEnrollment = {}
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    applyFilters () { this.query.page = 1; this.refresh() },
    resetFilters () {
      this.query = { page: 1, page_size: this.query.page_size, search: '', state: null, online: null }
      this.refresh()
    },
    formatDate (value) { return formatDateUtil(value) },
    stateLabel (state) { return this.$t(`device_enrollment.states.${state}`) },
    stateVariant (state) {
      if (state === 'claimed') return 'success'
      if (state === 'ready_to_claim') return 'primary'
      if (['conflict', 'revoked'].includes(state)) return 'danger'
      if (state === 'quarantined') return 'warning'
      return 'secondary'
    },
    async loadPresences (items) {
      if (!items.length) {
        this.presenceByEnrollment = {}
        return
      }
      try {
        const result = await fetchDeviceEnrollmentPresences(items.map(item => item.uuid))
        this.presenceByEnrollment = Object.fromEntries(
          (result.items || []).map(presence => [presence.enrollment_uuid, presence])
        )
      } catch {
        this.presenceByEnrollment = {}
      }
    },
    connectionState (item) {
      const presence = this.presenceByEnrollment[item.uuid]
      if (!presence || presence.mqtt_connected === null || presence.mqtt_connected === undefined) return 'unavailable'
      if (presence.mqtt_connected === false) return 'offline'
      if (!presence.host_registered || ['quarantined', 'revoked', 'retired'].includes(item.state)) return 'limited'
      return 'online'
    },
    connectionLabel (item) {
      const state = this.connectionState(item)
      if (state === 'online') return this.$t('device_enrollment.online')
      if (state === 'limited') return this.$t('device_enrollment.online_limited')
      if (state === 'offline') return this.$t('device_enrollment.offline')
      return this.$t('device_enrollment.connection_unavailable')
    },
    connectionVariant (item) {
      const state = this.connectionState(item)
      if (state === 'online') return 'success'
      if (state === 'limited') return 'warning'
      return 'secondary'
    },
    openDetail (item) { this.$router.push(`/devices/enrollments/${item.uuid}`) },
    startAutoRefresh () {
      this.stopAutoRefresh()
      if (!document.hidden) this.refreshTimer = window.setInterval(this.refresh, 15000)
    },
    stopAutoRefresh () {
      if (this.refreshTimer) window.clearInterval(this.refreshTimer)
      this.refreshTimer = null
    },
    handleVisibility () {
      if (document.hidden) this.stopAutoRefresh()
      else { this.refresh(); this.startAutoRefresh() }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/enrollment-list.scss"></style>
