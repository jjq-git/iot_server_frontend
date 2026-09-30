<template>
  <base-card
    class="dashboard-widget dashboard-widget--chart"
    :class="{ 'dashboard-widget--compact': compact }"
  >
    <template #header>
      <div class="dashboard-widget__header">
        <div>
          <h2 class="dashboard-widget__title">{{ title }}</h2>
          <span v-if="subtitle" class="dashboard-widget__subtitle">{{ subtitle }}</span>
        </div>
        <div class="dashboard-widget__actions">
          <div v-if="allowChartToggle" class="dashboard-widget__segments">
            <button type="button" :class="{ active: chartType === 'line' }" @click="$emit('type-change', 'line')">
              {{ $t('dashboard.chart.online_trend.line') }}
            </button>
            <button type="button" :class="{ active: chartType === 'area' }" @click="$emit('type-change', 'area')">
              {{ $t('dashboard.chart.online_trend.area') }}
            </button>
          </div>
          <base-icon-button :label="$t('common.refresh')" :loading="loading" @click="$emit('refresh')">
            <app-icon name="arrow-clockwise" />
          </base-icon-button>
        </div>
      </div>
    </template>

    <div v-if="error" class="dashboard-widget-state dashboard-widget-state--error">
      <app-icon name="exclamation-triangle"  />
      <strong>{{ $t('common.load_failed') }}</strong>
      <button type="button" @click="$emit('retry')">{{ $t('common.retry') }}</button>
    </div>
    <div v-else-if="loading && !chartOptionReady" class="dashboard-widget-state">
      <b-spinner small />
      <span>{{ $t('common.loading') }}</span>
    </div>
    <div v-else-if="empty || !chartOptionReady" class="dashboard-widget-state">
      <app-icon name="graph-up"  />
      <strong>{{ emptyText }}</strong>
    </div>
    <template v-else>
      <component
        :is="chartComponent"
        v-if="chartComponent"
        :option="option"
        :update-options="chartUpdateOptions"
        :autoresize="chartAutoresize"
        class="dashboard-widget__chart"
      />
      <div v-else class="dashboard-widget-state"><b-spinner small /><span>{{ $t('common.loading') }}</span></div>
      <div v-if="summary.length" class="dashboard-widget__summary">
        <div v-for="item in summary" :key="item.label" class="dashboard-widget__summary-item">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </template>
  </base-card>
</template>

<script>
import BaseCard from '@/components/base/BaseCard.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import { isChartOptionReady } from '@/utils/chart-options'

export default {
  name: 'ChartWidget',
  components: { BaseCard, BaseIconButton },
  data () {
    return {
      chartAutoresize: { throttle: 200 },
      chartUpdateOptions: { notMerge: true, lazyUpdate: true }
    }
  },
  computed: {
    chartOptionReady () {
      return isChartOptionReady(this.option)
    }
  },
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    chartComponent: { type: [Object, Function], default: null },
    option: { type: Object, default: () => ({}) },
    summary: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: '' },
    allowChartToggle: { type: Boolean, default: false },
    chartType: { type: String, default: 'line' },
    compact: { type: Boolean, default: false }
  }
}
</script>
