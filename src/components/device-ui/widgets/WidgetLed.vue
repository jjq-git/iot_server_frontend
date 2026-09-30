<template>
  <div role="img" :aria-label="accessibleName">
    <span class="web-ui-led__light" :style="lightStyle" aria-hidden="true" />
  </div>
</template>

<script>
export default {
  name: 'WebUiWidgetLed',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true }
  },
  computed: {
    lightStyle () {
      const brightness = Math.max(0, Math.min(255, Number(this.widgetProps.brightness ?? 255))) / 255
      return {
        color: this.widgetProps.color || 'var(--color-lvgl-preview-primary)',
        opacity: String(0.22 + brightness * 0.78)
      }
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  }
}
</script>
