<template>
  <div class="debug-mqtt-stream">
    <page-section-card class="filter-card search-card--titled" :header="$t('debug_mqtt_stream.filter_section')">
      <b-form @submit.stop.prevent="reconnect">
        <div class="filter-row">
          <div class="filter-left">
            <b-form-select
              v-model="hostFilter"
              class="filter-control debug-filter-host"
              :options="hostFilterOptions"
            />
            <b-form-select
              v-model="kindFilter"
              class="filter-control mqtt-filter-kind"
              :options="kindFilterOptions"
            />
            <base-input
              v-model.trim="topicFilter"
              class="filter-control mqtt-filter-topic"
              :placeholder="$t('debug_mqtt_stream.filter.topic_placeholder')" :clearable="false"
            />
            <div class="filter-actions">
              <span class="mqtt-toolbar-status">
                <b-badge :variant="hostFilter ? (connected ? 'success' : 'secondary') : 'light'">
                  {{ hostFilter
                    ? $t(connected ? 'debug_mqtt_stream.status.connected' : 'debug_mqtt_stream.status.disconnected')
                    : $t('debug_mqtt_stream.status.idle') }}
                </b-badge>
                <b-badge variant="info">{{ filteredMessages.length }} / {{ messages.length }}</b-badge>
              </span>
              <base-button class="mqtt-filter-action" :variant="paused ? 'success' : 'warning'" :disabled="!hostFilter" @click="paused = !paused">
                {{ $t(paused ? 'debug_mqtt_stream.actions.resume' : 'debug_mqtt_stream.actions.pause') }}
              </base-button>
              <base-button class="mqtt-filter-action" variant="outline-danger" @click="clearMessages">
                <app-icon name="trash"  />
                {{ $t('debug_mqtt_stream.actions.clear') }}
              </base-button>
              <base-button
                :variant="hideHeartbeat ? 'primary' : 'outline-secondary'"
                @click="hideHeartbeat = !hideHeartbeat"
              >
                <app-icon :name="hideHeartbeat ? 'eye-slash' : 'eye'" />
                {{ $t(hideHeartbeat ? 'debug_mqtt_stream.actions.hide_heartbeat_on' : 'debug_mqtt_stream.actions.hide_heartbeat_off') }}
              </base-button>
              <base-button
                :variant="expandAll ? 'primary' : 'outline-secondary'"
                @click="toggleExpandAll"
              >
                <app-icon :name="expandAll ? 'arrows-collapse' : 'arrows-expand'" />
                {{ $t(expandAll ? 'debug_mqtt_stream.actions.expand_all_on' : 'debug_mqtt_stream.actions.expand_all_off') }}
              </base-button>
              <base-button variant="primary" :disabled="!hostFilter" @click="reconnect">
                <app-icon name="arrow-clockwise"  />
                {{ $t('debug_mqtt_stream.actions.reconnect') }}
              </base-button>
            </div>
          </div>
        </div>
      </b-form>
    </page-section-card>

    <base-card no-body>
      <base-table
        :items="tableMessages"
        :fields="fields"
        :striped="false"
        small
        hover
        responsive
        sticky-header="65vh"
        primary-key="id"
        table-class="mqtt-stream-data-table"
        :empty-text="hostFilter ? $t('debug_mqtt_stream.empty') : $t('debug_mqtt_stream.empty_no_host')"
        show-empty
        class="mqtt-stream-table"
      >
        <template #cell(ts)="row">
          <code class="mqtt-time">{{ formatTime(row.item.ts) }}</code>
        </template>
        <template #cell(host)="row">
          <div class="mqtt-device-cell" :title="row.item.host_uuid">
            <strong class="mqtt-host">{{ hostName(row.item.host_uuid) }}</strong>
            <small v-if="visibleDeviceId(row.item)" class="mqtt-device-id">#{{ row.item.device_id }}</small>
          </div>
        </template>
        <template #cell(kind)="row">
          <b-badge
            :variant="kindVariant(row.item.kind)"
            class="mqtt-kind"
            :class="{ 'mqtt-kind-heartbeat': row.item.kind === 'heartbeat' }"
          >
            {{ kindLabel(row.item.kind) }}
          </b-badge>
        </template>
        <template #cell(topic)="row">
          <code class="mqtt-topic" :title="row.item.topic">{{ row.item.topic || '-' }}</code>
        </template>
        <template #cell(summary)="row">
          <span class="mqtt-summary" :title="summarize(row.item)">{{ summarize(row.item) }}</span>
        </template>
        <template #cell(payload)="row">
          <base-button
            size="sm"
            variant="link"
            class="mqtt-payload-toggle"
            @click="toggleExpand(row.item)"
          >{{ $t(isExpanded(row.item) ? 'debug_mqtt_stream.actions.collapse' : 'debug_mqtt_stream.actions.expand') }}</base-button>
        </template>
        <template #row-details="row">
          <div class="mqtt-payload-details">
            <pre class="mqtt-payload">{{ stringify(row.item.payload) || '{}' }}</pre>
          </div>
        </template>
      </base-table>
    </base-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { createMqttStream } from '@/api/debug/mqtt_stream'
import { fetchHosts } from '@/api/hosts'

const MAX_BUFFER = 500
// hostFilter 哨兵值:'' = 未选主机(默认,不订阅),'__all__' = 全部主机
const HOST_FILTER_ALL = '__all__'

// 解析 topic 拿 message_type: wf2/{host_uuid}/{kind}/{device_id}
function parseKind (topic) {
  if (!topic) return 'unknown'
  const parts = topic.split('/')
  if (parts.length >= 3 && parts[0] === 'wf2') return parts[2]
  return parts[0] || 'unknown'
}

const KIND_VARIANTS = {
  status: 'success',
  heartbeat: 'light',
  ack: 'info',
  command: 'primary',
  ota: 'warning',
  emcy: 'danger',
  error: 'danger',
  serial: 'secondary',
  log: 'secondary',
  od_dump: 'dark',
  provision: 'info',
  lwt: 'warning',
  unknown: 'light'
}

const KIND_LABEL_KEYS = {
  status: 'debug_mqtt_stream.kind.status',
  heartbeat: 'debug_mqtt_stream.kind.heartbeat',
  ack: 'debug_mqtt_stream.kind.ack',
  command: 'debug_mqtt_stream.kind.command',
  ota: 'debug_mqtt_stream.kind.ota',
  emcy: 'debug_mqtt_stream.kind.emcy',
  error: 'debug_mqtt_stream.kind.error',
  serial: 'debug_mqtt_stream.kind.serial',
  log: 'debug_mqtt_stream.kind.log',
  od_dump: 'debug_mqtt_stream.kind.od_dump',
  provision: 'debug_mqtt_stream.kind.provision',
  lwt: 'debug_mqtt_stream.kind.lwt',
  unknown: 'debug_mqtt_stream.kind.unknown'
}

// 用于判断 status 帧是否仅是心跳:这些字段全相同视为周期心跳
// 排除 message_id / timestamp / uptime 这种每帧必变的非业务字段
const HEARTBEAT_SCALAR_KEYS = ['online', 'canopen_state', 'error_code', 'fw_version', 'product_code']
const HEARTBEAT_OBJECT_KEYS = ['attributes', 'system_status', 'network_status', 'device_counts']

// 比较两条 status 业务字段,全部相同 → 心跳
function isHeartbeat (prev, curr) {
  if (!prev) return false
  const prevData = (prev && prev.data) ? prev.data : prev
  const currData = (curr && curr.data) ? curr.data : curr
  if (!prevData || !currData) return false
  for (const k of HEARTBEAT_SCALAR_KEYS) {
    if (JSON.stringify(prevData[k]) !== JSON.stringify(currData[k])) return false
  }
  for (const k of HEARTBEAT_OBJECT_KEYS) {
    const a = prevData[k]
    const b = currData[k]
    if (a !== undefined || b !== undefined) {
      if (JSON.stringify(a) !== JSON.stringify(b)) return false
    }
  }
  return true
}

export default {
  name: 'DebugMqttStream',
  data () {
    return {
      stream: null,
      connected: false,
      paused: false,
      expandAll: false,
      expandedSet: new Set(),
      frozenMessages: null,
      messages: [],
      // 默认未选主机,不订阅 WebSocket,避免顶级菜单进来就被刷屏
      hostFilter: '',
      topicFilter: '',
      kindFilter: 'all',
      hideHeartbeat: true,
      hosts: [],
      loadingHosts: false
    }
  },
  computed: {
    fields () {
      return [
        { key: 'ts', label: this.$t('debug_mqtt_stream.column.time'), thStyle: { width: '124px' } },
        { key: 'host', label: this.$t('debug_mqtt_stream.column.device'), thStyle: { width: '132px' } },
        { key: 'kind', label: this.$t('debug_mqtt_stream.column.kind'), thStyle: { width: '88px' } },
        { key: 'topic', label: this.$t('debug_mqtt_stream.column.topic'), thStyle: { width: '420px' } },
        { key: 'summary', label: this.$t('debug_mqtt_stream.column.summary') },
        { key: 'payload', label: this.$t('debug_mqtt_stream.column.payload'), thStyle: { width: '78px' } }
      ]
    },
    tableMessages () {
      const source = this.frozenMessages || this.filteredMessages
      return source.map(item => ({
        ...item,
        _showDetails: this.isExpanded(item)
      }))
    },
    hostFilterOptions () {
      // 来源 1:后端 hosts 列表(进入页面立即拉)
      // 来源 2:从已收到的 messages 里补漏(防 hosts 接口落后)
      const set = new Set()
      for (const h of this.hosts) if (h && h.uuid) set.add(h.uuid)
      for (const m of this.messages) if (m.host_uuid) set.add(m.host_uuid)
      const opts = [
        { value: '', text: this.$t('debug_mqtt_stream.filter.host_placeholder') },
        { value: HOST_FILTER_ALL, text: this.$t('debug_mqtt_stream.filter.all_hosts') }
      ]
      const hostMeta = new Map()
      for (const h of this.hosts) if (h && h.uuid) hostMeta.set(h.uuid, h)
      for (const u of [...set].sort()) {
        const meta = hostMeta.get(u)
        const sn = meta && meta.serial_no ? ` ${meta.serial_no}` : ''
        opts.push({ value: u, text: `${u.slice(0, 8)}…${sn}` })
      }
      return opts
    },
    kindFilterOptions () {
      return [
        { value: 'all', text: this.$t('debug_mqtt_stream.filter.kind_all') },
        { value: 'status', text: this.$t('debug_mqtt_stream.filter.kind_status') },
        { value: 'heartbeat', text: this.$t('debug_mqtt_stream.filter.kind_heartbeat') },
        { value: 'ack', text: this.$t('debug_mqtt_stream.kind.ack') },
        { value: 'command', text: this.$t('debug_mqtt_stream.kind.command') },
        { value: 'ota', text: 'OTA' },
        { value: 'emcy', text: 'EMCY' },
        { value: 'serial', text: this.$t('debug_mqtt_stream.filter.kind_serial') },
        { value: 'od_dump', text: 'OD' }
      ]
    },
    filteredMessages () {
      // 未选主机:列表强制为空,引导用户先选
      if (!this.hostFilter) return []
      return this.messages.filter(msg => {
        // '__all__' 表示用户显式选了"全部主机",其他值是具体 host_uuid
        if (this.hostFilter !== HOST_FILTER_ALL && msg.host_uuid !== this.hostFilter) return false
        if (this.topicFilter && !(msg.topic || '').includes(this.topicFilter)) return false
        // 默认隐藏心跳;但用户主动选 'heartbeat' 时不再过滤掉
        if (this.hideHeartbeat && msg.kind === 'heartbeat' && this.kindFilter !== 'heartbeat') return false
        if (this.kindFilter !== 'all') {
          const k = msg.kind
          if (this.kindFilter === 'serial' && !(k === 'serial' || k === 'log')) return false
          else if (this.kindFilter === 'emcy' && !(k === 'emcy' || k === 'error')) return false
          else if (this.kindFilter !== 'serial' && this.kindFilter !== 'emcy' && k !== this.kindFilter) return false
        }
        return true
      })
    }
  },
  created () {
    // 用 non-reactive Map 缓存每个设备最近一条 status,避免 Vue 深度劫持浪费
    this._lastStatus = new Map()
  },
  mounted () {
    // 先拉主机列表填下拉,WebSocket 等用户选主机后再开
    this.loadHosts()
  },
  beforeDestroy () {
    if (this.stream) this.stream.close()
  },
  watch: {
    hostFilter (val, old) {
      this.resetExpansion()
      // 未选 → 选了:开 WS;已选 → 切换到未选:关 WS;其他切换不重连(过滤是前端做)
      if (!old && val) {
        this.connect()
      } else if (old && !val) {
        if (this.stream) {
          this.stream.close()
          this.stream = null
        }
        this.connected = false
      }
    },
    topicFilter () {
      this.resetExpansion()
    },
    kindFilter () {
      this.resetExpansion()
    },
    hideHeartbeat () {
      this.resetExpansion()
    }
  },
  methods: {
    connect () {
      if (this.stream) this.stream.close()
      this.stream = createMqttStream({
        onOpen: () => { this.connected = true },
        onClose: () => { this.connected = false },
        onMessage: data => {
          if (this.paused) return
          if (!data || data.type === 'pong' || data.type === 'ping' || data.type === 'connected') return
          const entry = (data.type === 'mqtt_message' && data.data) ? data.data : data
          const ts = entry.received_at
            ? Date.parse(entry.received_at) / 1000
            : (entry.ts || Date.now() / 1000)
          const topic = entry.topic || ''
          const parts = topic.split('/')
          const item = {
            id: `${ts}-${this.messages.length}`,
            ts,
            host_uuid: entry.host_uuid || (parts[1] || ''),
            device_id: entry.device_id || parts[3] || '',
            kind: entry.message_type || parseKind(topic),
            topic,
            payload: entry.payload,
            qos: entry.qos
          }
          // status 帧:与同设备上一条对比,业务关键字段全相同 → 标记心跳
          if (item.kind === 'status') {
            const dedupKey = `${item.host_uuid}#${item.device_id || ''}`
            const prev = this._lastStatus.get(dedupKey)
            if (isHeartbeat(prev, item.payload)) {
              item.kind = 'heartbeat'
            }
            // 上一条永远记录最新 status payload,保证后续比较基线持续滚动
            this._lastStatus.set(dedupKey, item.payload)
          }
          this.messages.unshift(item)
          if (this.messages.length > MAX_BUFFER) {
            this.messages.length = MAX_BUFFER
          }
        }
      })
    },
    reconnect () {
      if (!this.hostFilter) return
      this.connect()
    },
    async loadHosts () {
      this.loadingHosts = true
      try {
        // 后端 page_size 上限 100(app/api/hosts.py: Query(le=100))
        const data = await fetchHosts({ page: 1, page_size: 100 })
        // 后端不同接口返回结构不一,对齐 DeviceControl.vue 的兼容写法
        this.hosts = (data && (data.items || data.hosts || data.data)) || data || []
      } catch (e) {
        // 拉失败不阻塞页面,下拉里仍可从 messages 反推 host_uuid
        this.hosts = []
      } finally {
        this.loadingHosts = false
      }
    },
    clearMessages () {
      this.messages = []
      this.expandedSet = new Set()
      this.frozenMessages = null
      this.expandAll = false
      // 清空时同步重置心跳基线,避免清空后第一条 status 误判为心跳
      if (this._lastStatus) this._lastStatus.clear()
    },
    isExpanded (item) {
      return this.expandAll || this.expandedSet.has(item.id)
    },
    toggleExpand (item) {
      if (this.expandAll) {
        this.expandAll = false
        this.expandedSet = new Set(
          (this.frozenMessages || this.filteredMessages)
            .filter(message => message.id !== item.id)
            .map(message => message.id)
        )
        if (this.expandedSet.size === 0) this.frozenMessages = null
        return
      }

      const s = new Set(this.expandedSet)
      if (s.has(item.id)) {
        s.delete(item.id)
      } else {
        if (!this.frozenMessages) this.frozenMessages = this.filteredMessages.slice()
        s.add(item.id)
      }
      this.expandedSet = s
      if (s.size === 0) this.frozenMessages = null
    },
    toggleExpandAll () {
      if (this.expandAll) {
        this.resetExpansion()
        return
      }
      this.frozenMessages = this.filteredMessages.slice()
      this.expandedSet = new Set()
      this.expandAll = true
    },
    resetExpansion () {
      this.expandAll = false
      this.expandedSet = new Set()
      this.frozenMessages = null
    },
    shortUuid (u) {
      if (!u) return '-'
      if (u.length <= 13) return u
      return u.slice(0, 8) + '…'
    },
    hostName (hostUuid) {
      const host = this.hosts.find(item => item && item.uuid === hostUuid)
      return (host && host.serial_no) || this.shortUuid(hostUuid)
    },
    visibleDeviceId (item) {
      if (!item.device_id) return false
      return String(item.device_id) !== String(item.host_uuid || '')
    },
    kindVariant (k) { return KIND_VARIANTS[k] || 'light' },
    kindLabel (k) {
      const key = KIND_LABEL_KEYS[k]
      return key ? this.$t(key) : k
    },
    summarize (item) {
      // 给 payload 一行摘要,关键值用括号显示原始 key=value
      const p = item.payload
      if (!p || typeof p !== 'object') return String(p ?? '')
      const data = p.data || p
      const onlineText = this.$t('common.status.online')
      const offlineText = this.$t('common.status.offline')
      // 心跳帧:节奏信息 + 在线/NMT 状态,业务字段无变化所以不展开细节
      if (item.kind === 'heartbeat') {
        const tail = []
        if (data.online !== undefined) tail.push(data.online ? onlineText : offlineText)
        if (data.canopen_state) tail.push(`NMT ${data.canopen_state}`)
        const heartbeatLabel = this.$t('debug_mqtt_stream.summary.heartbeat')
        return tail.length ? `${heartbeatLabel} · ${tail.join(' · ')}` : heartbeatLabel
      }
      const bits = []
      // 在线状态
      if (data.online !== undefined) bits.push(data.online ? onlineText : offlineText)
      // CANopen NMT 状态
      if (data.canopen_state) bits.push(`NMT ${data.canopen_state}`)
      // 错误码(高亮提示)
      if (data.error_code) bits.push(this.$t('debug_mqtt_stream.summary.error_code', { code: data.error_code }))
      // 命令动作
      if (data.action) bits.push(this.$t('debug_mqtt_stream.summary.action', { action: data.action }))
      // 串口/日志:直接展示第一行真实内容,日志比其他字段长不跟其他字段挤
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        const first = data.lines[0]
        const level = first.level || first.lvl || 'I'
        const tag = (first.tag || '').slice(0, 12)
        const msg = (first.msg || this.$getErrorMessage(first) || '').slice(0, 120)
        const head = `[${level}${tag ? ' ' + tag : ''}]`
        const text = `${head} ${msg}`
        if (data.lines.length > 1) {
          return this.$t('debug_mqtt_stream.summary.more_lines', { text, count: data.lines.length - 1 })
        }
        return text
      }
      // 兼容单条 message 格式(无 lines 数组,日志直接挂在 data.message)
      if (data.message && (item.kind === 'serial' || item.kind === 'log')) {
        return `[${data.level || 'I'}${data.tag ? ' ' + data.tag : ''}] ${String(data.message).slice(0, 120)}`
      }
      // OD 条目
      if (data.entries && Array.isArray(data.entries)) bits.push(this.$t('debug_mqtt_stream.summary.od_entries', { n: data.entries.length }))
      // OTA 进度
      if (data.progress !== undefined) bits.push(`OTA ${data.progress}%`)
      if (data.status && item.kind === 'ota') bits.push(this.$t('debug_mqtt_stream.summary.ota_status', { status: data.status }))
      // 节点统计
      if (data.device_counts && data.device_counts.nodes_total !== undefined) {
        const dc = data.device_counts
        bits.push(this.$t('debug_mqtt_stream.summary.nodes', { online: dc.nodes_online ?? '?', total: dc.nodes_total }))
      }
      // 固件版本(只在还有空间且非心跳时)
      if (data.fw_version && bits.length < 3) bits.push(this.$t('debug_mqtt_stream.summary.fw_version', { ver: data.fw_version }))
      // 消息 ID(放最后,辅助调试)
      if (p.message_id && bits.length < 4) bits.push(`mid ${String(p.message_id).slice(-10)}`)
      return bits.slice(0, 4).join(' · ') || this.$t('debug_mqtt_stream.summary.click_expand')
    },
    formatTime (ts) {
      if (!ts) return '-'
      const ms = ts > 1e12 ? ts : ts * 1000
      const d = new Date(ms)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
    },
    stringify (val) {
      if (val === null || val === undefined) return ''
      if (typeof val === 'string') return val
      try {
        return JSON.stringify(val, null, 2)
      } catch (e) {
        return String(val)
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/debug/mqtt-stream.scss"></style>
