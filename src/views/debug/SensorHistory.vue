<template>
  <div class="debug-sensor-history">
    <!-- 查询条件 -->
    <page-section-card class="filter-card sh-card search-card--titled" :header="$t('debug_sensor_history.section.filter')">
      <b-form class="sh-filter-form" @submit.prevent="loadRecords">
        <!-- 查询对象 -->
        <div class="sh-selection-grid">
          <div class="sh-form-cell sh-form-cell--pod">
            <label class="sh-label">{{ $t('debug_sensor_history.form.unit_label') }}</label>
            <b-form-select
              v-model="selectedPod"
              :options="unitOptions"
              size="sm"
              @change="onUnitChange"
            />
          </div>
          <div class="sh-form-cell sh-form-cell--fields">
            <label class="sh-label">{{ $t('debug_sensor_history.form.fields_label') }}</label>
            <b-dropdown
              size="sm"
              variant="outline-secondary"
              class="sh-fields-dropdown"
              :text="fieldsButtonText"
              :disabled="availableFields.length === 0"
            >
              <b-dropdown-form @submit.prevent>
                <div class="sh-fields-actions mb-2">
                  <base-button size="sm" variant="link" @click="selectAllFields">{{ $t('debug_sensor_history.form.select_all') }}</base-button>
                  <base-button size="sm" variant="link" @click="clearFields">{{ $t('debug_sensor_history.form.clear') }}</base-button>
                </div>
                <b-form-checkbox
                  v-for="f in availableFields"
                  :key="f"
                  v-model="selectedFields"
                  :value="f"
                  class="sh-field-cb"
                >
                  {{ f }}
                </b-form-checkbox>
              </b-dropdown-form>
            </b-dropdown>
            <small v-if="availableFields.length === 0" class="sh-muted sh-fields-hint">
              {{ $t('debug_sensor_history.form.fields_hint') }}
            </small>
          </div>
          <div class="sh-form-cell sh-form-cell--page-size">
            <label class="sh-label">{{ $t('debug_sensor_history.form.page_size_label') }}</label>
            <base-input v-model.number="pageSize" type="number" size="sm" min="20" max="2000" :clearable="false" />
          </div>
        </div>

        <!-- 时间范围 -->
        <div class="sh-time-panel">
          <div class="sh-form-cell sh-form-cell--quick">
            <label class="sh-label">{{ $t('debug_sensor_history.form.quick_label') }}</label>
            <b-button-group size="sm" class="sh-quick-btns">
              <base-button
                v-for="q in quickRanges"
                :key="q.key"
                :variant="activeQuickKey === q.key ? 'primary' : 'outline-primary'"
                @click="applyQuickRange(q)"
              >
                {{ q.label }}
              </base-button>
            </b-button-group>
          </div>
          <div class="sh-date-range">
            <div class="sh-form-cell">
              <label class="sh-label">{{ $t('debug_sensor_history.form.start_label') }}</label>
              <base-input
                v-model="startTime"
                type="datetime-local"
                size="sm"
                step="60"
                :placeholder="$t('debug_sensor_history.form.datetime_placeholder')"
                @input="activeQuickKey = 'custom'" :clearable="false"
              />
            </div>
            <span class="sh-date-separator" aria-hidden="true"><app-icon name="arrow-right"  /></span>
            <div class="sh-form-cell">
              <label class="sh-label">{{ $t('debug_sensor_history.form.end_label') }}</label>
              <base-input
                v-model="endTime"
                type="datetime-local"
                size="sm"
                step="60"
                :placeholder="$t('debug_sensor_history.form.datetime_placeholder')"
                @input="activeQuickKey = 'custom'" :clearable="false"
              />
            </div>
          </div>
        </div>

        <div class="sh-form-actions">
          <base-button
            type="submit"
            size="sm"
            variant="primary"
            :disabled="!selectedPod || loading"
          >
            <b-spinner v-if="loading" small />
            <app-icon name="search" v-else />
            {{ $t('debug_sensor_history.form.submit') }}
          </base-button>
          <base-button
            size="sm"
            variant="outline-primary"
            :disabled="!records.length"
            @click="exportCsv"
          >
            <app-icon name="download"  />
            {{ $t('debug_sensor_history.form.export_csv') }}
          </base-button>
        </div>
      </b-form>
    </page-section-card>

    <!-- 折线图 -->
    <base-card v-if="records.length > 0" class="mb-3 sh-card search-card--titled" :header="$t('debug_sensor_history.section.chart')">
      <div v-if="numericChartFields.length === 0" class="sh-empty">
        {{ $t('debug_sensor_history.empty.no_numeric') }}
      </div>
      <div v-else>
        <component
          :is="chartComponent"
          v-if="chartComponent"
          :option="chartOption"
          autoresize
          class="sh-chart"
        />
        <div v-else class="sh-empty">
          {{ $t('debug_sensor_history.empty.chart_failed') }}
        </div>
      </div>
    </base-card>

    <!-- 数据表格 -->
    <base-card class="sh-card sh-results-card" no-body>
      <base-table
        :items="records"
        :fields="tableFields"
        :loading="loading"
        :load-error="loadError"
        :current-page="currentPage"
        :per-page="tablePerPage"
        small
        striped
        responsive
        :sticky-header="records.length > 0 ? '50vh' : false"
        :empty-text="$t('debug_sensor_history.empty.no_records')"
        @retry="loadRecords"
      />
      <div v-if="records.length > tablePerPage" class="sh-pager">
        <b-pagination
          v-model="currentPage"
          :total-rows="records.length"
          :per-page="tablePerPage"
          align="center"
          size="sm"
        />
      </div>
    </base-card>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import Vue from 'vue'
import { fetchPods, fetchPodRecords } from '@/api/pods'
import { recordsToCsv, downloadCsv } from '@/api/debug/sensor_history'
import { formatDate } from '@/utils/format'
import { getFontScale } from '@/utils/font-size'

// 异步加载 echarts + vue-echarts,失败时降级隐藏图表
let _chartComponentPromise = null
async function loadChartComponent () {
  if (_chartComponentPromise) return _chartComponentPromise
  _chartComponentPromise = (async () => {
    try {
      const VueCompositionAPI = (await import('@vue/composition-api')).default
      Vue.use(VueCompositionAPI)
      const { use } = await import('echarts/core')
      const { CanvasRenderer } = await import('echarts/renderers')
      const { LineChart } = await import('echarts/charts')
      const {
        TitleComponent,
        TooltipComponent,
        LegendComponent,
        GridComponent,
        DataZoomComponent
      } = await import('echarts/components')
      use([
        CanvasRenderer,
        LineChart,
        TitleComponent,
        TooltipComponent,
        LegendComponent,
        GridComponent,
        DataZoomComponent
      ])
      const VChart = (await import('vue-echarts')).default
      return VChart
    } catch (e) {
      console.warn('[SensorHistory] echarts 加载失败,降级隐藏折线图', e)
      return null
    }
  })()
  return _chartComponentPromise
}

const TIME_KEYS = ['time', 'created_at', 'timestamp', 'ts']

// URL query 持久化字段：刷新或后退时还原查询条件
const URL_QUERY_FIELDS = ['pod', 'start', 'end', 'page_size', 'quick']
const URL_QUERY_DEFAULTS = {
  pod: '',
  start: '',
  end: '',
  page_size: 200,
  quick: '24h'
}

export default {
  name: 'DebugSensorHistory',
  data () {
    return {
      pods: [],
      selectedPod: '',
      startTime: '',
      endTime: '',
      pageSize: 200,
      currentPage: 1,
      tablePerPage: 50,
      activeQuickKey: '24h',

      records: [],
      availableFields: [], // 该 pod 最近一条记录可选的字段
      selectedFields: [],
      loading: false,
      loadError: '',

      chartComponent: null,
      // ECharts 画布文字不受 CSS 字号影响，需按当前档位系数换算
      fontScale: getFontScale(),
      fontSizeObserver: null
    }
  },
  computed: {
    // 必须是 computed：放在 mounted 里 $t 只求值一次，切换语言后按钮文案不会更新
    quickRanges () {
      return [
        { key: '1h', label: this.$t('debug_sensor_history.quick.h1'), minutes: 60 },
        { key: '24h', label: this.$t('debug_sensor_history.quick.h24'), minutes: 60 * 24 },
        { key: '7d', label: this.$t('debug_sensor_history.quick.d7'), minutes: 60 * 24 * 7 },
        { key: '30d', label: this.$t('debug_sensor_history.quick.d30'), minutes: 60 * 24 * 30 },
        { key: 'custom', label: this.$t('debug_sensor_history.quick.custom'), minutes: 0 }
      ]
    },
    unitOptions () {
      const opts = (this.pods || []).map(u => ({
        value: u.uuid || u.id,
        text: u.name || u.uuid || `pod#${u.id}`
      }))
      return [{ value: '', text: this.$t('debug_sensor_history.unit_options.select') }, ...opts]
    },
    fieldsButtonText () {
      if (this.availableFields.length === 0) return this.$t('debug_sensor_history.fields_button.waiting')
      if (this.selectedFields.length === 0) return this.$t('debug_sensor_history.fields_button.none_selected')
      if (this.selectedFields.length === this.availableFields.length) {
        return this.$t('debug_sensor_history.fields_button.all', { count: this.availableFields.length })
      }
      return this.$t('debug_sensor_history.fields_button.partial', { selected: this.selectedFields.length, total: this.availableFields.length })
    },
    /** 表格字段 = 时间列 + 选中字段(若未选则全部) */
    tableFields () {
      if (!this.records.length) return []
      const allKeys = Object.keys(this.records[0])
      const timeKeys = allKeys.filter(k => TIME_KEYS.includes(k))
      const dataKeys = this.selectedFields.length > 0
        ? this.selectedFields.filter(k => allKeys.includes(k))
        : allKeys.filter(k => !TIME_KEYS.includes(k))
      return [...timeKeys, ...dataKeys].map(k => ({
        key: k,
        label: k,
        sortable: true
      }))
    },
    /** 数值类型字段(用于绘图) */
    numericChartFields () {
      if (!this.records.length) return []
      const candidates = this.selectedFields.length > 0
        ? this.selectedFields
        : this.availableFields
      return candidates.filter(f => {
        return this.records.some(r => typeof r[f] === 'number' && Number.isFinite(r[f]))
      })
    },
    chartOption () {
      const fields = this.numericChartFields
      if (fields.length === 0) return {}
      const timeKey = TIME_KEYS.find(k => k in (this.records[0] || {})) || 'created_at'
      const sorted = [...this.records].sort((a, b) => {
        const ta = new Date(a[timeKey]).getTime() || 0
        const tb = new Date(b[timeKey]).getTime() || 0
        return ta - tb
      })
      const xData = sorted.map(r => {
        const t = r[timeKey]
        if (!t) return ''
        try { return formatDate(t, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) } catch (e) { return String(t) }
      })
      const series = fields.map(f => ({
        name: f,
        type: 'line',
        smooth: true,
        showSymbol: false,
        connectNulls: true,
        data: sorted.map(r => (typeof r[f] === 'number' ? r[f] : null))
      }))
      // 顶层 textStyle 作为全局默认，legend/坐标轴/tooltip 均继承，随字号档位缩放
      const baseFont = Math.round(12 * this.fontScale)
      return {
        textStyle: { fontSize: baseFont },
        tooltip: { trigger: 'axis', textStyle: { fontSize: baseFont } },
        legend: { data: fields, top: 0, textStyle: { fontSize: baseFont } },
        grid: { left: '3%', right: '3%', bottom: '12%', top: 36, containLabel: true },
        xAxis: { type: 'category', data: xData, boundaryGap: false, axisLabel: { fontSize: baseFont } },
        yAxis: { type: 'value', scale: true, axisLabel: { fontSize: baseFont } },
        dataZoom: [
          { type: 'inside', start: 0, end: 100 },
          { type: 'slider', start: 0, end: 100, height: 18 }
        ],
        series
      }
    }
  },
  watch: {
    selectedPod () { this._syncQueryToUrl() },
    startTime () { this._syncQueryToUrl() },
    endTime () { this._syncQueryToUrl() },
    pageSize () { this._syncQueryToUrl() },
    activeQuickKey () { this._syncQueryToUrl() },
    // 浏览器前进/后退：URL 变了同步回散列字段
    $route (to, from) {
      if (to.path !== from.path) return
      this._restoreQueryFromUrl()
    }
  },
  async mounted () {
    // 默认套 24h 范围
    this.applyQuickRange(this.quickRanges.find(q => q.key === '24h'))
    // URL 上有保存的状态则覆盖（包括用户的 custom 时间窗）
    this._restoreQueryFromUrl()
    await this.loadUnits()
    // 异步装载 echarts,失败也不影响其他功能
    loadChartComponent().then(c => { this.chartComponent = c })
    // 字号档位写在 <html data-font-size> 上，变化时重算图表字号
    this.fontSizeObserver = new MutationObserver(() => { this.fontScale = getFontScale() })
    this.fontSizeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-font-size']
    })
  },
  beforeDestroy () {
    if (this.fontSizeObserver) { this.fontSizeObserver.disconnect(); this.fontSizeObserver = null }
  },
  methods: {
    // 把 URL query 写回散列字段
    _restoreQueryFromUrl () {
      const q = this.$route.query || {}
      if (q.pod !== undefined) this.selectedPod = q.pod
      if (q.start !== undefined) this.startTime = q.start
      if (q.end !== undefined) this.endTime = q.end
      if (q.page_size !== undefined) {
        const n = parseInt(q.page_size, 10)
        if (!Number.isNaN(n)) this.pageSize = n
      }
      if (q.quick !== undefined) this.activeQuickKey = q.quick
    },
    // 把散列字段写回 URL（默认值不写入避免污染）
    _syncQueryToUrl () {
      const next = {}
      const cur = {
        pod: this.selectedPod,
        start: this.startTime,
        end: this.endTime,
        page_size: this.pageSize,
        quick: this.activeQuickKey
      }
      URL_QUERY_FIELDS.forEach(field => {
        const v = cur[field]
        if (v === '' || v === null || v === undefined) return
        if (v === URL_QUERY_DEFAULTS[field]) return
        next[field] = String(v)
      })
      const routeQuery = this.$route.query || {}
      const sameKeys = Object.keys(routeQuery).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(k => routeQuery[k] === next[k])
      if (sameValues) return
      this.$router.replace({ query: next }).catch(() => {})
    },
    async loadUnits () {
      try {
        const data = await fetchPods({ page: 1, page_size: 200 })
        this.pods = (data && (data.items || data.pods || data.data)) || data || []
      } catch (e) {
        console.error('加载单元列表失败', e)
      }
    },
    applyQuickRange (q) {
      this.activeQuickKey = q.key
      if (q.key === 'custom') return
      const now = new Date()
      const start = new Date(now.getTime() - q.minutes * 60 * 1000)
      this.startTime = this._toLocalInput(start)
      this.endTime = this._toLocalInput(now)
    },
    _toLocalInput (d) {
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    async onUnitChange () {
      // 切换 pod 时取最新一条以列出字段
      this.availableFields = []
      this.selectedFields = []
      this.records = []
      if (!this.selectedPod) return
      try {
        const data = await fetchPodRecords(this.selectedPod, { page: 1, page_size: 1 })
        const items = (data && (data.items || data.records || data.data)) || data || []
        if (items.length > 0) {
          const rec = items[0]
          // record_data 字段可能嵌套,前端兼容两种:扁平 or {record_data: {...}}
          const fields = rec.record_data && typeof rec.record_data === 'object'
            ? Object.keys(rec.record_data)
            : Object.keys(rec).filter(k => !TIME_KEYS.includes(k))
          this.availableFields = fields
        }
      } catch (e) {
        console.warn('探测字段失败', e)
      }
    },
    selectAllFields () {
      this.selectedFields = [...this.availableFields]
    },
    clearFields () {
      this.selectedFields = []
    },
    async loadRecords () {
      if (!this.selectedPod) return
      this.loading = true
      this.loadError = ''
      this.currentPage = 1
      try {
        const params = { page: 1, page_size: this.pageSize }
        if (this.startTime) params.start_date = new Date(this.startTime).toISOString()
        if (this.endTime) params.end_date = new Date(this.endTime).toISOString()
        if (this.selectedFields.length > 0) {
          params.fields = this.selectedFields.join(',')
        }
        const data = await fetchPodRecords(this.selectedPod, params)
        let list = (data && (data.items || data.records || data.data)) || data || []
        // 把 record_data 嵌套展平,方便表格/图表用
        list = list.map(r => {
          if (r.record_data && typeof r.record_data === 'object') {
            return { ...r, ...r.record_data }
          }
          return r
        })
        this.records = list
        // 如果用户没显式选字段,把可用字段列表也补齐
        if (this.availableFields.length === 0 && list.length > 0) {
          const sample = list[0]
          this.availableFields = Object.keys(sample).filter(k => !TIME_KEYS.includes(k))
        }
      } catch (e) {
        const msg = this.$getErrorMessage(e) || this.$t('debug_sensor_history.toast.load_failed')
        this.loadError = msg
        console.error('加载记录失败', e)
        this.$uiToast && this.$uiToast.toast(this.$t('debug_sensor_history.toast.load_failed'), { variant: 'danger', title: this.$t('debug_sensor_history.toast.load_failed_title') })
      } finally {
        this.loading = false
      }
    },
    exportCsv () {
      if (!this.records.length) return
      const cols = this.tableFields.map(f => f.key)
      const csv = recordsToCsv(this.records, cols)
      const filename = `pod_${this.selectedPod}_records_${Date.now()}.csv`
      downloadCsv(csv, filename)
    }
  }
}
</script>
