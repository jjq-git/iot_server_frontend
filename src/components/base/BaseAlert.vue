<template>
  <b-alert :show="show" :variant="variant" :dismissible="dismissible" v-bind="$attrs" v-on="$listeners">
    <slot />
  </b-alert>
</template>

<script>
export default {
  name: 'BaseAlert',
  inheritAttrs: false,
  props: {
    show: {
      type: [Boolean, Number],
      default: true
    },
    variant: {
      type: String,
      default: 'info'
    },
    dismissible: {
      type: Boolean,
      default: false
    }
  }
}
</script>
