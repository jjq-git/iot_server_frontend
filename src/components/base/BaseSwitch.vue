<template>
  <b-form-checkbox
    class="base-switch"
    :checked="modelValue"
    switch
    v-bind="$attrs"
    v-on="filteredListeners"
    @input="handleInput"
    @change="handleChange"
  >
    <slot />
  </b-form-checkbox>
</template>

<script>
export default {
  name: 'BaseSwitch',
  inheritAttrs: false,
  props: {
    value: {
      type: [Boolean, String, Number],
      default: null
    },
    checked: {
      type: [Boolean, String, Number],
      default: null
    }
  },
  computed: {
    modelValue () {
      return this.checked !== null ? this.checked : this.value
    },
    filteredListeners () {
      const { input, change, ...rest } = this.$listeners || {}
      return rest
    }
  },
  methods: {
    handleInput (val) {
      this.$emit('input', val)
    },
    handleChange (val) {
      this.$emit('change', val)
    }
  }
}
</script>
