<template>
  <b-modal
    :id="id"
    :visible="localVisible"
    :title="title"
    :ok-title="okTitle || $t('base_modal.ok_default')"
    :cancel-title="cancelTitle || $t('base_modal.cancel_default')"
    :header-close-label="resolvedCloseLabel"
    :ok-variant="okVariant"
    :busy="busy"
    :hide-footer="hideFooter"
    :size="size"
    :modal-class="resolvedModalClass"
    :centered="centered"
    :scrollable="scrollable"
    v-bind="$attrs"
    @ok="handleOk"
    @hidden="onHidden"
    @show="onShow"
    @change="onModalChange"
    v-on="filteredListeners"
  >
    <slot />
    <template #modal-header-close>
      <span :title="resolvedCloseLabel">
        <app-icon name="x" aria-hidden="true" />
      </span>
    </template>
    <template v-if="$slots['modal-header']" #modal-header="{ close }">
      <slot name="modal-header" :close="close" />
    </template>
    <template v-if="$scopedSlots['modal-footer'] || $slots['modal-footer']" #modal-footer="{ ok, cancel, hide }">
      <slot name="modal-footer" :ok="ok" :cancel="cancel" :hide="hide" />
    </template>
  </b-modal>
</template>

<script>
export default {
  name: 'BaseModal',
  inheritAttrs: false,
  props: {
    id: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: ''
    },
    okTitle: {
      type: String,
      default: ''
    },
    cancelTitle: {
      type: String,
      default: ''
    },
    closeLabel: {
      type: String,
      default: ''
    },
    okVariant: {
      type: String,
      default: 'primary'
    },
    busy: {
      type: Boolean,
      default: false
    },
    value: {
      type: Boolean,
      default: false
    },
    visible: {
      type: Boolean,
      default: null
    },
    hideFooter: {
      type: Boolean,
      default: false
    },
    size: {
      type: String,
      default: undefined
    },
    centered: {
      type: Boolean,
      default: true
    },
    scrollable: {
      type: Boolean,
      default: true
    },
    modalClass: {
      type: [String, Object, Array],
      default: undefined
    }
  },
  data () {
    return {
      localVisible: this.visible === null ? this.value : this.visible
    }
  },
  watch: {
    value: {
      handler (val) {
        if (this.visible === null) this.localVisible = val
      },
      immediate: true
    },
    visible (val) {
      if (val !== null) this.localVisible = val
    }
  },
  computed: {
    resolvedCloseLabel () {
      return this.closeLabel || this.$t('common.close')
    },
    resolvedModalClass () {
      return ['app-modal', this.modalClass]
    },
    filteredListeners () {
      const { input, hidden, show, change, ok, ...rest } = this.$listeners || {}
      return rest
    }
  },
  methods: {
    handleOk (evt) {
      this.$emit('ok', evt)
    },
    onModalChange (val) {
      this.localVisible = val
      this.$emit('input', val)
    },
    onHidden () {
      this.localVisible = false
      this.$emit('input', false)
      if (this.$listeners && this.$listeners.hidden) {
        this.$listeners.hidden()
      }
    },
    onShow () {
      this.localVisible = true
      this.$emit('input', true)
      if (this.$listeners && this.$listeners.show) {
        this.$listeners.show()
      }
    },
    show () {
      this.localVisible = true
    },
    hide () {
      this.localVisible = false
    }
  }
}
</script>
