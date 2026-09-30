<template>
  <div v-if="clearable" class="base-input-control" :class="{ 'base-input-control--has-value': hasValue }">
    <b-form-input
      ref="control"
      :value="value"
      :type="type"
      :placeholder="placeholder"
      :state="state"
      :disabled="disabled"
      :trim="trim"
      :aria-label="accessibleLabel"
      v-bind="$attrs"
      v-on="forwardedListeners"
      @input="$emit('input', $event)"
    />
    <button
      v-if="showClearButton"
      class="base-control-clear"
      type="button"
      :title="$t('common.clear')"
      :aria-label="$t('common.clear')"
      @mousedown.prevent
      @click.stop="clearValue"
    >
      <app-icon name="x" aria-hidden="true" />
    </button>
  </div>
  <b-form-input
    v-else
    ref="control"
    :value="value"
    :type="type"
    :placeholder="placeholder"
    :state="state"
    :disabled="disabled"
    :trim="trim"
    :aria-label="accessibleLabel"
    v-bind="$attrs"
    v-on="forwardedListeners"
    @input="$emit('input', $event)"
  />
</template>

<script>
export default {
  name: 'BaseInput',
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number],
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    placeholder: {
      type: String,
      default: ''
    },
    state: {
      type: Boolean,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    },
    trim: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    accessibleLabel () {
      if (this.$attrs['aria-label']) return this.$attrs['aria-label']
      return this.$attrs.id ? null : (this.placeholder || null)
    },
    hasValue () {
      return this.value !== '' && this.value !== null && this.value !== undefined
    },
    showClearButton () {
      return this.hasValue && !this.disabled && !this.isReadonly
    },
    isReadonly () {
      return this.$attrs.readonly !== undefined && this.$attrs.readonly !== false
    },
    forwardedListeners () {
      const { input, ...listeners } = this.$listeners
      return listeners
    }
  },
  methods: {
    clearValue () {
      this.$emit('input', '')
      this.$emit('change', '')
      this.$emit('clear')
      this.$nextTick(() => this.focus())
    },
    focus () {
      this.$refs.control && this.$refs.control.focus()
    },
    blur () {
      this.$refs.control && this.$refs.control.blur()
    }
  }
}
</script>
