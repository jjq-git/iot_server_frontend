<template>
  <div
    role="progressbar"
    :aria-label="accessibleName"
    :aria-valuemin="minimum"
    :aria-valuemax="maximum"
    :aria-valuenow="value"
    :tabindex="interactive ? 0 : -1"
    @click="interactive && $emit('activate')"
    @pointerdown="startPointerChange"
    @pointermove="movePointerChange"
    @pointerup="finishPointerChange"
    @pointercancel="finishPointerChange"
    @keydown.enter.prevent="interactive && $emit('activate')"
    @keydown.space.prevent="interactive && $emit('activate')"
  >
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path class="web-ui-arc__track" :style="trackStyle" :d="geometry.background" :stroke-width="geometry.trackWidth" />
      <path class="web-ui-arc__indicator" :style="indicatorStyle" :d="geometry.indicator" :stroke-width="geometry.indicatorWidth" />
      <circle class="web-ui-arc__knob" :style="knobStyle" :cx="geometry.knob[0]" :cy="geometry.knob[1]" :r="geometry.knobRadius" />
    </svg>
  </div>
</template>

<script>
import lvglPreviewGeometry from '@/services/webUi/lvglPreviewGeometry'

export default {
  name: 'WebUiWidgetArc',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetStyles: { type: Object, default: () => ({}) },
    widgetPartStyles: { type: Object, default: () => ({}) },
    widgetPartStyleProps: { type: Object, default: () => ({}) },
    displayDpi: { type: Number, default: 160 },
    interactive: { type: Boolean, default: false }
  },
  data () {
    return { pointerActive: false }
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
    geometry () {
      return lvglPreviewGeometry.arcGeometry(this.widgetProps, this.widgetPartStyleProps, this.displayDpi)
    },
    trackStyle () {
      return this.arcPartStyle('main')
    },
    indicatorStyle () {
      return this.arcPartStyle('indicator')
    },
    knobStyle () {
      const style = this.widgetPartStyles.knob || {}
      const props = this.widgetPartStyleProps.knob || {}
      return {
        color: style.backgroundColor || style.color,
        opacity: props.bg_opa === undefined ? style.opacity : Math.max(0, Math.min(1, Number(props.bg_opa) / 255))
      }
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  },
  methods: {
    arcPartStyle (part) {
      const style = this.widgetPartStyles[part] || {}
      const props = this.widgetPartStyleProps[part] || {}
      return {
        color: style.color,
        opacity: props.arc_opa === undefined ? undefined : Math.max(0, Math.min(1, Number(props.arc_opa) / 255)),
        strokeLinecap: props.arc_rounded === false ? 'butt' : 'round'
      }
    },
    startPointerChange (event) {
      if (!this.interactive) return
      this.pointerActive = true
      if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId)
      this.emitPointerValue(event)
    },
    movePointerChange (event) {
      if (this.pointerActive) this.emitPointerValue(event)
    },
    finishPointerChange (event) {
      if (!this.pointerActive) return
      this.emitPointerValue(event)
      this.pointerActive = false
    },
    emitPointerValue (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const angle = (Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI + 360) % 360
      const start = (Number(this.widgetProps.bg_start_angle ?? 135) + Number(this.widgetProps.rotation ?? 0) + 360) % 360
      const end = (Number(this.widgetProps.bg_end_angle ?? 45) + Number(this.widgetProps.rotation ?? 0) + 360) % 360
      const span = (end - start + 360) % 360 || 360
      let relative = (angle - start + 360) % 360
      if (relative > span) relative = relative - span < (360 - span) / 2 ? span : 0
      let ratio = relative / span
      if (this.widgetProps.mode === 'reverse') ratio = 1 - ratio
      const value = this.minimum + ratio * (this.maximum - this.minimum)
      this.$emit('value-change', Math.round(value))
    }
  }
}
</script>
