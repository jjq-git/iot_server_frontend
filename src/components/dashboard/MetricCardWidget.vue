<template>
  <div class="dashboard-metrics">
    <article v-for="card in cards" :key="card.key" class="dashboard-metric" :data-tone="card.tone">
      <div class="dashboard-metric__header">
        <div class="dashboard-metric__icon"><app-icon :name="card.icon" /></div>
        <span class="dashboard-metric__label">{{ card.label }}</span>
        <div v-if="card.chip" class="dashboard-metric__chip">{{ card.chip }}</div>
      </div>
      <div class="dashboard-metric__value-row">
        <strong class="dashboard-metric__value">{{ card.value }}</strong>
        <span v-if="card.unit" class="dashboard-metric__unit">{{ card.unit }}</span>
      </div>
      <div class="dashboard-metric__track"><span :style="{ width: card.progress + '%' }" /></div>
      <div class="dashboard-metric__sub">
        <span>{{ card.subLabel }}</span>
        <span>{{ card.subValue }}</span>
      </div>
    </article>
  </div>
</template>

<script>
export default {
  name: 'MetricCardWidget',
  props: {
    cards: {
      type: Array,
      default: () => []
    }
  }
}
</script>
