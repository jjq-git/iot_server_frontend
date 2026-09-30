<template>
  <div :class="['node-detail', 'detail-page', { 'is-readonly': !canEdit(detail, 'node') }]">
    <div v-if="loading && !detail.id" class="text-center py-4 text-muted">
      <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
      {{ $t('node_detail.loading') }}
    </div>

    <template v-else>
      <base-card class="card-style-b">
        <div class="waterfall-container">
          <!-- 基础信息 -->
          <div class="section-b">
            <div class="section-header-b">
              <app-icon name="file-earmark-text" class="section-icon" />
              <span class="section-title-b">{{ $t('node_detail.section.basic_info') }}</span>
            </div>
            <div class="detail-list">
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.node_id') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ detail.id || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.serial_no') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ detail.serial_no || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.mac_address') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ detail.mac_address || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.company') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ detail.manufacturer_name || '-' }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.node_type') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ detail.hn_model_name || '-' }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.hw_ver') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'hw_ver'" class="edit-input-wrapper">
                    <base-input
                      v-model="editValue"
                      size="sm"
                      @keyup.enter="saveFieldEdit('hw_ver')"
                      @blur="saveFieldEdit('hw_ver')" :clearable="false"
                    />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'node'), activate: () => startEdit('hw_ver', detail.hw_ver) }">
                    <span class="value-text">{{ detail.hardware_model_display || detail.hw_ver || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.sw_ver') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'sw_ver'" class="edit-input-wrapper">
                    <base-input
                      v-model="editValue"
                      size="sm"
                      @keyup.enter="saveFieldEdit('sw_ver')"
                      @blur="saveFieldEdit('sw_ver')" :clearable="false"
                    />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'node'), activate: () => startEdit('sw_ver', detail.sw_ver) }">
                    <span class="value-text">{{ detail.sw_ver || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.shipped_at') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ formatDateTime(detail.shipped_at) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 运行状态 -->
          <div class="section-b">
            <div class="section-header-b">
              <app-icon name="graph-up" class="section-icon" />
              <span class="section-title-b">{{ $t('node_detail.section.running_status') }}</span>
            </div>
            <div class="detail-list">
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.is_active') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <base-badge :variant="statusActiveTagType(detail.is_active)">
                      {{ statusActiveLabel(detail.is_active) }}
                    </base-badge>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.online_status') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <base-badge :variant="statusTagType(detail.status)">
                      {{ statusLabel(detail.status) }}
                    </base-badge>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.heartbeat_interval') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'heartbeat_interval'" class="edit-input-wrapper">
                    <b-form-select
                      v-model="editValue"
                      size="sm"
                      :options="heartbeatIntervalOptions"
                      @change="saveFieldEdit('heartbeat_interval')"
                    />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'node'), activate: () => startEdit('heartbeat_interval', detail.heartbeat_interval) }">
                    <span v-if="detail.heartbeat_interval" class="value-text">
                      {{ detail.heartbeat_interval }}{{ $t('node_detail.heartbeat_unit') }}
                      <span class="text-muted">{{ getHeartbeatIntervalDesc(detail.heartbeat_interval) }}</span>
                    </span>
                    <span v-else class="value-text">-</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.last_seen') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ formatDateTime(detail.last_seen) }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('node_detail.field.created_at') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ formatDateTime(detail.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </base-card>
    </template>
  </div>
</template>

<script>
import { fetchNodeDetail, updateNode } from '@/api/nodes'
import BaseCard from '@/components/base/BaseCard.vue'
import { formatDate } from '@/utils/format'
import { PERMISSION } from '@/utils/permission'
import unsavedGuard from '@/mixins/unsavedGuard'

export default {
  name: 'NodeDetail',
  // 后端更新节点要求 pod.receive（nodes.py update_node），显式声明避免依赖 rolePermission 默认值
  permissionCapabilities: {
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    BaseCard
  },
  mixins: [unsavedGuard],
  data () {
    return {
      loading: false,
      editingField: null,
      editValue: '',
      detail: {}
    }
  },
  computed: {
    onlineStatusOptions () {
      return [
        { value: 'online', text: this.$t('node_detail.online_options.online') },
        { value: 'offline', text: this.$t('node_detail.online_options.offline') },
        { value: 'maintenance', text: this.$t('node_detail.online_options.maintenance') }
      ]
    },
    heartbeatIntervalOptions () {
      return [
        { value: 30, text: this.$t('node_detail.heartbeat_options.30s') },
        { value: 60, text: this.$t('node_detail.heartbeat_options.60s') },
        { value: 120, text: this.$t('node_detail.heartbeat_options.120s') },
        { value: 300, text: this.$t('node_detail.heartbeat_options.300s') }
      ]
    }
  },
  created () {
    this.fetchDetail()
  },
  methods: {
    // unsavedGuard mixin 接入：行内编辑某字段未保存时拦截路由切换/页面关闭
    isFormDirty () {
      return this.editingField !== null
    },
    async fetchDetail () {
      const nodeId = this.$route.params.nodeId
      if (!nodeId) return

      this.loading = true
      try {
        const res = await fetchNodeDetail(nodeId)
        this.detail = res.data || res
      } catch (error) {
        this.$uiToast.error(this.$t('node_detail.toast.load_failed_prefix') + (this.$getErrorMessage(error) || this.$t('node_detail.toast.retry_later')))
        this.$router.push('/devices/nodes')
      } finally {
        this.loading = false
      }
    },
    startEdit (field, value) {
      const editableFields = new Set([
        'hw_ver',
        'sw_ver',
        'heartbeat_interval'
      ])
      if (!this.canEdit(this.detail, 'node') || !editableFields.has(field)) {
        if (!this.canEdit(this.detail, 'node')) {
          this.$uiToast.warning(this.$t('common.no_permission_edit'))
        }
        return
      }
      this.editingField = field
      this.editValue = value ?? ''
    },
    async saveFieldEdit (field) {
      if (!this.canEdit(this.detail, 'node')) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      try {
        // 更新本地数据
        if (field === 'hw_ver') {
          this.detail.hw_ver = this.editValue
        } else {
          this.detail[field] = this.editValue
        }

        // 调用 API 更新
        const updateData = {}
        updateData[field] = this.editValue
        await updateNode(this.detail.id, updateData)

        this.$uiToast.success(this.$t('node_detail.toast.update_success'))
      } catch (error) {
        this.$uiToast.error(this.$t('node_detail.toast.update_failed_prefix') + (this.$getErrorMessage(error) || this.$t('node_detail.toast.retry_later')))
        // 恢复原值
        this.fetchDetail()
      } finally {
        this.editingField = null
        this.editValue = ''
      }
    },
    statusActiveLabel (status) {
      const map = {
        true: this.$t('node_detail.active_options.active'),
        false: this.$t('node_detail.active_options.inactive')
      }
      return map[status] || status
    },
    statusLabel (status) {
      const map = {
        online: this.$t('node_detail.online_options.online'),
        offline: this.$t('node_detail.online_options.offline'),
        maintenance: this.$t('node_detail.online_options.maintenance')
      }
      return map[status] || status
    },
    statusTagType (status) {
      const map = {
        online: 'success',
        offline: 'info',
        maintenance: 'warning'
      }
      return map[status] || 'info'
    },
    statusActiveTagType (status) {
      const map = {
        true: 'success',
        false: 'secondary'
      }
      return map[status] || 'info'
    },
    getHeartbeatIntervalDesc (seconds) {
      if (seconds <= 30) return this.$t('node_detail.heartbeat_desc.realtime')
      if (seconds <= 60) return this.$t('node_detail.heartbeat_desc.standard')
      if (seconds <= 120) return this.$t('node_detail.heartbeat_desc.powersave')
      return this.$t('node_detail.heartbeat_desc.limited')
    },
    formatDateTime (dateString) {
      return formatDate(dateString)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/node-detail.scss"></style>
