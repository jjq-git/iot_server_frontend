<template>
  <div class="debug-devices">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <div class="toolbar">
      <base-input
        v-model.trim="query.search"
        class="toolbar__search"
        :placeholder="$t('debug_devices.toolbar.search_placeholder')"
        size="sm"
        @keyup.enter="handleSearch" :clearable="false"
      />
      <base-select
        v-model="query.status"
        class="toolbar__filter"
        size="sm"
        :options="statusOptions"
        @change="handleSearch"
      />
      <base-button size="sm" variant="primary" @click="handleSearch">
        <app-icon name="search" /> {{ $t('debug_devices.toolbar.query') }}
      </base-button>
      <base-button size="sm" variant="outline-secondary" @click="reload">
        <app-icon name="arrow-clockwise" :animation="loading ? 'spin' : ''" /> {{ $t('debug_devices.toolbar.refresh') }}
      </base-button>
      <b-form-checkbox v-model="autoRefresh" class="toolbar__auto" switch>
        {{ $t('debug_devices.toolbar.auto_refresh') }}
      </b-form-checkbox>
      <span class="toolbar__stats">
        {{ $t('debug_devices.toolbar.stats', { hostsTotal: stats.hostsTotal, hostsOnline: stats.hostsOnline, nodesTotal: stats.nodesTotal, nodesOnline: stats.nodesOnline }) }}
      </span>
        </div>
      </template>

    <base-table
      :items="hosts"
      :fields="hostFields"
      :loading="loading"
      :load-error="hasError ? errorMsg : ''"
      :empty-text="$t('debug_devices.table.no_hosts')"
      striped
      hover
      small
      class="device-table"
      @retry="reload"
    >
      <template #head(expand)>
        <span class="table-disclosure-heading" :title="$t('debug_devices.actions.expand')">
          <app-icon name="chevron-right" aria-hidden="true" />
          <span class="sr-only">{{ $t('debug_devices.actions.expand') }}</span>
        </span>
      </template>
      <template #cell(expand)="row">
        <base-icon-button
          class="expand-btn"
          :label="row.detailsShowing ? $t('debug_devices.actions.collapse') : $t('debug_devices.actions.expand')"
          @click="toggleRow(row)"
        >
          <app-icon :name="row.detailsShowing ? 'chevron-down' : 'chevron-right'" />
        </base-icon-button>
      </template>

      <template #cell(status)="row">
        <base-badge :variant="statusVariant(row.item.status)">
          {{ statusLabel(row.item.status) }}
        </base-badge>
      </template>

      <template #cell(chip)="row">
        <base-badge :variant="chipVariant(getChip(row.item))">
          {{ getChip(row.item) || $t('debug_devices.table.unknown') }}
        </base-badge>
      </template>

      <template #cell(func)="row">
        <span :title="getFunc(row.item) || $t('debug_devices.table.func_unregistered')">
          {{ getFunc(row.item) || '-' }}
        </span>
      </template>

      <template #cell(mac_address)="row">
        <code class="mono">{{ row.item.mac_address || '-' }}</code>
      </template>

      <template #cell(sw_ver)="row">
        <span>{{ row.item.sw_ver || '-' }}</span>
        <app-icon
          v-if="row.item.has_new_firmware"
          name="arrow-up-circle"
          variant="warning"
          class="ml-1"
          :title="$t('debug_devices.table.has_new_firmware')"
        />
      </template>

      <template #cell(last_seen)="row">
        <span :title="row.item.last_seen">{{ formatRelative(row.item.last_seen) }}</span>
      </template>

      <template #cell(actions)="row">
        <base-action-button :title="$t('debug_devices.actions.host_detail')" @click="goHostDetail(row.item)">
          <app-icon name="info-circle" /> <span>{{ $t('debug_devices.actions.host_detail') }}</span>
        </base-action-button>
        <base-action-button :title="$t('debug_devices.actions.od_diagnose')" @click="goWithHost('/debug/od', row.item)">
          <app-icon name="diagram-3" /> <span>{{ $t('debug_devices.actions.od_diagnose') }}</span>
        </base-action-button>
        <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), row.item.serial_no || row.item.uuid].filter(Boolean).join(' ') }">
          <template #button-content><app-icon name="list" aria-hidden="true" /></template>
          <b-dropdown-item-button @click="goWithHost('/debug/device-control', row.item)"><app-icon name="sliders" aria-hidden="true" /> {{ $t('debug_devices.actions.device_console') }}</b-dropdown-item-button>
          <b-dropdown-item-button @click="goWithHost('/debug/serial-logs', row.item)"><app-icon name="terminal" aria-hidden="true" /> {{ $t('debug_devices.actions.serial_logs') }}</b-dropdown-item-button>
          <b-dropdown-item-button @click="goWithHost('/debug/emcy', row.item)"><app-icon name="exclamation-octagon" aria-hidden="true" /> {{ $t('debug_devices.actions.emcy_logs') }}</b-dropdown-item-button>
        </b-dropdown>
      </template>

      <!-- 展开行：显示绑定节点 -->
      <template #row-details="row">
        <div class="row-details">
          <div v-if="row.item._nodesLoading" class="text-muted small">
            <b-spinner small /> {{ $t('debug_devices.table.loading_nodes') }}
          </div>
          <div v-else-if="row.item._nodesError" class="text-danger small">
            {{ row.item._nodesError }}
          </div>
          <div v-else-if="!row.item._nodes || row.item._nodes.length === 0" class="text-muted small">
            {{ $t('debug_devices.table.no_bound_nodes') }}
          </div>
          <base-table
            v-else
            :items="row.item._nodes"
            :fields="nodeFields"
            small
            striped
            class="nested-table" :hover="false" :responsive="false" :show-empty="false"
          >
            <template #cell(status)="r">
              <base-badge :variant="statusVariant(r.item.status)">
                {{ statusLabel(r.item.status) }}
              </base-badge>
            </template>
            <template #cell(chip)="r">
              <base-badge :variant="chipVariant(getChip(r.item))">
                {{ getChip(r.item) || $t('debug_devices.table.unknown') }}
              </base-badge>
            </template>
            <template #cell(func)="r">
              <span :title="getFunc(r.item) || $t('debug_devices.table.func_unregistered')">
                {{ getFunc(r.item) || '-' }}
              </span>
            </template>
            <template #cell(mac_address)="r">
              <code class="mono">{{ r.item.mac_address || '-' }}</code>
            </template>
            <template #cell(can_node_id)="r">
              <base-badge variant="light">{{ r.item.can_node_id == null ? '-' : r.item.can_node_id }}</base-badge>
            </template>
            <template #cell(last_seen)="r">
              <span :title="r.item.last_seen">{{ formatRelative(r.item.last_seen) }}</span>
            </template>
            <template #cell(actions)="r">
              <base-action-button :title="$t('debug_devices.actions.node_detail')" @click="goNodeDetail(r.item)">
                <app-icon name="info-circle" /> <span>{{ $t('debug_devices.actions.node_detail') }}</span>
              </base-action-button>
              <base-action-button :title="$t('debug_devices.actions.od_diagnose')" @click="goWithNode('/debug/od', row.item, r.item)">
                <app-icon name="diagram-3" /> <span>{{ $t('debug_devices.actions.od_diagnose') }}</span>
              </base-action-button>
              <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), r.item.serial_no || r.item.uuid].filter(Boolean).join(' ') }">
                <template #button-content><app-icon name="list" aria-hidden="true" /></template>
                <b-dropdown-item-button @click="goWithNode('/debug/device-control', row.item, r.item)"><app-icon name="sliders" aria-hidden="true" /> {{ $t('debug_devices.actions.device_console') }}</b-dropdown-item-button>
              </b-dropdown>
            </template>
          </base-table>

          <!-- 实时串口日志（从 MQTT 消息流过滤 type=serial 的子集，与设备管理同屏） -->
          <div class="serial-logs-inline mt-3">
            <div class="d-flex align-items-center mb-2">
              <strong class="mr-2">{{ $t('debug_devices.serial.title') }}</strong>
              <base-badge :variant="row.item._serialStreamConnected ? 'success' : 'secondary'" class="mr-2">
                {{ row.item._serialStreamConnected ? $t('common.status.connected') : $t('common.status.disconnected') }}
              </base-badge>
              <base-badge variant="info" class="mr-2">{{ $t('debug_devices.serial.row_count', { n: (row.item._serialLogs || []).length }) }}</base-badge>
              <base-input
                v-model="row.item._serialFilter"
                :placeholder="$t('debug_devices.serial.filter_placeholder')"
                size="sm"
                class="mr-2 filter-width-220" :clearable="false"
              />
              <div class="serial-tool-group" role="group" :aria-label="$t('debug_devices.serial.title')">
                <base-icon-button
                  class="serial-tool-button"
                  tone="warning"
                  :label="row.item._serialPaused ? $t('debug_devices.serial.resume') : $t('debug_devices.serial.pause')"
                  @click="toggleSerialPause(row.item)"
                >
                  <app-icon :name="row.item._serialPaused ? 'play' : 'pause'" />
                </base-icon-button>
                <base-icon-button
                  class="serial-tool-button"
                  tone="danger"
                  :label="$t('debug_devices.serial.clear')"
                  @click="clearSerialLogs(row.item)"
                >
                  <app-icon name="trash"  />
                </base-icon-button>
                <base-icon-button
                  class="serial-tool-button"
                  :label="$t('debug_devices.serial.open_independent')"
                  @click="goWithHost('/debug/serial-logs', row.item)"
                >
                  <app-icon name="box-arrow-up-right"  />
                </base-icon-button>
              </div>
            </div>
            <div class="serial-logs-pane" :class="{ paused: row.item._serialPaused }">
              <div v-if="!row.item._serialLogs || row.item._serialLogs.length === 0" class="text-muted small p-2">
                {{ $t('debug_devices.serial.wait_mqtt') }}
              </div>
              <div
                v-for="(line, idx) in filteredSerialLogs(row.item)"
                :key="idx"
                class="serial-line"
              >
                <span class="srl-ts">{{ line.ts }}</span>
                <base-badge :variant="serialLevelVariant(line.level)" class="srl-lvl">{{ line.level || '-' }}</base-badge>
                <span class="srl-tag">[{{ line.tag || '-' }}]</span>
                <span class="srl-msg">{{ line.msg }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </base-table>

    <template #footer>
      <base-pagination
        v-model="query.page"
        :total-rows="total"
        :per-page.sync="query.page_size"
        :show-per-page="true"
        @input="reload"
        @update:perPage="onPageSizeChange"
      />
    </template>
    </list-page-card>
  </div>
</template>

<script>
import { fetchHosts } from '@/api/hosts'
import { fetchNodes } from '@/api/nodes'
import { fetchOnlineNodes } from '@/api/debug'
import { createMqttStream } from '@/api/debug/mqtt_stream'
import { getDeviceInfo } from '@/config/host-mac-types'
import { formatDate } from '@/utils/format'
import ListPageCard from '@/components/shared/ListPageCard.vue'

const SERIAL_LOG_LIMIT = 500 // 每个主机展开行最多保留的串口行数（防内存爆）

function formatHHMMSSms (ts) {
  // ts 可以是 epoch 浮点秒 / ISO 字符串 / 空，统一格式为 HH:MM:SS.fff
  if (!ts && ts !== 0) {
    const d = new Date()
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`
  }
  let d
  if (typeof ts === 'number') {
    d = new Date(ts * (ts > 1e12 ? 1 : 1000))
  } else {
    d = new Date(ts)
  }
  if (isNaN(d.getTime())) return ''
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`
}
function pad2 (n) { return n < 10 ? `0${n}` : `${n}` }
function pad3 (n) { return n < 10 ? `00${n}` : (n < 100 ? `0${n}` : `${n}`) }

export default {
  name: 'DebugDevices',
  components: { ListPageCard },
  data () {
    return {
      hosts: [],
      total: 0,
      loading: false,
      hasError: false,
      errorMsg: '',
      autoRefresh: false,
      autoTimer: null,
      query: {
        page: 1,
        page_size: 20,
        search: '',
        status: ''
      },
      // 全部节点缓存（用于统计），按需拉
      allNodes: []
    }
  },
  computed: {
    statusOptions () {
      return [
        { value: '', text: this.$t('debug_devices.status_options.all') },
        { value: 'online', text: this.$t('common.status.online') },
        { value: 'offline', text: this.$t('common.status.offline') },
        { value: 'maintenance', text: this.$t('common.status.maintenance') }
      ]
    },
    // 列宽：把固定宽度从 1100+ 收紧到 ~830px，给自适应列（serial_no/mac/sw_ver/last_seen）留余量；
    // 操作列 actions 4 个按钮，120px 够（每按钮约 28px + gap）；
    // 功能/角色多数为空，140px 已能容纳 1-2 个标签；超出走 nowrap+ellipsis 由 BootstrapVue 默认处理。
    hostFields () {
      return [
        { key: 'expand', label: this.$t('debug_devices.actions.expand'), thStyle: { width: '52px' }, class: 'expand-cell' },
        { key: 'status', label: this.$t('debug_devices.table.status'), thStyle: { width: '70px' } },
        { key: 'chip', label: this.$t('debug_devices.table.chip'), thStyle: { width: '90px' } },
        { key: 'func', label: this.$t('debug_devices.table.func'), thStyle: { width: '140px' } },
        { key: 'serial_no', label: this.$t('debug_devices.table.serial_no') },
        { key: 'mac_address', label: this.$t('debug_devices.table.mac') },
        { key: 'sw_ver', label: this.$t('debug_devices.table.sw_ver') },
        { key: 'last_seen', label: this.$t('debug_devices.table.last_seen'), thStyle: { width: '110px' } },
        { key: 'actions', label: this.$t('debug_devices.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    nodeFields () {
      return [
        { key: 'status', label: this.$t('debug_devices.table.status'), thStyle: { width: '70px' } },
        { key: 'chip', label: this.$t('debug_devices.table.chip'), thStyle: { width: '90px' } },
        { key: 'func', label: this.$t('debug_devices.table.func'), thStyle: { width: '140px' } },
        { key: 'can_node_id', label: this.$t('debug_devices.table.can_id'), thStyle: { width: '70px' } },
        { key: 'serial_no', label: this.$t('debug_devices.table.serial_no') },
        { key: 'mac_address', label: this.$t('debug_devices.table.mac') },
        { key: 'sw_ver', label: this.$t('debug_devices.table.sw_ver') },
        { key: 'last_seen', label: this.$t('debug_devices.table.last_seen'), thStyle: { width: '110px' } },
        { key: 'actions', label: this.$t('debug_devices.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    stats () {
      const hostsTotal = this.total
      const hostsOnline = this.hosts.filter(h => h.status === 'online').length
      const nodesTotal = this.allNodes.length
      const nodesOnline = this.allNodes.filter(n => n.status === 'online').length
      return { hostsTotal, hostsOnline, nodesTotal, nodesOnline }
    }
  },
  watch: {
    autoRefresh (val) {
      if (val) {
        this.autoTimer = setInterval(() => this.reload(true), 10000)
      } else if (this.autoTimer) {
        clearInterval(this.autoTimer)
        this.autoTimer = null
      }
    }
  },
  mounted () {
    this.reload()
    this.loadAllNodesForStats()
  },
  beforeDestroy () {
    if (this.autoTimer) clearInterval(this.autoTimer)
    // 关闭所有展开行启动的 mqtt 串口流，避免组件销毁后 WS 还在跑
    for (const h of this.hosts) {
      if (h && h._serialStream) {
        try { h._serialStream.close() } catch (e) { /* ignore */ }
      }
    }
  },
  methods: {
    async reload (silent = false) {
      if (!silent) this.loading = true
      this.hasError = false
      try {
        const params = { ...this.query }
        if (!params.status) delete params.status
        if (!params.search) delete params.search
        const res = await fetchHosts(params)
        const items = (res.items || []).map(h => ({
          ...h,
          _nodes: null,
          _nodesLoading: false,
          _nodesError: null
        }))
        this.hosts = items
        this.total = res.total || 0
      } catch (err) {
        this.hasError = true
        this.errorMsg = this.$getErrorMessage(err) || this.$t('debug_devices.errors.load_failed')
        this.hosts = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },
    async loadAllNodesForStats () {
      // 后端 page_size 上限 100；分页累加直到拉完
      try {
        const all = []
        let page = 1
        while (true) {
          const res = await fetchNodes({ page, page_size: 100 })
          const items = res.items || []
          all.push(...items)
          const total = res.total || 0
          if (all.length >= total || items.length === 0) break
          page += 1
          if (page > 50) break // 5000 节点封顶保护
        }
        this.allNodes = all
      } catch (err) {
        this.allNodes = []
      }
    },
    handleSearch () {
      this.query.page = 1
      this.reload()
    },
    onPageSizeChange () {
      this.query.page = 1
      this.reload()
    },
    async toggleRow (row) {
      const item = row.item
      if (row.detailsShowing) {
        // 收起：关掉 mqtt 流，释放资源
        this.stopSerialStream(item)
        row.toggleDetails()
        return
      }
      // 展开时实时拉物理节点（不论是否首次，都拉最新）
      this.$set(item, '_nodesLoading', true)
      this.$set(item, '_nodesError', null)
      try {
        const res = await fetchOnlineNodes(item.uuid, 120)
        // 后端返回 {host_uuid, window_seconds, host, nodes:[...]}
        // 把 can_node_id 映射成 status="online" + 标准化字段，方便表格显示
        const nodes = (res && res.nodes ? res.nodes : []).map(n => ({
          status: 'online', // 能在 ring buffer 出现就是在线
          can_node_id: n.can_node_id,
          last_seen: n.last_seen,
          mac_address: n.mac_address || null,
          serial_no: n.serial_no || this.$t('debug_devices.table.fake_serial', { id: n.can_node_id }),
          hn_model_name: n.is_bound ? this.$t('debug_devices.table.bound') : this.$t('debug_devices.table.unbound'),
          sw_ver: n.sw_ver || null,
          chip_model: n.chip_model || null,
          func_desc: n.func_desc || null,
          id: n.id || null,
          uuid: n.uuid || null
        }))
        this.$set(item, '_nodes', nodes)
      } catch (err) {
        this.$set(item, '_nodesError', this.$getErrorMessage(err) || this.$t('debug_devices.errors.load_nodes_failed'))
        this.$set(item, '_nodes', [])
      } finally {
        this.$set(item, '_nodesLoading', false)
      }
      // 同步启动主机 serial WS 流（subscribe 完整 mqtt-stream，前端按 message_type=serial 过滤）
      this.startSerialStream(item)
      row.toggleDetails()
    },

    // ==================== 实时串口流 ====================
    startSerialStream (item) {
      // 防止重复连接
      if (item._serialStream) return
      this.$set(item, '_serialLogs', item._serialLogs || [])
      this.$set(item, '_serialPaused', !!item._serialPaused)
      this.$set(item, '_serialFilter', item._serialFilter || '')
      this.$set(item, '_serialStreamConnected', false)
      const stream = createMqttStream({
        hostUuid: item.uuid,
        onOpen: () => { this.$set(item, '_serialStreamConnected', true) },
        onClose: () => { this.$set(item, '_serialStreamConnected', false) },
        onMessage: msg => this.onSerialStreamMessage(item, msg)
      })
      this.$set(item, '_serialStream', stream)
    },
    stopSerialStream (item) {
      const s = item._serialStream
      if (s && typeof s.close === 'function') {
        try { s.close() } catch (e) { /* ignore */ }
      }
      this.$set(item, '_serialStream', null)
      this.$set(item, '_serialStreamConnected', false)
    },
    onSerialStreamMessage (item, msg) {
      if (item._serialPaused) return
      if (!msg || msg.type !== 'mqtt_message') return // 跳过 connected/pong
      const data = msg.data || {}
      // 后端 message_type 字段已分类；这里只关心 serial（也兼容老 log 别名）
      if (data.message_type !== 'serial' && data.message_type !== 'log') return
      // payload.lines 是设备端 host_log_forward 的批量结构 [{level,tag,msg}]
      const payload = data.payload || {}
      const lines = Array.isArray(payload.lines) ? payload.lines : null
      const ts = formatHHMMSSms(data.received_at)
      const arr = item._serialLogs || []
      if (lines) {
        for (const ln of lines) {
          arr.push({ ts, level: (ln.level || '').toString().toUpperCase().slice(0, 1), tag: ln.tag || '', msg: ln.msg || '' })
        }
      } else {
        // 单条无 lines 字段的情况（少见）
        const lvl = payload.level || ''
        const tag = payload.tag || ''
        const m = payload.msg || payload.message || JSON.stringify(payload)
        arr.push({ ts, level: lvl.toString().toUpperCase().slice(0, 1), tag, msg: m })
      }
      // 截断：超过 limit 删掉头部，保留最近 SERIAL_LOG_LIMIT 行
      if (arr.length > SERIAL_LOG_LIMIT) {
        arr.splice(0, arr.length - SERIAL_LOG_LIMIT)
      }
      this.$set(item, '_serialLogs', arr.slice()) // slice 触发响应式更新
    },
    toggleSerialPause (item) {
      this.$set(item, '_serialPaused', !item._serialPaused)
    },
    clearSerialLogs (item) {
      this.$set(item, '_serialLogs', [])
    },
    filteredSerialLogs (item) {
      const all = item._serialLogs || []
      const f = (item._serialFilter || '').trim().toLowerCase()
      if (!f) return all
      return all.filter(l => (l.tag && l.tag.toLowerCase().includes(f)) || (l.msg && l.msg.toLowerCase().includes(f)))
    },
    serialLevelVariant (lvl) {
      const v = (lvl || '').toUpperCase()
      if (v === 'E') return 'danger'
      if (v === 'W') return 'warning'
      if (v === 'I') return 'info'
      if (v === 'D' || v === 'V') return 'secondary'
      return 'light'
    },
    statusLabel (s) {
      const map = {
        online: this.$t('common.status.online'),
        offline: this.$t('common.status.offline'),
        maintenance: this.$t('common.status.maintenance')
      }
      return map[s] || (s || this.$t('debug_devices.table.unknown'))
    },
    statusVariant (s) {
      return { online: 'success', offline: 'secondary', maintenance: 'warning' }[s] || 'light'
    },
    getChip (item) {
      // 优先读后端 chip_model（已规范化为小写如 'esp32-s3'，转大写显示）
      if (item && item.chip_model) {
        return this.normalizeChip(item.chip_model)
      }
      // 兜底：本地 MAC 映射（数据库未填时使用）
      const info = getDeviceInfo(item && item.mac_address)
      return info ? info.chip : null
    },
    getFunc (item) {
      if (item && item.func_desc) return item.func_desc
      const info = getDeviceInfo(item && item.mac_address)
      return info ? info.func : null
    },
    normalizeChip (chip) {
      // 'esp32-s3' → 'ESP32-S3'，留意保持已经大写的字符串原样
      if (!chip) return chip
      const s = String(chip).toUpperCase()
      return s.startsWith('ESP') ? s : chip
    },
    chipVariant (chip) {
      if (!chip) return 'light'
      if (chip.includes('P4')) return 'primary'
      if (chip.includes('S3')) return 'info'
      if (chip.includes('C3')) return 'success'
      if (chip.includes('C6')) return 'warning'
      return 'secondary'
    },
    formatRelative (ts) {
      if (!ts) return '-'
      const t = new Date(ts).getTime()
      if (Number.isNaN(t)) return '-'
      const diff = Date.now() - t
      const sec = Math.floor(diff / 1000)
      if (sec < 60) return this.$t('common.time.seconds_ago', { n: sec })
      const min = Math.floor(sec / 60)
      if (min < 60) return this.$t('common.time.minutes_ago', { n: min })
      const hr = Math.floor(min / 60)
      if (hr < 24) return this.$t('common.time.hours_ago', { n: hr })
      const day = Math.floor(hr / 24)
      if (day < 30) return this.$t('common.time.days_ago', { n: day })
      return formatDate(ts)
    },
    goHostDetail (host) {
      this.$router.push(`/devices/hosts/${host.id}`)
    },
    goNodeDetail (node) {
      this.$router.push(`/devices/nodes/${node.id || node.node_id}`)
    },
    goWithHost (path, host) {
      this.$router.push({ path, query: { host: host.uuid || host.id } })
    },
    goWithNode (path, host, node) {
      this.$router.push({
        path,
        query: {
          host: host.uuid || host.id,
          node: node.id || node.node_id || node.can_node_id
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/devices.scss"></style>
