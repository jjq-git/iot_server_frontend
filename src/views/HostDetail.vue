<template>
  <div :class="['host-detail', 'detail-page', { 'is-readonly': !canEdit(detail, 'host') }]">
    <div v-if="loading && !detail.uuid" class="host-detail__loading">
      <b-spinner small class="mr-2" />
      <span>{{ $t('host_detail.loading') }}</span>
    </div>

    <template v-else>
      <base-card class="card-style-b">
        <div class="waterfall-container">
          <!-- 基础信息 -->
          <div class="section-b">
            <div class="section-header-b">
              <app-icon name="file-earmark-text" class="section-icon" />
              <span class="section-title-b">{{ $t('host_detail.sections.basic') }}</span>
            </div>
            <div class="detail-list">
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.device_id') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ detail.id || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.serial_no') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'serial_no'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('serial_no')" @blur="saveFieldEdit('serial_no')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('serial_no', detail.serial_no) }">
                    <span class="value-text">{{ detail.serial_no || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.mac_address') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'mac_address'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('mac_address')" @blur="saveFieldEdit('mac_address')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('mac_address', detail.mac_address) }">
                    <span class="value-text">{{ detail.mac_address || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.company') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ detail.manufacturer_name || '-' }}</span>
                </div>
              </div>
              <!-- installation_address 不在主机契约(GET/PUT /hosts)中,展示与编辑均已移除 -->
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.product_code') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'product_code'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('product_code')" @blur="saveFieldEdit('product_code')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('product_code', detail.product_code) }">
                    <span class="value-text">{{ detail.product_code || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 安全配置 -->
          <div class="section-b">
            <div class="section-header-b">
              <app-icon name="shield-lock" class="section-icon" />
              <span class="section-title-b">{{ $t('host_detail.sections.security') }}</span>
            </div>
            <div class="detail-list">
              <!-- 以下三个字段当前不在主机契约中,仅在后端返回时才渲染,避免恒显「未配置」误导 -->
              <div v-if="detail.key_configured !== undefined" class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.mqtt_key') }}</div>
                <div class="detail-row__content">
                  <base-badge v-if="detail.key_configured" variant="success">{{ $t('common.status.configured') }}</base-badge>
                  <base-badge v-else variant="secondary">{{ $t('common.status.unconfigured') }}</base-badge>
                </div>
              </div>
              <div v-if="detail.hardware_model_code !== undefined" class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.hardware_model_code') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ detail.hardware_model_code || '-' }}</span>
                  </div>
                </div>
              </div>
              <div v-if="detail.key_fingerprint !== undefined" class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.key_fingerprint') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ detail.key_fingerprint || '-' }}</span>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.hn_model_id') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'hn_model_id'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('hn_model_id')" @blur="saveFieldEdit('hn_model_id')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('hn_model_id', detail.hn_model_id) }">
                    <span class="value-text">{{ detail.hn_model_id || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 运行状态 -->
          <div class="section-b">
            <div class="section-header-b">
              <app-icon name="graph-up" class="section-icon" />
              <span class="section-title-b">{{ $t('host_detail.sections.runtime') }}</span>
            </div>
            <div class="detail-list">
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.online_status') }}</div>
                <div class="detail-row__content">
                  <div class="host-status-badges">
                    <base-badge :variant="statusTagType(detail.status)">
                      {{ statusLabel(detail.status) }}
                    </base-badge>
                    <base-badge v-if="detail.topology_pending" variant="warning">
                      {{ $t('hosts.status.topology_pending') }}
                    </base-badge>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.hw_ver') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'hw_ver'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('hw_ver')" @blur="saveFieldEdit('hw_ver')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('hw_ver', detail.hw_ver) }">
                    <span class="value-text">{{ detail.hw_ver || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.sw_ver') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'sw_ver'" class="edit-input-wrapper">
                    <base-input v-model="editValue" size="sm" @keyup.enter="saveFieldEdit('sw_ver')" @blur="saveFieldEdit('sw_ver')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('sw_ver', detail.sw_ver) }">
                    <span class="value-text">{{ detail.sw_ver || '-' }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.heartbeat_interval') }}</div>
                <div class="detail-row__content">
                  <div v-if="editingField === 'heartbeat_interval'" class="edit-input-wrapper">
                    <base-select v-model="editValue" :options="heartbeatIntervalOptions" @input="saveFieldEdit('heartbeat_interval')" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(detail, 'host'), activate: () => startEdit('heartbeat_interval', detail.heartbeat_interval) }">
                    <span v-if="detail.heartbeat_interval" class="value-text">
                      {{ $t('host_detail.fields.seconds', { n: detail.heartbeat_interval }) }}
                      <span class="text-muted">{{ getHeartbeatIntervalDesc(detail.heartbeat_interval) }}</span>
                    </span>
                    <span v-else class="value-text">-</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.last_seen') }}</div>
                <div class="detail-row__content">
                  <div class="value-wrapper">
                    <span class="value-text">{{ formatDateTime(detail.last_seen) }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-row">
                <div class="detail-row__label">{{ $t('host_detail.fields.created_at') }}</div>
                <div class="detail-row__content">
                  <span class="value-text">{{ formatDateTime(detail.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </base-card>

      <host-files-panel v-if="detail.uuid" :host-uuid="detail.uuid" />

      <!-- MQTT 消息日志面板 -->
      <base-card v-if="wsMessageLog.length > 0" class="mqtt-log-card">
        <div class="section-header-b">
          <app-icon name="broadcast" class="section-icon" />
          <span class="section-title-b">{{ $t('host_detail.sections.mqtt_log', { count: wsMessageLog.length }) }}</span>
          <base-button
            size="sm"
            variant="outline-secondary"
            class="ml-auto"
            :aria-expanded="mqttLogExpanded ? 'true' : 'false'"
            @click="mqttLogExpanded = !mqttLogExpanded"
          >
            <app-icon name="chevron-down" :rotate="mqttLogExpanded ? 180 : 0" class="mr-1" />
            {{ $t(mqttLogExpanded ? 'common.collapse' : 'common.expand') }}
          </base-button>
          <base-button
            size="sm"
            variant="outline-secondary"
            class="ml-2"
            @click="clearMessageLog"
          >
            {{ $t('host_detail.actions.clear') }}
          </base-button>
        </div>
        <div v-show="mqttLogExpanded" class="mqtt-log-list">
          <div
            v-for="(log, index) in wsMessageLog"
            :key="index"
            class="mqtt-log-item"
            :class="{ 'is-status-update': log.type === 'status_update' }"
          >
            <div class="mqtt-log-time">{{ log.timestamp }}</div>
            <div class="mqtt-log-type">{{ log.type }}</div>
            <div class="mqtt-log-data">
              <pre>{{ formatLogData(log.data) }}</pre>
            </div>
          </div>
        </div>
      </base-card>

      <base-alert
        v-if="fallbackUsed"
        class="host-detail__notice"
        variant="warning"
        :dismissible="false"
      >
        {{ $t('host_detail.fallback_notice') }}
      </base-alert>

      <!-- 编辑主机对话框 -->
      <base-modal
        id="host-detail-edit-modal"
        :title="$t('host_detail.dialog.edit_title')"
        v-model="editDialogVisible"
        size="xl"
        @hidden="resetEditForm"
        :busy="saving"
        :ok-disabled="saving"
        :ok-title="$t('host_detail.dialog.ok_save_config')"
        :cancel-title="$t('common.cancel')"
        @ok="handleSaveEditOk"
        class="dialog-with-header-bg"
      >
        <b-form>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('host_detail.fields_label.company')">
                <base-input v-model="detail.manufacturer_name" :disabled="true" :placeholder="$t('host_detail.dialog.company_disabled')" />
              </base-form-group>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('host_detail.fields_label.serial')">
                <base-input v-model="detail.serial_no" :disabled="true" :placeholder="$t('host_detail.dialog.serial_disabled')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('host_detail.fields_label.mac')">
                <base-input v-model="detail.mac_address" :disabled="true" :placeholder="$t('host_detail.dialog.mac_disabled')" />
              </base-form-group>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('host_detail.fields_label.hw_ver')">
                <base-input v-model="detail.hw_ver" :disabled="true" :placeholder="$t('host_detail.dialog.hw_disabled')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('host_detail.fields_label.sw_ver')">
                <base-input v-model="detail.sw_ver" :disabled="true" :placeholder="$t('host_detail.dialog.sw_disabled')" />
              </base-form-group>
            </b-col>
          </b-row>

          <base-form-group required :label="$t('host_detail.fields_label.heartbeat')" :state="editFieldState('heartbeat_interval')" :invalid-feedback="editErrors.heartbeat_interval">
            <base-select v-model="editForm.heartbeat_interval" :placeholder="$t('host_detail.dialog.heartbeat_placeholder')" :options="heartbeatIntervalOptions" :state="editFieldState('heartbeat_interval')" />
            <span class="form-tips">{{ $t('host_detail.dialog.heartbeat_tip') }}</span>
          </base-form-group>

          <base-form-group :label="$t('host_detail.fields_label.remark')">
            <base-textarea
              v-model="editForm.remark"
              :rows="3"
              :placeholder="$t('host_detail.dialog.remark_placeholder')"
            />
          </base-form-group>
        </b-form>
      </base-modal>

      <!-- 节点绑定管理对话框 -->
      <base-modal
        id="host-detail-node-management-modal"
        :title="$t('host_detail.dialog.node_title')"
        v-model="editingNodes"
        size="xl"
        @hidden="closeNodeManagement"
        :busy="savingNodes"
        :ok-disabled="savingNodes"
        :ok-title="$t('host_detail.dialog.ok_save_binding')"
        :cancel-title="$t('common.cancel')"
        @ok="handleSaveNodeBindingsOk"
        class="dialog-with-header-bg"
      >
        <div class="node-management">
          <div class="node-management__tip">
            <base-alert variant="info" :dismissible="false">
              <div>{{ $t('host_detail.dialog.node_tip_max') }}</div>
              <div>{{ $t('host_detail.dialog.node_tip_swap') }}</div>
            </base-alert>
          </div>

          <div class="node-management__positions">
            <b-row>
              <b-col cols="12" md="4" v-for="pos in ['A', 'B', 'C']" :key="pos" class="mb-3">
                <div class="node-position-edit">
                  <div class="node-position-edit__header">
                    <span class="node-position-edit__title">{{ $t('host_detail.dialog.position', { pos }) }}</span>
                    <base-badge v-if="getNodeByPosition(pos)" :variant="getNodeStatusTagType(pos)">
                      {{ getNodeStatusText(pos) }}
                    </base-badge>
                  </div>

                  <div class="node-position-edit__form">
                    <b-form>
                      <base-form-group :label="$t('host_detail.dialog.node_label')">
                        <base-select
                          v-model="nodeBindings[pos].node_uuid"
                          :options="nodeSelectOptions(pos)"
                          @input="handleNodeSelect(pos)"
                        />
                      </base-form-group>

                      <base-form-group :label="$t('host_detail.dialog.can_addr')">
                        <base-input
                          v-model.number="nodeBindings[pos].can_node_id"
                          type="number"
                          min="2"
                          max="127"
                          :disabled="!nodeBindings[pos].node_uuid"
                          :placeholder="$t('host_detail.dialog.can_addr_placeholder')" :clearable="false"
                        />
                      </base-form-group>
                    </b-form>

                    <div v-if="nodeBindings[pos].node_uuid" class="node-info">
                      <div><strong>{{ $t('host_detail.dialog.node_info_title') }}</strong></div>
                      <div v-if="getSelectedNodeInfo(pos)">
                        <div>{{ $t('host_detail.dialog.node_mac', { value: getSelectedNodeInfo(pos).mac_address }) }}</div>
                        <div>{{ $t('host_detail.dialog.node_hw_model', { value: getSelectedNodeInfo(pos).hardware_model }) }}</div>
                        <div>{{ $t('host_detail.dialog.node_fw_ver', { value: getSelectedNodeInfo(pos).firmware_version }) }}</div>
                        <div>{{ $t('host_detail.dialog.node_status') }}<base-badge :variant="statusTagType(getSelectedNodeInfo(pos).status)">
                          {{ getSelectedNodeInfo(pos).status === 'online' ? $t('common.status.online') : $t('common.status.offline') }}
                        </base-badge></div>
                      </div>
                    </div>
                  </div>
                </div>
              </b-col>
            </b-row>
          </div>

          <div class="node-management__stats">
            <div>{{ $t('host_detail.dialog.stats_bound', { count: getBoundNodeCount() }) }}</div>
            <div>{{ $t('host_detail.dialog.stats_available', { count: availableNodes.length - getBoundNodeCount() }) }}</div>
          </div>
        </div>

      </base-modal>
    </template>
  </div>
</template>

<script>
import { fetchHostDetail, updateHost } from '@/api'
import { fetchHostNodes } from '@/api/nodes'
import {
  createBinding,
  deleteBinding,
  fetchNodes,
  replaceNode,
  updateCanNodeId
} from '@/api/hnBindings'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import HostFilesPanel from '@/components/host/HostFilesPanel.vue'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import { formatDate } from '@/utils/format'
import { PERMISSION } from '@/utils/permission'
import unsavedGuard from '@/mixins/unsavedGuard'

export default {
  name: 'HostDetail',
  permissionCapabilities: {
    edit: PERMISSION.USER_MANAGE
  },
  components: {
    BaseAlert,
    BaseCard,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseTextarea,
    HostFilesPanel
  },
  mixins: [unsavedGuard],
  data () {
    return {
      loading: false,
      fallbackUsed: false,
      detail: {},
      editDialogVisible: false,
      saving: false,
      nodesLoading: false,
      editingNodes: false,
      formDirtyFlag: false,
      // 字段编辑相关
      editingField: null,
      editValue: '',
      editForm: {
        heartbeat_interval: 60,
        remark: ''
      },
      editErrors: {},
      // 节点绑定相关数据
      hostNodes: [],
      availableNodes: [],
      savingNodes: false,
      nodeBindings: {
        A: { node_uuid: null, can_node_id: null },
        B: { node_uuid: null, can_node_id: null },
        C: { node_uuid: null, can_node_id: null }
      },
      wsMessageLog: [], // MQTT 消息日志
      mqttLogExpanded: false,
      maxLogEntries: 50 // 最多保留 50 条日志
    }
  },
  computed: {
    heartbeatIntervalOptions () {
      return [
        { value: 30, text: this.$t('host_detail.heartbeat_options.realtime') },
        { value: 60, text: this.$t('host_detail.heartbeat_options.standard') },
        { value: 120, text: this.$t('host_detail.heartbeat_options.power_save') },
        { value: 300, text: this.$t('host_detail.heartbeat_options.limited') }
      ]
    }
  },
  watch: {
    '$route.params.deviceId': {
      immediate: true,
      handler () {
        this.fetchDetail()
      }
    },
    editForm: {
      deep: true,
      handler () {
        // 仅当编辑弹窗打开时把改动视为脏数据
        if (this.editDialogVisible) {
          this.formDirtyFlag = true
        }
      }
    }
  },
  mounted () {
    // 注意：不在 mounted 时连接，等待数据加载完成后再连接
  },
  beforeDestroy () {
    // 组件销毁前断开 WebSocket
    this.disconnectWebSocket()
  },
  methods: {
    async fetchDetail () {
      const hostId = this.$route.params.deviceId
      if (!hostId) return

      this.loading = true
      this.fallbackUsed = false
      try {
        const response = await fetchHostDetail(hostId)
        this.detail = response
        // 获取主机关联节点
        this.fetchHostNodes()

        // 数据加载成功后连接 WebSocket
        this.$nextTick(() => {
          this.connectWebSocket()
        })
      } catch (error) {
        // 尝试使用备用方案
        this.fallbackUsed = true
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_detail.toast.fetch_detail_failed'))
      } finally {
        this.loading = false
      }
    },
    statusLabel (status) {
      const map = {
        online: this.$t('common.status.online'),
        offline: this.$t('common.status.offline'),
        maintenance: this.$t('common.status.maintenance')
      }
      return map[status] || this.$t('common.unknown')
    },
    statusTagType (status) {
      if (status === 'online') return 'success'
      if (status === 'maintenance') return 'warning'
      return 'info'
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    // 获取主机关联节点
    async fetchHostNodes () {
      const hostId = this.detail.id
      if (!hostId) return

      this.nodesLoading = true
      try {
        const res = await fetchHostNodes(hostId)

        const bindings = res?.data?.list || res?.data || res?.items || res || []
        this.hostNodes = bindings.map(item => {
          if (item.node) return item
          return {
            ...item,
            binding_uuid: item.uuid,
            node: {
              id: item.node_id,
              uuid: item.node_uuid || String(item.node_id),
              serial_number: item.node_serial_no || '-',
              mac_address: item.node_mac_address || '-',
              node_type_name: item.node_model_name || '-',
              hardware_model: item.node_model_name || '-',
              firmware_version: item.node_firmware_version || '-',
              status: item.node_status || 'offline'
            }
          }
        })
      } catch (error) {
        this.$uiToast.error(this.$t('host_detail.toast.fetch_nodes_failed', { msg: this.$getErrorMessage(error) || this.$t('host_detail.toast.fetch_nodes_default') }))
      } finally {
        this.nodesLoading = false
      }
    },
    // 查看节点详情
    viewNodeDetail (row) {
      if (row && row.id) {
        this.$router.push('/devices/nodes/' + row.id)
      } else {
        this.$uiToast.warning(this.$t('host_detail.toast.node_info_incomplete'))
      }
    },

    getHeartbeatIntervalDesc (interval) {
      if (interval <= 30) return this.$t('host_detail.heartbeat_desc.realtime')
      if (interval <= 60) return this.$t('host_detail.heartbeat_desc.standard')
      if (interval <= 120) return this.$t('host_detail.heartbeat_desc.power_save')
      return this.$t('host_detail.heartbeat_desc.limited')
    },
    startEdit (field, value) {
      const editableFields = new Set([
        'serial_no',
        'mac_address',
        'product_code',
        'hn_model_id',
        'hw_ver',
        'sw_ver',
        'heartbeat_interval'
      ])
      if (!this.canEdit(this.detail, 'host') || !editableFields.has(field)) {
        if (!this.canEdit(this.detail, 'host')) {
          this.$uiToast.warning(this.$t('common.no_permission_edit'))
        }
        return
      }
      this.editingField = field
      this.editValue = value ?? ''
    },

    async saveFieldEdit (field) {
      if (!this.canEdit(this.detail, 'host')) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      // 防止重复调用
      if (this.saving) return

      if (!this.editingField || !this.detail) return

      this.saving = true
      try {
        const hostId = this.detail.uuid || this.detail.device_id || this.detail.mac_address
        const updateData = { [field]: this.editValue }
        await updateHost(hostId, updateData)

        // 更新本地数据
        this.$set(this.detail, field, this.editValue)

        // 如果是状态字段，确保 status 也被正确更新
        if (field === 'status') {
          this.$set(this.detail, 'status', this.editValue)
        }

        this.$uiToast.success(this.$t('host_detail.toast.field_update_success'))
        // 强制刷新视图，确保状态变更立即显示
        this.$forceUpdate()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_detail.toast.field_update_failed'))
      } finally {
        this.saving = false
        // 延迟清空 editingField，确保视图先更新
        this.$nextTick(() => {
          this.editingField = null
          this.editValue = ''
        })
      }
    },

    editHost () {
      // 填充编辑表单数据
      this.editForm = {
        heartbeat_interval: this.detail.heartbeat_interval || 60,
        remark: this.detail.remark || ''
      }
      this.editDialogVisible = true
      // 弹窗刚打开还没改动，置 false 避免初始化触发 dirty
      this.$nextTick(() => { this.formDirtyFlag = false })
    },
    // unsavedGuard mixin 接入：编辑弹窗有未保存修改或行内编辑中时拦截
    isFormDirty () {
      if (this.editDialogVisible && this.formDirtyFlag) return true
      if (this.editingField !== null) return true
      return false
    },

    resetEditForm () {
      this.editForm = {
        heartbeat_interval: 60,
        remark: ''
      }
      this.editErrors = {}
    },
    editFieldState (field) {
      if (!(field in this.editErrors)) {
        return null
      }
      return !this.editErrors[field]
    },
    validateEditForm () {
      const errors = {}
      if (!this.editForm.heartbeat_interval) {
        errors.heartbeat_interval = this.$t('host_detail.toast.validate_heartbeat')
      }
      this.editErrors = errors
      return Object.keys(errors).length === 0
    },
    handleSaveEditOk (event) {
      event.preventDefault()
      this.saveEdit()
    },

    async saveEdit () {
      if (!this.validateEditForm()) {
        return
      }

      this.saving = true
      try {
        const hostId = this.detail.uuid || this.detail.device_id || this.detail.mac_address
        await updateHost(hostId, {
          heartbeat_interval: this.editForm.heartbeat_interval,
          remark: this.editForm.remark
        })

        // 更新本地数据
        this.detail = {
          ...this.detail,
          heartbeat_interval: this.editForm.heartbeat_interval,
          remark: this.editForm.remark
        }

        this.$uiToast.success(this.$t('host_detail.toast.host_update_success'))
        // 保存成功后重置 dirty，避免关闭弹窗时被误拦截
        this.formDirtyFlag = false
        this.editDialogVisible = false
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_detail.toast.host_update_failed'))
      } finally {
        this.saving = false
      }
    },

    // 节点绑定相关方法
    async manageNodes () {
      this.editingNodes = true
      try {
        await this.fetchHostNodes()
        const response = await fetchNodes({ page: 1, page_size: 200, is_active: true })
        const nodes = response?.items || response?.data?.items || response?.data || response || []
        const currentNodeIds = new Set(this.hostNodes.map(item => item.node?.id).filter(Boolean))
        const nodesById = new Map(nodes.map(node => [node.id, node]))
        this.hostNodes = this.hostNodes.map(binding => {
          const node = nodesById.get(binding.node?.id)
          if (!node) return binding
          return {
            ...binding,
            node: {
              ...binding.node,
              ...node,
              serial_number: node.serial_number || node.serial_no,
              node_type_name: node.node_type_name || node.hn_model_name,
              hardware_model: node.hardware_model || node.hn_model_name,
              firmware_version: node.firmware_version || node.sw_ver
            }
          }
        })
        this.availableNodes = nodes
          .filter(node => {
            const sameCompany = !this.detail.manufacturer_id || node.manufacturer_id === this.detail.manufacturer_id
            return sameCompany && (!node.is_bound || currentNodeIds.has(node.id))
          })
          .map(node => ({
            ...node,
            serial_number: node.serial_number || node.serial_no,
            node_type_name: node.node_type_name || node.hn_model_name,
            hardware_model: node.hardware_model || node.hn_model_name,
            firmware_version: node.firmware_version || node.sw_ver
          }))
        this.initializeNodeBindings()
      } catch (error) {
        this.availableNodes = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_detail.toast.fetch_nodes_default'))
      }
    },

    initializeNodeBindings () {
      this.nodeBindings = {
        A: { node_uuid: null, can_node_id: null },
        B: { node_uuid: null, can_node_id: null },
        C: { node_uuid: null, can_node_id: null }
      }
      // 根据当前节点数据初始化绑定表单
      this.hostNodes.forEach(item => {
        if (item.node) {
          this.nodeBindings[item.node_pos] = {
            node_uuid: item.node.uuid,
            can_node_id: item.can_node_id
          }
        }
      })
    },

    getNodeByPosition (pos) {
      const nodeBinding = this.hostNodes.find(item => item.node_pos === pos)
      return nodeBinding ? nodeBinding.node : null
    },

    getNodeStatusTagType (pos) {
      const node = this.getNodeByPosition(pos)
      if (!node) return 'info'
      if (node.status === 'online') return 'success'
      if (node.status === 'maintenance') return 'warning'
      if (node.status === 'offline') return 'info'
      return 'info'
    },

    getNodeStatusText (pos) {
      const node = this.getNodeByPosition(pos)
      if (!node) return this.$t('host_detail.node_status.unbound')
      if (node.status === 'online') return this.$t('host_detail.node_status.online')
      if (node.status === 'maintenance') return this.$t('host_detail.node_status.maintenance')
      if (node.status === 'offline') return this.$t('host_detail.node_status.offline')
      return this.$t('host_detail.node_status.unknown')
    },

    getCanNodeIdByPosition (pos) {
      const nodeBinding = this.hostNodes.find(item => item.node_pos === pos)
      return nodeBinding ? nodeBinding.can_node_id || 0 : 0
    },

    closeNodeManagement () {
      this.editingNodes = false
      // 重置绑定表单
      this.nodeBindings = {
        A: { node_uuid: null, can_node_id: null },
        B: { node_uuid: null, can_node_id: null },
        C: { node_uuid: null, can_node_id: null }
      }
    },

    handleNodeSelect (pos) {
      // 当选择节点时，为CAN地址设置默认值
      if (this.nodeBindings[pos].node_uuid && !this.nodeBindings[pos].can_node_id) {
        // 生成一个基于位置的默认CAN地址
        const defaultCanIds = { A: 10, B: 20, C: 30 }
        this.nodeBindings[pos].can_node_id = defaultCanIds[pos]
      }
    },

    getAvailableNodesForPosition (pos) {
      // 获取可用的节点（排除已被其他位置绑定的节点）
      const boundNodeUuids = Object.values(this.nodeBindings)
        .filter((binding, index) => {
          const bindingPos = Object.keys(this.nodeBindings)[index]
          return bindingPos !== pos && binding.node_uuid
        })
        .map(binding => binding.node_uuid)

      return this.availableNodes.filter(node =>
        !boundNodeUuids.includes(node.uuid)
      )
    },
    nodeSelectOptions (pos) {
      const options = [{ value: null, text: this.$t('host_detail.dialog.node_unbound') }]
      this.getAvailableNodesForPosition(pos).forEach(node => {
        options.push({
          value: node.uuid,
          text: `${node.serial_number} (${node.node_type_name})`
        })
      })
      return options
    },

    getSelectedNodeInfo (pos) {
      if (!this.nodeBindings[pos].node_uuid) return null
      const node = this.availableNodes.find(n => n.uuid === this.nodeBindings[pos].node_uuid)
      return node || null
    },

    getBoundNodeCount () {
      return Object.values(this.nodeBindings).filter(binding => binding.node_uuid).length
    },
    handleSaveNodeBindingsOk (event) {
      event.preventDefault()
      this.saveNodeBindings()
    },

    async saveNodeBindings () {
      // 验证所有已选节点的CAN地址
      let valid = true
      for (const pos of ['A', 'B', 'C']) {
        const canNodeId = Number(this.nodeBindings[pos].can_node_id)
        if (this.nodeBindings[pos].node_uuid && (
          !Number.isInteger(canNodeId) || canNodeId < 2 || canNodeId > 127
        )) {
          this.$uiToast.warning(this.$t('host_node_binding.validation.can_node_id_invalid'))
          valid = false
          break
        }
      }

      if (!valid) return

      this.savingNodes = true
      try {
        const existingByPosition = new Map(this.hostNodes.map(item => [item.node_pos, item]))
        for (const pos of ['A', 'B', 'C']) {
          const existing = existingByPosition.get(pos)
          const desired = this.nodeBindings[pos]
          const desiredNode = desired.node_uuid
            ? this.availableNodes.find(node => node.uuid === desired.node_uuid)
            : null

          if (!existing && desiredNode) {
            await createBinding({
              host_id: this.detail.id,
              node_id: desiredNode.id,
              can_node_id: desired.can_node_id,
              node_pos: pos
            })
          } else if (existing && !desiredNode) {
            await deleteBinding(existing.binding_uuid || existing.uuid)
          } else if (existing && desiredNode) {
            const bindingUuid = existing.binding_uuid || existing.uuid
            if (existing.node?.id !== desiredNode.id) {
              await replaceNode({
                uuid: bindingUuid,
                new_node_id: desiredNode.id,
                can_node_id: desired.can_node_id,
                // 后端 PUT /hn-bindings/replace 的 reason 为必填审计字段
                reason: this.$t('host_detail.dialog.binding_replace_reason')
              })
            } else if (existing.can_node_id !== desired.can_node_id) {
              await updateCanNodeId(bindingUuid, { can_node_id: desired.can_node_id })
            }
          }
        }

        await this.fetchHostNodes()
        this.$uiToast.success(this.$t('host_detail.toast.node_binding_success'))
        this.editingNodes = false
      } catch (error) {
        await this.fetchHostNodes()
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_detail.toast.node_binding_failed'))
      } finally {
        this.savingNodes = false
      }
    },

    // ========== WebSocket 相关方法 ==========
    connectWebSocket () {
      // 如果 WebSocket 已连接，跳过
      if (wsManager.isConnected()) {
        return
      }

      // 尝试多种可能的 UUID 字段名
      const hostUuid = this.detail.uuid || this.detail.id || this.detail.device_id || this.detail.mac_address

      if (!hostUuid) {
        console.warn('[HostDetail] 主机 UUID 为空，跳过 WebSocket 连接')
        return
      }

      wsManager.connectSingle(hostUuid, {
        statusUpdate: (data) => {
          this.handleStatusUpdate(data)
        },
        error: (error) => {
          console.error('[HostDetail] WebSocket 错误:', error)
        }
      })
    },

    disconnectWebSocket () {
      wsManager.disconnect()
    },

    handleStatusUpdate (data) {
      const { data: statusData } = data

      // 记录消息到日志
      this.addMessageLog('status_update', statusData)

      // 更新在线状态
      if (statusData.is_online !== undefined) {
        this.$set(this.detail, 'status', statusData.is_online ? 'online' : 'offline')
      }

      // 更新最后在线时间
      if (statusData.last_seen) {
        this.$set(this.detail, 'last_seen', statusData.last_seen)
      }

      if (statusData.topology_pending !== undefined) {
        this.$set(this.detail, 'topology_pending', statusData.topology_pending)
      }

      if (statusData.enrollment_state) {
        this.$set(this.detail, 'enrollment_state', statusData.enrollment_state)
      }

      // 更新系统状态（如果有）
      if (statusData.system_status) {
        this.$set(this.detail, 'system_status', statusData.system_status)
      }
    },

    // 添加消息到日志
    addMessageLog (type, data) {
      const now = new Date()
      const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })

      this.wsMessageLog.unshift({
        type,
        data,
        timestamp: timeStr
      })

      // 限制日志条数
      if (this.wsMessageLog.length > this.maxLogEntries) {
        this.wsMessageLog = this.wsMessageLog.slice(0, this.maxLogEntries)
      }
    },

    // 清空消息日志
    clearMessageLog () {
      this.wsMessageLog = []
      this.mqttLogExpanded = false
    },

    // 格式化日志数据
    formatLogData (data) {
      if (!data) return ''
      return JSON.stringify(data, null, 2)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/host-detail.scss"></style>
