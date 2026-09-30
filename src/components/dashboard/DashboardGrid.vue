<template>
  <div class="dashboard-grid">
    <section
      v-for="module in modules"
      :key="module.id"
      class="dashboard-grid__item"
      :class="`dashboard-grid__item--${module.id}`"
      :style="itemStyle(module)"
    >
      <slot :module="module" />
    </section>
  </div>
</template>

<script>
export default {
  name: 'DashboardGrid',
  props: {
    modules: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    itemStyle (module) {
      const layout = module.layout || {}
      const columnSpan = Math.min(12, Math.max(1, Number(layout.w || 12)))
      const requestedStart = Math.min(12, Math.max(1, Number(layout.x || 0) + 1))
      return {
        '--dashboard-column-span': String(columnSpan),
        '--dashboard-column-start': String(Math.min(requestedStart, 13 - columnSpan)),
        '--dashboard-row-span': String(Math.min(12, Math.max(1, Number(layout.h || 1))))
      }
    }
  }
}
</script>
