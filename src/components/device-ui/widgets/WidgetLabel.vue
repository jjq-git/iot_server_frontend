<template>
  <div>
    <span>{{ widgetProps.text }}</span>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'WebUiWidgetLabel',
  inheritAttrs: false,
  props: {
    widgetProps: { type: Object, required: true }
  }
}
</script>
