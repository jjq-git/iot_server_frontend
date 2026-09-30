<template>
  <div class="dashboard-page">
    <b-overlay :show="loading" rounded="sm" opacity="0.65">
      <!-- 统计卡片 -->
      <b-row class="stats-row">
        <b-col cols="12" sm="6" xl="3">
          <div class="stat-card stat-card--primary">
            <div class="stat-card__accent"></div>
            <div class="stat-card__icon">
              <app-icon name="controller-system" />
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">{{ stats.onlineDevices | formatNumber }}</div>
              <div class="stat-card__label">{{ $t('dashboard.stat.online_devices') }}</div>
              <div class="stat-card__sub">
                {{ $t('dashboard.stat.online_rate', { rate: stats.onlineRate }) }}
              </div>
            </div>
          </div>
        </b-col>

        <b-col cols="12" sm="6" xl="3">
          <div class="stat-card stat-card--success">
            <div class="stat-card__accent"></div>
            <div class="stat-card__icon">
              <app-icon name="soundproof-pod" />
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">{{ stats.podTotal | formatNumber }}</div>
              <div class="stat-card__label">{{ $t('dashboard.stat.pod_total') }}</div>
              <div class="stat-card__sub">
                {{ $t('dashboard.stat.pod_usage_rate', { rate: stats.podUsageRate }) }}
              </div>
            </div>
          </div>
        </b-col>

        <b-col cols="12" sm="6" xl="3">
          <div class="stat-card stat-card--warning">
            <div class="stat-card__accent"></div>
            <div class="stat-card__icon">
              <app-icon name="folder" />
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">{{ stats.fileTotal | formatNumber }}</div>
              <div class="stat-card__label">{{ $t('dashboard.stat.file_total') }}</div>
              <div class="stat-card__sub">
                {{ $t('dashboard.stat.file_size', { size: stats.fileSize }) }}
              </div>
            </div>
          </div>
        </b-col>

        <b-col cols="12" sm="6" xl="3">
          <div class="stat-card stat-card--danger">
            <div class="stat-card__accent"></div>
            <div class="stat-card__icon">
              <app-icon name="bell" />
            </div>
            <div class="stat-card__body">
              <div class="stat-card__value">{{ stats.alertsToday | formatNumber }}</div>
              <div class="stat-card__label">{{ $t('dashboard.stat.alerts_today') }}</div>
              <div class="stat-card__sub" :class="{ 'text-danger': stats.alertsPending > 0 }">
                {{ $t('dashboard.stat.pending', { count: stats.alertsPending }) }}
              </div>
            </div>
          </div>
        </b-col>
      </b-row>

      <!-- 图表区域 2x2 -->
      <b-row class="charts-grid">
        <!-- 设备在线率趋势 -->
        <b-col cols="12" xl="6" class="mb-3">
          <base-card class="chart-panel">
            <template #header>
              <div class="panel-header">
                <span class="panel-title">{{ $t('dashboard.chart.online_trend.title') }}</span>
                <div class="panel-actions">
                  <b-button-group size="sm" class="chart-toggle">
                    <base-button
                      :variant="onlineChartType === 'line' ? 'primary' : 'outline-secondary'"
                      @click="onlineChartType = 'line'"
                    >{{ $t('dashboard.chart.online_trend.line') }}</base-button>
                    <base-button
                      :variant="onlineChartType === 'area' ? 'primary' : 'outline-secondary'"
                      @click="onlineChartType = 'area'"
                    >{{ $t('dashboard.chart.online_trend.area') }}</base-button>
                  </b-button-group>
                  <base-button size="sm" variant="link" class="refresh-btn" @click="refreshOnlineChart">
                    <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
                  </base-button>
                </div>
              </div>
            </template>

            <div class="chart-body">
              <component
                :is="chartComponent"
                v-if="chartComponent"
                :option="onlineRateChartOption"
                autoresize
                class="chart-instance"
              />
              <div v-else class="chart-placeholder">
                <b-spinner small variant="secondary" />
                <span class="ml-2 text-muted">{{ $t('common.loading') }}</span>
              </div>
              <div class="chart-summary-row">
                <div class="summary-stat">
                  <span class="summary-label">{{ $t('dashboard.chart.online_trend.avg') }}</span>
                  <strong>{{ getAverage(onlineRateData) }}%</strong>
                </div>
                <div class="summary-stat">
                  <span class="summary-label">{{ $t('dashboard.chart.online_trend.max') }}</span>
                  <strong class="text-success">{{ maxOnlineRate }}%</strong>
                </div>
                <div class="summary-stat">
                  <span class="summary-label">{{ $t('dashboard.chart.online_trend.min') }}</span>
                  <strong class="text-warning">{{ minOnlineRate }}%</strong>
                </div>
              </div>
            </div>
          </base-card>
        </b-col>

        <!-- 静音仓使用时长分布 -->
        <b-col cols="12" xl="6" class="mb-3">
          <base-card class="chart-panel">
            <template #header>
              <div class="panel-header">
                <span class="panel-title">{{ $t('dashboard.chart.pod_duration.title') }}</span>
                <base-button size="sm" variant="link" class="refresh-btn" @click="refreshPodDuration">
                  <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
                </base-button>
              </div>
            </template>

            <div class="chart-body">
              <component
                :is="chartComponent"
                v-if="chartComponent"
                :option="podDurationOption"
                autoresize
                class="chart-instance chart-instance--doughnut"
              />
              <div v-else class="chart-placeholder">
                <b-spinner small variant="secondary" />
                <span class="ml-2 text-muted">{{ $t('common.loading') }}</span>
              </div>
              <div class="doughnut-stats">
                <div class="doughnut-stat">
                  <div class="doughnut-stat__value">{{ podAvgDuration }}</div>
                  <div class="doughnut-stat__label">{{ $t('dashboard.chart.pod_duration.avg') }}(h)</div>
                </div>
                <div class="doughnut-stat">
                  <div class="doughnut-stat__value">{{ podLongestDuration }}</div>
                  <div class="doughnut-stat__label">{{ $t('dashboard.chart.pod_duration.longest') }}(h)</div>
                </div>
                <div class="doughnut-stat">
                  <div class="doughnut-stat__value">{{ podDurationData.today }}</div>
                  <div class="doughnut-stat__label">{{ $t('dashboard.chart.pod_duration.today') }}</div>
                </div>
              </div>
            </div>
          </base-card>
        </b-col>

        <!-- 文件使用统计 -->
        <b-col cols="12" xl="6" class="mb-3 datepicker-popover-scope">
          <base-card class="chart-panel datepicker-popover-card">
            <template #header>
              <div class="panel-header">
                <span class="panel-title">{{ $t('dashboard.chart.file_stats.title') }}</span>
                <div class="panel-actions">
                  <b-form-datepicker
                    v-model="startDate"
                    v-bind="datepickerI18n"
                    value-as-date
                    size="sm"
                    class="date-picker"
                    @input="refreshFileStats"
                  />
                  <span class="date-separator">—</span>
                  <b-form-datepicker
                    v-model="endDate"
                    v-bind="datepickerI18n"
                    value-as-date
                    size="sm"
                    class="date-picker"
                    @input="refreshFileStats"
                  />
                  <base-button size="sm" variant="link" class="refresh-btn" @click="refreshFileStats">
                    <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
                  </base-button>
                </div>
              </div>
            </template>

            <div class="chart-body">
              <component
                :is="chartComponent"
                v-if="chartComponent"
                :option="fileStatsOption"
                autoresize
                class="chart-instance"
              />
              <div v-else class="chart-placeholder">
                <b-spinner small variant="secondary" />
                <span class="ml-2 text-muted">{{ $t('common.loading') }}</span>
              </div>
              <div class="chart-summary-row chart-summary-row--icons">
                <div class="summary-item">
                  <app-icon name="download" class="summary-icon" />
                  <div class="summary-text">
                    <div class="summary-label">{{ $t('dashboard.chart.file_stats.downloads') }}</div>
                    <div class="summary-val">{{ $t('dashboard.chart.file_stats.times', { n: stats.fileDownloads }) }}</div>
                  </div>
                </div>
                <div class="summary-item">
                  <app-icon name="play-circle" class="summary-icon" />
                  <div class="summary-text">
                    <div class="summary-label">{{ $t('dashboard.chart.file_stats.plays') }}</div>
                    <div class="summary-val">{{ $t('dashboard.chart.file_stats.times', { n: stats.filePlays }) }}</div>
                  </div>
                </div>
                <div class="summary-item">
                  <app-icon name="plus" class="summary-icon" />
                  <div class="summary-text">
                    <div class="summary-label">{{ $t('dashboard.chart.file_stats.new_files') }}</div>
                    <div class="summary-val">{{ $t('dashboard.chart.file_stats.items', { n: stats.fileNew }) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </base-card>
        </b-col>

        <!-- 系统告警统计 -->
        <b-col cols="12" xl="6" class="mb-3">
          <base-card class="chart-panel">
            <template #header>
              <div class="panel-header">
                <span class="panel-title">{{ $t('dashboard.chart.alerts.title') }}</span>
                <base-button size="sm" variant="link" class="refresh-btn" @click="refreshAlerts">
                  <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
                </base-button>
              </div>
            </template>

            <div class="chart-body">
              <component
                :is="chartComponent"
                v-if="chartComponent"
                :option="alertsChartOption"
                autoresize
                class="chart-instance chart-instance--doughnut"
              />
              <div v-else class="chart-placeholder">
                <b-spinner small variant="secondary" />
                <span class="ml-2 text-muted">{{ $t('common.loading') }}</span>
              </div>
              <div class="alerts-stats-row">
                <div class="alerts-stat alerts-stat--today">
                  <div class="alerts-stat__num">{{ stats.alertsToday }}</div>
                  <div class="alerts-stat__txt">{{ $t('dashboard.stat.alerts_today') }}</div>
                </div>
                <div class="alerts-stat alerts-stat--week">
                  <div class="alerts-stat__num">{{ stats.alertsWeek }}</div>
                  <div class="alerts-stat__txt">{{ $t('dashboard.chart.alerts.week') }}</div>
                </div>
                <div class="alerts-stat alerts-stat--pending">
                  <div class="alerts-stat__num">{{ stats.alertsPending }}</div>
                  <div class="alerts-stat__txt">{{ $t('dashboard.chart.alerts.pending') }}</div>
                </div>
              </div>
            </div>
          </base-card>
        </b-col>
      </b-row>

      <!-- 详细统计表格 -->
      <base-card class="detail-table-panel">
        <template #header>
          <div class="panel-header">
            <span class="panel-title">{{ $t('dashboard.detail_table.title') }}</span>
            <base-button size="sm" variant="link" class="refresh-btn" @click="refreshTable">
              <app-icon name="arrow-clockwise" class="mr-1" />{{ $t('common.refresh') }}
            </base-button>
          </div>
        </template>

        <base-table
          :items="tableData"
          :fields="tableFields"
          striped
          responsive
          :busy="tableLoading"
          small
          class="detail-table" :hover="false" :show-empty="false"
        >
          <template #cell(online_rate)="row">
            <b-badge
              :variant="row.item.online_rate >= 95 ? 'success' : row.item.online_rate >= 90 ? 'warning' : 'danger'"
            >{{ row.item.online_rate }}%</b-badge>
          </template>
        </base-table>
      </base-card>
    </b-overlay>
  </div>
</template>

<script>
import Vue from 'vue'
import { fetchDashboard } from '@/api'
import BaseCard from '@/components/base/BaseCard.vue'
import datepickerI18n from '@/mixins/datepickerI18n'
import { getFontScale } from '@/utils/font-size'
import { createThemePalette, getPrimaryColor, THEME_CHANGE_EVENT } from '@/utils/theme'

// ── ECharts 按需加载器 (tree-shaking) ──────────────────────────
let _chartLoadPromise = null
function loadChartComponent () {
  if (_chartLoadPromise) return _chartLoadPromise
  _chartLoadPromise = (async () => {
    try {
      const VueCompositionAPI = (await import('@vue/composition-api')).default
      Vue.use(VueCompositionAPI)
      const { use } = await import('echarts/core')
      const { CanvasRenderer } = await import('echarts/renderers')
      const { LineChart, BarChart, PieChart, GaugeChart } = await import('echarts/charts')
      const {
        TitleComponent,
        TooltipComponent,
        LegendComponent,
        GridComponent,
        GraphicComponent
      } = await import('echarts/components')
      use([
        CanvasRenderer,
        LineChart,
        BarChart,
        PieChart,
        GaugeChart,
        TitleComponent,
        TooltipComponent,
        LegendComponent,
        GridComponent,
        GraphicComponent
      ])
      const VChart = (await import('vue-echarts')).default
      return VChart
    } catch (e) {
      console.warn('[Dashboard] echarts 加载失败,降级隐藏图表', e)
      return null
    }
  })()
  return _chartLoadPromise
}

// ── 创建默认状态 ──────────────────────────────────────────────
const createDefaultState = () => ({
  stats: {
    onlineDevices: 0,
    totalDevices: 0,
    onlineRate: 0,
    podTotal: 0,
    podUsageRate: 0,
    fileTotal: 0,
    fileSize: 0,
    alertsToday: 0,
    alertsPending: 0,
    fileDownloads: 0,
    filePlays: 0,
    fileNew: 0,
    alertsWeek: 0
  },
  alertTypes: { offline: 0, communication: 0, other: 0 },
  deviceStatusData: { online: 0, offline: 0, maintenance: 0, inactive: 0 },
  onlineRateData: [0, 0, 0, 0, 0, 0, 0],
  onlineRateTrend: [],
  podDurationData: { '0-1h': 0, '1-2h': 0, '2-4h': 0, '4h+': 0, total: 0, today: 0 },
  podDurationPercent: { '0-1h': 0, '1-2h': 0, '2-4h': 0, '4h+': 0 },
  podAvgDuration: 0,
  podLongestDuration: 0,
  fileDownloadData: [0, 0, 0, 0, 0, 0, 0],
  fileDownloadLabels: [],
  alertWaveData: [0, 0, 0, 0, 0, 0, 0],
  alertTrend: [],
  podUsageTrend: [],
  tableData: []
})

export default {
  name: 'DashboardView',
  components: { BaseCard },
  mixins: [datepickerI18n],
  data () {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 6)

    return {
      dateRange: [start, end],
      onlineChartType: 'line',
      tableLoading: false,
      loading: false,
      refreshTimer: null,
      chartComponent: null,
      isDark: false,
      themePalette: createThemePalette(getPrimaryColor()),
      themeChangeHandler: null,
      // ECharts 画布文字不受 CSS 字号影响，需按当前档位系数换算
      fontScale: getFontScale(),
      rootAttrObserver: null,
      ...createDefaultState()
    }
  },
  computed: {
    // 必须是 computed：放在 data() 里 $t 只求值一次，切换语言后表头不会更新
    tableFields () {
      return [
        { key: 'date', label: this.$t('dashboard.detail_table.column.date') },
        { key: 'online_devices', label: this.$t('dashboard.detail_table.column.online_devices') },
        { key: 'total_devices', label: this.$t('dashboard.detail_table.column.total_devices') },
        { key: 'online_rate', label: this.$t('dashboard.detail_table.column.online_rate') },
        { key: 'pod_usage', label: this.$t('dashboard.detail_table.column.pod_usage') },
        { key: 'avg_usage_time', label: this.$t('dashboard.detail_table.column.avg_usage_time') },
        { key: 'file_downloads', label: this.$t('dashboard.detail_table.column.file_downloads') },
        { key: 'alerts_count', label: this.$t('dashboard.detail_table.column.alerts_count') }
      ]
    },
    startDate: {
      get () { return this.dateRange[0] || null },
      set (value) { this.dateRange = [value, this.dateRange[1] || value] }
    },
    endDate: {
      get () { return this.dateRange[1] || null },
      set (value) { this.dateRange[0] = this.dateRange[0] || value; this.dateRange = [this.dateRange[0], value] }
    },
    chartLabels () {
      if (this.onlineRateTrend.length) return this.onlineRateTrend.map(item => item.label)
      return this.onlineRateData.map((_, i) => `${i + 1}`)
    },
    maxOnlineRate () {
      return this.onlineRateData.length ? Math.max(...this.onlineRateData) : 0
    },
    minOnlineRate () {
      return this.onlineRateData.length ? Math.min(...this.onlineRateData) : 0
    },
    // ── ECharts 通用样式 ──────────────────────────────────────
    chartTheme () {
      // 引用主题状态以确保 data-theme 变化后重新生成 ECharts option。
      const theme = this.isDark
      const styles = window.getComputedStyle(document.documentElement)
      const read = name => styles.getPropertyValue(name).trim()
      return {
        theme,
        text: read('--color-chart-text'),
        textStrong: read('--color-chart-text-strong'),
        grid: read('--color-chart-grid'),
        surface: read('--color-chart-surface'),
        success: read('--color-chart-success'),
        warning: read('--color-chart-warning'),
        error: read('--color-chart-error'),
        info: read('--color-chart-info'),
        errorArea: read('--color-chart-error-area'),
        tooltipBg: read('--color-chart-tooltip-bg'),
        tooltipBorder: read('--color-chart-tooltip-border'),
        tooltipText: read('--color-chart-tooltip-text')
      }
    },
    chartTextColor () {
      return this.chartTheme.text
    },
    chartTextColorStrong () {
      return this.chartTheme.textStrong
    },
    chartBorderColor () {
      return this.chartTheme.grid
    },

    deviceStatusOption () {
      const vm = this
      return {
        tooltip: {
          trigger: 'item',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) }
        },
        legend: {
          bottom: 0,
          textStyle: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
          itemWidth: 10,
          itemHeight: 10
        },
        series: [{
          type: 'pie',
          radius: ['54%', '78%'],
          center: ['50%', '43%'],
          minAngle: 4,
          stillShowZeroSum: false,
          label: { show: false },
          itemStyle: {
            borderRadius: 3,
            borderColor: vm.chartTheme.surface,
            borderWidth: 2
          },
          data: [
            { value: vm.deviceStatusData.online || 0, name: vm.$t('dashboard.chart.device_status.online') },
            { value: vm.deviceStatusData.offline || 0, name: vm.$t('dashboard.chart.device_status.offline') },
            { value: vm.deviceStatusData.maintenance || 0, name: vm.$t('dashboard.chart.device_status.maintenance') },
            { value: vm.deviceStatusData.inactive || 0, name: vm.$t('dashboard.chart.device_status.inactive') }
          ],
          color: [vm.chartTheme.success, vm.chartTheme.error, vm.chartTheme.warning, vm.chartTextColor]
        }]
      }
    },

    podUsageTrendOption () {
      const vm = this
      const labels = vm.podUsageTrend.map(item => item.label || item.date)
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) }
        },
        legend: {
          top: 0,
          textStyle: { color: vm.chartTextColor, fontSize: vm.chartFont(12) }
        },
        grid: { left: 42, right: 42, top: 44, bottom: 28 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLine: { lineStyle: { color: vm.chartBorderColor } },
          axisTick: { show: false },
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) }
        },
        yAxis: [
          {
            type: 'value',
            minInterval: 1,
            axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
            splitLine: { lineStyle: { color: vm.chartBorderColor, type: 'dashed' } }
          },
          {
            type: 'value',
            axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12), formatter: '{value} min' },
            splitLine: { show: false }
          }
        ],
        series: [
          {
            name: vm.$t('dashboard.chart.pod_usage_trend.uses'),
            type: 'bar',
            data: vm.podUsageTrend.map(item => Number(item.usage_count || 0)),
            barMaxWidth: 28,
            itemStyle: { color: vm.themePalette.brand, borderRadius: [4, 4, 0, 0] }
          },
          {
            name: vm.$t('dashboard.chart.pod_usage_trend.avg_duration'),
            type: 'line',
            yAxisIndex: 1,
            data: vm.podUsageTrend.map(item => Number(item.avg_duration_minutes || 0)),
            smooth: false,
            symbolSize: 7,
            lineStyle: { width: 2, color: vm.chartTheme.warning },
            itemStyle: { color: vm.chartTheme.warning }
          }
        ]
      }
    },

    alertTrendOption () {
      const vm = this
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) }
        },
        grid: { left: 40, right: 24, top: 20, bottom: 28 },
        xAxis: {
          type: 'category',
          data: vm.alertTrend.map(item => item.label || item.date),
          axisLine: { lineStyle: { color: vm.chartBorderColor } },
          axisTick: { show: false },
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) }
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
          splitLine: { lineStyle: { color: vm.chartBorderColor, type: 'dashed' } }
        },
        series: [{
          name: vm.$t('dashboard.chart.alert_trend.count'),
          type: 'line',
          smooth: false,
          symbol: 'circle',
          symbolSize: 7,
          data: vm.alertTrend.map(item => Number(item.count || 0)),
          lineStyle: { width: 3, color: vm.chartTheme.error },
          itemStyle: { color: vm.chartTheme.error },
          areaStyle: { color: vm.chartTheme.errorArea }
        }]
      }
    },

    // ── ① 设备在线率趋势 (折线/面积图) ─────────────────────────
    onlineRateChartOption () {
      const vm = this
      const isArea = vm.onlineChartType === 'area'
      // formatter 在渲染期才执行，字号需在 computed 求值时先算好，否则不会随档位重算
      const fsLabel = vm.chartFont(12)
      const fsValue = vm.chartFont(18)
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) },
          formatter (params) {
            const p = params[0]
            return `<div style="font-size:${fsLabel}px;opacity:.7;margin-bottom:4px">${p.name}</div>
                    <div style="font-size:${fsValue}px;font-weight:var(--font-weight-bold)">${p.value}%</div>`
          }
        },
        grid: { left: 40, right: 24, top: 16, bottom: 28 },
        xAxis: {
          type: 'category',
          data: vm.chartLabels,
          axisLine: { lineStyle: { color: vm.chartBorderColor } },
          axisTick: { show: false },
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) }
        },
        yAxis: {
          type: 'value',
          min: Math.max(0, Math.floor(vm.minOnlineRate - 5)),
          max: Math.max(vm.maxOnlineRate + 5, 100),
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12), formatter: '{value}%' },
          splitLine: { lineStyle: { color: vm.chartBorderColor, type: 'dashed' } }
        },
        series: [{
          data: vm.onlineRateData,
          type: 'line',
          smooth: false,
          symbol: 'circle',
          symbolSize: 8,
          showSymbol: true,
          lineStyle: { width: 3, color: vm.themePalette.brand },
          itemStyle: {
            color: vm.themePalette.brand,
            borderColor: vm.chartTheme.surface,
            borderWidth: 2
          },
          areaStyle: isArea
            ? {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: vm.themePalette.outline },
                    { offset: 1, color: vm.themePalette.background }
                  ]
                }
              }
            : undefined,
          emphasis: {
            focus: 'series',
            itemStyle: { shadowBlur: 10, shadowColor: vm.themePalette.outline }
          }
        }]
      }
    },

    // ── ② 静音仓使用时长分布 (环形图) ──────────────────────────
    podDurationOption () {
      const vm = this
      const data = [
        { value: vm.podDurationData['0-1h'] || 0, name: '0-1 h' },
        { value: vm.podDurationData['1-2h'] || 0, name: '1-2 h' },
        { value: vm.podDurationData['2-4h'] || 0, name: '2-4 h' },
        { value: vm.podDurationData['4h+'] || 0, name: '4+ h' }
      ]
      const fsLabel = vm.chartFont(13)
      const fsValue = vm.chartFont(18)
      const fsUnit = vm.chartFont(12)
      return {
        tooltip: {
          trigger: 'item',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) },
          formatter (p) {
            // formatter 每次 hover 都执行，$t 取当时的 locale，语言切换无需重绘图表
            const times = vm.$t('dashboard.chart.pod_duration.times', { n: p.value })
            return `<div style="font-size:${fsLabel}px">${p.name}</div>
                    <div style="font-size:${fsValue}px;font-weight:var(--font-weight-bold)">${times} <span style="font-size:${fsUnit}px;opacity:.7">(${p.percent}%)</span></div>`
          }
        },
        legend: {
          bottom: 0,
          textStyle: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 20
        },
        series: [{
          type: 'pie',
          radius: ['58%', '82%'],
          center: ['50%', '45%'],
          minAngle: 4,
          stillShowZeroSum: false,
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 3,
            borderColor: vm.chartTheme.surface,
            borderWidth: 3
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: vm.chartFont(16), fontWeight: 'bold' },
            scaleSize: 8
          },
          data,
          color: [vm.themePalette.brand, vm.chartTheme.success, vm.chartTheme.warning, vm.chartTheme.error]
        }],
        graphic: {
          type: 'text',
          left: 'center',
          top: '38%',
          style: {
            text: vm.podDurationData.total || 0,
            textAlign: 'center',
            fill: vm.chartTextColorStrong,
            fontSize: vm.chartFont(26),
            fontWeight: 'bold'
          }
        }
      }
    },

    // ── ③ 文件使用统计 (柱状图) ───────────────────────────────
    fileStatsOption () {
      const vm = this
      const labels = vm.fileDownloadData.map((_, i) => vm.getWeekdayLabel(i))
      const fsLabel = vm.chartFont(12)
      const fsValue = vm.chartFont(18)
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) },
          formatter (params) {
            const p = params[0]
            const times = vm.$t('dashboard.chart.file_stats.times', { n: p.value })
            return `<div style="font-size:${fsLabel}px;opacity:.7;margin-bottom:4px">${p.name}</div>
                    <div style="font-size:${fsValue}px;font-weight:var(--font-weight-bold)">${times}</div>`
          }
        },
        grid: { left: 36, right: 16, top: 16, bottom: 28 },
        xAxis: {
          type: 'category',
          data: labels,
          axisLine: { lineStyle: { color: vm.chartBorderColor } },
          axisTick: { show: false },
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) }
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
          splitLine: { lineStyle: { color: vm.chartBorderColor, type: 'dashed' } }
        },
        series: [{
          data: vm.fileDownloadData,
          type: 'bar',
          barWidth: '50%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: vm.themePalette.bright },
                { offset: 1, color: vm.themePalette.brand }
              ]
            }
          },
          emphasis: {
            itemStyle: {
              color: vm.themePalette.bright,
              shadowBlur: 8,
              shadowColor: vm.themePalette.outline
            }
          }
        }]
      }
    },

    // ── ④ 系统告警统计 (环形图 + 统计卡) ────────────────────────
    alertsChartOption () {
      const vm = this
      const data = [
        { value: vm.alertTypes.offline || 0, name: vm.$t('dashboard.chart.alerts.type_offline', { n: vm.alertTypes.offline || 0 }) },
        { value: vm.alertTypes.communication || 0, name: vm.$t('dashboard.chart.alerts.type_communication', { n: vm.alertTypes.communication || 0 }) },
        { value: vm.alertTypes.other || 0, name: vm.$t('dashboard.chart.alerts.type_other', { n: vm.alertTypes.other || 0 }) }
      ].filter(d => d.value > 0)
      return {
        tooltip: {
          trigger: 'item',
          backgroundColor: vm.chartTheme.tooltipBg,
          borderColor: vm.chartTheme.tooltipBorder,
          textStyle: { color: vm.chartTheme.tooltipText, fontSize: vm.chartFont(13) }
        },
        legend: {
          bottom: 0,
          textStyle: { color: vm.chartTextColor, fontSize: vm.chartFont(12) },
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 16
        },
        series: [{
          type: 'pie',
          radius: ['55%', '80%'],
          center: ['50%', '43%'],
          minAngle: 4,
          stillShowZeroSum: false,
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 3,
            borderColor: vm.chartTheme.surface,
            borderWidth: 2
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: vm.chartFont(14), fontWeight: 'bold' },
            scaleSize: 6
          },
          data,
          color: [vm.chartTheme.error, vm.chartTheme.warning, vm.chartTheme.info]
        }]
      }
    }
  },
  created () {
    this.loadDashboard()
    this.startAutoRefresh()
  },
  mounted () {
    this.detectTheme()
    this.detectFontScale()
    this.themeChangeHandler = event => {
      this.themePalette = event.detail || createThemePalette(getPrimaryColor())
    }
    window.addEventListener(THEME_CHANGE_EVENT, this.themeChangeHandler)
    // 主题 / 字号都写在 <html> 属性上，共用一个 observer 监听
    this.rootAttrObserver = new MutationObserver(() => {
      this.detectTheme()
      this.detectFontScale()
    })
    this.rootAttrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-font-size']
    })
    loadChartComponent().then(c => { this.chartComponent = c })
  },
  beforeDestroy () {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null }
    if (this.rootAttrObserver) { this.rootAttrObserver.disconnect(); this.rootAttrObserver = null }
    if (this.themeChangeHandler) window.removeEventListener(THEME_CHANGE_EVENT, this.themeChangeHandler)
  },
  methods: {
    detectTheme () {
      this.isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    },
    detectFontScale () {
      this.fontScale = getFontScale()
    },
    /** 图表字号：按当前字体档位缩放，读 this.fontScale 以便 option 重算 */
    chartFont (basePx) {
      return Math.round(basePx * this.fontScale)
    },
    async loadDashboard (options = {}) {
      const { silent = false, loadingTarget = 'page', successMessage = '' } = options
      if (loadingTarget === 'table') {
        this.tableLoading = true
      } else if (!silent) {
        this.loading = true
      }
      try {
        const response = await fetchDashboard(this.buildDashboardParams())
        this.applyDashboardData(this.unwrapDashboardPayload(response))
        if (successMessage) this.$uiToast.success(successMessage)
      } catch (error) {
        this.$uiToast.error(this.$t('dashboard.toast.load_failed'))
      } finally {
        this.loading = false
        this.tableLoading = false
      }
    },
    applyDashboardData (payload) {
      const defaults = createDefaultState()
      this.stats = { ...defaults.stats, ...(payload.stats || {}) }
      this.alertTypes = { ...defaults.alertTypes, ...(payload.alertTypes || {}) }
      this.deviceStatusData = { ...defaults.deviceStatusData, ...(payload.deviceStatusData || {}) }
      this.onlineRateData = this.normalizeArray(payload.onlineRateData, 7)
      this.onlineRateTrend = Array.isArray(payload.onlineRateTrend) ? payload.onlineRateTrend : []
      this.podDurationData = { ...defaults.podDurationData, ...(payload.podDurationData || {}) }
      this.podDurationPercent = { ...defaults.podDurationPercent, ...(payload.podDurationPercent || {}) }
      this.podAvgDuration = Number(payload.podAvgDuration || 0)
      this.podLongestDuration = Number(payload.podLongestDuration || 0)
      this.fileDownloadData = Array.isArray(payload.fileDownloadData) && payload.fileDownloadData.length ? payload.fileDownloadData : defaults.fileDownloadData
      this.fileDownloadLabels = Array.isArray(payload.fileDownloadLabels) ? payload.fileDownloadLabels : []
      this.alertWaveData = this.normalizeArray(payload.alertWaveData, 7)
      this.alertTrend = Array.isArray(payload.alertTrend) ? payload.alertTrend : defaults.alertTrend
      this.podUsageTrend = Array.isArray(payload.podUsageTrend) ? payload.podUsageTrend : defaults.podUsageTrend
      this.tableData = Array.isArray(payload.tableData) ? payload.tableData.map(item => ({ ...item, date: item.date_label || item.date || '' })) : []
    },
    unwrapDashboardPayload (response) {
      return (response && (response.data || response.result || response.dashboard)) || response || {}
    },
    normalizeArray (data, length) {
      const normalized = Array.isArray(data) ? data.slice(0, length) : []
      while (normalized.length < length) normalized.push(0)
      return normalized
    },
    buildDashboardParams () {
      const [start, end] = this.dateRange || []
      const params = {}
      if (start instanceof Date) params.start_date = this.formatDate(start)
      if (end instanceof Date) params.end_date = this.formatDate(end)
      return params
    },
    formatDate (value) {
      const y = value.getFullYear()
      const m = String(value.getMonth() + 1).padStart(2, '0')
      const d = String(value.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    },
    getAverage (data) {
      if (!Array.isArray(data) || !data.length) return 0
      return Math.round(data.reduce((s, v) => s + Number(v || 0), 0) / data.length)
    },
    getWeekdayLabel (index) {
      const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      return keys[index] ? this.$t(`dashboard.weekday.${keys[index]}`) : ''
    },
    refreshOnlineChart () {
      this.loadDashboard({ successMessage: this.$t('dashboard.toast.online_updated') })
    },
    refreshPodDuration () {
      this.loadDashboard({ successMessage: this.$t('dashboard.toast.duration_updated') })
    },
    refreshFileStats () {
      this.loadDashboard({ successMessage: this.$t('dashboard.toast.file_stats_updated') })
    },
    refreshAlerts () {
      this.loadDashboard({ successMessage: this.$t('dashboard.toast.alerts_updated') })
    },
    refreshTable () {
      this.loadDashboard({ loadingTarget: 'table', successMessage: this.$t('dashboard.toast.refreshed') })
    },
    startAutoRefresh () {
      this.refreshTimer = setInterval(() => { this.loadDashboard({ silent: true }) }, 60000)
    }
  }
}
</script>
