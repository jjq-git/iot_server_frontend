<template>
  <div role="group" :aria-label="accessibleName">
    <button
      type="button"
      class="web-ui-spinbox__step"
      :disabled="disabled"
      aria-label="−"
      @click="changeBy(-step)"
    >−</button>
    <input
      class="web-ui-spinbox__input"
      type="number"
      :min="minimum"
      :max="maximum"
      :step="step"
      :value="displayValue"
      :disabled="disabled"
      :aria-label="accessibleName"
      @change="setDisplayValue($event.target.value)"
    >
    <button
      type="button"
      class="web-ui-spinbox__step"
      :disabled="disabled"
      aria-label="+"
      @click="changeBy(step)"
    >+</button>
  </div>
</template>

<script>
export default {
  name: 'WebUiWidgetSpinbox',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetStates: { type: Object, required: true },
    interactive: { type: Boolean, default: false }
  },
  computed: {
    minimum () { return Number(this.widgetProps.min_value ?? -99999) },
    maximum () { return Number(this.widgetProps.max_value ?? 99999) },
    step () { return Math.max(1, Number(this.widgetProps.step ?? 1)) },
    decimalScale () { return 10 ** Math.max(0, Number(this.widgetProps.dec_point_pos ?? 0)) },
    value () { return Number(this.widgetProps.value ?? 0) },
    displayValue () { return this.value / this.decimalScale },
    disabled () { return !this.interactive || this.widgetStates.disabled },
    accessibleName () { return this.node.displayName || this.node.codeName || this.node.id }
  },
  methods: {
    changeBy (amount) {
      let next = this.value + amount
      if (this.widgetProps.rollover === true) {
        if (next > this.maximum) next = this.minimum
        if (next < this.minimum) next = this.maximum
      } else {
        next = Math.max(this.minimum, Math.min(this.maximum, next))
      }
      this.$emit('value-change', next)
    },
    setDisplayValue (value) {
      const next = Math.round(Number(value) * this.decimalScale)
      if (Number.isFinite(next)) this.$emit('value-change', Math.max(this.minimum, Math.min(this.maximum, next)))
    }
  }
}
</script>
