<template>
  <base-card v-bind="$attrs" v-on="$listeners">
    <div v-if="hasHeading" class="interaction-list-heading">
      <span class="interaction-list-heading__mark" aria-hidden="true"></span>
      <h2>{{ resolvedTitle }}</h2>
      <span v-if="resolvedGroup" class="interaction-list-heading__group">{{ resolvedGroup }}</span>
      <div v-if="$slots['heading-actions']" class="interaction-list-heading__actions">
        <slot name="heading-actions" />
      </div>
    </div>
    <slot />
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </base-card>
</template>

<script>
export default {
  name: 'PageSectionCard',
  inheritAttrs: false,
  props: {
    title: {
      type: String,
      default: ''
    },
    group: {
      type: String,
      default: ''
    }
  },
  computed: {
    hasHeading () {
      return Boolean(this.title || this.group || this.$slots['heading-actions'])
    },
    resolvedTitle () {
      return this.title
    },
    resolvedGroup () {
      return this.group
    }
  }
}
</script>

<style scoped>
.interaction-list-heading__actions {
  display: flex;
  align-self: center;
  align-items: center;
}
</style>
