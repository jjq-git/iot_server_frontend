<template>
  <div class="pod-control-panel">
    <div class="control-surface">
      <base-alert
        v-if="isOffline"
        variant="warning"
        :dismissible="false"
        class="control-offline-alert"
      >
        <strong>{{ $t('pod_control_panel.offline.title') }}</strong>
        <span>{{ offlineDescription }}</span>
      </base-alert>

      <div class="control-section">
        <h4 class="section-title">
          <app-icon name="sliders" class="mr-1" /> {{ $t('pod_control_panel.section.device_control') }}
          <span class="section-context">{{ podUuid }}</span>
        </h4>

        <base-loading v-if="loading" :show="true" class="py-4" />

        <template v-else>
          <div v-if="!controlCards.length" class="text-muted text-center py-4">
            {{ $t('pod_control_panel.empty.no_modules') }}
          </div>

          <div v-else class="control-grid">
            <button
              v-for="card in controlCards"
              :key="card.key"
              type="button"
              class="control-card"
              :class="{
                'control-card--unbound': !card.bound,
                'control-card--offline': isOffline
              }"
              :disabled="isOffline"
              :title="isOffline ? $t('pod_control_panel.offline.control_disabled') : ''"
              @click="openModuleDialog(card.module, card.instance)"
            >
              <span class="control-icon">
                <app-icon :name="getModuleIcon(card.module)" />
              </span>
              <span class="control-copy">
                <span class="control-heading">
                  <span class="control-label">{{ card.module.title }}</span>
                  <base-badge :variant="card.bound ? 'success' : 'secondary'">
                    {{ $t(card.bound ? 'pod_control_panel.module_status.bound' : 'pod_control_panel.module_status.unbound') }}
                  </base-badge>
                </span>
                <span class="control-summary">{{ getModuleSummary(card.module, card.instance) }}</span>
              </span>
            </button>
          </div>
        </template>
      </div>

      <div class="control-section">
        <h4 class="section-title">
          <app-icon name="tools" class="mr-1" /> {{ $t('pod_control_panel.section.common_actions') }}
        </h4>
        <div class="control-actions">
          <base-button v-if="supportsAction('restart')" size="sm" variant="outline-secondary" class="control-action" :disabled="!canSendCommands" :title="commandDisabledTitle" @click="confirmRestart">
            <app-icon name="arrow-clockwise"  />
            <span>{{ $t('pod_control_panel.actions.restart_device') }}</span>
          </base-button>

          <base-button v-if="isPlatformAccount && supportsAction('get_status')" size="sm" variant="outline-secondary" class="control-action" :disabled="!canSendCommands" :title="commandDisabledTitle" @click="sendGetStatus">
            <app-icon name="graph-up"  />
            <span>{{ $t('pod_control_panel.actions.get_status') }}</span>
          </base-button>

          <base-button v-if="canUseCustomCommands" size="sm" variant="outline-secondary" class="control-action" :disabled="!canSendCustomCommands" :title="commandDisabledTitle" @click="openCustomDialog">
            <app-icon name="gear"  />
            <span>{{ $t('pod_control_panel.actions.custom_command') }}</span>
          </base-button>

          <base-button v-if="isPlatformAccount" size="sm" variant="outline-secondary" class="control-action" @click="showCommandHistory">
            <app-icon name="clock-history" />
            <span>{{ $t('pod_control_panel.section.command_history') }}</span>
          </base-button>
        </div>
      </div>
    </div>

    <base-modal
      id="pod-control-panel-dialog"
      v-model="dialogVisible"
      :title="dialogTitle"
      modal-class="model-ele pod-control-panel-modal dialog-with-header-bg"
      @hidden="resetDialog"
    >
      <template v-if="dialogMode === 'module' && activeModule">
        <base-alert
          v-if="!activeModule.bound"
          variant="warning"
          class="mb-3"
        >
          {{ $t('pod_control_panel.module_dialog.unbound_warning') }}
        </base-alert>

        <base-form-group
          v-if="activeModule.instances && activeModule.instances.length > 1"
          :label="$t('pod_control_panel.module_dialog.control_target')"
        >
          <base-select v-model="selectedInstanceUuid" :options="getInstanceOptions(activeModule)" />
        </base-form-group>

        <div v-if="activeShadowItems.length" class="control-shadow-list">
          <div v-for="item in activeShadowItems" :key="item.field.attr_code" class="control-shadow-item">
            <div class="control-shadow-copy">
              <span class="control-shadow-field">{{ item.field.attr_name }}</span>
              <span class="control-shadow-reported">
                {{ $t('pod_control_panel.shadow.reported_value', { value: formatFieldValue(item.shadow.reported_value, item.field) }) }}
              </span>
            </div>
            <base-badge :variant="shadowStatusVariant(item.shadow.state)">
              {{ $t(`pod_control_panel.shadow.${item.shadow.state}`) }}
            </base-badge>
          </div>
        </div>

        <b-form v-if="sortedActiveWidgets.length" class="device-widget-list">
          <device-widget
            v-for="widget in sortedActiveWidgets"
            :key="widget.id"
            :widget="widget"
            :values="moduleForm"
            :disabled="!canSendCommands || !activeModule.bound || isWidgetInterlocked(widget)"
            @change="handleWidgetChange"
            @invoke="invokeWidget"
          />
        </b-form>

        <b-form v-else>
          <base-form-group
            v-for="field in sortedActiveFields"
            :key="field.attr_code"
            :label="field.attr_name"
          >
            <template v-if="widgetOf(field) === 'switch'">
              <b-form-checkbox
                v-model="moduleForm[field.attr_code]"
                switch
                :disabled="!canEditField(field)"
              >
                {{ $t(moduleForm[field.attr_code] ? 'pod_control_panel.module_dialog.switch_on' : 'pod_control_panel.module_dialog.switch_off') }}
              </b-form-checkbox>
            </template>

            <template v-else-if="widgetOf(field) === 'dropdown'">
              <base-select
                v-model="moduleForm[field.attr_code]"
                :options="getFieldOptions(field)"
                :disabled="!canEditField(field)"
              />
            </template>

            <template v-else-if="widgetOf(field) === 'slider'">
              <div class="slider-group">
                <base-input
                  :value="sliderValue(field)"
                  type="range"
                  :min="getFieldMin(field)"
                  :max="getFieldMax(field)"
                  :disabled="!canEditField(field)"
                  :clearable="false"
                  @input="setSliderValue(field, $event)"
                />
                <base-input
                  v-model="moduleForm[field.attr_code]"
                  :clearable="false"
                  type="number"
                  :min="getFieldMin(field)"
                  :max="getFieldMax(field)"
                  :disabled="!canEditField(field)"
                  class="slider-number-input"
                />
              </div>
            </template>

            <template v-else-if="widgetOf(field) === 'stepper'">
              <b-input-group class="stepper-group">
                <b-input-group-prepend>
                  <base-button
                    size="sm"
                    variant="outline-secondary"
                    :disabled="!canEditField(field)"
                    @click="stepField(field, -1)"
                  >-</base-button>
                </b-input-group-prepend>
                <base-input
                  v-model="moduleForm[field.attr_code]"
                  :clearable="false"
                  type="number"
                  :min="getFieldMin(field)"
                  :max="getFieldMax(field)"
                  :disabled="!canEditField(field)"
                />
                <b-input-group-append>
                  <base-button
                    size="sm"
                    variant="outline-secondary"
                    :disabled="!canEditField(field)"
                    @click="stepField(field, 1)"
                  >+</base-button>
                </b-input-group-append>
              </b-input-group>
            </template>

            <template v-else-if="widgetOf(field) === 'color_picker'">
              <input
                v-model="moduleForm[field.attr_code]"
                type="color"
                :disabled="!canEditField(field)"
                class="color-picker"
              />
            </template>

            <template v-else-if="widgetOf(field) === 'badge'">
              <base-badge variant="info">{{ displayBadgeValue(field) }}</base-badge>
            </template>

            <template v-else-if="widgetOf(field) === 'chart'">
              <div class="control-mini-chart" :title="formatFieldValue(moduleForm[field.attr_code], field)">
                <svg viewBox="0 0 240 64" role="img" :aria-label="field.label || field.attr_code">
                  <polyline :points="chartPoints(moduleForm[field.attr_code])" fill="none" stroke="currentColor" stroke-width="3" />
                </svg>
                <span>{{ formatFieldValue(chartLatestValue(moduleForm[field.attr_code]), field) }}</span>
              </div>
            </template>

            <template v-else-if="widgetOf(field) === 'number'">
              <base-input
                v-model="moduleForm[field.attr_code]"
                :clearable="false"
                type="number"
                :min="getFieldMin(field)"
                :max="getFieldMax(field)"
                :disabled="!canEditField(field)"
              />
            </template>

            <template v-else>
              <base-input
                v-model="moduleForm[field.attr_code]"
                :disabled="!canEditField(field)"
                :placeholder="$t('pod_control_panel.module_dialog.input_placeholder')"
              />
            </template>

            <div v-if="field.unit || field.description" class="field-tip">
              <span v-if="field.unit">{{ $t('pod_control_panel.module_dialog.unit_prefix') }}{{ field.unit }}</span>
              <span v-if="field.description">{{ field.description }}</span>
            </div>
          </base-form-group>
        </b-form>
      </template>

      <template v-else-if="dialogMode === 'custom'">
        <b-form>
          <base-form-group :label="$t('pod_control_panel.module_dialog.command_label')">
            <base-input v-model.trim="customCommand" :placeholder="$t('pod_control_panel.module_dialog.command_placeholder')" />
          </base-form-group>
          <base-form-group :label="$t('pod_control_panel.module_dialog.payload_label')">
            <base-textarea
              v-model="customPayloadJson"
              :rows="8"
              :placeholder="$t('pod_control_panel.module_dialog.payload_placeholder')"
            />
          </base-form-group>
        </b-form>
      </template>

      <template #modal-footer>
        <div class="w-100 d-flex justify-content-end">
          <base-button variant="outline-secondary" class="mr-2" @click="dialogVisible = false">{{ $t('pod_control_panel.actions.cancel') }}</base-button>
          <base-button
            v-if="dialogMode === 'module'"
            :disabled="sending || !canSendCommands || (activeModule && !activeModule.bound)"
            @click="submitModuleCommand"
          >
            {{ sending ? $t('pod_control_panel.actions.sending') : $t('pod_control_panel.actions.send_control') }}
          </base-button>
          <base-button
            v-else
            :disabled="sending || !canSendCustomCommands"
            @click="submitCustomCommand"
          >
            {{ sending ? $t('pod_control_panel.actions.sending') : $t('pod_control_panel.actions.send_command') }}
          </base-button>
        </div>
      </template>
    </base-modal>

    <base-modal
      id="pod-command-history-modal"
      v-model="commandHistoryVisible"
      :title="$t('pod_control_panel.section.command_history')"
      size="xl"
      hide-footer
      modal-class="pod-command-history-modal"
    >
      <div class="history-section">
        <div class="history-dialog-toolbar">
          <span class="text-muted small">{{ historyTotal }}</span>
          <base-button size="sm" variant="outline-secondary" :title="$t('pod_control_panel.actions.refresh')" :disabled="historyLoading" @click="loadCommandHistory">
          <app-icon name="arrow-clockwise"  />
          <span class="sr-only">{{ $t('pod_control_panel.actions.refresh') }}</span>
        </base-button>
        </div>
      <base-table :items="commandHistory" :fields="commandHistoryFields" :loading="historyLoading" small bordered>
        <template #cell(sent_at)="data">
          {{ formatTime(data.item.queued_at || data.item.sent_at) }}
        </template>
        <template #cell(command)="data">
          <base-badge variant="secondary">{{ data.item.command }}</base-badge>
        </template>
        <template #cell(status)="data">
          <base-badge :variant="statusBadgeVariant(data.item.status)">
            {{ statusBadgeLabel(data.item.status) }}
          </base-badge>
        </template>
        <template #cell(command_id)="data">
          <span class="text-muted small">{{ data.item.command_id ? data.item.command_id.slice(0, 16) + '…' : '-' }}</span>
        </template>
        <template #cell(payload)="data">
          <span class="payload-json">{{ JSON.stringify(data.item.payload || data.item.ack_payload || {}) }}</span>
        </template>
      </base-table>
      <div v-if="historyTotal > 0" class="history-pager">
        <base-pagination
          v-model="historyPage"
          :total-rows="historyTotal"
          :per-page.sync="historyPageSize"
          :show-per-page="true"
          @input="handleHistoryPageChange"
        />
      </div>
      </div>
    </base-modal>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import DeviceWidget from '@/components/DeviceWidget.vue'
import { fetchPodControlSchema, fetchPodControlState, sendPodCommand, sendDeviceControl, sendWidgetOperation, fetchPodCommands } from '@/api/pods'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { formatDate } from '@/utils/format'
import { applyControlSafetyInterlocks, isControlFieldInterlocked, normalizeControlFieldValue, pendingControlKey, reconcileControlDisplayState, shouldRollbackControlDraft, sliderDisplayValue, validateControlFieldValue } from '@/utils/control-validation.mjs'
import { buildControlAddressIndex, hasActiveControlShadows, stateSnapshotUpdates, statusMessageUpdates } from '@/utils/control-state.mjs'
import { expandControlModules } from '@/utils/control-modules.mjs'
import { widgetsForModule } from '@/utils/widget-contract.mjs'
import { podControlRealtime } from '@realtime-mode-entry'

const CONTROL_STATE_RECONCILE_MS = 30000
const LEGACY_STATE_MIN_INTERVAL_MS = 5000

export default {
  name: 'PodControlPanel',
  components: {
    BaseAlert,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BasePagination,
    BaseSelect,
    BaseTable,
    BaseTextarea,
    DeviceWidget
  },
  props: {
    podUuid: {
      type: String,
      required: true
    },
    online: { type: Boolean, default: null },
    lastSeen: { type: [String, Number, Date], default: null },
    readOnly: { type: Boolean, default: false }
  },
  data () {
    const user = getCurrentUser()
    return {
      loading: false,
      sending: false,
      dialogVisible: false,
      dialogMode: 'module',
      activeModule: null,
      selectedInstanceUuid: '',
      moduleForm: {},
      moduleOriginalForm: {},
      pendingModuleCommands: {},
      customCommand: 'custom',
      customPayloadJson: '{}',
      controlSchema: {
        modules: [],
        actions: []
      },
      commandHistory: [],
      historyTotal: 0,
      historyPage: 1,
      historyPageSize: 10,
      historyLoading: false,
      commandHistoryVisible: false,
      commandHistoryLoaded: false,
      onlineState: this.online,
      lastSeenAt: this.lastSeen,
      permissionUser: user
    }
  },
  computed: {
    isPlatformAccount () {
      return hasPermission(PERMISSION.PLATFORM_DIAGNOSE, this.permissionUser)
    },
    isOffline () {
      return this.onlineState === false
    },
    canOperateCommands () {
      return !this.readOnly && hasPermission(PERMISSION.POD_CONTROL, this.permissionUser)
    },
    canSendCommands () {
      return this.canOperateCommands && !this.isOffline
    },
    canUseCustomCommands () {
      return !this.readOnly && this.isPlatformAccount
    },
    canSendCustomCommands () {
      return this.canUseCustomCommands && !this.isOffline
    },
    offlineDescription () {
      if (this.lastSeenAt) {
        return this.$t('pod_control_panel.offline.description_with_last_seen', {
          time: this.formatTime(this.lastSeenAt)
        })
      }
      return this.$t('pod_control_panel.offline.description')
    },
    commandDisabledTitle () {
      return this.isOffline ? this.$t('pod_control_panel.offline.control_disabled') : ''
    },
    actionKeys () {
      return new Set(
        (this.controlSchema.actions || [])
          .map(action => action && action.key)
          .filter(Boolean)
      )
    },
    controlCards () {
      return expandControlModules(this.controlSchema.modules)
    },
    dialogTitle () {
      if (this.dialogMode === 'custom') {
        return this.$t('pod_control_panel.module_dialog.title_custom')
      }
      return this.activeModule ? this.activeModule.title : this.$t('pod_control_panel.module_dialog.title_default')
    },
    sortedActiveFields () {
      if (!this.activeModule || !this.activeModule.fields) {
        return []
      }
      return [...this.activeModule.fields]
        .filter(field => this.isFieldVisible(field))
        .sort((a, b) => (a.display_order || 9999) - (b.display_order || 9999))
    },
    sortedActiveWidgets () {
      if (!this.activeModule) return []
      return widgetsForModule(this.activeModule)
        .filter(widget => widget.widget !== 'none' && widget.fields.some(field => this.isFieldVisible(field)))
        .sort((a, b) => {
          const aOrder = Math.min(...a.fields.map(field => field.display_order || 9999))
          const bOrder = Math.min(...b.fields.map(field => field.display_order || 9999))
          return aOrder - bOrder
        })
    },
    activeShadowItems () {
      if (!this.selectedInstanceUuid) return []
      return this.sortedActiveFields
        .map(field => ({ field, shadow: field.shadows && field.shadows[this.selectedInstanceUuid] }))
        .filter(item => item.shadow && ['pending', 'acknowledged', 'failed', 'timeout'].includes(item.shadow.state))
    },
    commandHistoryFields () {
      return [
        { key: 'sent_at', label: this.$t('pod_control_panel.history_table.sent_at'), thStyle: { width: '170px' } },
        { key: 'command_id', label: this.$t('pod_control_panel.history_table.command_id'), thStyle: { width: '100px' } },
        { key: 'command', label: this.$t('pod_control_panel.history_table.command'), thStyle: { width: '80px' } },
        { key: 'status', label: this.$t('pod_control_panel.history_table.status'), thStyle: { width: '90px' } },
        { key: 'payload', label: this.$t('pod_control_panel.history_table.payload') }
      ]
    }
  },
  watch: {
    online (value) {
      this.onlineState = value
      this._setInstancesOnline(value)
    },
    lastSeen (value) {
      this.lastSeenAt = value
    },
    historyPageSize () {
      if (!this.commandHistoryVisible) return
      this.historyPage = 1
      this.loadCommandHistory()
    },
    podUuid: {
      immediate: true,
      handler (newVal, oldVal) {
        this._teardownRealtime()
        this.commandHistoryVisible = false
        this.commandHistoryLoaded = false
        this.commandHistory = []
        this.historyTotal = 0
        this.historyPage = 1
        this._initializePodControl(newVal)
      }
    },
    selectedInstanceUuid (newValue, oldValue) {
      if (this.activeModule && newValue && oldValue && newValue !== oldValue) {
        this.initializeModuleForm()
      }
    }
  },
  beforeDestroy () {
    this._teardownRealtime()
  },
  methods: {
    supportsAction (actionKey) {
      return this.actionKeys.has(actionKey)
    },
    async _initializePodControl (expectedUuid) {
      if (!expectedUuid) return
      await this.loadControlSchema()
      if (this.podUuid !== expectedUuid) return
      await this.loadControlState()
      if (this.podUuid !== expectedUuid) return
      this._setupWebSocket()
      this._controlStateReconcileTimer = setInterval(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          this.loadControlState()
        }
      }, CONTROL_STATE_RECONCILE_MS)
    },
    _teardownRealtime () {
      podControlRealtime.disconnect()
      if (this._controlStateReconcileTimer) {
        clearInterval(this._controlStateReconcileTimer)
        this._controlStateReconcileTimer = null
      }
      if (this._controlStateSyncTimer) {
        clearTimeout(this._controlStateSyncTimer)
        this._controlStateSyncTimer = null
      }
      this._controlAddressIndex = new Map()
      this._controlSchemaRequest = null
      this._controlStateRequest = null
      this._controlStateRefreshQueued = false
      this._lastControlStateSyncAt = 0
      this._wsConnectedOnce = false
      this.pendingModuleCommands = {}
    },
    _setupWebSocket () {
      if (!this.podUuid) return
      podControlRealtime.connect(this.podUuid, {
        onOpen: () => {
          if (this._wsConnectedOnce) this._scheduleControlStateSync(0, true)
          this._wsConnectedOnce = true
        },
        onStatusUpdate: (msg) => {
          this._updateAvailability(msg && msg.status ? msg.status : msg)
          const updates = statusMessageUpdates(msg, this._controlAddressIndex)
          if (updates.length) {
            this._applyControlUpdates(updates)
            if (hasActiveControlShadows(this.controlSchema.modules)) {
              this._scheduleControlStateSync(250)
            }
          } else {
            // 旧四层状态或无法映射的事件走轻量快照兜底，且最多每 5 秒一次。
            this._scheduleControlStateSync(500)
          }
        },
        onCommandAck: (msg) => {
          this.loadCommandHistory()
          this._scheduleControlStateSync(0, true)
        },
        onError: (err) => {
          console.error('[PodControlPanel] WS error:', err)
        }
      })
    },
    statusBadgeVariant (status) {
      const map = { success: 'success', failed: 'danger', timeout: 'warning', sent: 'info', queued: 'secondary' }
      return map[status] || 'secondary'
    },
    statusBadgeLabel (status) {
      const map = {
        success: this.$t('pod_control_panel.status_label.success'),
        failed: this.$t('pod_control_panel.status_label.failed'),
        timeout: this.$t('pod_control_panel.status_label.timeout'),
        sent: this.$t('pod_control_panel.status_label.sent'),
        queued: this.$t('pod_control_panel.status_label.queued')
      }
      return map[status] || status
    },
    async loadControlSchema () {
      if (this._controlSchemaRequest) return this._controlSchemaRequest
      this.loading = true
      const expectedUuid = this.podUuid
      const request = fetchPodControlSchema(expectedUuid)
      this._controlSchemaRequest = request
      try {
        const res = await request
        if (this.podUuid !== expectedUuid) return
        this.controlSchema = res || { modules: [], actions: [] }
        this._controlAddressIndex = buildControlAddressIndex(this.controlSchema.modules)
      } catch (error) {
        this.$uiToast.error(this.$t('pod_control_panel.toast.load_failed') + (this.$getErrorMessage(error)))
        this.controlSchema = { modules: [], actions: [] }
        this._controlAddressIndex = new Map()
      } finally {
        if (this.podUuid === expectedUuid) this.loading = false
        if (this._controlSchemaRequest === request) this._controlSchemaRequest = null
      }
    },
    async loadControlState () {
      if (!this.podUuid) return
      if (this._controlStateRequest) {
        this._controlStateRefreshQueued = true
        return this._controlStateRequest
      }
      const expectedUuid = this.podUuid
      const request = fetchPodControlState(expectedUuid)
      this._controlStateRequest = request
      try {
        const state = await request
        if (this.podUuid !== expectedUuid || !state) return
        this._lastControlStateSyncAt = Date.now()
        this._updateAvailability(state)
        this._applyControlUpdates(stateSnapshotUpdates(state, this._controlAddressIndex))
      } catch (error) {
        console.error('[PodControlPanel] control-state error:', error)
      } finally {
        if (this._controlStateRequest === request) this._controlStateRequest = null
        if (this._controlStateRefreshQueued && this.podUuid === expectedUuid) {
          this._controlStateRefreshQueued = false
          this._scheduleControlStateSync(0, true)
        }
      }
    },
    _scheduleControlStateSync (delay = 0, force = false) {
      if (!this.podUuid) return
      const elapsed = Date.now() - (this._lastControlStateSyncAt || 0)
      const wait = force ? delay : Math.max(delay, LEGACY_STATE_MIN_INTERVAL_MS - elapsed)
      if (this._controlStateSyncTimer) {
        if (!force) return
        clearTimeout(this._controlStateSyncTimer)
      }
      this._controlStateSyncTimer = setTimeout(() => {
        this._controlStateSyncTimer = null
        this.loadControlState()
      }, Math.max(0, wait))
    },
    _setInstancesOnline (isOnline) {
      if (typeof isOnline !== 'boolean') return
      for (const module of this.controlSchema.modules || []) {
        for (const instance of module.instances || []) {
          this.$set(instance, 'online', Boolean(isOnline))
        }
      }
    },
    _updateAvailability (status) {
      if (!status || typeof status !== 'object') return
      if (typeof status.is_online === 'boolean') {
        this.onlineState = status.is_online
        this._setInstancesOnline(status.is_online)
      }
      // REST /control-state 返回 last_seen_at;WS 推送沿用 last_seen,两者都兼容
      const lastSeen = status.last_seen_at || status.last_seen
      if (lastSeen) this.lastSeenAt = lastSeen
    },
    _applyControlUpdates (updates) {
      for (const update of updates) {
        const field = update.field
        if (!field.current_values || typeof field.current_values !== 'object') {
          this.$set(field, 'current_values', {})
        }
        this.$set(field.current_values, update.targetUuid, update.value)
        const firstInstance = update.module.instances && update.module.instances[0]
        if (firstInstance && firstInstance.device_uuid === update.targetUuid) {
          this.$set(field, 'current_value', update.value)
        }
        if (update.hasShadow) {
          if (!field.shadows || typeof field.shadows !== 'object') this.$set(field, 'shadows', {})
          if (update.shadow) this.$set(field.shadows, update.targetUuid, update.shadow)
          else this.$delete(field.shadows, update.targetUuid)
        }
        this._syncOpenDialogDraft(update)
      }
      this._reconcileOpenDialogDisplayState()
    },
    _reconcileOpenDialogDisplayState () {
      if (!this.dialogVisible || !this.activeModule) return
      const reconciled = reconcileControlDisplayState(this.sortedActiveFields, this.moduleOriginalForm)
      this.sortedActiveFields.forEach(field => {
        const attrCode = field.attr_code
        const original = this.moduleOriginalForm[attrCode]
        const next = reconciled[attrCode]
        if (JSON.stringify(original) === JSON.stringify(next)) return
        if (JSON.stringify(this.moduleForm[attrCode]) !== JSON.stringify(original)) return
        this.$set(this.moduleForm, attrCode, next)
        this.$set(this.moduleOriginalForm, attrCode, next)
      })
    },
    _syncOpenDialogDraft (update) {
      if (!this.dialogVisible || !this.activeModule) return
      if (this.activeModule.device_model_uuid !== update.module.device_model_uuid) return
      if (this.selectedInstanceUuid !== update.targetUuid) return
      const attrCode = update.field.attr_code
      const draft = this.moduleForm[attrCode]
      const original = this.moduleOriginalForm[attrCode]
      const pendingKey = pendingControlKey(update.targetUuid, update.field)
      const pending = this.pendingModuleCommands[pendingKey]
      const shadow = update.shadow
      if (pending && shadow && ['pending', 'acknowledged'].includes(shadow.state)) return
      if (pending && !shadow) return
      if (pending && shadow && ['failed', 'timeout'].includes(shadow.state)) {
        if (shouldRollbackControlDraft({ pending, shadow, draft })) {
          const reported = shadow.reported_value !== undefined && shadow.reported_value !== null
            ? shadow.reported_value
            : update.value
          const value = this.normalizeFieldValue(update.field, reported)
          this.$set(this.moduleForm, attrCode, value)
          this.$set(this.moduleOriginalForm, attrCode, value)
        }
        this.$delete(this.pendingModuleCommands, pendingKey)
        this.$uiToast.error(this.$t('pod_control_panel.toast.control_rollback', {
          field: update.field.attr_name,
          status: this.$t(`pod_control_panel.shadow.${shadow.state}`)
        }))
        return
      }
      if (pending && shadow && ['applied', 'reported'].includes(shadow.state)) {
        this.$delete(this.pendingModuleCommands, pendingKey)
      }
      if (JSON.stringify(draft) !== JSON.stringify(original)) return
      const value = this.normalizeFieldValue(update.field, update.value)
      this.$set(this.moduleForm, attrCode, value)
      this.$set(this.moduleOriginalForm, attrCode, value)
    },
    formatTime (time) {
      return formatDate(time)
    },
    getModuleIcon (module) {
      const iconMap = {
        fan: 'fan',
        light: 'lightbulb',
        ac: 'snow',
        fresh_air: 'wind',
        door_lock: 'lock',
        audio: 'headphones'
      }
      return iconMap[module.control_category] || 'cpu'
    },
    formatInstanceLabel (instance) {
      const parts = []
      if (Number.isInteger(instance.can_node_id)) parts.push(this.$t('pod_control_panel.node_id', { id: instance.can_node_id }))
      if (instance.serial_no) parts.push(instance.serial_no)
      if (instance.node_pos) parts.push(this.$t('pod_control_panel.position_prefix', { pos: instance.node_pos }))
      if (instance.mac_address) parts.push(instance.mac_address)
      return parts.join(' | ') || instance.device_uuid
    },
    getModuleSummary (module, instance = null) {
      if (!module || !instance) {
        return this.$t('pod_control_panel.module_status.unbound')
      }
      const parts = []
      if (Number.isInteger(instance.can_node_id)) parts.push(this.$t('pod_control_panel.node_id', { id: instance.can_node_id }))
      if (instance.serial_no) parts.push(instance.serial_no)
      if (instance.node_pos) parts.push(this.$t('pod_control_panel.position_prefix', { pos: instance.node_pos }))
      const index = (module.instances || []).findIndex(item => item.device_uuid === instance.device_uuid)
      if (index >= 0) parts.push(this.$t('pod_control_panel.instance_counter', { current: index + 1, total: module.instances.length }))
      return parts.join(' · ') || instance.device_uuid || '-'
    },
    getInstanceOptions (module) {
      if (!module || !Array.isArray(module.instances)) {
        return []
      }
      return module.instances.map(instance => ({
        value: instance.device_uuid,
        text: this.formatInstanceLabel(instance)
      }))
    },
    usesOptions (field) {
      if (Array.isArray(field.options)) {
        return field.options.length > 0
      }
      if (field.options && typeof field.options === 'object' && Array.isArray(field.options.enum)) {
        return field.options.enum.length > 0
      }
      return false
    },
    getFieldOptions (field) {
      if (Array.isArray(field.options)) return field.options
      if (field.options && Array.isArray(field.options.enum)) return field.options.enum
      return []
    },
    widgetOf (field) {
      const w = (field.widget || '').toLowerCase()
      const validWidgets = ['slider', 'switch', 'dropdown', 'stepper', 'color_picker', 'text', 'badge', 'chart', 'none']
      if (validWidgets.includes(w)) return w
      if (this.usesOptions(field)) return 'dropdown'
      if (field.data_type === 'BOOLEAN') return 'switch'
      const isNumber = ['UNSIGNED8', 'UNSIGNED16', 'UNSIGNED32', 'INTEGER8', 'INTEGER16', 'INTEGER32', 'REAL32'].includes(field.data_type)
      if (isNumber) {
        const hasRange = field.min_val !== null && field.min_val !== undefined && field.max_val !== null && field.max_val !== undefined
        return hasRange ? 'slider' : 'number'
      }
      return 'text'
    },
    isNumberField (field) {
      return ['UNSIGNED8', 'UNSIGNED16', 'UNSIGNED32', 'INTEGER8', 'INTEGER16', 'INTEGER32', 'REAL32'].includes(field.data_type)
    },
    isFieldVisible (field) {
      if (field.is_visible === false) return false
      if ((field.widget || '').toLowerCase() === 'none') return false
      const readPermissions = this.getPermissionList(field, 'read_permissions')
      if (readPermissions.length && !readPermissions.some(code => hasPermission(code, this.permissionUser))) return false
      return true
    },
    getPermissionList (field, key) {
      const opts = field.options
      if (!opts || Array.isArray(opts) || typeof opts !== 'object') return []
      const perms = opts.permissions || {}
      return Array.isArray(perms[key]) ? perms[key] : []
    },
    displayBadgeValue (field) {
      const raw = this.moduleForm[field.attr_code]
      if (raw === undefined || raw === null || raw === '') return this.$t('pod_control_panel.module_dialog.badge_empty')
      const list = this.getFieldOptions(field)
      const matched = list.find(item => String(item.value) === String(raw))
      return matched ? matched.text : raw
    },
    chartValues (value) {
      const raw = Array.isArray(value)
        ? value
        : (Array.isArray(value?.values) ? value.values : (Array.isArray(value?.series) ? value.series : [value]))
      return raw.map(item => Number(item?.value ?? item)).filter(Number.isFinite).slice(-30)
    },
    chartLatestValue (value) {
      const values = this.chartValues(value)
      return values.length ? values[values.length - 1] : null
    },
    chartPoints (value) {
      const values = this.chartValues(value)
      if (!values.length) return ''
      const min = Math.min(...values)
      const max = Math.max(...values)
      const range = max - min || 1
      return values.map((item, index) => {
        const x = values.length === 1 ? 120 : (index * 236) / (values.length - 1) + 2
        const y = 60 - ((item - min) / range) * 56
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    formatFieldValue (value, field) {
      if (value === undefined || value === null || value === '') return '-'
      if (field?.attr_code === 'node2_curtain_position' && Number(value) === 255) {
        return this.$t('pod_control_panel.shadow.unknown_value')
      }
      const formatted = typeof value === 'object' ? JSON.stringify(value) : String(value)
      return field?.unit ? `${formatted} ${field.unit}` : formatted
    },
    stepField (field, delta) {
      if (!this.canEditField(field)) return
      const step = Number(field.step || 1)
      const current = Number(this.moduleForm[field.attr_code] || 0)
      let next = current + delta * step
      const min = this.getFieldMin(field)
      const max = this.getFieldMax(field)
      if (Number.isFinite(min) && next < min) next = min
      if (Number.isFinite(max) && next > max) next = max
      this.$set(this.moduleForm, field.attr_code, next)
    },
    getFieldMin (field) {
      if (field.min_val === null || field.min_val === undefined || field.min_val === '') return undefined
      const value = Number(field.min_val)
      return Number.isFinite(value) ? value : undefined
    },
    getFieldMax (field) {
      if (field.max_val === null || field.max_val === undefined || field.max_val === '') return undefined
      const value = Number(field.max_val)
      return Number.isFinite(value) ? value : undefined
    },
    normalizeFieldValue (field, value) {
      return normalizeControlFieldValue(field, value)
    },
    sliderValue (field) {
      return sliderDisplayValue(
        this.moduleForm[field.attr_code],
        this.getFieldMin(field),
        this.getFieldMax(field)
      )
    },
    setSliderValue (field, value) {
      this.$set(this.moduleForm, field.attr_code, this.normalizeFieldValue(field, value))
    },
    canEditField (field) {
      if (!this.canSendCommands) return false
      const widget = this.widgetOf(field)
      if (['badge', 'chart', 'none'].includes(widget)) return false
      const controlPermissions = this.getPermissionList(field, 'control_permissions')
      if (controlPermissions.length && !controlPermissions.some(code => hasPermission(code, this.permissionUser))) return false
      if (field.web_editable === false) {
        return false
      }
      return field.access_type === 'RW' || !!field.web_control_table
    },
    isWidgetInterlocked (widget) {
      return (widget.fields || []).some(field => isControlFieldInterlocked(field, this.moduleForm))
    },
    shadowStatusVariant (state) {
      return ({
        pending: 'warning',
        acknowledged: 'info',
        applied: 'success',
        reported: 'secondary',
        failed: 'danger',
        timeout: 'danger',
        superseded: 'secondary'
      })[state] || 'secondary'
    },
    validateChangedFields (fields, attrs) {
      for (const field of fields) {
        const result = validateControlFieldValue(field, attrs[field.attr_code])
        if (result.valid) continue
        const hasRange = result.reason === 'below_min' || result.reason === 'above_max'
        this.$uiToast.error(this.$t(
          hasRange ? 'pod_control_panel.toast.invalid_range' : 'pod_control_panel.toast.invalid_value',
          {
            field: field.attr_name,
            min: result.min ?? this.getFieldMin(field) ?? '-',
            max: result.max ?? this.getFieldMax(field) ?? '-'
          }
        ))
        return false
      }
      return true
    },
    recordPendingControl (fields, attrs, response) {
      fields.forEach(field => {
        const key = pendingControlKey(this.selectedInstanceUuid, field)
        const submittedValue = attrs[field.attr_code]
        this.$set(this.pendingModuleCommands, key, {
          commandId: response.message_id ? String(response.message_id) : null,
          submittedValue
        })
        if (!field.shadows || typeof field.shadows !== 'object') this.$set(field, 'shadows', {})
        const previous = field.shadows[this.selectedInstanceUuid] || {}
        const reportedValue = previous.reported_value !== undefined
          ? previous.reported_value
          : field.current_values && field.current_values[this.selectedInstanceUuid]
        this.$set(field.shadows, this.selectedInstanceUuid, {
          ...previous,
          state: 'pending',
          desired_value: submittedValue,
          reported_value: reportedValue,
          command_id: response.message_id ? String(response.message_id) : null
        })
        this.$set(this.moduleOriginalForm, field.attr_code, submittedValue)
      })
    },
    handleWidgetChange ({ field, value }) {
      if (!field || !this.canEditField(field)) return
      this.$set(this.moduleForm, field.attr_code, this.normalizeFieldValue(field, value))
    },
    async invokeWidget (widget) {
      if (!this.canSendCommands || !widget) return
      const field = Array.isArray(widget.fields) ? widget.fields[0] : null
      if (!widget.idx && (!field || !field.attr_code)) return
      this.sending = true
      try {
        const response = widget.idx
          ? await sendWidgetOperation(this.podUuid, {
            operation: 'invoke',
            idx: widget.idx,
            sidx: widget.sidx || 0,
            target_uuid: this.selectedInstanceUuid || undefined,
            need_ack: true
          })
          : await sendDeviceControl(this.podUuid, {
            attr_code: field && field.attr_code,
            value: true,
            target_uuid: this.selectedInstanceUuid || undefined
          })
        if (response.published === false) {
          this.$uiToast.error(this.$t('pod_control_panel.toast.publish_failed'))
          this.loadCommandHistory()
          this.$emit('command-failed', response)
          return
        }
        this.$uiToast.success(this.$t('pod_control_panel.toast.queued'))
        this.$emit('command-sent', response)
        this.loadCommandHistory()
        this._scheduleControlStateSync(0, true)
      } catch (error) {
        this.$uiToast.error(this.$t('pod_control_panel.toast.send_failed') + (this.$getErrorMessage(error)))
      } finally {
        this.sending = false
      }
    },
    openModuleDialog (module, instance = null) {
      if (this.isOffline) return
      this.dialogMode = 'module'
      this.activeModule = module
      this.selectedInstanceUuid = instance?.device_uuid || (module.instances && module.instances.length ? module.instances[0].device_uuid : '')
      this.initializeModuleForm()
      this.dialogVisible = true
    },
    initializeModuleForm () {
      if (!this.activeModule) return
      this.moduleForm = {}
      ;(this.activeModule.fields || []).forEach(field => {
        const shadow = field.shadows && field.shadows[this.selectedInstanceUuid]
        const pendingValue = shadow && ['pending', 'acknowledged'].includes(shadow.state)
          ? shadow.desired_value
          : undefined
        const instanceValue = pendingValue !== undefined
          ? pendingValue
          : field.current_values && Object.prototype.hasOwnProperty.call(field.current_values, this.selectedInstanceUuid)
            ? field.current_values[this.selectedInstanceUuid]
            : field.current_value
        this.$set(this.moduleForm, field.attr_code, this.normalizeFieldValue(field, instanceValue))
      })
      this.moduleForm = reconcileControlDisplayState(this.sortedActiveFields, this.moduleForm)
      this.moduleOriginalForm = { ...this.moduleForm }
    },
    openCustomDialog () {
      if (!this.canSendCustomCommands) return
      this.dialogMode = 'custom'
      this.activeModule = null
      this.customCommand = 'custom'
      this.customPayloadJson = '{}'
      this.dialogVisible = true
    },
    async confirmRestart () {
      if (!this.supportsAction('restart') || !this.canSendCommands) return
      try {
        const confirmed = await this.$uiConfirm(this.$t('pod_control_panel.confirm.restart_message'),
          {
            title: this.$t('pod_control_panel.confirm.restart_title'),
            okTitle: this.$t('pod_control_panel.confirm.ok_restart'),
            cancelTitle: this.$t('pod_control_panel.confirm.cancel'),
            type: 'warning'
          })
        if (!confirmed) return
        this.sendCommandDirect('restart', {})
      } catch (error) {
        return error
      }
    },
    sendGetStatus () {
      if (!this.isPlatformAccount || !this.supportsAction('get_status') || !this.canSendCommands) return
      this.sendCommandDirect('get_status', {})
    },
    async sendCommandDirect (command, payload) {
      const tenantAllowedCommands = ['restart', 'write_attrs']
      if (!this.canSendCommands) return
      if (!this.isPlatformAccount && !tenantAllowedCommands.includes(command)) return
      if (['restart', 'get_status'].includes(command) && !this.supportsAction(command)) return

      this.sending = true
      try {
        const resp = await sendPodCommand(this.podUuid, { command, payload })
        if (resp.published === false) {
          this.$uiToast.error(this.$t('pod_control_panel.toast.publish_failed'))
          this.loadCommandHistory()
          this.$emit('command-failed', resp)
          return
        }
        this.$uiToast.success(this.$t('pod_control_panel.toast.queued'))
        this.loadCommandHistory()
        this.$emit('command-sent', resp)
        this._scheduleControlStateSync(0, true)
      } catch (error) {
        this.$uiToast.error(this.$t('pod_control_panel.toast.send_failed') + (this.$getErrorMessage(error)))
        this.loadCommandHistory()
        this.$emit('command-failed', error)
      } finally {
        this.sending = false
        this.dialogVisible = false
      }
    },
    submitModuleCommand () {
      if (!this.activeModule) return
      const attrs = {}
      const changedFields = []
      const editableFields = this.sortedActiveFields.filter(field => this.canEditField(field))
      const submissionValues = applyControlSafetyInterlocks(editableFields, this.moduleForm)
      editableFields.forEach(field => {
        if (
          JSON.stringify(submissionValues[field.attr_code]) !== JSON.stringify(this.moduleOriginalForm[field.attr_code])
        ) {
          attrs[field.attr_code] = submissionValues[field.attr_code]
          changedFields.push(field)
        }
      })
      changedFields.forEach(field => {
        this.$set(this.moduleForm, field.attr_code, submissionValues[field.attr_code])
      })
      if (!Object.keys(attrs).length) {
        this.$uiToast.warning(this.$t('pod_control_panel.toast.no_field'))
        return
      }
      if (!this.validateChangedFields(changedFields, attrs)) return
      this.submitViaDeviceControl(changedFields, attrs)
    },
    async submitViaDeviceControl (changedFields, attrs) {
      this.sending = true
      const successes = []
      const failures = []
      try {
        const requests = []
        const widgetGroups = new Map()
        changedFields.forEach(field => {
          const usesWidgetContract = field.co_index && Array.isArray(field.operations) && field.operations.includes('set')
          if (!usesWidgetContract) {
            requests.push({ fields: [field], legacy: true })
            return
          }
          const key = field.widget_id || field.attr_code
          if (!widgetGroups.has(key)) widgetGroups.set(key, [])
          widgetGroups.get(key).push(field)
        })
        widgetGroups.forEach(fields => requests.push({ fields, legacy: false }))

        for (const request of requests) {
          try {
            const field = request.fields[0]
            const resp = !request.legacy
              ? await sendWidgetOperation(this.podUuid, {
                operation: 'set',
                objects: request.fields.map(item => ({
                  idx: item.co_index,
                  sidx: Number.parseInt(item.co_sub_index || '0', 16) || 0,
                  value: attrs[item.attr_code]
                })),
                target_uuid: this.selectedInstanceUuid || undefined,
                need_ack: true
              })
              : await sendDeviceControl(this.podUuid, {
                attr_code: field.attr_code,
                value: attrs[field.attr_code],
                target_uuid: this.selectedInstanceUuid
              })
            if (resp && resp.published === false) {
              const publishError = new Error(this.$t('pod_control_panel.toast.publish_failed'))
              publishError.userMessage = this.$t('pod_control_panel.toast.publish_failed')
              throw publishError
            }
            successes.push({ fields: request.fields, resp })
            request.fields.forEach(item => {
              this.$set(this.moduleOriginalForm, item.attr_code, attrs[item.attr_code])
            })
            if (!request.legacy) this.recordPendingControl(request.fields, attrs, resp)
          } catch (error) {
            failures.push({ fields: request.fields, error })
          }
        }
        this.loadCommandHistory()
        if (successes.length) this._scheduleControlStateSync(0, true)
        if (failures.length === 0) {
          this.$uiToast.success(this.$t('pod_control_panel.toast.sent_count', { count: successes.length }))
          this.$emit('command-sent', successes)
        } else if (successes.length === 0) {
          const firstError = failures[0].error
          this.$uiToast.error(this.$t('pod_control_panel.toast.all_failed', {
            count: failures.length,
            detail: this.$getErrorMessage(firstError)
          }))
          this.$emit('command-failed', failures)
        } else {
          this.$uiToast.warning(this.$t('pod_control_panel.toast.partial', { success: successes.length, failed: failures.length }))
        }
      } finally {
        this.sending = false
      }
    },
    submitViaWriteAttrs (attrs) {
      const selectedInstance = (this.activeModule.instances || []).find(item => item.device_uuid === this.selectedInstanceUuid) || null
      const payload = {
        target_type: this.activeModule.device_type,
        target_uuid: this.selectedInstanceUuid,
        attrs
      }
      if (selectedInstance && selectedInstance.node_pos) {
        payload.node_pos = selectedInstance.node_pos
      }
      this.sendCommandDirect('write_attrs', payload)
    },
    submitCustomCommand () {
      if (!this.canSendCustomCommands) return
      let payload = {}
      try {
        payload = this.customPayloadJson ? JSON.parse(this.customPayloadJson) : {}
      } catch (error) {
        this.$uiToast.error(this.$t('pod_control_panel.toast.json_invalid') + error.message)
        return
      }
      if (!this.customCommand) {
        this.$uiToast.warning(this.$t('pod_control_panel.toast.command_required'))
        return
      }
      this.sendCommandDirect(this.customCommand, payload)
    },
    resetDialog () {
      this.activeModule = null
      this.selectedInstanceUuid = ''
      this.moduleForm = {}
      this.moduleOriginalForm = {}
      this.customCommand = 'custom'
      this.customPayloadJson = '{}'
    },
    showCommandHistory () {
      this.commandHistoryVisible = true
      if (!this.commandHistoryLoaded) this.loadCommandHistory()
    },
    async loadCommandHistory () {
      if (!this.isPlatformAccount) {
        this.commandHistory = []
        this.historyTotal = 0
        return
      }
      if (!this.commandHistoryVisible) return
      this.historyLoading = true
      try {
        const res = await fetchPodCommands(this.podUuid, {
          page: this.historyPage,
          page_size: this.historyPageSize
        })
        this.commandHistory = (res && res.items) || []
        this.historyTotal = Number(res && res.total) || 0
        this.commandHistoryLoaded = true
      } catch (error) {
        // 降级：API 不可用则用本地缓存
        const history = localStorage.getItem(`pod_command_history_${this.podUuid}`)
        try {
          const cachedItems = history ? JSON.parse(history) : []
          const start = (this.historyPage - 1) * this.historyPageSize
          this.historyTotal = cachedItems.length
          this.commandHistory = cachedItems.slice(start, start + this.historyPageSize)
          this.commandHistoryLoaded = true
        } catch (cacheError) {
          localStorage.removeItem(`pod_command_history_${this.podUuid}`)
          this.commandHistory = []
          this.historyTotal = 0
        }
      } finally {
        this.historyLoading = false
      }
    },
    handleHistoryPageChange (page) {
      this.historyPage = page
      this.loadCommandHistory()
    }
  }
}
</script>
