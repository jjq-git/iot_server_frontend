<template>
  <button
    type="button"
    role="switch"
    :aria-checked="String(checked)"
    :aria-label="accessibleName"
    :disabled="!interactive || widgetStates.disabled"
    :style="trackStyle"
    @click="handleClick"
  >
    <span class="web-ui-switch__thumb" :style="thumbStyle" aria-hidden="true" />
  </button>
</template>

<script>
export default {
  name: 'WebUiWidgetSwitch',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    interactive: { type: Boolean, default: false },
    widgetStates: { type: Object, required: true },
    widgetPartStyles: { type: Object, default: () => ({}) }
  },
  computed: {
    checked () {
      return this.widgetStates.checked === true
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    },
    trackStyle () {
      return this.checked ? (this.widgetPartStyles.indicator || {}) : {}
    },
    thumbStyle () {
      return this.widgetPartStyles.knob || {}
    }
  },
  methods: {
    handleClick () {
      this.$emit('activate')
      this.$emit('value-change', !this.checked)
    }
  }
}
</script>
