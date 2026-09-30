<template>
  <metric-card-widget v-if="module.module_key === 'stats_preview' || module.id === 'stats_preview'" :cards="payload.cards" />
  <table-widget
    v-else-if="module.widget_type === 'table' && module.supported"
    v-bind="payload"
    :loading="loading"
    :error="error"
    @refresh="$emit('refresh', module.id)"
    @retry="$emit('retry', module.id)"
  />
  <chart-widget
    v-else-if="chartTypes.includes(module.widget_type) && module.supported"
    v-bind="payload"
    :chart-component="chartComponent"
    :compact="Number(module.layout && module.layout.w) <= 4"
    :loading="loading"
    :error="error"
    @refresh="$emit('refresh', module.id)"
    @retry="$emit('retry', module.id)"
    @type-change="$emit('type-change', $event)"
  />
  <div v-else class="dashboard-widget-state dashboard-widget-state--unsupported">
    <app-icon name="exclamation-triangle"  />
    <strong>{{ $t('dashboard.dynamic.unsupported_title') }}</strong>
    <span>{{ module.id }}</span>
  </div>
</template>

<script>
import ChartWidget from './ChartWidget.vue'
import MetricCardWidget from './MetricCardWidget.vue'
import TableWidget from './TableWidget.vue'

export default {
  name: 'WidgetRenderer',
  components: { ChartWidget, MetricCardWidget, TableWidget },
  props: {
    module: { type: Object, required: true },
    payload: { type: Object, default: () => ({}) },
    chartComponent: { type: [Object, Function], default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  data () {
    return { chartTypes: ['line', 'area', 'bar', 'pie', 'gauge'] }
  }
}
</script>
