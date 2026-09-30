<template>
  <b-card
    :header="header"
    :header-bg-variant="headerBgVariant"
    :header-text-variant="headerTextVariant"
    v-bind="$attrs"
    v-on="$listeners"
  >
    <slot />
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </b-card>
</template>

<script>
export default {
  name: 'BaseCard',
  inheritAttrs: false,
  props: {
    header: {
      type: String,
      default: ''
    },
    headerBgVariant: {
      type: String,
      default: 'white'
    },
    headerTextVariant: {
      type: String,
      default: 'dark'
    }
  }
}
</script>
