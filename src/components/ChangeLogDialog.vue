<template>
  <base-modal
    id="change-log-dialog"
    :title="$t('change_log_dialog.title')"
    :value="visible"
    size="xl"
    modal-class="dialog-with-header-bg model-ele"
    @input="handleVisibleChange"
    @hidden="$emit('close')"
  >
    <div class="change-log-container">
      <!-- 变更记录 -->
      <div class="change-history-section">
        <!-- <h4 class="section-title">变更历史</h4> -->
        <base-table
          :items="changes"
          :fields="changeLogFields"
          :loading="loading"
          bordered
          :striped="true"
          responsive
          :sticky-header="'400px'"
        >
          <template #cell(changed_at)="data">
            <span>
              {{ formatDateTime(data.item.changed_at) }}
            </span>
          </template>
          <template #cell(action)="data">
            <base-badge :variant="getActionTagType(data.item.action)">
              {{ getActionLabel(data.item.action) }}
            </base-badge>
          </template>
          <template #cell(change_content)="data">
            <div class="change-value">
              <span class="old-value" v-if="data.item.old_value !== null && data.item.old_value !== undefined">
                <span class="value-label">{{ $t('change_log_dialog.old_value') }}</span>
                <span class="value-content">{{ formatValue(data.item.old_value) }}</span>
              </span>
              <span class="new-value" v-if="data.item.new_value !== null && data.item.new_value !== undefined">
                <span class="value-label">{{ $t('change_log_dialog.new_value') }}</span>
                <span class="value-content">{{ formatValue(data.item.new_value) }}</span>
              </span>
            </div>
          </template>
          <template #cell(changed_by)="data">
            {{ data.item.changed_by || '-' }}
          </template>
        </base-table>
      </div>
    </div>
    <template #modal-footer>
      <div class="w-100 d-flex justify-content-end">
        <base-button variant="outline-secondary" @click="handleClose">
          <app-icon name="x" class="mr-1" />
          {{ $t('common.close') }}
        </base-button>
      </div>
    </template>
  </base-modal>
</template>

<script>
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import { formatDate } from '@/utils/format'

export default {
  name: 'ChangeLogDialog',
  components: {
    BaseButton,
    BaseModal,
    BaseTable
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    changeLog: {
      type: Object,
      default: null
    }
  },
  computed: {
    changes () {
      return this.changeLog && this.changeLog.changes ? this.changeLog.changes : []
    },
    changeLogFields () {
      return [
        { key: 'changed_at', label: this.$t('change_log_dialog.column.changed_at'), thStyle: { minWidth: '100px' } },
        { key: 'action', label: this.$t('change_log_dialog.column.action'), thStyle: { minWidth: '100px' } },
        { key: 'changed_field', label: this.$t('change_log_dialog.column.changed_field'), thStyle: { minWidth: '100px' } },
        { key: 'change_content', label: this.$t('change_log_dialog.column.change_content'), thStyle: { minWidth: '160px' } },
        { key: 'changed_by', label: this.$t('change_log_dialog.column.changed_by'), thStyle: { minWidth: '80px' } }
      ]
    }
  },
  methods: {
    handleVisibleChange (value) {
      this.$emit('update:visible', value)
    },
    formatDateTime (value) {
      return formatDate(value)
    },

    getActionTagType (action) {
      const typeMap = {
        create: 'success',
        update: 'warning',
        activate: 'success',
        deactivate: 'danger'
      }
      return typeMap[action] || 'secondary'
    },

    getActionLabel (action) {
      const labelMap = {
        create: this.$t('change_log_dialog.action.create'),
        update: this.$t('change_log_dialog.action.update'),
        activate: this.$t('change_log_dialog.action.activate'),
        deactivate: this.$t('change_log_dialog.action.deactivate')
      }
      return labelMap[action] || action
    },

    formatValue (value) {
      if (value === null || value === undefined) {
        return '-'
      }
      if (typeof value === 'boolean') {
        return value ? this.$t('common.yes') : this.$t('common.no')
      }
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
    },

    handleClose () {
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>
.change-log-container {
  max-height: 600px;
  overflow-y: auto;
}

.change-history-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid var(--color-accent-blue);
}

.change-value {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.old-value {
  color: var(--color-text-muted);
  font-size: var(--font-size-caption);
}

.new-value {
  color: var(--color-success);
  font-size: var(--font-size-caption);
}

.value-label {
  font-weight: var(--font-weight-medium);
  margin-right: 4px;
}

.value-content {
  color: var(--color-text-primary);
}
</style>
