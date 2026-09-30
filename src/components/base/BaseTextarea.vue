<template>
  <b-form-textarea
    :value="value"
    :placeholder="placeholder"
    :rows="rows"
    :max-rows="maxRows"
    :state="state"
    :disabled="disabled"
    v-bind="$attrs"
    @input="$emit('input', $event)"
    v-on="$listeners"
  />
</template>

<script>
export default {
  name: 'BaseTextarea',
  inheritAttrs: false,
  props: {
    value: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    rows: {
      type: Number,
      default: 3
    },
    maxRows: {
      type: Number,
      default: null
    },
    state: {
      type: Boolean,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    }
  }
}
</script>
