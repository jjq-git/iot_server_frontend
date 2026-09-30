<template>
  <base-card class="host-files-panel">
    <div class="host-files-panel__header">
      <div>
        <h3>{{ $t('host_files.title') }}</h3>
        <p>{{ $t('host_files.subtitle') }}</p>
      </div>
      <base-button size="sm" variant="outline-primary" :disabled="loading" @click="load">
        <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('host_files.refresh') }}
      </base-button>
    </div>
    <b-tabs pills card class="host-files-panel__tabs">
      <b-tab :title="$t('host_files.effective')" active>
        <base-table :items="effectiveFiles" :fields="effectiveFields" :loading="loading" bordered>
          <template #cell(checksum)="data">
            <code :title="data.item.checksum">{{ shortChecksum(data.item.checksum) }}</code>
          </template>
          <template #cell(source_scope)="data">
            <base-badge :variant="data.item.source_scope === 'host' ? 'primary' : 'secondary'">
              {{ $t('host_files.scope_' + data.item.source_scope) }}
            </base-badge>
          </template>
        </base-table>
        <base-alert v-if="!loading && effectiveFiles.length === 0" variant="info" :dismissible="false">
          {{ $t('host_files.no_effective') }}
        </base-alert>
      </b-tab>
      <b-tab :title="$t('host_files.deployments')">
        <base-table :items="deployments" :fields="deploymentFields" :loading="loading" bordered>
          <template #cell(status)="data">
            <base-badge :variant="statusVariant(data.item.status)">
              {{ $t('host_files.status_' + data.item.status) }}
            </base-badge>
          </template>
          <template #cell(requested_at)="data">{{ formatDateTime(data.item.requested_at) }}</template>
          <template #cell(actions)="data">
            <base-button
              v-if="canManage && ['failed', 'superseded'].includes(data.item.status)"
              size="sm"
              variant="outline-primary"
              class="mr-1"
              @click="retry(data.item)"
            >{{ $t('host_files.retry') }}</base-button>
            <base-button
              v-if="canManage && data.item.status === 'applied' && data.item.is_current"
              size="sm"
              variant="outline-warning"
              @click="rollback(data.item)"
            >{{ $t('host_files.rollback') }}</base-button>
          </template>
        </base-table>
        <base-alert v-if="!loading && deployments.length === 0" variant="info" :dismissible="false">
          {{ $t('host_files.no_deployments') }}
        </base-alert>
      </b-tab>
    </b-tabs>
  </base-card>
</template>

<script>
import {
  fetchEffectiveHostFiles,
  fetchFileDeployments,
  retryFileDeployment,
  rollbackFileDeployment
} from '@/api/hostFiles'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'

export default {
  name: 'HostFilesPanel',
  components: { BaseAlert, BaseCard },
  props: {
    hostUuid: { type: String, required: true }
  },
  data () {
    return {
      loading: false,
      effectiveFiles: [],
      deployments: []
    }
  },
  computed: {
    canManage () {
      return hasPermission(PERMISSION.FILE_UPLOAD, getCurrentUser())
    },
    effectiveFields () {
      return [
        { key: 'file_name', label: this.$t('host_files.file_name') },
        { key: 'file_type', label: this.$t('host_files.file_type') },
        { key: 'purpose', label: this.$t('host_files.purpose') },
        { key: 'slot_key', label: this.$t('host_files.slot') },
        { key: 'playlist_order', label: this.$t('host_files.order') },
        { key: 'source_scope', label: this.$t('host_files.source') },
        { key: 'checksum', label: 'SHA256' }
      ]
    },
    deploymentFields () {
      return [
        { key: 'file_name', label: this.$t('host_files.file_name') },
        { key: 'purpose', label: this.$t('host_files.purpose') },
        { key: 'status', label: this.$t('host_files.status') },
        { key: 'source', label: this.$t('host_files.source') },
        { key: 'requested_at', label: this.$t('host_files.requested_at') },
        { key: 'error_code', label: this.$t('host_files.error') },
        { key: 'actions', label: this.$t('host_files.actions'), class: 'actions-cell' }
      ]
    }
  },
  watch: {
    hostUuid: { immediate: true, handler: 'load' }
  },
  methods: {
    async load () {
      if (!this.hostUuid) return
      this.loading = true
      try {
        const [effective, history] = await Promise.all([
          fetchEffectiveHostFiles(this.hostUuid),
          fetchFileDeployments(this.hostUuid, { page_size: 100 })
        ])
        this.effectiveFiles = effective?.items || effective || []
        this.deployments = history?.items || []
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_files.load_failed'))
      } finally {
        this.loading = false
      }
    },
    async retry (deployment) {
      try {
        await retryFileDeployment(this.hostUuid, deployment.uuid)
        this.$uiToast.success(this.$t('host_files.retry_success'))
        await this.load()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_files.action_failed'))
      }
    },
    async rollback (deployment) {
      const confirmed = await this.$uiConfirm(this.$t('host_files.rollback_confirm'), {
        title: this.$t('host_files.rollback'),
        okTitle: this.$t('host_files.rollback'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await rollbackFileDeployment(this.hostUuid, deployment.uuid)
        this.$uiToast.success(this.$t('host_files.rollback_success'))
        await this.load()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_files.action_failed'))
      }
    },
    shortChecksum (checksum) {
      return checksum ? checksum.slice(0, 12) + '…' : '-'
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    statusVariant (status) {
      if (status === 'applied') return 'success'
      if (status === 'failed') return 'danger'
      if (status === 'superseded') return 'secondary'
      if (status === 'downloaded') return 'info'
      return 'warning'
    }
  }
}
</script>

<style scoped>
.host-files-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.host-files-panel__header h3 {
  margin: 0 0 0.25rem;
  font-size: var(--font-size-title-sm);
}

.host-files-panel__header p {
  margin: 0;
  color: var(--color-text-secondary);
}

.host-files-panel ::v-deep .host-files-panel__tabs .nav-pills .nav-link {
  color: var(--color-text-secondary);
}

.host-files-panel ::v-deep .host-files-panel__tabs .nav-pills .nav-link:hover {
  background: var(--color-brand-soft);
  color: var(--color-brand-dark);
}

.host-files-panel ::v-deep .host-files-panel__tabs .nav-pills .nav-link.active,
.host-files-panel ::v-deep .host-files-panel__tabs .nav-pills .show > .nav-link {
  background: var(--color-brand-solid, var(--color-brand));
  color: var(--color-on-brand, var(--color-text-inverse));
}

.host-files-panel ::v-deep .base-table-wrapper .table-responsive {
  padding-right: 0;
  padding-left: 0;
}
</style>
