<template>
  <div role="progressbar" :aria-label="accessibleName">
    <span class="web-ui-spinner__track" :style="trackStyle" aria-hidden="true" />
  </div>
</template>

<script>
export default {
  name: 'WebUiWidgetSpinner',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetPartStyles: { type: Object, default: () => ({}) }
  },
  computed: {
    trackStyle () {
      const indicator = this.widgetPartStyles.indicator || {}
      return {
        animationDuration: `${Math.max(1, Number(this.widgetProps.anim_duration ?? 1000))}ms`,
        '--web-ui-spinner-angle': `${Math.max(1, Math.min(359, Number(this.widgetProps.angle ?? 90)))}deg`,
        ...(indicator.backgroundColor || indicator.color
          ? { color: indicator.backgroundColor || indicator.color }
          : {})
      }
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  }
}
</script>
