<template>
  <div class="dashboard-page">
    <div v-if="configLoadFailed" class="dashboard-config-note">
      {{ $t('dashboard.dynamic.config_fallback') }}
    </div>

    <b-overlay :show="loading && !hasLoadedOnce" opacity="0.65">
      <div v-if="!dashboardModules.length" class="dashboard-config-note">
        {{ $t('company_dashboard_config.no_panels') }}
      </div>
      <dashboard-grid v-else :modules="dashboardModules">
        <template #default="{ module }">
          <widget-renderer
            :module="module"
            :payload="widgetPayloads[module.id] || {}"
            :chart-component="chartComponent"
            :loading="moduleLoading(module.id)"
            :error="moduleErrors[module.id] || ''"
            @refresh="refreshModule"
            @retry="retryModule"
            @type-change="onlineChartType = $event"
          />
        </template>
      </dashboard-grid>
    </b-overlay>
  </div>
</template>

<script>
import DashboardView from './Dashboard.vue'
import { fetchEffectiveDashboardConfig, queryDashboardChartData } from '@/api/dashboard'
import DashboardGrid from '@/components/dashboard/DashboardGrid.vue'
import WidgetRenderer from '@/components/dashboard/WidgetRenderer.vue'
import {
  createDefaultDashboardConfig,
  getDashboardRefreshInterval,
  resolveDashboardConfig
} from '@/services/dashboard/configResolver'
import { runCachedDashboardQuery } from '@/services/dashboard/queryCache'
import { normalizeChartAxisIndex } from '@/utils/chart-options'

const unavailableStatuses = [404, 405, 501]

export default {
  name: 'DashboardRuntime',
  extends: DashboardView,
  components: { DashboardGrid, WidgetRenderer },
  data () {
    return {
      effectiveDashboardConfig: createDefaultDashboardConfig(),
      configLoadFailed: false,
      batchQuerySupported: true,
      configuredResults: {},
      moduleErrors: {},
      loadingModules: [],
      hasLoadedOnce: false
    }
  },
  computed: {
    dashboardModules () {
      return this.effectiveDashboardConfig.modules || []
    },
    dashboardPageTitle () {
      return String(this.effectiveDashboardConfig.branding?.title || '').trim()
    },
    dashboardSubtitle () {
      const range = `${this.formatDate(this.startDate)} – ${this.formatDate(this.endDate)}`
      return this.$t('dashboard.dynamic.subtitle', { range })
    },
    widgetPayloads () {
      const base = {
        stats_preview: {
          cards: [
            {
              key: 'online',
              icon: 'diagram-3',
              value: this.stats.onlineDevices,
              unit: this.$t('dashboard.dynamic.pod_devices'),
              label: this.$t('dashboard.stat.online_devices'),
              subLabel: this.$t('dashboard.dynamic.online_rate_label'),
              subValue: `${this.stats.onlineRate}%`,
              progress: Number(this.stats.onlineRate || 0),
              chip: `${this.stats.onlineDevices}/${this.stats.totalDevices}`,
              tone: 'brand'
            },
            {
              key: 'pods',
              icon: 'soundproof-pod',
              value: this.stats.podTotal,
              unit: this.$t('dashboard.dynamic.pod_count'),
              label: this.$t('dashboard.stat.pod_total'),
              subLabel: this.$t('dashboard.dynamic.usage_rate_label'),
              subValue: `${this.stats.podUsageRate}%`,
              progress: Number(this.stats.podUsageRate || 0),
              chip: this.$t('dashboard.dynamic.in_use', { count: this.stats.podInUse || 0 }),
              tone: 'success'
            },
            {
              key: 'files',
              icon: 'folder2-open',
              value: this.stats.fileTotal,
              unit: this.$t('dashboard.dynamic.pod_files'),
              label: this.$t('dashboard.stat.file_total'),
              subLabel: this.$t('dashboard.dynamic.total_size_label'),
              subValue: this.stats.fileSize,
              progress: Math.min(100, Number(this.stats.fileTotal || 0) * 5),
              chip: this.stats.fileSize,
              tone: 'warning'
            },
            {
              key: 'alerts',
              icon: 'bell',
              value: this.stats.alertsToday,
              unit: this.$t('dashboard.dynamic.pod_alerts'),
              label: this.$t('dashboard.stat.alerts_today'),
              subLabel: this.$t('dashboard.dynamic.pending_label'),
              subValue: this.stats.alertsPending,
              progress: Math.min(100, Number(this.stats.alertsPending || 0) * 10),
              chip: this.$t(this.stats.alertsToday ? 'dashboard.dynamic.attention' : 'dashboard.dynamic.normal'),
              tone: 'danger'
            }
          ]
        },
        device_online_rate: {
          title: this.moduleTitle('device_online_rate', 'dashboard.chart.online_trend.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('device_online_rate', this.onlineRateChartOption),
          summary: [
            { label: this.$t('dashboard.chart.online_trend.avg'), value: `${this.getAverage(this.onlineRateData)}%` },
            { label: this.$t('dashboard.chart.online_trend.max'), value: `${this.maxOnlineRate}%` },
            { label: this.$t('dashboard.chart.online_trend.min'), value: `${this.minOnlineRate}%` }
          ],
          allowChartToggle: true,
          chartType: this.onlineChartType,
          empty: this.moduleIsEmpty('device_online_rate'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        device_status_distribution: {
          title: this.moduleTitle('device_status_distribution', 'dashboard.chart.device_status.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('device_status_distribution', this.deviceStatusOption),
          summary: [
            { label: this.$t('dashboard.chart.device_status.online'), value: this.deviceStatusData.online },
            { label: this.$t('dashboard.chart.device_status.offline'), value: this.deviceStatusData.offline },
            { label: this.$t('dashboard.chart.device_status.maintenance'), value: this.deviceStatusData.maintenance },
            { label: this.$t('dashboard.chart.device_status.inactive'), value: this.deviceStatusData.inactive }
          ],
          empty: this.moduleIsEmpty('device_status_distribution'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        pod_usage_distribution: {
          title: this.moduleTitle('pod_usage_distribution', 'dashboard.chart.pod_duration.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('pod_usage_distribution', this.podDurationOption),
          summary: [
            { label: this.$t('dashboard.chart.pod_duration.total_uses'), value: this.podDurationData.total },
            { label: this.$t('dashboard.chart.pod_duration.avg'), value: `${this.podAvgDuration} h` },
            { label: this.$t('dashboard.chart.pod_duration.longest'), value: `${this.podLongestDuration} h` }
          ],
          empty: this.moduleIsEmpty('pod_usage_distribution'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        pod_usage_trend: {
          title: this.moduleTitle('pod_usage_trend', 'dashboard.chart.pod_usage_trend.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('pod_usage_trend', this.podUsageTrendOption),
          summary: [
            {
              label: this.$t('dashboard.chart.pod_usage_trend.total'),
              value: this.podUsageTrend.reduce((sum, item) => sum + Number(item.usage_count || 0), 0)
            },
            {
              label: this.$t('dashboard.chart.pod_usage_trend.daily_avg'),
              value: this.getAverage(this.podUsageTrend.map(item => item.usage_count))
            },
            {
              label: this.$t('dashboard.chart.pod_usage_trend.peak'),
              value: Math.max(0, ...this.podUsageTrend.map(item => Number(item.usage_count || 0)))
            }
          ],
          empty: this.moduleIsEmpty('pod_usage_trend'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        file_usage_stats: {
          title: this.moduleTitle('file_usage_stats', 'dashboard.chart.file_stats.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('file_usage_stats', this.fileStatsOption),
          summary: [
            { label: this.$t('dashboard.chart.file_stats.downloads'), value: this.stats.fileDownloads },
            { label: this.$t('dashboard.chart.file_stats.plays'), value: this.stats.filePlays },
            { label: this.$t('dashboard.chart.file_stats.new_files'), value: this.stats.fileNew }
          ],
          empty: this.moduleIsEmpty('file_usage_stats'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        alert_stats: {
          title: this.moduleTitle('alert_stats', 'dashboard.chart.alerts.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('alert_stats', this.alertsChartOption),
          summary: [
            { label: this.$t('dashboard.stat.alerts_today'), value: this.stats.alertsToday },
            { label: this.$t('dashboard.chart.alerts.week'), value: this.stats.alertsWeek },
            { label: this.$t('dashboard.chart.alerts.pending'), value: this.stats.alertsPending }
          ],
          empty: this.moduleIsEmpty('alert_stats'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        alert_trend: {
          title: this.moduleTitle('alert_trend', 'dashboard.chart.alert_trend.title'),
          subtitle: this.dashboardSubtitle,
          option: this.optionWithConfiguredData('alert_trend', this.alertTrendOption),
          summary: [
            { label: this.$t('dashboard.stat.alerts_today'), value: this.stats.alertsToday },
            { label: this.$t('dashboard.chart.alerts.week'), value: this.stats.alertsWeek },
            {
              label: this.$t('dashboard.chart.alert_trend.peak'),
              value: Math.max(0, ...this.alertTrend.map(item => Number(item.count || 0)))
            }
          ],
          empty: this.moduleIsEmpty('alert_trend'),
          emptyText: this.$t('dashboard.dynamic.empty')
        },
        detailed_stats: {
          title: this.moduleTitle('detailed_stats', 'dashboard.detail_table.title'),
          subtitle: this.dashboardSubtitle,
          items: this.tableData,
          fields: this.tableFields
        }
      }
      return this.dashboardModules.reduce((payloads, module) => {
        const moduleKey = module.module_key || module.id
        const fallback = base[moduleKey] || {
          title: this.moduleDisplayTitle(module),
          subtitle: this.dashboardSubtitle,
          emptyText: this.$t('dashboard.dynamic.empty')
        }
        payloads[module.id] = this.payloadFromResult(module, this.configuredResults[module.id], fallback)
        return payloads
      }, {})
    }
  },
  created () {
    this.$eventBus.$on('dashboard-range-change', this.handleDashboardRangeChange)
    this.loadDashboardConfiguration()
  },
  beforeDestroy () {
    this.$eventBus.$off('dashboard-range-change', this.handleDashboardRangeChange)
    this.$eventBus.$emit('page-title-updated', '')
  },
  mounted () {
    this.publishPageSubtitle()
  },
  watch: {
    dashboardSubtitle () {
      this.publishPageSubtitle()
    },
    dashboardPageTitle () {
      this.publishPageTitle()
    }
  },
  methods: {
    publishPageSubtitle () {
      this.$eventBus.$emit('page-subtitle-updated', this.dashboardSubtitle)
      this.$eventBus.$emit('dashboard-range-updated', { start: this.startDate, end: this.endDate })
    },
    publishPageTitle () {
      this.$eventBus.$emit('page-title-updated', this.dashboardPageTitle)
    },
    handleDashboardRangeChange ({ start, end }) {
      this.startDate = start
      this.endDate = end
      this.refreshDashboard()
    },
    async loadDashboardConfiguration () {
      try {
        const response = await fetchEffectiveDashboardConfig()
        this.effectiveDashboardConfig = resolveDashboardConfig(response)
        this.publishPageTitle()
      } catch (error) {
        this.configLoadFailed = true
        this.effectiveDashboardConfig = createDefaultDashboardConfig()
      } finally {
        this.restartAutoRefresh()
        this.loadConfiguredChartData()
      }
    },
    moduleTitle (moduleId, fallbackKey) {
      const module = this.dashboardModules.find(item => item.id === moduleId || item.module_key === moduleId)
      return module?.display?.title || module?.name || this.$t(fallbackKey)
    },
    moduleDisplayTitle (module) {
      const explicitTitle = String(module?.display?.title || module?.name || '').trim()
      if (explicitTitle) return explicitTitle

      const moduleKey = String(module?.module_key || module?.id || '').trim()
      const translationKey = `company_dashboard_config.panel_names.${moduleKey}`
      return this.$te(translationKey) ? this.$t(translationKey) : moduleKey
    },
    moduleLoading (moduleId) {
      return this.loadingModules.includes(moduleId) || (this.loading && !this.hasLoadedOnce)
    },
    startAutoRefresh () {
      this.restartAutoRefresh()
    },
    restartAutoRefresh () {
      if (this.refreshTimer) clearInterval(this.refreshTimer)
      const seconds = getDashboardRefreshInterval(this.dashboardModules)
      this.refreshTimer = setInterval(() => {
        this.loadDashboard({ silent: true })
        this.loadConfiguredChartData()
      }, seconds * 1000)
    },
    async refreshDashboard () {
      await this.loadDashboard({ successMessage: this.$t('dashboard.toast.refreshed') })
      this.hasLoadedOnce = true
      await this.loadConfiguredChartData(null, true)
    },
    async refreshModule (moduleId) {
      const refreshers = {
        device_online_rate: this.refreshOnlineChart,
        device_status_distribution: this.loadDashboard,
        pod_usage_distribution: this.refreshPodDuration,
        pod_usage_trend: this.loadDashboard,
        file_usage_stats: this.refreshFileStats,
        alert_stats: this.refreshAlerts,
        alert_trend: this.loadDashboard,
        detailed_stats: this.refreshTable
      }
      const refresh = refreshers[moduleId]
      if (refresh) await refresh.call(this)
      else await this.loadDashboard({ silent: true })
      this.hasLoadedOnce = true
      await this.loadConfiguredChartData([moduleId], true)
    },
    retryModule (moduleId) {
      this.$delete(this.moduleErrors, moduleId)
      this.refreshModule(moduleId)
    },
    buildConfiguredQueries (moduleIds) {
      const selected = moduleIds?.length
        ? this.dashboardModules.filter(module => moduleIds.includes(module.id))
        : this.dashboardModules
      const start = this.startDate instanceof Date ? this.startDate.toISOString() : null
      const end = this.endDate instanceof Date ? this.endDate.toISOString() : null
      return selected
        .filter(module => module.supported)
        .map(module => ({
          request_id: module.id,
          panel_id: module.id,
          module_key: module.module_key || module.id,
          interval: module.query.interval,
          start_time: start,
          end_time: end,
          timezone: this.effectiveDashboardConfig.timezone || 'Asia/Shanghai',
          resource_uuids: module.query.resource_uuids || []
        }))
    },
    async loadConfiguredChartData (moduleIds = null, force = false) {
      if (this.configLoadFailed || !this.batchQuerySupported) return
      const queries = this.buildConfiguredQueries(moduleIds)
      if (!queries.length) return
      const ids = queries.map(query => query.request_id)
      this.loadingModules = Array.from(new Set([...this.loadingModules, ...ids]))
      try {
        const response = await runCachedDashboardQuery(
          { queries },
          queryDashboardChartData,
          { ttl: force ? 1 : 30000 }
        )
        const items = response?.items || response?.data?.items || []
        items.forEach(item => {
          if (item.error || item.status === 'error') {
            this.$set(this.moduleErrors, item.request_id, this.$getErrorMessage(item.error) || item.message || this.$t('dashboard.toast.load_failed'))
            return
          }
          this.$set(this.configuredResults, item.request_id, item)
          this.$delete(this.moduleErrors, item.request_id)
        })
      } catch (error) {
        if (unavailableStatuses.includes(error?.response?.status)) {
          this.batchQuerySupported = false
          return
        }
        ids.forEach(id => this.$set(this.moduleErrors, id, this.$getErrorMessage(error) || this.$t('dashboard.toast.load_failed')))
      } finally {
        this.loadingModules = this.loadingModules.filter(id => !ids.includes(id))
      }
    },
    optionWithConfiguredData (moduleId, fallbackOption) {
      const result = this.configuredResults[moduleId]
      const points = result?.series?.[0]?.points
      if (!Array.isArray(points) || !points.length || !fallbackOption?.series?.length) return fallbackOption

      const labels = points.map(point => point.label || point.name || point.timestamp || point.time || point.x || '')
      const values = points.map(point => Number(point.value ?? point.y ?? 0))
      return {
        ...fallbackOption,
        xAxis: fallbackOption.xAxis ? { ...fallbackOption.xAxis, data: labels } : fallbackOption.xAxis,
        series: fallbackOption.series.map((series, index) => {
          if (index !== 0) return series
          const data = series.type === 'pie'
            ? points.map((point, pointIndex) => ({
              name: this.configuredPointName(moduleId, point, labels[pointIndex]),
              value: values[pointIndex]
            }))
            : values
          return { ...series, data }
        })
      }
    },
    payloadFromResult (module, result, fallback) {
      const resultSeries = Array.isArray(result?.series) ? result.series : []
      const points = resultSeries[0]?.points || []
      if (!result || !Array.isArray(points)) return fallback
      const moduleKey = module.module_key || module.id
      if (moduleKey === 'stats_preview') return fallback
      if (module.widget_type === 'table') {
        return {
          ...fallback,
          title: module.name || fallback.title,
          items: points.map(point => point.data || point),
          fields: this.tableFields
        }
      }
      const labels = points.map(point => point.label || point.name || point.timestamp || '')
      const values = points.map(point => Number(point.value ?? 0))
      const chartType = module.widget_type === 'area' ? 'line' : module.widget_type
      return {
        ...fallback,
        title: module.name || fallback.title,
        option: this.configuredChartOption(module, resultSeries, points, labels, values, chartType, fallback.option || {}),
        summary: this.configuredSummary(module, resultSeries, points, values, fallback, chartType),
        empty: !resultSeries.some(series => Array.isArray(series.points) && series.points.length) ||
          (result.result_shape === 'category' && !values.some(value => value > 0))
      }
    },
    configuredChartOption (module, resultSeries, points, labels, values, chartType, fallbackOption) {
      if (chartType === 'gauge') return this.configuredGaugeOption(module, values)
      if (chartType === 'pie') return this.configuredPieOption(module, points, labels, values)
      return this.configuredCartesianOption(module, resultSeries, chartType, fallbackOption)
    },
    configuredGaugeOption (module, values) {
      const rawValue = Number(values[0] || 0)
      const decimalPlaces = Number(module.display?.decimal_places ?? 0)
      const value = Number(rawValue.toFixed(decimalPlaces))
      const unit = module.display?.unit || '%'
      const color = this.moduleSeriesColor(module.module_key || module.id)
      return {
        tooltip: this.configuredTooltip('item'),
        series: [{
          type: 'gauge',
          min: 0,
          max: 100,
          startAngle: 90,
          endAngle: -270,
          radius: '72%',
          center: ['50%', '50%'],
          pointer: { show: false },
          progress: {
            show: true,
            roundCap: true,
            width: 14,
            itemStyle: { color }
          },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [[1, this.chartBorderColor]]
            }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: { show: false },
          detail: {
            offsetCenter: [0, 0],
            color: this.chartTextColorStrong,
            fontSize: this.chartFont(34),
            fontWeight: 700,
            formatter: `{value}${unit}`
          },
          data: [{ value }]
        }]
      }
    },
    configuredPieOption (module, points, labels, values) {
      const moduleKey = module.module_key || module.id
      const data = points.map((point, index) => ({
        name: this.configuredPointName(moduleKey, point, labels[index]),
        value: values[index]
      }))
      const total = values.reduce((sum, value) => sum + value, 0)
      return {
        tooltip: this.configuredTooltip('item'),
        legend: {
          show: module.display?.legend !== false,
          bottom: 0,
          left: 'center',
          itemWidth: 9,
          itemHeight: 9,
          icon: 'circle',
          textStyle: { color: this.chartTextColor, fontSize: this.chartFont(12) }
        },
        graphic: [{
          type: 'text',
          left: 'center',
          top: '38%',
          silent: true,
          style: {
            text: String(total),
            fill: this.chartTextColorStrong,
            fontSize: this.chartFont(28),
            fontWeight: 700,
            textAlign: 'center'
          }
        }],
        series: [{
          type: 'pie',
          radius: ['52%', '72%'],
          center: ['50%', '43%'],
          minAngle: 4,
          stillShowZeroSum: false,
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: {
            borderRadius: 4,
            borderColor: this.chartTheme.surface,
            borderWidth: 3
          },
          emphasis: { scaleSize: 5 },
          data,
          color: this.moduleSeriesPalette(moduleKey)
        }]
      }
    },
    configuredCartesianOption (module, resultSeries, chartType, fallbackOption) {
      const moduleKey = module.module_key || module.id
      const isBar = chartType === 'bar'
      const baseSeries = Array.isArray(fallbackOption.series) ? fallbackOption.series : []
      const primarySeries = baseSeries[0] || {}
      const xAxis = Array.isArray(fallbackOption.xAxis) ? fallbackOption.xAxis[0] || {} : fallbackOption.xAxis || {}
      const labels = []
      resultSeries.forEach(source => {
        const sourcePoints = source.points || []
        sourcePoints.forEach(point => {
          const label = point.label || point.name || point.timestamp || ''
          if (!labels.includes(label)) labels.push(label)
        })
      })
      const styleYAxis = axis => ({
        ...axis,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: this.chartTextColor,
          fontSize: this.chartFont(12),
          ...(axis?.axisLabel || {})
        },
        splitLine: { show: true, lineStyle: { color: this.chartBorderColor, type: 'solid' } }
      })
      const preservedBaseSeries = resultSeries.length === 1 && baseSeries.length > 1 && moduleKey === 'pod_usage_trend'
        ? baseSeries.slice(1)
        : []
      const axisIndexes = [
        ...resultSeries.map(source => normalizeChartAxisIndex(source.y_axis)),
        ...preservedBaseSeries.map(source => normalizeChartAxisIndex(source.yAxisIndex))
      ]
      const maxAxisIndex = Math.max(0, ...axisIndexes)
      const fallbackYAxis = fallbackOption.yAxis || { type: 'value' }
      const fallbackAxes = Array.isArray(fallbackYAxis) ? fallbackYAxis : [fallbackYAxis]
      const yAxis = Array.from({ length: maxAxisIndex + 1 }, (_, index) => styleYAxis({
        ...(fallbackAxes[index] || fallbackAxes[0] || { type: 'value' }),
        name: resultSeries.find(source => normalizeChartAxisIndex(source.y_axis) === index)?.unit || '',
        position: index === 0 ? 'left' : 'right',
        nameTextStyle: { color: this.chartTextColor, fontSize: this.chartFont(11) }
      }))
      const palette = this.moduleSeriesPalette(moduleKey)
      const series = resultSeries.map((source, index) => {
        const color = palette[index % palette.length]
        const pointValues = new Map((source.points || []).map(point => [point.label || point.name || point.timestamp || '', Number(point.value ?? 0)]))
        const values = labels.map(label => pointValues.has(label) ? pointValues.get(label) : null)
        return {
          ...(index === 0 ? primarySeries : {}),
          name: this.configuredSeriesName(source.name),
          type: isBar ? 'bar' : 'line',
          yAxisIndex: normalizeChartAxisIndex(source.y_axis),
          data: values,
          connectNulls: false,
          smooth: false,
          showSymbol: !isBar && values.length <= 14,
          symbol: 'circle',
          symbolSize: 6,
          barMaxWidth: 30,
          lineStyle: isBar ? undefined : { ...(index === 0 ? primarySeries.lineStyle || {} : {}), width: 2.5, color },
          itemStyle: {
            ...(index === 0 ? primarySeries.itemStyle || {} : {}),
            color,
            borderRadius: isBar ? [4, 4, 0, 0] : undefined
          },
          areaStyle: module.widget_type === 'area' || (index === 0 && primarySeries.areaStyle)
            ? (primarySeries.areaStyle || { color: this.themePalette.background })
            : undefined
        }
      })
      if (preservedBaseSeries.length) {
        series.push(...preservedBaseSeries.map(source => ({
          ...source,
          yAxisIndex: normalizeChartAxisIndex(source.yAxisIndex)
        })))
      }
      return {
        ...fallbackOption,
        tooltip: this.configuredTooltip('axis'),
        legend: {
          ...(fallbackOption.legend || {}),
          show: series.length > 1 && module.display?.legend !== false,
          textStyle: { color: this.chartTextColor, fontSize: this.chartFont(12) }
        },
        grid: { left: 44, right: 24, top: series.length > 1 ? 44 : 20, bottom: 32, containLabel: false, ...(fallbackOption.grid || {}) },
        xAxis: {
          ...xAxis,
          type: 'category',
          data: labels,
          boundaryGap: isBar,
          axisLine: { lineStyle: { color: this.chartBorderColor } },
          axisTick: { show: false },
          axisLabel: { color: this.chartTextColor, fontSize: this.chartFont(12) }
        },
        yAxis: yAxis.length === 1 ? yAxis[0] : yAxis,
        series
      }
    },
    configuredTooltip (trigger) {
      return {
        trigger,
        backgroundColor: this.chartTheme.tooltipBg,
        borderColor: this.chartTheme.tooltipBorder,
        textStyle: { color: this.chartTheme.tooltipText, fontSize: this.chartFont(13) }
      }
    },
    moduleSeriesColor (moduleKey) {
      if (moduleKey === 'alert_stats' || moduleKey === 'alert_trend') return this.chartTheme.error
      if (moduleKey === 'file_usage_stats') return this.chartTheme.info
      if (moduleKey === 'pod_occupancy_trend') return this.chartTheme.success
      if (moduleKey === 'pod_power_trend' || moduleKey === 'pod_light_trend') return this.chartTheme.warning
      if (moduleKey === 'pod_network_signal_trend' || moduleKey === 'pod_fan_trend') return this.chartTheme.info
      return this.themePalette.brand
    },
    moduleSeriesPalette (moduleKey) {
      if (moduleKey === 'device_status_distribution') {
        return [this.chartTheme.success, this.chartTheme.error, this.chartTheme.warning, this.chartTextColor]
      }
      if (moduleKey === 'alert_stats') {
        return [this.chartTheme.error, this.chartTheme.warning, this.chartTheme.info]
      }
      if (moduleKey === 'pod_environment_trend') {
        return [this.chartTheme.warning, this.chartTheme.info]
      }
      if (moduleKey === 'pod_fan_trend') {
        return [this.themePalette.brand, this.chartTheme.info, this.chartTheme.success]
      }
      if (moduleKey === 'pod_power_trend' || moduleKey === 'pod_light_trend') {
        return [this.chartTheme.warning, this.themePalette.brand, this.chartTheme.info]
      }
      return [this.themePalette.brand, this.chartTheme.success, this.chartTheme.warning, this.chartTheme.info]
    },
    configuredSummary (module, resultSeries, points, values, fallback, chartType) {
      if (module.display?.show_summary === false) return []
      const moduleKey = module.module_key || module.id
      if (chartType === 'gauge') return []
      if (moduleKey.startsWith('pod_') && moduleKey.endsWith('_trend') && moduleKey !== 'pod_usage_trend') {
        return resultSeries.slice(0, 4).map(series => {
          const seriesPoints = series.points || []
          const current = Number(seriesPoints[seriesPoints.length - 1]?.value ?? 0)
          const decimals = Number(module.display?.decimal_places ?? 1)
          return {
            label: this.configuredSeriesName(series.name),
            value: `${current.toFixed(decimals)}${series.unit || module.display?.unit || ''}`
          }
        })
      }
      if (moduleKey === 'device_status_distribution') {
        return points.map((point, index) => ({
          label: this.configuredPointName(moduleKey, point, point.label || point.name || ''),
          value: values[index]
        }))
      }
      if (moduleKey === 'alert_stats') {
        return points.map((point, index) => ({
          label: this.configuredCategoryName(moduleKey, point.label || point.name || ''),
          value: values[index]
        }))
      }
      if (moduleKey === 'device_online_rate' && values.length) {
        return [
          { label: this.$t('dashboard.chart.online_trend.avg'), value: `${this.getAverage(values)}%` },
          { label: this.$t('dashboard.chart.online_trend.max'), value: `${Math.max(...values)}%` },
          { label: this.$t('dashboard.chart.online_trend.min'), value: `${Math.min(...values)}%` }
        ]
      }
      if (moduleKey === 'pod_usage_distribution') {
        return [{ label: this.$t('dashboard.chart.pod_duration.total_uses'), value: values.reduce((sum, value) => sum + value, 0) }]
      }
      if (moduleKey === 'pod_usage_trend' && values.length) {
        return [
          { label: this.$t('dashboard.chart.pod_usage_trend.total'), value: values.reduce((sum, value) => sum + value, 0) },
          { label: this.$t('dashboard.chart.pod_usage_trend.daily_avg'), value: this.getAverage(values) },
          { label: this.$t('dashboard.chart.pod_usage_trend.peak'), value: Math.max(...values) }
        ]
      }
      if (moduleKey === 'file_usage_stats') {
        return [{ label: this.$t('dashboard.chart.file_stats.downloads'), value: values.reduce((sum, value) => sum + value, 0) }]
      }
      if (moduleKey === 'alert_trend' && values.length) {
        return [
          { label: this.$t('dashboard.stat.alerts_today'), value: values[values.length - 1] },
          { label: this.$t('dashboard.chart.alerts.week'), value: values.reduce((sum, value) => sum + value, 0) },
          { label: this.$t('dashboard.chart.alert_trend.peak'), value: Math.max(...values) }
        ]
      }
      if (Array.isArray(fallback?.summary) && fallback.summary.length) return fallback.summary
      return [{
        label: this.$t('dashboard.dynamic.current_value'),
        value: `${values[values.length - 1] || 0}${module.display?.unit || (chartType === 'gauge' ? '%' : '')}`
      }]
    },
    configuredSeriesName (name) {
      const key = String(name || '').trim().toLowerCase()
      const translationKey = {
        temperature: 'dashboard.dynamic.series.temperature',
        humidity: 'dashboard.dynamic.series.humidity',
        noise: 'dashboard.dynamic.series.noise',
        occupancy: 'dashboard.dynamic.series.occupancy',
        estimated_power: 'dashboard.dynamic.series.estimated_power',
        fan_request: 'dashboard.dynamic.series.fan_request',
        fan_actual: 'dashboard.dynamic.series.fan_actual',
        fan_rpm: 'dashboard.dynamic.series.fan_rpm',
        light_level: 'dashboard.dynamic.series.light_level',
        wifi_rssi: 'dashboard.dynamic.series.wifi_rssi',
        desk_height: 'dashboard.dynamic.series.desk_height'
      }[key]
      return translationKey ? this.$t(translationKey) : name
    },
    configuredPointName (moduleId, point, fallback) {
      const name = String(point.label || point.name || fallback || '')
      const statusKey = name.trim().toLowerCase()
      if (moduleId === 'device_status_distribution') {
        const translationKeys = {
          online: 'dashboard.chart.device_status.online',
          offline: 'dashboard.chart.device_status.offline',
          maintenance: 'dashboard.chart.device_status.maintenance',
          inactive: 'dashboard.chart.device_status.inactive'
        }
        return translationKeys[statusKey] ? this.$t(translationKeys[statusKey]) : name
      }
      if (moduleId === 'alert_stats') {
        const translationKeys = {
          offline: 'dashboard.chart.alerts.type_offline',
          communication: 'dashboard.chart.alerts.type_communication',
          other: 'dashboard.chart.alerts.type_other'
        }
        return translationKeys[statusKey] ? this.$t(translationKeys[statusKey], { n: point.value ?? 0 }) : name
      }
      if (moduleId === 'pod_usage_distribution') {
        return ({ '0-1h': '0–1 h', '1-2h': '1–2 h', '2-4h': '2–4 h', '4h+': '4+ h' })[statusKey] || name
      }
      return name
    },
    configuredCategoryName (moduleId, name) {
      if (moduleId !== 'alert_stats') return name
      const translationKeys = {
        offline: 'dashboard.chart.alerts.type_offline',
        communication: 'dashboard.chart.alerts.type_communication',
        other: 'dashboard.chart.alerts.type_other'
      }
      const key = translationKeys[String(name).trim().toLowerCase()]
      return key ? String(this.$t(key, { n: '' })).replace(/\s*[:：]\s*$/, '').trim() : name
    },
    moduleIsEmpty (moduleId) {
      const result = this.configuredResults[moduleId]
      if (!result) return false
      const series = result.series || result.data?.series || []
      const points = series.flatMap(item => item.points || item.data || [])
      if (!points.length) return true
      if (result.result_shape === 'category') {
        return !points.some(point => Number(point.value ?? point.y ?? 0) > 0)
      }
      return false
    }
  }
}
</script>
