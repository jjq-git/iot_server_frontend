<template>
  <div role="group" :aria-label="accessibleName">
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="web-ui-buttonmatrix__row"
    >
      <button
        v-for="button in row"
        :key="button.index"
        type="button"
        class="web-ui-buttonmatrix__button"
        :class="{ 'is-selected': button.index === selectedButton }"
        :disabled="!interactive || widgetStates.disabled || button.disabled"
        @click="selectButton(button.index)"
      >
        {{ button.label }}
      </button>
    </div>
  </div>
</template>

<script>
function normalizedMap (value) {
  if (Array.isArray(value)) return value.map(item => String(item))
  if (typeof value !== 'string') return ['Btn1', 'Btn2', 'Btn3', '\n', 'Btn4', 'Btn5']
  return value.split(/\r?\n|\|/).flatMap((item, index, all) => (
    index < all.length - 1 ? [item, '\n'] : [item]
  ))
}

function controlTokens (value) {
  if (Array.isArray(value)) return value.map(item => String(item))
  if (typeof value !== 'string') return []
  return value.trim() ? value.trim().split(/\s+/) : []
}

export default {
  name: 'WebUiWidgetButtonMatrix',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetStates: { type: Object, required: true },
    interactive: { type: Boolean, default: false }
  },
  computed: {
    selectedButton () {
      return Number(this.widgetProps.selected_button ?? -1)
    },
    rows () {
      const controls = controlTokens(this.widgetProps.ctrl_map)
      const rows = [[]]
      let index = 0
      normalizedMap(this.widgetProps.map).forEach(label => {
        if (label === '\n') {
          if (rows[rows.length - 1].length) rows.push([])
          return
        }
        const tokens = (controls[index] || '').split('|')
        rows[rows.length - 1].push({
          index,
          label,
          disabled: tokens.includes('disabled') || tokens.includes('hidden')
        })
        index += 1
      })
      return rows.filter(row => row.length)
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    }
  },
  methods: {
    selectButton (index) {
      this.$emit('value-change', index)
      this.$emit('activate')
    }
  }
}
</script>
