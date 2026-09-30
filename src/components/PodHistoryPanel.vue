<template>
  <div class="pod-history-panel">
    <div class="history-summary mb-3">
      <div>
        <small class="text-muted d-block">{{ $t('pod_history.current_version') }}</small>
        <strong>{{ currentTopologyVersion || '-' }}</strong>
      </div>
      <base-button size="sm" variant="outline-secondary" :disabled="loading" @click="loadAll">
        <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('pod_history.refresh') }}
      </base-button>
      <base-button v-if="canReplaceHost" size="sm" variant="primary" @click="replaceModal = true">
        <app-icon name="arrow-repeat" class="mr-1" />{{ $t('pod_history.replace_host') }}
      </base-button>
    </div>

    <base-card class="mb-3">
      <template #header>{{ $t('pod_history.topology_title') }}</template>
      <base-table
        :items="topologyItems"
        :fields="topologyFields"
        :loading="topologyLoading"
        :empty-text="$t('pod_history.no_topology')"
        show-empty
      >
        <template #cell(version)="data">
          <base-button variant="link" size="sm" class="p-0" @click="showTopology(data.item.version)">
            v{{ data.item.version }}
          </base-button>
        </template>
        <template #cell(host)="data">
          <div>{{ data.item.host_serial_no || data.item.host_uuid }}</div>
          <small class="text-muted">{{ data.item.host_product_code || '-' }}</small>
        </template>
        <template #cell(change_type)="data">
          <base-badge variant="secondary">{{ eventLabel(data.item.change_type) }}</base-badge>
        </template>
        <template #cell(nodes)="data">{{ (data.item.nodes || []).length }}</template>
        <template #cell(effective_from)="data">{{ formatDate(data.item.effective_from) }}</template>
      </base-table>
      <base-pagination
        class="pod-history-panel__pager"
        v-model="topologyPage"
        :total-rows="topologyTotal"
        :per-page.sync="topologyLimit"
        :show-per-page="true"
        align="right"
        @input="loadTopology"
      />
    </base-card>

    <base-card>
      <template #header>{{ $t('pod_history.lifecycle_title') }}</template>
      <base-table
        :items="lifecycleItems"
        :fields="lifecycleFields"
        :loading="lifecycleLoading"
        :empty-text="$t('pod_history.no_lifecycle')"
        show-empty
      >
        <template #cell(event_type)="data">
          <base-badge variant="info">{{ eventLabel(data.item.event_type) }}</base-badge>
        </template>
        <template #cell(transition)="data">{{ transitionLabel(data.item) }}</template>
        <template #cell(occurred_at)="data">{{ formatDate(data.item.occurred_at) }}</template>
      </base-table>
      <base-pagination
        class="pod-history-panel__pager"
        v-model="lifecyclePage"
        :total-rows="lifecycleTotal"
        :per-page.sync="lifecycleLimit"
        :show-per-page="true"
        align="right"
        @input="loadLifecycle"
      />
    </base-card>

    <base-modal
      id="pod-topology-version-detail"
      v-model="detailModal"
      :title="$t('pod_history.version_detail', { version: selectedTopology ? selectedTopology.version : '-' })"
      size="xl"
      hide-footer
    >
      <div v-if="selectedTopology" class="mb-3">
        <div><strong>{{ $t('pod_history.host') }}:</strong> {{ selectedTopology.host_serial_no }} ({{ selectedTopology.host_uuid }})</div>
        <div><strong>{{ $t('pod_history.reason') }}:</strong> {{ selectedTopology.reason || '-' }}</div>
        <div><strong>{{ $t('pod_history.source') }}:</strong> {{ selectedTopology.source }}</div>
      </div>
      <base-table :items="selectedTopology ? selectedTopology.nodes : []" :fields="nodeFields" :loading="detailLoading" show-empty />
    </base-modal>

    <base-modal id="pod-host-replace" v-model="replaceModal" :title="$t('pod_history.replace_host')" hide-footer>
      <base-form-group :label="$t('pod_history.target_host')">
        <base-input v-model.trim="replaceForm.host_id" :placeholder="$t('pod_history.target_host_hint')" />
      </base-form-group>
      <base-form-group :label="$t('pod_history.reason')">
        <base-input v-model.trim="replaceForm.reason" />
      </base-form-group>
      <div class="d-flex justify-content-end">
        <base-button variant="outline-secondary" class="mr-2" @click="replaceModal = false">{{ $t('pod_history.cancel') }}</base-button>
        <base-button variant="primary" :disabled="replacing || !replaceForm.host_id || !replaceForm.reason" @click="submitHostReplacement">
          {{ replacing ? $t('pod_history.submitting') : $t('pod_history.submit') }}
        </base-button>
      </div>
    </base-modal>
  </div>
</template>

<script>
import {
  fetchPodLifecycleEvents,
  fetchPodTopologyHistory,
  fetchPodTopologyVersion,
  replacePodHost
} from '@/api/pods'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import { formatDate } from '@/utils/format'
import { PERMISSION } from '@/utils/permission'

export default {
  name: 'PodHistoryPanel',
  components: { BaseButton, BaseCard, BaseInput, BaseModal, BasePagination, BaseTable },
  props: {
    podUuid: { type: String, required: true },
    currentTopologyVersion: { type: Number, default: null },
    lifecycleState: { type: String, default: 'inventory' },
    readOnly: { type: Boolean, default: false },
    resourcePermissions: { type: Array, default: () => [] }
  },
  data () {
    return {
      topologyLoading: false,
      lifecycleLoading: false,
      detailLoading: false,
      replacing: false,
      topologyItems: [],
      lifecycleItems: [],
      topologyTotal: 0,
      lifecycleTotal: 0,
      topologyPage: 1,
      lifecyclePage: 1,
      topologyLimit: 10,
      lifecycleLimit: 10,
      detailModal: false,
      replaceModal: false,
      selectedTopology: null,
      replaceForm: { host_id: '', reason: '' }
    }
  },
  computed: {
    loading () {
      return this.topologyLoading || this.lifecycleLoading
    },
    canReplaceHost () {
      return !this.readOnly &&
        this.lifecycleState !== 'retired' &&
        this.resourcePermissions.includes(PERMISSION.POD_MAINTAIN)
    },
    topologyFields () {
      return [
        { key: 'version', label: this.$t('pod_history.version') },
        { key: 'host', label: this.$t('pod_history.host') },
        { key: 'change_type', label: this.$t('pod_history.change_type') },
        { key: 'nodes', label: this.$t('pod_history.node_count') },
        { key: 'reason', label: this.$t('pod_history.reason') },
        { key: 'effective_from', label: this.$t('pod_history.occurred_at') }
      ]
    },
    lifecycleFields () {
      return [
        { key: 'event_type', label: this.$t('pod_history.event_type') },
        { key: 'transition', label: this.$t('pod_history.transition') },
        { key: 'reason', label: this.$t('pod_history.reason') },
        { key: 'source', label: this.$t('pod_history.source') },
        { key: 'occurred_at', label: this.$t('pod_history.occurred_at') }
      ]
    },
    nodeFields () {
      return [
        { key: 'node_serial_no', label: this.$t('pod_history.node_serial') },
        { key: 'node_product_code', label: this.$t('pod_history.node_model') },
        { key: 'slot_code', label: this.$t('pod_history.slot') },
        { key: 'can_node_id', label: this.$t('pod_history.can_address') },
        { key: 'node_position', label: this.$t('pod_history.position') }
      ]
    }
  },
  watch: {
    topologyLimit () {
      this.topologyPage = 1
      this.loadTopology()
    },
    lifecycleLimit () {
      this.lifecyclePage = 1
      this.loadLifecycle()
    }
  },
  created () {
    this.loadAll()
  },
  methods: {
    formatDate,
    eventLabel (value) {
      const key = `pod_history.events.${value}`
      return this.$te(key) ? this.$t(key) : value
    },
    transitionLabel (item) {
      if (item.event_type === 'control_transfer') return `${item.from_company_id || '-'} → ${item.to_company_id || '-'}`
      if (item.event_type === 'location_move') return `${item.from_location_id || '-'} → ${item.to_location_id || '-'}`
      return '-'
    },
    async loadAll () {
      await Promise.all([this.loadTopology(), this.loadLifecycle()])
    },
    async loadTopology () {
      this.topologyLoading = true
      try {
        const response = await fetchPodTopologyHistory(this.podUuid, { page: this.topologyPage, limit: this.topologyLimit })
        this.topologyItems = response.items || []
        this.topologyTotal = Number(response.total || 0)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_history.load_failed'))
      } finally {
        this.topologyLoading = false
      }
    },
    async loadLifecycle () {
      this.lifecycleLoading = true
      try {
        const response = await fetchPodLifecycleEvents(this.podUuid, { page: this.lifecyclePage, limit: this.lifecycleLimit })
        this.lifecycleItems = response.items || []
        this.lifecycleTotal = Number(response.total || 0)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_history.load_failed'))
      } finally {
        this.lifecycleLoading = false
      }
    },
    async showTopology (version) {
      this.detailModal = true
      this.detailLoading = true
      try {
        this.selectedTopology = await fetchPodTopologyVersion(this.podUuid, version)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_history.load_failed'))
      } finally {
        this.detailLoading = false
      }
    },
    normalizedHostId () {
      const value = String(this.replaceForm.host_id).trim()
      return /^\d+$/.test(value) ? Number(value) : value
    },
    async requestHostReplacement (force) {
      return replacePodHost(
        this.podUuid,
        { host_id: this.normalizedHostId(), reason: this.replaceForm.reason.trim(), source: 'manual' },
        { force }
      )
    },
    async submitHostReplacement () {
      if (!this.canReplaceHost) return
      this.replacing = true
      try {
        let response
        try {
          response = await this.requestHostReplacement(false)
        } catch (error) {
          const detail = error.response?.data?.detail
          if (error.response?.status !== 409 || detail?.error !== 'pod_device_config_invalid') throw error
          const confirmed = await this.$uiConfirm(detail.message, {
            title: this.$t('pod_history.replace_host'),
            okTitle: this.$t('pod_history.force_replace'),
            cancelTitle: this.$t('pod_history.cancel'),
            okVariant: 'danger'
          })
          if (!confirmed) return
          response = await this.requestHostReplacement(true)
        }
        this.replaceModal = false
        this.replaceForm = { host_id: '', reason: '' }
        this.$uiToast.success(this.$t('pod_history.replace_success', { version: response.topology_version }))
        await this.loadTopology()
        this.$emit('changed')
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_history.replace_failed'))
      } finally {
        this.replacing = false
      }
    }
  }
}
</script>
