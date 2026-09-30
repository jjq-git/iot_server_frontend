<template>
  <button
    type="button"
    :disabled="!interactive || widgetStates.disabled"
    :aria-label="accessibleName"
    @click="$emit('activate')"
  >
    <slot />
  </button>
</template>

<script>
export default {
  name: 'WebUiWidgetButton',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    interactive: { type: Boolean, default: false },
    widgetStates: { type: Object, required: true },
    hasChildren: { type: Boolean, default: false }
  },
  computed: {
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  }
}
</script>
