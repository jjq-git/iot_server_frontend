<template>
  <b-button
    class="base-button"
    :variant="variant"
    :size="size"
    :disabled="disabled || loading"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <b-spinner v-if="loading" small />
    <slot />
  </b-button>
</template>

<script>
export default {
  name: 'BaseButton',
  inheritAttrs: false,
  props: {
    variant: {
      type: String,
      default: 'primary'
    },
    size: {
      type: String,
      default: null
    },
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

<style scoped>
.base-button {
  --app-icon-size: var(--icon-size-md);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
}

.base-button.btn-sm {
  --app-icon-size: var(--icon-size-sm);
}

/* BaseButton owns icon/text spacing; neutralize legacy Bootstrap utilities in its slot. */
.base-button ::v-deep .app-icon {
  margin-right: 0 !important;
  margin-left: 0 !important;
}
</style>
