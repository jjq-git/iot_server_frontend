<template>
  <b-badge
    :variant="variant"
    :pill="pill"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
  </b-badge>
</template>

<script>
export default {
  name: 'BaseBadge',
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'secondary'
    },
    pill: {
      type: Boolean,
      default: false
    }
  }
}
</script>
