<template>
  <div class="od-manager">
    <!-- 顶部：紧凑级联选择 + 操作（沿用 Nodes.vue filter-row 样式） -->
    <page-section-card class="filter-card">
      <b-form class="od-manager__filters" @submit.prevent="handleDump">
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              v-model="selectedHost"
              class="filter-control"
              :options="hostOptions"
              :disabled="hostOptions.length === 0"
              :placeholder="hostOptions.length === 0 ? $t('od_manager.filters.no_online_host') : $t('od_manager.filters.select_online_host')"
              @input="onHostChange"
            />
            <base-select
              v-model="selectedTargetDevice"
              class="filter-control"
              :options="targetDeviceOptions"
              :disabled="!selectedHost"
              :placeholder="!selectedHost ? $t('od_manager.filters.select_host_first') : $t('od_manager.filters.select_target_device')"
              @input="onTargetDeviceChange"
            />
            <base-select
              v-model="form.profile"
              class="filter-control"
              :options="profileOptions"
              :placeholder="$t('od_manager.filters.select_profile')"
            />
            <base-input
              v-if="form.profile === 'custom'"
              v-model.trim="form.custom_objects"
              class="filter-control"
              :placeholder="$t('od_manager.filters.custom_objects_placeholder')"
            />
            <base-select
              v-model="specDeviceId"
              class="filter-control"
              :options="catalogOptions"
              :placeholder="$t('od_manager.filters.select_spec')"
              @input="onSpecSelectionChange"
            />
            <base-input
              v-model.trim="filterText"
              class="filter-control"
              :placeholder="$t('od_manager.filters.filter_placeholder')"
            />
            <div class="filter-actions">
              <base-button :disabled="busy || polling || !canDump" @click="handleDump">
                <app-icon name="arrow-down-circle"  />
                {{ $t('od_manager.actions.diagnose_now') }}
              </base-button>
              <base-button
                variant="secondary"
                :disabled="!form.host_uuid"
                @click="loadSnapshot"
              >
                <app-icon name="arrow-clockwise"  />
                {{ $t('od_manager.actions.refresh_snapshot') }}
              </base-button>
            </div>
          </div>
        </div>
      </b-form>
      <b-alert
        v-if="form.profile === 'custom' && !customObjectResult.valid"
        show
        variant="warning"
        class="mt-2 mb-0"
      >
        {{ $t('od_manager.warning.custom_objects_invalid') }}
      </b-alert>
      <b-alert v-if="specWarning" show variant="warning" class="mt-2 mb-0">{{ specWarning }}</b-alert>
      <b-alert v-if="pollError" show variant="danger" class="mt-2 mb-0">{{ pollError }}</b-alert>
    </page-section-card>

    <!-- 进度 + 主机概览 -->
    <base-card v-if="snapshot">
      <div class="od-manager__summary">
        <div class="od-manager__summary-row">
          <span class="od-manager__label">{{ $t('od_manager.summary.host') }}</span>
          <span class="od-manager__value">{{ snapshot.host_uuid || '-' }}</span>
          <span class="od-manager__label">{{ $t('od_manager.summary.target') }}</span>
          <span class="od-manager__value">{{ $t('od_manager.summary.target_value', { id: snapshot.nid, label: snapshot.target_label || '-' }) }}</span>
          <span class="od-manager__label">{{ $t('od_manager.summary.status') }}</span>
          <base-badge :variant="snapshot.completed ? 'success' : 'warning'">
            {{ snapshot.completed ? $t('od_manager.summary.completed') : $t('od_manager.summary.in_progress') }}
          </base-badge>
          <span class="od-manager__label">{{ $t('od_manager.summary.received_total') }}</span>
          <span class="od-manager__value">{{ snapshot.received }} / {{ snapshot.total }}</span>
          <span class="od-manager__label">{{ $t('od_manager.summary.updated_at') }}</span>
          <span class="od-manager__value">{{ formatTime(snapshot.updated_at) }}</span>
        </div>
        <div class="od-manager__progress">
          <div
            class="od-manager__progress-bar"
            :style="{ width: progressPct + '%' }"
            :class="{ 'od-manager__progress-bar--done': snapshot.completed }"
          ></div>
        </div>
        <!-- 对比统计 -->
        <div v-if="diffStats" class="od-manager__summary-row od-manager__diff-stats">
          <span class="od-manager__label">{{ $t('od_manager.summary.compare_spec', { device: specDeviceId }) }}</span>
          <base-badge variant="warning">{{ $t('od_manager.summary.value_mismatch', { n: diffStats.value_mismatch }) }}</base-badge>
          <base-badge variant="info">{{ $t('od_manager.summary.runtime', { n: diffStats.runtime }) }}</base-badge>
          <base-badge variant="secondary">{{ $t('od_manager.summary.missing_in_spec', { n: diffStats.missing_in_spec }) }}</base-badge>
          <base-badge variant="success">{{ $t('od_manager.summary.match', { n: diffStats.match }) }}</base-badge>
          <base-button
            size="sm"
            variant="outline-secondary"
            class="od-manager__toggle-btn"
            @click="toggleHideMatched"
          >
            {{ hideMatched ? $t('od_manager.actions.expand_matched') : $t('od_manager.actions.collapse_matched') }}
          </base-button>
          <span class="od-manager__label">{{ $t('od_manager.summary.summary_diff', { bad: diffStats.value_mismatch + diffStats.runtime + diffStats.missing_in_spec, match: diffStats.match }) }}</span>
        </div>
      </div>

      <!-- 实机 OD 紧凑表格: 单行展示, 信息全部靠左, 点击展开看完整描述 -->
      <div class="od-table" role="table">
        <div class="od-table__head" role="row">
          <div class="od-table__cell od-table__cell--status">{{ $t('od_manager.table.status') }}</div>
          <div class="od-table__cell od-table__cell--index">{{ $t('od_manager.table.index') }}</div>
          <div class="od-table__cell od-table__cell--name">{{ $t('od_manager.table.name') }}</div>
          <div class="od-table__cell od-table__cell--meta">{{ $t('od_manager.table.type') }}</div>
          <div class="od-table__cell od-table__cell--value">{{ $t('od_manager.table.device') }}</div>
          <div class="od-table__cell od-table__cell--value">{{ $t('od_manager.table.yaml') }}</div>
        </div>
        <template v-for="(row, i) in filteredRows">
          <div
            :key="row.index + ':' + i"
            class="od-table__row"
            :class="['od-table__row--' + row.status, { 'od-table__row--open': expandedKey === (row.index + ':' + i) }]"
            role="row"
            tabindex="0"
            :aria-expanded="String(expandedKey === (row.index + ':' + i))"
            :title="row.meaning || ''"
            @click="toggleExpand(row.index + ':' + i)"
            @keydown.enter.prevent="toggleExpand(row.index + ':' + i)"
            @keydown.space.prevent="toggleExpand(row.index + ':' + i)"
          >
            <div class="od-table__cell od-table__cell--status">
              <base-badge :variant="statusVariant(row.status)" class="od-table__badge">
                {{ statusLabel(row.status) }}
              </base-badge>
            </div>
            <div class="od-table__cell od-table__cell--index">
              <code>{{ row.index }}</code>
            </div>
            <div class="od-table__cell od-table__cell--name">{{ row.name }}</div>
            <div class="od-table__cell od-table__cell--meta">
              <span class="od-table__access" :data-access="row.access || '-'">{{ row.access || '-' }}</span>
              <span class="od-table__sep">·</span>
              <span>{{ row.type_or_size }}</span>
            </div>
            <div class="od-table__cell od-table__cell--value">
              <code v-if="row.device_value !== null && row.device_value !== undefined">{{ formatValue(row.device_value, row.size) }}</code>
              <span v-else class="od-table__missing">—</span>
            </div>
            <div class="od-table__cell od-table__cell--value">
              <code v-if="row.spec_default !== null && row.spec_default !== undefined">{{ row.spec_default }}</code>
              <span v-else class="od-table__missing">—</span>
            </div>
          </div>
          <div
            v-if="expandedKey === (row.index + ':' + i)"
            :key="'detail:' + row.index + ':' + i"
            class="od-table__detail"
          >
            <div v-if="row.meaning" class="od-table__detail-line">
              <span class="od-table__detail-label">{{ $t('od_manager.detail.meaning') }}</span>
              <span>{{ row.meaning }}</span>
            </div>
            <div class="od-table__detail-line">
              <span class="od-table__detail-label">{{ $t('od_manager.detail.full_name') }}</span>
              <code>{{ row.name }}</code>
              <span class="od-table__detail-label">{{ $t('od_manager.detail.access') }}</span>
              <code>{{ row.access || '-' }}</code>
              <span class="od-table__detail-label">{{ $t('od_manager.detail.bytes') }}</span>
              <code>{{ row.size }}</code>
            </div>
          </div>
        </template>
        <div v-if="filteredRows.length === 0" class="od-table__empty">{{ $t('od_manager.table.no_match') }}</div>
        <div
          v-if="diffStats && diffStats.match > 0"
          class="od-table__footer-hint"
        >
          <template v-if="hideMatched">
            {{ $t('od_manager.table.collapsed_count', { n: diffStats.match }) }}
            <base-button
              size="sm"
              variant="outline-secondary"
              class="od-table__footer-btn"
              @click="toggleHideMatched"
            >
              {{ $t('od_manager.actions.expand') }}
            </base-button>
          </template>
          <template v-else>
            {{ $t('od_manager.table.expanded') }}
            <base-button
              size="sm"
              variant="outline-secondary"
              class="od-table__footer-btn"
              @click="toggleHideMatched"
            >
              {{ $t('od_manager.actions.collapse_matched') }}
            </base-button>
          </template>
        </div>
      </div>
    </base-card>

    <base-card v-else>
      <div class="od-manager__empty">
        <p>{{ $t('od_manager.empty.tip1') }}</p>
        <p class="od-manager__hint" v-html="$t('od_manager.empty.tip2_html')"></p>
        <p class="od-manager__hint" v-html="$t('od_manager.empty.tip3_html')"></p>
      </div>
    </base-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchHosts } from '@/api/hosts'
import { triggerOdDump, fetchOdSnapshot, fetchOdSpec, fetchOdCatalog, fetchOdDeviceModels } from '@/api/od'
import { formatDate } from '@/utils/format'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import { findOdDeviceResolution, getResolvedOdSpec, isFreshOdSnapshot } from '@/utils/canopen.mjs'

export default {
  name: 'OdManager',
  data () {
    return {
      hosts: [],
      hostsTimer: null,
      selectedHost: null,
      selectedTargetDevice: null, // "host" | "node:<can_id>"
      deviceModels: [], // PostgreSQL 库存权威解析结果
      form: {
        host_uuid: '',
        device_id: 1,
        target: '2',
        profile: 'full',
        custom_objects: ''
      },
      catalog: { nodes: [], hosts: [] },
      specDeviceId: '',
      specVersion: 'V0.0.1',
      specHnModelId: null,
      spec: null, // 当前 specDeviceId 的规范 OD
      specWarning: '',
      filterText: '',
      busy: false,
      loading: false,
      snapshot: null,
      pollTimer: null,
      polling: false,
      pollError: '',
      activeDump: null,
      // 当前展开的行 key (index + ':' + i),null 表示全收起
      expandedKey: null,
      // 是否折叠 status==='match' 的行,默认折叠;持久化到 localStorage
      hideMatched: (() => {
        try {
          const v = localStorage.getItem('od_hide_matched')
          return v === null ? true : v === 'true'
        } catch (e) {
          return true
        }
      })()
    }
  },
  computed: {
    canDump () {
      return !!this.form.host_uuid && this.customObjectResult.valid
    },
    profileOptions () {
      return ['fault', 'startup', 'maintenance', 'full', 'custom'].map(value => ({
        value,
        text: this.$t(`od_manager.profiles.${value}`)
      }))
    },
    customObjectResult () {
      if (this.form.profile !== 'custom') return { valid: true, objects: [] }
      const tokens = String(this.form.custom_objects || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      if (tokens.length === 0 || tokens.length > 128) return { valid: false, objects: [] }
      const objects = []
      const seen = new Set()
      for (const token of tokens) {
        const match = token.match(/^(0x[0-9a-f]{1,4})(?::(\d{1,3}))?$/i)
        if (!match) return { valid: false, objects: [] }
        const index = parseInt(match[1], 16)
        const subIndex = match[2] === undefined ? null : parseInt(match[2], 10)
        if (index < 0x1000 || index > 0xFFFF || (subIndex !== null && subIndex > 255)) {
          return { valid: false, objects: [] }
        }
        const idx = `0x${index.toString(16).toUpperCase().padStart(4, '0')}`
        const key = `${idx}:${subIndex === null ? '*' : subIndex}`
        if (seen.has(key)) return { valid: false, objects: [] }
        seen.add(key)
        objects.push(subIndex === null ? { idx } : { idx, sidx: subIndex })
      }
      return { valid: true, objects }
    },
    hostOptions () {
      // OD 诊断必须实时操作设备,只列在线主机
      return this.hosts
        .filter(h => h.status === 'online')
        .map(h => ({
          value: h.uuid,
          text: h.serial_no || h.uuid.slice(0, 8)
        }))
    },
    /**
     * 目标设备 = 主机自身（device_id=1, target="1"）+ 该主机下的所有在线节点
     * value 编码：
     *   "host"               → 主机 OD（command/1, target=1）
     *   "node:<can_node_id>" → 节点 OD（command/<can_node_id> 或 command/1 + target=can_node_id）
     */
    targetDeviceOptions () {
      if (!this.selectedHost) return []
      const opts = []
      const host = findOdDeviceResolution(this.deviceModels, 'host', 1)
      if (host) {
        opts.push({ value: 'host', text: this.$t('od_manager.table.host_self') })
      }
      for (const device of this.deviceModels.filter(item => item.target_type === 'node')) {
        const routeId = device.route_device_id
        const label = device.serial_no || device.model_code || `node-${routeId}`
        opts.push({
          value: `node:${routeId}`,
          text: `${label} (device_id=${routeId})`
        })
      }
      return opts
    },
    catalogOptions () {
      const list = []
      for (const n of (this.catalog.nodes || [])) {
        list.push({ value: n.id, text: `${n.id} - ${n.name || ''}` })
      }
      for (const h of (this.catalog.hosts || [])) {
        list.push({ value: h.id, text: `${h.id} - ${h.name || ''} (host)` })
      }
      return list
    },
    progressPct () {
      if (!this.snapshot || !this.snapshot.total) return 0
      const p = (this.snapshot.received * 100) / this.snapshot.total
      return Math.max(0, Math.min(100, Math.round(p)))
    },
    /**
     * 合并设备实机 entries 与 YAML 规范 entries。
     *
     * PostgreSQL 规范按 (index, sub-index) 精确对齐。
     * 历史 YAML 兼容响应继续按规范化 name 对齐。
     *
     * 命名规范化：大小写不敏感、去尾部 ".N" 后缀、去常见同义词差异
     *   SYNC_WINDOW vs SYNC_WINDOW_LENGTH        → 都归一到 SYNC_WINDOW
     *   EMCY_INHIBIT vs INHIBIT_TIME_EMCY        → 排序词后均一
     *   IDENTITY.0 / NUM_ENTRIES / *_MAX_SUB     → 都归一到 MAX_SUB
     */
    mergedRows () {
      const toIntIdx = (s) => {
        if (typeof s === 'number') return s
        if (typeof s === 'string') return parseInt(s.replace(/^0x/i, ''), 16) || 0
        return 0
      }

      // 名字归一化：去 .N 后缀 / 同义词清理 / 词排序
      const normName = (n) => {
        if (!n) return ''
        let s = String(n).trim().toUpperCase().replace(/\.\d+$/, '')
        // 同义词归一
        const aliases = {
          NUM_ENTRIES: 'MAX_SUB',
          IDENTITY: 'MAX_SUB',
          STORE_PARAMS: 'MAX_SUB',
          STORE_PARAMETERS: 'MAX_SUB',
          RESTORE_PARAMS: 'MAX_SUB',
          RESTORE_PARAMETERS: 'MAX_SUB'
        }
        if (aliases[s]) s = aliases[s]
        // 去掉常见后缀以匹配缩写：SYNC_WINDOW_LENGTH ≡ SYNC_WINDOW
        s = s.replace(/_LENGTH$/, '')
        // 词排序：EMCY_INHIBIT vs INHIBIT_TIME_EMCY
        const tokens = s.split('_').filter(Boolean).sort()
        return tokens.join('_')
      }

      const usesExactAddress = this.spec?.source === 'postgresql_hn_model_attrs'
      // 历史 YAML 以 name 为主键，同 index 多条时再按 name 校验。
      const specByName = new Map()
      const specByIdx = new Map() // multi-map: idx → [entry, entry, ...]
      const specByAddress = new Map()
      if (this.spec && this.spec.entries) {
        for (const e of this.spec.entries) {
          const idx = toIntIdx(e.index)
          if (idx) {
            if (!specByIdx.has(idx)) specByIdx.set(idx, [])
            specByIdx.get(idx).push(e)
            const sub = Number.isInteger(Number(e.sub)) ? Number(e.sub) : 0
            specByAddress.set(`${idx}:${sub}`, e)
          }
          const nk = normName(e.name)
          if (nk && !specByName.has(nk)) specByName.set(nk, e)
        }
      }

      // 合并：以 dev 条目为主线
      // 对齐优先级:
      //   1) name 严格匹配(归一化后): 最准,跨 index 模式都能对上
      //   2) 同 index 内按 name 二次匹配
      //   3) 都对不上 → missing_in_spec(节点没有该字段对应的规范定义)
      const consumedSpec = new Set()
      const rows = []
      const allDevices = (this.snapshot && this.snapshot.entries) || []
      for (const dev of allDevices) {
        const devName = normName(dev.n)
        const devIdx = toIntIdx(dev.i)
        const devSub = Number.isInteger(Number(dev.s)) ? Number(dev.s) : 0
        let spec = usesExactAddress && devIdx
          ? specByAddress.get(`${devIdx}:${devSub}`)
          : (devName ? specByName.get(devName) : null)
        if (!usesExactAddress && !spec) {
          // name 没命中,尝试 index 匹配——但只接受同 index 中 name 也对得上的那一条
          const idx = toIntIdx(dev.i)
          const candidates = idx ? (specByIdx.get(idx) || []) : []
          for (const c of candidates) {
            if (normName(c.name) === devName) { spec = c; break }
          }
          // 还没找到 → 不强行匹配同 index 的不同字段(避免 6 条错配),保持 spec=null
        }
        if (spec) consumedSpec.add(spec)

        let status = 'match'
        if (!spec) {
          status = 'missing_in_spec'
        } else {
          const specNum = this.parseSpecDefault(spec.default)
          if (specNum === null) {
            status = 'match'
          } else if (specNum === dev.v) {
            status = 'match'
          } else {
            const isReadOnly = (spec.dir === 'ro' || dev.a === 'ro')
            if (isReadOnly && specNum === 0 && dev.v !== 0) {
              status = 'runtime'
            } else {
              status = 'value_mismatch'
            }
          }
        }

        rows.push({
          status,
          index: dev.i || (spec && spec.index) || '-',
          name: dev.n || (spec && spec.name) || '',
          // 中文含义：YAML group_name 通常含中文(如"风扇控制") 或 spec.unit / category
          meaning: this.fieldMeaning(dev, spec),
          access: dev.a || (spec && spec.dir) || '',
          type_or_size: `${dev.sz}B${spec ? ' / ' + spec.type : ''}`,
          size: dev.sz,
          device_value: dev.v,
          spec_default: spec ? spec.default : null
        })
      }
      // 不再追加 "missing_in_device" — 节点固件本来就不会实现规范里所有字段
      // (规范是"全集",设备是"子集",没实现 ≠ 出错)。consumedSpec 仅用于将来扩展。
      void consumedSpec // eslint-disable-line no-void
      // 保留固件上报的原始顺序(按 group_index 然后 sub),不再按 status 排序。
      // 这样用户能稳定地按 index 找字段,排查更顺手。
      return rows
    },
    diffStats () {
      if (!this.snapshot || !this.spec) return null
      const stats = {
        match: 0,
        value_mismatch: 0,
        runtime: 0,
        missing_in_device: 0,
        missing_in_spec: 0
      }
      for (const r of this.mergedRows) stats[r.status] = (stats[r.status] || 0) + 1
      return stats
    },
    filteredRows () {
      // 1) 文本过滤
      const f = this.filterText.toLowerCase().trim()
      let rows = this.mergedRows
      if (f) {
        rows = rows.filter(r =>
          (r.index || '').toLowerCase().includes(f) ||
          (r.name || '').toLowerCase().includes(f)
        )
      }
      // 2) 折叠匹配项:hideMatched=true 时过滤掉 status==='match'
      if (this.hideMatched) {
        rows = rows.filter(r => r.status !== 'match')
      }
      // 3) 按 status 优先级稳定排序(同优先级保持原顺序,即 group_index → sub)
      const priority = {
        value_mismatch: 0,
        runtime: 1,
        missing_in_spec: 2,
        match: 3,
        missing_in_device: 4
      }
      // 复制后排序避免污染 mergedRows;Array.prototype.sort 在现代浏览器是稳定排序
      return rows.slice().sort((a, b) => {
        const pa = priority[a.status] ?? 99
        const pb = priority[b.status] ?? 99
        return pa - pb
      })
    }
  },
  async mounted () {
    await this.loadHosts()
    await this.loadCatalog()
    if (this.specDeviceId) await this.loadSpec()
    // OD 诊断需要实时知道哪些设备在线 → 每 15 秒拉一次主机列表
    this.hostsTimer = setInterval(() => this.loadHosts(), 15000)
  },
  beforeDestroy () {
    this.stopPolling()
    wsManager.disconnect()
    if (this.hostsTimer) clearInterval(this.hostsTimer)
  },
  methods: {
    async loadHosts () {
      try {
        const data = await fetchHosts({ page: 1, page_size: 100 })
        this.hosts = (data && (data.items || data.data || data.hosts)) || data || []
        if (Array.isArray(this.hosts) && this.hosts.length > 0 && !this.selectedHost) {
          // 默认选第一个在线主机
          const online = this.hosts.find(h => h.status === 'online')
          if (online) {
            this.selectedHost = online.uuid
            this.onHostChange(online.uuid)
          }
        }
      } catch (err) {
        console.error('加载主机列表失败', err)
      }
    },
    async loadCatalog () {
      try {
        this.catalog = await fetchOdCatalog()
      } catch (err) {
        console.error('加载 OD 目录失败', err)
      }
    },
    async loadSpec () {
      if (!this.specDeviceId) {
        this.spec = null
        return
      }
      try {
        const data = await fetchOdSpec(this.specDeviceId, this.specVersion, this.specHnModelId)
        if (data && !data.error) {
          this.spec = data
          this.specWarning = ''
        } else {
          this.spec = null
          this.specWarning = data?.error || this.$t('od_manager.warning.spec_unavailable')
        }
      } catch (err) {
        console.error('加载规范 OD 失败', err)
        this.spec = null
        this.specWarning = this.$t('od_manager.warning.spec_unavailable')
      }
    },
    async onHostChange (uuid) {
      this.stopPolling()
      wsManager.disconnect()
      this.form.host_uuid = uuid || ''
      this.snapshot = null
      this.pollError = ''
      this.selectedTargetDevice = null
      this.deviceModels = []
      if (!uuid) return
      wsManager.connectSingle(uuid, { odDumpProgress: this.handleOdProgress })
      try {
        const data = await fetchOdDeviceModels(uuid)
        this.deviceModels = Array.isArray(data?.devices) ? data.devices : []
      } catch (err) {
        console.error('Failed to load authoritative OD device models', err)
        this.specWarning = this.$t('od_manager.warning.model_unknown')
      }
      // 默认选第一个目标设备
      if (this.targetDeviceOptions.length > 0) {
        this.selectedTargetDevice = this.targetDeviceOptions[0].value
        this.onTargetDeviceChange(this.selectedTargetDevice)
      }
    },
    onTargetDeviceChange (val) {
      // val 形如 "host" 或 "node:<can_id>"
      let resolution = null
      if (val === 'host') {
        this.form.device_id = 1
        this.form.target = '1'
        resolution = findOdDeviceResolution(this.deviceModels, 'host', 1)
      } else if (typeof val === 'string' && val.startsWith('node:')) {
        const routeId = parseInt(val.split(':')[1], 10) || 2
        this.form.device_id = 1
        this.form.target = String(routeId)
        resolution = findOdDeviceResolution(this.deviceModels, 'node', routeId)
      }
      this.snapshot = null
      const resolvedSpec = getResolvedOdSpec(resolution)
      if (!resolvedSpec) {
        this.specDeviceId = ''
        this.specHnModelId = null
        this.spec = null
        this.specWarning = resolution?.resolution_status === 'resolved'
          ? this.$t('od_manager.warning.spec_unavailable')
          : this.$t('od_manager.warning.model_unknown')
      } else {
        this.specDeviceId = resolvedSpec.id
        this.specVersion = resolvedSpec.version
        this.specHnModelId = resolvedSpec.hnModelId
        this.specWarning = ''
        this.loadSpec()
      }
      if (this.form.host_uuid) this.loadSnapshot()
    },
    onSpecSelectionChange (specId) {
      this.specHnModelId = null
      const entries = [...(this.catalog.nodes || []), ...(this.catalog.hosts || [])]
      const entry = entries.find(item => item.id === specId)
      const versions = (entry && entry.versions) || []
      this.specVersion = entry?.common_ver_1 || entry?.common_ver_2 || versions[0]?.ver || versions[0] || 'V0.0.1'
      this.specWarning = ''
      this.loadSpec()
    },
    formatTime (ts) {
      if (!ts) return '-'
      // ts 可能是 ISO 字符串(后端 datetime)或 unix
      const d = typeof ts === 'string' ? new Date(ts) : new Date(ts * 1000)
      return isNaN(d.getTime()) ? String(ts) : formatDate(d)
    },
    accessVariant (a) {
      if (a === 'rw') return 'primary'
      if (a === 'wo') return 'warning'
      return 'secondary'
    },
    statusVariant (s) {
      return {
        match: 'success',
        value_mismatch: 'warning',
        runtime: 'info',
        missing_in_device: 'danger',
        missing_in_spec: 'secondary'
      }[s] || 'secondary'
    },
    statusLabel (s) {
      const map = {
        match: this.$t('od_manager.status_label.match'),
        value_mismatch: this.$t('od_manager.status_label.value_mismatch'),
        runtime: this.$t('od_manager.status_label.runtime'),
        missing_in_device: this.$t('od_manager.status_label.missing_in_device'),
        missing_in_spec: this.$t('od_manager.status_label.missing_in_spec')
      }
      return map[s] || s
    },
    typeSize (t) {
      if (!t) return 0
      const m = { U8: 1, I8: 1, U16: 2, I16: 2, U32: 4, I32: 4 }
      return m[t.toUpperCase()] || 0
    },
    parseSpecDefault (v) {
      if (typeof v === 'number') return v
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (/^0x[0-9a-f]+$/i.test(trimmed)) return parseInt(trimmed, 16)
        if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)
      }
      return null
    },
    /**
     * 字段的中文实际意义。优先级：
     *   1) spec.summary       (字段自身"概述",最准)
     *   2) spec.group_summary (group 概述,兜底)
     *   3) spec.unit          (单位,如 mV/dBm)
     *   4) 内置 index 段映射
     */
    fieldMeaning (dev, spec) {
      if (spec) {
        if (spec.summary) return spec.summary
        if (spec.group_summary) return spec.group_summary
        if (spec.unit && spec.unit !== '-') return this.$t('od_manager.meaning.unit', { unit: spec.unit })
      }
      const idxStr = (dev && dev.i) || (spec && spec.index) || ''
      const idx = parseInt(idxStr.replace(/^0x/i, ''), 16) || 0
      if (idx >= 0x1000 && idx < 0x2000) return this.$t('od_manager.meaning.canopen_comm')
      if (idx >= 0x2000 && idx < 0x3000) return this.$t('od_manager.meaning.platform_common')
      if (idx >= 0x3000 && idx < 0x4000) return this.$t('od_manager.meaning.node_business')
      return ''
    },
    formatValue (v, size) {
      if (v === null || v === undefined) return '-'
      if (typeof v === 'number') {
        const sz = size || 4
        const padding = sz * 2
        return `0x${v.toString(16).toUpperCase().padStart(padding, '0')} (${v})`
      }
      return String(v)
    },
    async handleDump () {
      if (!this.canDump) return
      this.busy = true
      this.pollError = ''
      try {
        const queryNid = this.snapshotNid()
        let baseline = null
        try {
          baseline = await fetchOdSnapshot(this.form.host_uuid, queryNid)
        } catch (err) {
          console.warn('Failed to load OD baseline snapshot', err)
        }
        const r = await triggerOdDump({
          host_uuid: this.form.host_uuid,
          device_id: this.form.device_id,
          target: this.form.target,
          profile: this.form.profile,
          ...(this.form.profile === 'custom' ? { objects: this.customObjectResult.objects } : {})
        })
        if (!r || r.success === false) {
          throw new Error(r?.error || this.$t('od_manager.toast.trigger_failed'))
        }
        this.snapshot = null
        this.startPolling({
          baseline,
          issuedAt: r.issued_at || Math.floor(Date.now() / 1000),
          queryNid
        })
      } catch (err) {
        console.error('OD dump 触发失败:', err)
        const msg = err?.response?.data?.error || this.$getErrorMessage(err) || this.$t('od_manager.toast.trigger_failed')
        if (this.$uiToast) this.$uiToast.toast(msg, { title: this.$t('od_manager.toast.title'), variant: 'danger' })
      } finally {
        this.busy = false
      }
    },
    snapshotNid () {
      const target = parseInt(this.form.target, 10)
      return Number.isNaN(target) ? 2 : target
    },
    async loadSnapshot (options = {}) {
      if (!this.form.host_uuid) return
      // 规范三层 od_dump 从 payload.nid 标识快照目标。
      const queryNid = this.snapshotNid()
      this.loading = true
      try {
        const data = await fetchOdSnapshot(this.form.host_uuid, queryNid)
        if (data && data.exists) {
          if (!options.activeOnly || isFreshOdSnapshot(data, this.activeDump?.baseline, this.activeDump?.issuedAt)) {
            this.snapshot = data
          }
        } else if (!options.activeOnly) {
          this.snapshot = null
        }
      } catch (err) {
        console.error('加载快照失败:', err)
      } finally {
        this.loading = false
      }
    },
    startPolling (activeDump) {
      this.stopPolling()
      this.activeDump = activeDump
      this.polling = true
      const startedAt = Date.now()
      const poll = async () => {
        await this.loadSnapshot({ activeOnly: true })
        const elapsed = Date.now() - startedAt
        if (this.snapshot && this.snapshot.completed) {
          this.stopPolling()
          return
        }
        if (elapsed > 60000) {
          this.pollError = this.$t('od_manager.warning.dump_timeout')
          this.stopPolling()
          return
        }
        this.pollTimer = setTimeout(poll, 1000)
      }
      this.pollTimer = setTimeout(poll, 250)
    },
    stopPolling () {
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
        this.pollTimer = null
      }
      this.polling = false
      this.activeDump = null
    },
    handleOdProgress (message) {
      if (!this.polling || !this.activeDump) return
      const messageNid = message?.nid ?? message?.data?.nid ?? message?.device_id
      if (String(messageNid) !== String(this.activeDump.queryNid)) return
      const dumpId = message?.data?.dump_id
      const baselineDumpId = this.activeDump.baseline?.dump_id
      if (baselineDumpId !== undefined && dumpId === baselineDumpId) return
      this.loadSnapshot({ activeOnly: true })
    },
    /** 切换某行的展开/收起状态 */
    toggleExpand (key) {
      this.expandedKey = (this.expandedKey === key) ? null : key
    },
    /** 切换"折叠匹配项",并持久化到 localStorage */
    toggleHideMatched () {
      this.hideMatched = !this.hideMatched
      try {
        localStorage.setItem('od_hide_matched', String(this.hideMatched))
      } catch (e) {
        // localStorage 不可用时忽略,不影响功能
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/od-manager.scss"></style>
