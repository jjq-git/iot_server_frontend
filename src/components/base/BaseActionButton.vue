<template>
  <button
    type="button"
    class="action-icon action-icon--text"
    :class="{ 'action-icon--disabled': disabled || loading }"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : null"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <b-spinner v-if="loading" small aria-hidden="true" />
    <slot />
  </button>
</template>

<script>
export default {
  name: 'BaseActionButton',
  inheritAttrs: false,
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    }
  }
}
</script>
