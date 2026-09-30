<template>
  <b-form-checkbox-group
    :value="value"
    :options="options"
    :disabled="disabled"
    :stacked="stacked"
    v-bind="$attrs"
    v-on="forwardedListeners"
    @input="$emit('input', $event)"
  />
</template>

<script>
export default {
  name: 'BaseCheckboxGroup',
  inheritAttrs: false,
  props: {
    value: {
      type: Array,
      default: () => []
    },
    options: {
      type: Array,
      default: () => []
    },
    disabled: {
      type: Boolean,
      default: false
    },
    stacked: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    forwardedListeners () {
      const { input, ...listeners } = this.$listeners
      return listeners
    }
  }
}
</script>
