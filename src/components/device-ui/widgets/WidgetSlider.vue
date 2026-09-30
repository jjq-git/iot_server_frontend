<template>
  <input
    type="range"
    :aria-label="accessibleName"
    :min="minimum"
    :max="maximum"
    :value="value"
    :disabled="!interactive || widgetStates.disabled"
    :style="sliderStyle"
    @input="$emit('value-change', Number($event.target.value))"
  >
</template>

<script>
import lvglPreviewGeometry from '@/services/webUi/lvglPreviewGeometry'

export default {
  name: 'WebUiWidgetSlider',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetStates: { type: Object, required: true },
    widgetPartStyles: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false }
  },
  computed: {
    minimum () {
      return Number(this.widgetProps.min_value ?? 0)
    },
    maximum () {
      return Number(this.widgetProps.max_value ?? 100)
    },
    value () {
      return Number(this.widgetProps.value ?? this.minimum)
    },
    percent () {
      return lvglPreviewGeometry.rangePercent(this.widgetProps)
    },
    sliderStyle () {
      const indicator = this.widgetPartStyles.indicator || {}
      const knob = this.widgetPartStyles.knob || {}
      return {
        '--web-ui-slider-progress': `${this.percent}%`,
        ...(indicator.backgroundColor ? { '--web-ui-widget-indicator': indicator.backgroundColor } : {}),
        ...(knob.backgroundColor ? { '--web-ui-widget-knob': knob.backgroundColor } : {})
      }
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  }
}
</script>
