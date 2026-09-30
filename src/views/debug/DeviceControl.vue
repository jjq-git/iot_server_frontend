<template>
  <div class="debug-device-control">
    <!-- 顶部 标题 + 三级选择 -->
    <page-section-card class="filter-card ddc-card">
      <b-form @submit.stop.prevent="loadSpec">
        <div class="filter-row">
          <div class="filter-left">
            <b-form-select
              v-model="selectedHost"
              :options="hostOptions"
              class="filter-control"
              :aria-label="$t('debug_device_control.form.host')"
              @change="onHostChange"
            />
            <b-form-select
              v-model="selectedTargetKey"
              :options="targetDeviceOptions"
              class="filter-control"
              :aria-label="$t('debug_device_control.form.node')"
              :disabled="!selectedHost"
              @change="onTargetChange"
            />
            <b-form-select
              v-model="selectedVersion"
              :options="versionOptions"
              class="filter-control"
              :aria-label="$t('debug_device_control.form.spec_version')"
              :disabled="currentVersions.length === 0"
              @change="loadSpec"
            />
            <div class="filter-actions">
              <base-button variant="outline-secondary" :disabled="!selectedHost || loadingState" @click="loadDeviceState">
                <b-spinner v-if="loadingState" small />
                <app-icon name="arrow-clockwise" v-else />
                {{ $t('debug_device_control.actions.refresh_state') }}
              </base-button>
              <base-button variant="primary" :disabled="!canLoadSpec || loadingSpec" @click="loadSpec">
                <b-spinner v-if="loadingSpec" small />
                <app-icon name="arrow-clockwise" v-else />
                {{ $t('debug_device_control.actions.refresh_spec') }}
              </base-button>
            </div>
          </div>
        </div>
      </b-form>

      <div v-if="specInfoText" class="ddc-spec-info mt-2">
        <span class="ddc-muted">{{ specInfoText }}</span>
      </div>
      <div v-if="specWarning" class="ddc-warning mt-2">
        {{ specWarning }}
      </div>
    </page-section-card>

    <!-- 动态字段卡片(按 group 分) -->
    <div v-if="rwGroups.length > 0">
      <base-card
        v-for="group in rwGroups"
        :key="group.groupIndex || group.groupName"
        class="mb-3 ddc-card"
      >
        <template #header>
          <div class="ddc-group-header">
            <span class="ddc-group-name">{{ group.groupName }}</span>
            <code v-if="group.groupIndex" class="ddc-group-index">{{ group.groupIndex }}</code>
            <small v-if="group.groupSummary" class="ddc-muted ml-2">{{ group.groupSummary }}</small>
          </div>
        </template>

        <div
          v-for="entry in group.entries"
          :key="entry.index + ':' + entry.sub + ':' + entry.name"
          class="ddc-entry"
        >
          <div class="ddc-entry-meta">
            <code class="ddc-entry-code">{{ entry.name }}</code>
            <b-badge v-if="entry.dir === 'ro'" variant="secondary" class="ml-1">{{ $t('debug_device_control.dir.ro') }}</b-badge>
            <b-badge v-else-if="entry.dir === 'wo'" variant="warning" class="ml-1">{{ $t('debug_device_control.dir.wo') }}</b-badge>
            <b-badge v-else variant="info" class="ml-1">{{ entry.type }}</b-badge>
            <span class="ddc-entry-summary">{{ entry.summary || '-' }}</span>
            <span v-if="entry.unit" class="ddc-muted ml-1">{{ $t('debug_device_control.unit', { unit: entry.unit }) }}</span>
            <b-badge :variant="valueSources[entry.name] === 'live' ? 'success' : 'secondary'">
              {{ valueSources[entry.name] === 'live' ? $t('debug_device_control.value_source.live') : $t('debug_device_control.value_source.unavailable') }}
            </b-badge>
          </div>

          <div class="ddc-entry-control">
            <!-- BOOL switch -->
            <template v-if="entryDescriptors[entry.name].widget === 'switch'">
              <b-form-checkbox
                v-model="entryValues[entry.name]"
                :disabled="entryDescriptors[entry.name].readonly"
                switch
              >
                {{ entryValues[entry.name] ? 'ON' : 'OFF' }}
              </b-form-checkbox>
            </template>

            <!-- range slider -->
            <template v-else-if="entryDescriptors[entry.name].widget === 'range'">
              <b-input-group size="sm" class="ddc-range-group">
                <base-input
                  v-model.number="entryValues[entry.name]"
                  type="range"
                  :min="entryDescriptors[entry.name].min"
                  :max="entryDescriptors[entry.name].max"
                  :step="entryDescriptors[entry.name].step"
                  :disabled="entryDescriptors[entry.name].readonly" :clearable="false"
                />
                <b-input-group-append is-text>{{ entryValues[entry.name] }}</b-input-group-append>
              </b-input-group>
            </template>

            <!-- number input -->
            <template v-else-if="entryDescriptors[entry.name].widget === 'number'">
              <base-input
                v-model.number="entryValues[entry.name]"
                type="number"
                size="sm"
                :min="entryDescriptors[entry.name].min !== null ? entryDescriptors[entry.name].min : undefined"
                :max="entryDescriptors[entry.name].max !== null ? entryDescriptors[entry.name].max : undefined"
                :step="entryDescriptors[entry.name].step"
                :disabled="entryDescriptors[entry.name].readonly" :clearable="false"
              />
            </template>

            <!-- enum dropdown -->
            <template v-else-if="entryDescriptors[entry.name].widget === 'enum'">
              <b-form-select
                v-model="entryValues[entry.name]"
                :options="entryDescriptors[entry.name].options"
                size="sm"
                :disabled="entryDescriptors[entry.name].readonly"
              />
            </template>

            <!-- text input -->
            <template v-else-if="entryDescriptors[entry.name].widget === 'text'">
              <base-input
                v-model="entryValues[entry.name]"
                type="text"
                size="sm"
                :disabled="entryDescriptors[entry.name].readonly" :clearable="false"
              />
            </template>

            <!-- json textarea (DOMAIN / 兜底) -->
            <template v-else>
              <b-form-textarea
                v-model="entryValues[entry.name]"
                rows="2"
                size="sm"
                :placeholder="$t('debug_device_control.json_placeholder')"
                :disabled="entryDescriptors[entry.name].readonly"
              />
            </template>

            <base-button
              size="sm"
              variant="primary"
              class="ddc-send-btn"
              :disabled="entryDescriptors[entry.name].readonly || sendingMap[entry.name] || entryValues[entry.name] === null || entryValues[entry.name] === undefined"
              @click="sendEntry(entry)"
            >
              <b-spinner v-if="sendingMap[entry.name]" small />
              <span v-else>{{ $t('debug_device_control.actions.send') }}</span>
            </base-button>
          </div>
        </div>

        <div v-if="group.entries.length === 0" class="ddc-muted ddc-empty">
          {{ $t('debug_device_control.empty.no_fields') }}
        </div>
      </base-card>
    </div>

    <base-card v-else class="mb-3 ddc-card">
      <div class="ddc-empty-block">
        <p class="ddc-muted">
          {{ specWarning || $t('debug_device_control.empty.select_first') }}
        </p>
      </div>
    </base-card>

    <!-- 维护命令(通用) -->
    <base-card class="mb-3 ddc-card" :header="$t('debug_device_control.maint.section')">
      <div class="ddc-maint-row">
        <label class="ddc-maint-label">{{ $t('debug_device_control.maint.nmt_action') }}</label>
        <b-form-select v-model="nmtAction" :options="nmtOptions" class="ddc-maint-select" />
        <div class="ddc-maint-actions">
          <base-button
            class="ddc-maint-action"
            variant="info"
            :disabled="!selectedHost || maintSending"
            @click="confirmNmt"
          >
            <b-spinner v-if="maintSending" small />
            <span v-else>{{ $t('debug_device_control.maint.send_nmt') }}</span>
          </base-button>
          <base-button
            class="ddc-maint-action"
            variant="warning"
            :disabled="!selectedHost || maintSending"
            @click="confirmAndSendMaint('reboot')"
          >
            {{ $t('debug_device_control.maint.reboot') }}
          </base-button>
          <base-button
            class="ddc-maint-action"
            variant="danger"
            :disabled="!selectedHost || maintSending"
            @click="confirmAndSendMaint('emergency_stop')"
          >
            {{ $t('debug_device_control.maint.emergency_stop') }}
          </base-button>
        </div>
      </div>
    </base-card>

    <base-card v-if="recentCommands.length" class="mb-3 ddc-card" :header="$t('debug_device_control.command_status.section')">
      <div v-for="command in recentCommands" :key="command.commandId" class="ddc-command-row">
        <code>{{ command.commandId }}</code>
        <span>{{ command.label }}</span>
        <span>{{ $t('debug_device_control.command_status.target', { id: command.deviceId }) }}</span>
        <b-badge :variant="commandStatusVariant(command.status)">{{ command.status }}</b-badge>
      </div>
    </base-card>

    <!-- 高级:raw attr 下发 -->
    <base-card class="mb-3 ddc-card" no-body>
      <base-button
        block
        variant="link"
        class="ddc-advanced-toggle"
        @click="advancedOpen = !advancedOpen"
      >
        {{ advancedOpen ? '▼' : '▶' }} {{ $t('debug_device_control.advanced.toggle') }}
      </base-button>
      <div v-show="advancedOpen">
        <div class="ddc-advanced-body">
          <p class="ddc-muted">
            {{ $t('debug_device_control.advanced.desc') }}
          </p>
          <div class="ddc-raw-row">
            <div class="ddc-raw-cell">
              <label class="ddc-label">attr_code</label>
              <base-input
                v-model.trim="rawAttrCode"
                size="sm"
                :placeholder="$t('debug_device_control.advanced.attr_code_placeholder')" :clearable="false"
              />
            </div>
            <div class="ddc-raw-cell ddc-raw-cell--wide">
              <label class="ddc-label">value (JSON)</label>
              <base-input
                v-model="rawAttrValue"
                size="sm"
                placeholder='1 / "off" / {"a":1}' :clearable="false"
              />
            </div>
            <div class="ddc-raw-cell ddc-raw-cell--btn">
              <base-button
                size="sm"
                variant="primary"
                class="ddc-raw-btn"
                :disabled="!selectedHost || !rawAttrCode || rawSending"
                @click="sendRawAttr"
              >
                <b-spinner v-if="rawSending" small />
                <span v-else>{{ $t('debug_device_control.actions.send') }}</span>
              </base-button>
            </div>
          </div>
        </div>
      </div>
    </base-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import Vue from 'vue'
import { fetchHosts } from '@/api/hosts'
import { fetchOdDeviceModels, fetchOdSpec } from '@/api/od'
import {
  fetchDeviceState,
  sendDeviceControl,
  sendDeviceMaintenance
} from '@/api/debug'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import { findOdDeviceResolution, getResolvedOdSpec, readCanopenStatusValue } from '@/utils/canopen.mjs'
import {
  describeEntry,
  groupEntries
} from '@/utils/od_field_renderer'

export default {
  name: 'DebugDeviceControl',
  data () {
    return {
      // 主机/节点
      hosts: [],
      deviceModels: [],
      selectedHost: '',
      selectedTargetKey: '', // "host" | "node:<can_id>"

      // OD 规范
      currentDeviceId: 1,
      currentProductCode: '', // 当前节点对应的 product_code(NU0001/HU0000 等)
      currentVersions: [],
      selectedVersion: '',
      spec: null,
      loadingSpec: false,
      specWarning: '',
      loadingState: false,
      deviceStatus: {},

      // 字段值
      entryValues: {},
      valueSources: {},

      // 单字段下发 loading
      sendingMap: {},

      // 维护
      nmtAction: 'nmt_start',
      maintSending: false,

      // raw attr
      rawAttrCode: '',
      rawAttrValue: '',
      rawSending: false,
      advancedOpen: false,

      // 当前页面会话内的命令及设备 ACK
      recentCommands: []
    }
  },

  computed: {
    nmtOptions () {
      return [
        { value: 'nmt_start', text: this.$t('debug_device_control.nmt.start') },
        { value: 'nmt_stop', text: this.$t('debug_device_control.nmt.stop') },
        { value: 'nmt_reset', text: this.$t('debug_device_control.nmt.reset') }
      ]
    },
    hostOptions () {
      const opts = (this.hosts || [])
        .filter(h => h.status === 'online')
        .map(h => {
          const shortUuid = (h.uuid || '').slice(0, 8)
          const sn = h.serial_no ? ` ${h.serial_no}` : ''
          return {
            value: h.uuid,
            text: `${shortUuid}${sn}`
          }
        })
      return [{ value: '', text: this.$t('debug_device_control.form.host_placeholder') }, ...opts]
    },

    /**
     * 目标设备选项 = 主机自身 + 该主机绑定的节点。
     * value 编码:
     *   "host"               → 主机 device_id=1
     *   "node:<can_id>"      → 节点 device_id=<can_id>
     */
    targetDeviceOptions () {
      if (!this.selectedHost) return [{ value: '', text: this.$t('debug_device_control.form.select_host_first') }]
      const opts = [{ value: '', text: this.$t('debug_device_control.form.select_target') }]
      // 主机自身
      const hostDevice = findOdDeviceResolution(this.deviceModels, 'host', 1)
      const hostCode = hostDevice?.model_code || hostDevice?.spec_id
      const hostLabel = hostCode
        ? this.$t('debug_device_control.target.host_with_pc', { pc: hostCode })
        : this.$t('debug_device_control.target.host_default')
      if (hostDevice) opts.push({ value: 'host', text: hostLabel })
      // 节点
      for (const device of this.deviceModels.filter(item => item.target_type === 'node')) {
        const routeId = device.route_device_id
        const pc = device.model_code || device.spec_id || ''
        const label = this.$t('debug_device_control.target.node_prefix', { id: routeId }) +
                      (pc ? ` ${pc}` : '') +
                      (device.serial_no ? ` (${device.serial_no})` : '')
        opts.push({ value: `node:${routeId}`, text: label })
      }
      return opts
    },

    versionOptions () {
      const options = (this.currentVersions || []).map(v => ({ value: v, text: v }))
      return options.length > 0
        ? options
        : [{ value: '', text: this.$t('debug_device_control.form.spec_version'), disabled: true }]
    },

    canLoadSpec () {
      return !!this.currentProductCode && !!this.selectedVersion
    },

    /** 当前 spec 的所有 RW + RO 字段(按 group 分),只渲染 rw + ro,wo 也展示。 */
    rwGroups () {
      if (!this.spec || !this.spec.entries) return []
      // 渲染 rw / ro / wo 全部(ro 禁用),保持 OdManager 一致
      const visible = this.spec.entries.filter(e =>
        e.dir === 'rw' || e.dir === 'ro' || e.dir === 'wo'
      )
      return groupEntries(visible)
    },

    entryDescriptors () {
      const map = {}
      if (!this.spec || !this.spec.entries) return map
      for (const e of this.spec.entries) {
        map[e.name] = describeEntry(e)
      }
      return map
    },

    specInfoText () {
      if (!this.spec) return ''
      const total = (this.spec.entries || []).length
      const rw = (this.spec.entries || []).filter(e => e.dir === 'rw').length
      const ro = (this.spec.entries || []).filter(e => e.dir === 'ro').length
      return this.$t('debug_device_control.spec_info', {
        device_id: this.spec.device_id,
        version: this.spec.version,
        total,
        rw,
        ro
      })
    }
  },

  async mounted () {
    await this.loadHosts()
  },

  beforeDestroy () {
    wsManager.disconnect()
  },

  methods: {
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (e) {
        console.error('加载主机列表失败', e)
      }
    },

    async loadDeviceState () {
      if (!this.selectedHost) return
      // 防竞态：绑定发起时的主机，快速切主机后旧响应不得写入当前设备状态
      const host = this.selectedHost
      this.loadingState = true
      try {
        const state = await fetchDeviceState(host)
        if (host !== this.selectedHost) return
        this.deviceStatus = state?.pod_status?.status || {}
        this._applyCurrentValues()
      } catch (e) {
        if (host !== this.selectedHost) return
        console.error('加载设备当前状态失败', e)
        this._toast(this.$t('debug_device_control.toast.state_failed'), 'warning')
      } finally {
        if (host === this.selectedHost) this.loadingState = false
      }
    },

    handleStatusUpdate (message) {
      if (String(message?.device_id) !== String(this.currentDeviceId)) return
      const data = message?.data?.status || message?.data?.attributes || message?.data
      if (data && typeof data === 'object') {
        this.deviceStatus = { ...this.deviceStatus, ...data }
        this._applyCurrentValues()
      }
    },

    handleCommandAck (message) {
      const commandId = message?.command_id
      if (!commandId) return
      const command = this.recentCommands.find(item => item.commandId === commandId)
      if (command) {
        command.status = message.status || 'acknowledged'
        command.ackData = message.ack_data || null
      }
      const variant = ['success', 'completed', 'ok'].includes(String(message.status).toLowerCase()) ? 'success' : 'warning'
      this._toast(this.$t('debug_device_control.toast.ack', { cmd: commandId, status: message.status || 'ack' }), variant)
      this.loadDeviceState()
    },

    _applyCurrentValues () {
      if (!this.spec?.entries) return
      const next = { ...this.entryValues }
      const sources = { ...this.valueSources }
      for (const entry of this.spec.entries) {
        const current = readCanopenStatusValue(this.deviceStatus, entry, this.currentDeviceId)
        if (current.found) {
          next[entry.name] = current.value
          sources[entry.name] = 'live'
        }
      }
      this.entryValues = next
      this.valueSources = sources
    },

    _trackCommand (response, label) {
      const commandId = response?.command_id
      if (!commandId) return
      this.recentCommands.unshift({
        commandId,
        label,
        deviceId: this.currentDeviceId,
        status: 'sent'
      })
      this.recentCommands = this.recentCommands.slice(0, 10)
    },

    commandStatusVariant (status) {
      const normalized = String(status || '').toLowerCase()
      if (['success', 'completed', 'ok'].includes(normalized)) return 'success'
      if (['failed', 'error', 'timeout'].includes(normalized)) return 'danger'
      return 'info'
    },

    async onHostChange (uuid) {
      wsManager.disconnect()
      this.selectedTargetKey = ''
      this.deviceModels = []
      this.spec = null
      this.specWarning = ''
      this.deviceStatus = {}
      if (!uuid) return
      wsManager.connectSingle(uuid, {
        statusUpdate: this.handleStatusUpdate,
        commandAck: this.handleCommandAck
      })
      try {
        const [modelsData] = await Promise.all([
          fetchOdDeviceModels(uuid),
          this.loadDeviceState()
        ])
        this.deviceModels = Array.isArray(modelsData?.devices) ? modelsData.devices : []
      } catch (e) {
        console.error('加载设备型号解析失败', e)
        this.deviceModels = []
      }
      // 默认选第一个目标(主机自身或第一个节点)
      const opts = this.targetDeviceOptions.filter(o => o.value)
      if (opts.length > 0) {
        this.selectedTargetKey = opts[0].value
        this.onTargetChange(this.selectedTargetKey)
      }
    },

    onTargetChange (val) {
      this.spec = null
      this.specWarning = ''
      this.entryValues = {}
      if (!val) {
        this.currentDeviceId = 1
        this.currentProductCode = ''
        this.currentVersions = []
        this.selectedVersion = ''
        return
      }

      let resolution = null
      if (val === 'host') {
        this.currentDeviceId = 1
        resolution = findOdDeviceResolution(this.deviceModels, 'host', 1)
      } else if (val.startsWith('node:')) {
        const routeId = parseInt(val.split(':')[1], 10) || 2
        this.currentDeviceId = routeId
        resolution = findOdDeviceResolution(this.deviceModels, 'node', routeId)
      }

      const resolvedSpec = getResolvedOdSpec(resolution)
      this.currentProductCode = resolvedSpec?.id || ''
      this.currentVersions = resolvedSpec?.versions || []
      if (resolvedSpec) {
        this.selectedVersion = resolvedSpec.version
        this.loadSpec()
      } else {
        this.selectedVersion = ''
        this.specWarning = resolution?.resolution_status === 'resolved'
          ? this.$t('debug_device_control.warning.spec_not_uploaded', { pc: resolution.model_code || '-' })
          : this.$t('debug_device_control.warning.model_unknown')
      }
    },

    async loadSpec () {
      if (!this.canLoadSpec) return
      // 防竞态：绑定发起时的产品码/版本，快速切目标后旧规范不得写入当前目标
      const pc = this.currentProductCode
      const ver = this.selectedVersion
      this.loadingSpec = true
      this.specWarning = ''
      try {
        const data = await fetchOdSpec(pc, ver)
        if (pc !== this.currentProductCode || ver !== this.selectedVersion) return
        if (data && !data.error && Array.isArray(data.entries)) {
          this.spec = data
          this._initEntryValues(data.entries)
        } else {
          this.spec = null
          this.specWarning = data?.error || this.$t('debug_device_control.warning.no_valid_spec')
        }
      } catch (e) {
        if (pc !== this.currentProductCode || ver !== this.selectedVersion) return
        console.error('加载 OD 规范失败', e)
        this.spec = null
        this.specWarning = this.$t('debug_device_control.warning.load_spec_failed', { msg: this.$getErrorMessage(e) })
      } finally {
        if (pc === this.currentProductCode && ver === this.selectedVersion) this.loadingSpec = false
      }
    },

    /** 给所有可写字段铺一份默认值,用于 v-model。 */
    _initEntryValues (entries) {
      const next = {}
      const sources = {}
      for (const e of entries) {
        const current = readCanopenStatusValue(this.deviceStatus, e, this.currentDeviceId)
        next[e.name] = current.found ? current.value : null
        sources[e.name] = current.found ? 'live' : 'unavailable'
      }
      // 用 Vue.set 保证响应式
      this.entryValues = next
      this.valueSources = sources
      // 初始 sending 状态清空
      this.sendingMap = {}
    },

    async sendEntry (entry) {
      if (!this.selectedHost) {
        this._toast(this.$t('debug_device_control.toast.select_host_first'), 'warning')
        return
      }
      const desc = this.entryDescriptors[entry.name]
      if (desc.readonly) return

      const rawValue = this.entryValues[entry.name]
      let value = rawValue
      if (desc.widget === 'switch') {
        value = rawValue ? 1 : 0
      } else if (desc.widget === 'json') {
        try {
          value = rawValue === '' || rawValue === null || rawValue === undefined
            ? null
            : JSON.parse(rawValue)
        } catch (e) {
          this._toast(this.$t('debug_device_control.toast.invalid_json', { name: entry.name }), 'warning')
          return
        }
      }

      Vue.set(this.sendingMap, entry.name, true)
      try {
        const res = await sendDeviceControl(this.selectedHost, {
          device_id: this.currentDeviceId,
          attr_code: entry.name,
          value
        })
        this._trackCommand(res, entry.name)
        const cmdId = res?.command_id || res?.id || ''
        this._toast(this.$t('debug_device_control.toast.sent', {
          name: entry.name,
          value: this._formatValue(value),
          cmd: cmdId ? ` (cmd=${cmdId})` : ''
        }), 'success')
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('debug_device_control.toast.send_failed_default')
        this._toast(this.$t('debug_device_control.toast.send_failed_named', { name: entry.name, msg }), 'danger')
      } finally {
        Vue.set(this.sendingMap, entry.name, false)
      }
    },

    async sendMaintenance (action) {
      if (!this.selectedHost || !action) return
      this.maintSending = true
      try {
        const res = await sendDeviceMaintenance(this.selectedHost, {
          device_id: this.currentDeviceId,
          action
        })
        this._trackCommand(res, action)
        const cmdId = res?.command_id || ''
        this._toast(this.$t('debug_device_control.toast.maint_sent', {
          action,
          cmd: cmdId ? ` (cmd=${cmdId})` : ''
        }), 'success')
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('debug_device_control.toast.send_failed_default')
        this._toast(this.$t('debug_device_control.toast.maint_failed', { action, msg }), 'danger')
      } finally {
        this.maintSending = false
      }
    },

    async confirmAndSendMaint (action) {
      const map = {
        reboot: this.$t('debug_device_control.confirm.reboot'),
        emergency_stop: this.$t('debug_device_control.confirm.emergency_stop')
      }
      const ok = await this.$uiConfirm(map[action] || this.$t('debug_device_control.confirm.default'), {
        title: this.$t('common.confirm'),
        okVariant: action === 'emergency_stop' ? 'danger' : 'warning',
        okTitle: this.$t('common.ok'),
        cancelTitle: this.$t('common.cancel'),
        centered: true
      })
      if (ok) await this.sendMaintenance(action)
    },

    async confirmNmt () {
      if (this.nmtAction !== 'nmt_reset') {
        await this.sendMaintenance(this.nmtAction)
        return
      }
      const message = this.$t('debug_device_control.confirm.nmt_reset', { id: this.currentDeviceId })
      const ok = await this.$uiConfirm(message, {
        title: this.$t('common.confirm'),
        okVariant: 'warning',
        okTitle: this.$t('common.ok'),
        cancelTitle: this.$t('common.cancel'),
        centered: true
      })
      if (ok) await this.sendMaintenance(this.nmtAction)
    },

    async sendRawAttr () {
      if (!this.selectedHost || !this.rawAttrCode) return
      if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(this.rawAttrCode)) {
        this._toast(this.$t('debug_device_control.toast.invalid_attr_code'), 'warning')
        return
      }
      let value = this.rawAttrValue
      if (typeof value === 'string' && value.trim() !== '') {
        try { value = JSON.parse(value) } catch (e) { /* 保持原字符串 */ }
      }
      this.rawSending = true
      try {
        const res = await sendDeviceControl(this.selectedHost, {
          device_id: this.currentDeviceId,
          attr_code: this.rawAttrCode,
          value
        })
        this._trackCommand(res, this.rawAttrCode)
        const cmdId = res?.command_id || ''
        this._toast(this.$t('debug_device_control.toast.raw_sent', {
          code: this.rawAttrCode,
          cmd: cmdId ? ` (cmd=${cmdId})` : ''
        }), 'success')
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('debug_device_control.toast.send_failed_default')
        this._toast(this.$t('debug_device_control.toast.raw_failed', { code: this.rawAttrCode, msg }), 'danger')
      } finally {
        this.rawSending = false
      }
    },

    _formatValue (v) {
      if (v === null || v === undefined) return ''
      if (typeof v === 'object') {
        try { return JSON.stringify(v) } catch (e) { return String(v) }
      }
      return String(v)
    },

    _toast (msg, variant = 'info') {
      if (this.$uiToast) {
        this.$uiToast.toast(msg, {
          title: this.$t(variant === 'danger' ? 'common.error' : 'common.tip'),
          variant,
          autoHideDelay: variant === 'danger' ? 5000 : 3000
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/device-control.scss"></style>
