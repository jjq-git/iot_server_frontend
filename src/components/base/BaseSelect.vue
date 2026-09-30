<template>
  <div class="base-select-control" :class="{ 'base-select-control--has-value': hasValue }">
    <b-form-select
      ref="control"
      class="base-select-control__field"
      :value="value"
      :options="normalizedOptions"
      :state="state"
      :disabled="disabled"
      :aria-label="accessibleLabel"
      v-bind="$attrs"
      v-on="forwardedListeners"
      @input="$emit('input', $event)"
    />
    <button
      v-if="showClearButton"
      class="base-control-clear base-select-control__clear"
      type="button"
      :title="$t('common.clear')"
      :aria-label="$t('common.clear')"
      @mousedown.prevent
      @click.stop="clearValue"
    >
      <app-icon name="x" aria-hidden="true" />
    </button>
    <app-icon name="chevron-down" class="base-select-control__arrow" aria-hidden="true" />
  </div>
</template>

<script>
export default {
  name: 'BaseSelect',
  inheritAttrs: false,
  props: {
    value: {
      type: [String, Number, Boolean],
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    state: {
      type: Boolean,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    normalizedOptions () {
      return this.options.map(option => {
        if (typeof option === 'string') {
          return { text: option, value: option }
        }
        return {
          text: option.text ?? option.label ?? '',
          value: option.value
        }
      })
    },
    hasValue () {
      return this.value !== '' && this.value !== null && this.value !== undefined
    },
    accessibleLabel () {
      if (this.$attrs['aria-label']) return this.$attrs['aria-label']
      if (this.$attrs.id) return null
      const prompt = this.normalizedOptions.find(option => option.value === '' || option.value === null || option.value === undefined)
      return prompt?.text || this.normalizedOptions[0]?.text || null
    },
    showClearButton () {
      return this.clearable && this.hasValue && !this.disabled
    },
    emptyValue () {
      const emptyOption = this.normalizedOptions.find(option => option.value === '' || option.value === null || option.value === undefined)
      return emptyOption ? emptyOption.value : ''
    },
    forwardedListeners () {
      const { input, ...listeners } = this.$listeners
      return listeners
    }
  },
  methods: {
    clearValue () {
      this.$emit('input', this.emptyValue)
      this.$emit('change', this.emptyValue)
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
