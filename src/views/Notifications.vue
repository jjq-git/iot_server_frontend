<template>
  <div class="notifications-page">
    <list-page-card :total-rows="total" :per-page="500">
      <template #filters>
        <b-form class="notifications-page__filters" @submit.prevent>
        <div class="filter-row">
          <div class="filter-left">
            <base-select v-model="query.phase" class="filter-control" :options="phaseOptions" :aria-label="$t('route.notifications.type')" @change="loadNotifications" />
            <base-select v-model="query.status" class="filter-control" :options="statusOptions" :aria-label="$t('route.notifications.all_states')" @change="loadNotifications" />
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="items"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        :empty-text="$t('route.notifications.empty')"
        :striped="false"
        show-empty
        @retry="loadNotifications"
      >
        <template #cell(type)="row">
          <base-badge :variant="row.item.variant || 'secondary'">{{ phaseLabel(row.item.type) }}</base-badge>
        </template>
        <template #cell(content)="row">
          <div class="notification-content">
            <strong>{{ row.item.content }}</strong>
            <span v-if="row.item.summary">{{ row.item.summary }}</span>
          </div>
        </template>
        <template #cell(status)="row">
          <base-badge :variant="notificationStatusVariant(row.item.status)">
            {{ $t(`route.notifications.status_labels.${row.item.status}`) }}
          </base-badge>
        </template>
        <template #cell(actions)="row">
          <base-button
            v-if="row.item.status !== 'acked' && canAcknowledge"
            size="sm"
            variant="outline-primary"
            :loading="acknowledgingUuid === row.item.uuid"
            @click="acknowledge(row.item)"
          >
            {{ $t('route.notifications.acknowledge') }}
          </base-button>
        </template>
      </base-table>
    </list-page-card>
  </div>
</template>

<script>
import { acknowledgeNotification, fetchNotifications } from '@/api/notifications'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { formatDate } from '@/utils/format'

export default {
  name: 'NotificationsPage',
  components: { BaseBadge, BaseButton, BaseSelect, BaseTable, ListPageCard },
  data () {
    return {
      loading: false,
      loadError: '',
      acknowledgingUuid: null,
      query: {
        phase: '',
        status: ''
      },
      items: [],
      total: 0
    }
  },
  computed: {
    canAcknowledge () {
      return hasPermission(PERMISSION.POD_VIEW, getCurrentUser())
    },
    fields () {
      return [
        { key: 'type', label: this.$t('route.notifications.type') },
        { key: 'content', label: this.$t('route.notifications.content') },
        { key: 'relatedObject', label: this.$t('route.notifications.related_object') },
        { key: 'createdAt', label: this.$t('route.notifications.time') },
        { key: 'status', label: this.$t('route.notifications.status') },
        { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    phaseOptions () {
      return [
        { value: '', text: this.$t('route.notifications.all_types') },
        ...['pre_start', 'start', 'end', 'overstay', 'vacated', 'cleaning', 'cleaned']
          .map(value => ({ value, text: this.phaseLabel(value) }))
      ]
    },
    statusOptions () {
      return [
        { value: '', text: this.$t('route.notifications.all_states') },
        ...['pending', 'sent', 'failed', 'acked']
          .map(value => ({ value, text: this.$t(`route.notifications.status_labels.${value}`) }))
      ]
    }
  },
  created () {
    this.loadNotifications()
  },
  methods: {
    async loadNotifications () {
      this.loading = true
      this.loadError = ''
      try {
        const params = { limit: 500 }
        if (this.query.phase) params.phase = this.query.phase
        if (this.query.status) params.status = this.query.status
        const response = await fetchNotifications(params)
        this.items = (response?.items || []).map(item => ({
          uuid: item.uuid,
          category: item.phase,
          type: item.phase,
          content: item.template,
          summary: `${item.audience} · ${item.channel}`,
          relatedObject: item.pod_name || item.pod_uuid,
          createdAt: this.formatDateTime(item.created_at),
          status: item.status,
          variant: item.status === 'failed' ? 'danger' : (item.status === 'acked' ? 'secondary' : 'info')
        }))
        this.total = Number(response?.total ?? this.items.length)
      } catch (error) {
        this.items = []
        this.total = 0
        this.loadError = this.$getErrorMessage(error) || this.$t('route.notifications.empty')
        this.$uiToast.error(this.$getErrorMessage(error))
      } finally {
        this.loading = false
      }
    },
    async acknowledge (item) {
      this.acknowledgingUuid = item.uuid
      try {
        await acknowledgeNotification(item.uuid)
        await this.loadNotifications()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error))
      } finally {
        this.acknowledgingUuid = null
      }
    },
    phaseLabel (phase) {
      // 兜底：未登记的 phase（如后端新增的 service_* 工单通知）不漏出原始 i18n key 路径
      const key = `route.notifications.phase_labels.${phase}`
      return this.$te(key) ? this.$t(key) : String(phase || '-')
    },
    notificationStatusVariant (status) {
      return {
        pending: 'warning',
        sent: 'info',
        failed: 'danger',
        acked: 'success'
      }[status] || 'secondary'
    },
    formatDateTime (value) {
      return formatDate(value)
    }
  }
}
</script>
