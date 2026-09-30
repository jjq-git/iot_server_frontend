<template>
  <div
    v-if="show"
    class="base-loading"
    :class="{ 'base-loading--center': center }"
    v-bind="$attrs"
  >
    <b-spinner :small="small" :variant="variant" class="base-loading__spinner" />
    <span class="base-loading__text">{{ text || $t('common.loading') }}</span>
  </div>
</template>

<script>
export default {
  name: 'BaseLoading',
  inheritAttrs: false,
  props: {
    show: {
      type: Boolean,
      default: true
    },
    text: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'primary'
    },
    small: {
      type: Boolean,
      default: false
    },
    center: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style scoped>
.base-loading {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
}

.base-loading--center {
  justify-content: center;
}

.base-loading__spinner {
  margin-right: 0.5rem;
}

.base-loading__text {
  line-height: 1;
}
</style>
