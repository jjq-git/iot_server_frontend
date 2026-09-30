<template>
  <button
    :type="type"
    class="base-icon-button"
    :class="`base-icon-button--${tone}`"
    :disabled="disabled || loading"
    :title="label"
    :aria-label="label"
    :aria-busy="loading ? 'true' : null"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <b-spinner v-if="loading" small aria-hidden="true" />
    <slot v-else />
  </button>
</template>

<script>
export default {
  name: 'BaseIconButton',
  inheritAttrs: false,
  props: {
    label: {
      type: String,
      required: true
    },
    type: {
      type: String,
      default: 'button'
    },
    tone: {
      type: String,
      default: 'neutral',
      validator: value => ['neutral', 'danger', 'warning'].includes(value)
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
.base-icon-button {
  display: inline-flex;
  width: var(--list-control-height);
  min-width: var(--list-control-height);
  height: var(--list-control-height);
  min-height: var(--list-control-height);
  padding: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color var(--motion-duration-fast) var(--motion-ease-standard),
    color var(--motion-duration-fast) var(--motion-ease-standard),
    opacity var(--motion-duration-fast) var(--motion-ease-standard);
}

.base-icon-button:hover:not(:disabled) {
  background: var(--color-brand-soft);
  color: var(--color-brand);
}

.base-icon-button:focus {
  box-shadow: none;
  outline: none;
}

.base-icon-button:focus-visible {
  outline: 2px solid var(--color-brand);
  outline-offset: 2px;
}

.base-icon-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.base-icon-button--danger {
  color: var(--color-error);
}

.base-icon-button--danger:hover:not(:disabled) {
  background: var(--color-error-bg);
  color: var(--color-error-strong);
}

.base-icon-button--warning {
  color: var(--color-warning-strong);
}

.base-icon-button--warning:hover:not(:disabled) {
  background: var(--color-warning-bg);
  color: var(--color-warning-strong);
}

.base-icon-button ::v-deep .app-icon {
  width: var(--icon-size-md);
  height: var(--icon-size-md);
}

@media (prefers-reduced-motion: reduce) {
  .base-icon-button {
    transition: none;
  }
}
</style>
