<template>
  <div
    role="progressbar"
    :aria-label="accessibleName"
    :aria-valuemin="minimum"
    :aria-valuemax="maximum"
    :aria-valuenow="value"
  >
    <span class="web-ui-bar__indicator" :style="indicatorStyle" aria-hidden="true" />
  </div>
</template>

<script>
import lvglPreviewGeometry from '@/services/webUi/lvglPreviewGeometry'

export default {
  name: 'WebUiWidgetBar',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetPartStyles: { type: Object, default: () => ({}) }
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
    indicatorStyle () {
      const vertical = this.widgetProps.orientation === 'vertical' || (
        this.widgetProps.orientation !== 'horizontal' && Number(this.widgetProps.height) > Number(this.widgetProps.width)
      )
      return {
        ...this.widgetPartStyles.indicator,
        ...(vertical ? { height: `${this.percent}%` } : { width: `${this.percent}%` })
      }
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  }
}
</script>
