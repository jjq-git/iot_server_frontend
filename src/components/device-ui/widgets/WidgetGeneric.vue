<template>
  <label v-if="node.type === 'checkbox'" class="web-ui-generic__checkbox">
    <input
      type="checkbox"
      :checked="widgetStates.checked === true"
      :disabled="disabled"
      @change="$emit('property-change', { state: 'checked', value: $event.target.checked })"
    >
    <span>{{ widgetProps.text }}</span>
  </label>

  <select
    v-else-if="['dropdown', 'roller'].includes(node.type)"
    :value="selectedIndex"
    :disabled="disabled"
    :aria-label="accessibleName"
    @change="$emit('property-change', { prop: 'selected', value: Number($event.target.value) })"
  >
    <option v-for="(option, index) in options" :key="index" :value="index">{{ option }}</option>
  </select>

  <textarea
    v-else-if="node.type === 'textarea'"
    :value="widgetProps.text || ''"
    :placeholder="widgetProps.placeholder_text || ''"
    :maxlength="positiveNumber(widgetProps.max_length)"
    :disabled="disabled"
    :aria-label="accessibleName"
    :rows="widgetProps.one_line ? 1 : undefined"
    @input="$emit('property-change', { prop: 'text', value: $event.target.value })"
  />

  <div v-else-if="['image', 'animimage', 'lottie'].includes(node.type)" class="web-ui-generic__media">
    <span v-if="!mediaStyle.backgroundImage" class="web-ui-generic__placeholder">{{ accessibleName }}</span>
  </div>

  <svg v-else-if="node.type === 'line'" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polyline class="web-ui-generic__line" :points="linePoints" />
  </svg>

  <div v-else-if="node.type === 'qrcode'" class="web-ui-generic__qrcode" role="img" :aria-label="accessibleName">
    <span v-for="(cell, index) in qrCells" :key="index" :class="{ 'is-dark': cell }" />
  </div>

  <div v-else-if="node.type === 'calendar'" class="web-ui-generic__calendar" :aria-label="accessibleName">
    <strong>{{ calendarTitle }}</strong>
    <span v-for="day in calendarDays" :key="day">{{ day }}</span>
  </div>

  <div v-else-if="node.type === 'table'" class="web-ui-generic__table" role="table" :aria-label="accessibleName">
    <span v-for="cell in tableCells" :key="cell.key" role="cell">{{ cell.value }}</span>
  </div>

  <svg v-else-if="node.type === 'chart'" viewBox="0 0 100 100" preserveAspectRatio="none" :aria-label="accessibleName">
    <path class="web-ui-generic__chart-grid" d="M0 25H100M0 50H100M0 75H100M25 0V100M50 0V100M75 0V100" />
    <polyline class="web-ui-generic__chart-line" :points="chartPoints" />
  </svg>

  <div v-else-if="node.type === 'keyboard'" class="web-ui-generic__keyboard" :aria-label="accessibleName">
    <button v-for="key in keyboardKeys" :key="key" type="button" :disabled="disabled">{{ key }}</button>
  </div>

  <div v-else-if="node.type === 'scale'" class="web-ui-generic__scale" role="meter" :aria-label="accessibleName">
    <span>{{ scaleMinimum }}</span>
    <span>{{ scaleMaximum }}</span>
  </div>

  <button
    v-else-if="['imagebutton', 'msgbox-button', 'win-button', 'tabview-tab_button'].includes(node.type)"
    type="button"
    :disabled="disabled"
    :aria-label="accessibleName"
    @click="$emit('activate')"
  >
    {{ widgetProps.text || widgetProps.icon || '' }}<slot />
  </button>

  <div v-else :class="`web-ui-generic__${node.type}`">
    <strong v-if="widgetProps.title" class="web-ui-generic__title">{{ widgetProps.title }}</strong>
    <span v-if="widgetProps.text" class="web-ui-generic__text">{{ widgetProps.text }}</span>
    <slot />
  </div>
</template>

<script>
function numericValues (value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite)
  if (typeof value !== 'string') return []
  return value.split(/[\s,;|]+/).map(Number).filter(Number.isFinite)
}

export default {
  name: 'WebUiWidgetGeneric',
  inheritAttrs: false,
  props: {
    node: { type: Object, required: true },
    widgetProps: { type: Object, required: true },
    widgetStates: { type: Object, required: true },
    assetUrls: { type: Object, default: () => ({}) },
    interactive: { type: Boolean, default: false }
  },
  computed: {
    disabled () {
      return !this.interactive || this.widgetStates.disabled === true
    },
    accessibleName () {
      return this.node.displayName || this.node.codeName || this.node.id
    },
    options () {
      const value = this.widgetProps.options
      if (Array.isArray(value)) return value.map(String)
      return typeof value === 'string' ? value.split(/\r?\n|\|/).filter(Boolean) : []
    },
    selectedIndex () {
      return Number(this.widgetProps.selected === undefined ? 0 : this.widgetProps.selected)
    },
    mediaStyle () {
      const candidates = this.node.type === 'animimage'
        ? (Array.isArray(this.widgetProps.srcs) ? this.widgetProps.srcs : [])
        : [this.widgetProps.src]
      const url = candidates.map(id => this.assetUrls[id]).find(value => typeof value === 'string' && /^blob:/i.test(value))
      return url ? { backgroundImage: `url("${url}")` } : {}
    },
    linePoints () {
      const source = Array.isArray(this.widgetProps.points) ? this.widgetProps.points : []
      const points = source.map(point => {
        if (Array.isArray(point)) return `${Number(point[0]) || 0},${Number(point[1]) || 0}`
        if (point && typeof point === 'object') return `${Number(point.x) || 0},${Number(point.y) || 0}`
        return null
      }).filter(Boolean)
      return points.length ? points.join(' ') : '0,100 30,40 60,70 100,0'
    },
    qrCells () {
      const text = String(this.widgetProps.data || this.accessibleName)
      let seed = 0
      for (let index = 0; index < text.length; index += 1) seed = (seed * 31 + text.charCodeAt(index)) >>> 0
      return Array.from({ length: 121 }, (_, index) => ((seed >>> (index % 24)) + index * 7) % 3 !== 0)
    },
    calendarTitle () {
      const year = Number(this.widgetProps.shown_year) || new Date().getFullYear()
      const month = Number(this.widgetProps.shown_month) || new Date().getMonth() + 1
      return `${year}-${String(month).padStart(2, '0')}`
    },
    calendarDays () {
      return Array.from({ length: 31 }, (_, index) => index + 1)
    },
    tableCells () {
      const rows = Math.max(1, Math.min(30, Number(this.widgetProps.row_count) || 2))
      const columns = Math.max(1, Math.min(12, Number(this.widgetProps.column_count) || 2))
      const values = Object.fromEntries(this.node.children
        .filter(child => child.type === 'table-cell')
        .map(child => [`${Number(child.props.row) || 0}:${Number(child.props.column) || 0}`, child.props.value || '']))
      return Array.from({ length: rows * columns }, (_, index) => {
        const row = Math.floor(index / columns)
        const column = index % columns
        return { key: `${row}:${column}`, value: values[`${row}:${column}`] || '' }
      })
    },
    chartPoints () {
      const series = this.node.children.find(child => child.type === 'chart-series')
      const values = numericValues(series?.props?.values)
      if (!values.length) return '0,80 25,45 50,62 75,20 100,35'
      const minimum = Math.min(...values)
      const span = Math.max(1, Math.max(...values) - minimum)
      return values.map((value, index) => {
        const x = values.length === 1 ? 50 : index / (values.length - 1) * 100
        return `${x},${100 - ((value - minimum) / span * 100)}`
      }).join(' ')
    },
    keyboardKeys () {
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫', '↵']
    },
    scaleMinimum () {
      return this.widgetProps.min_value === undefined ? 0 : this.widgetProps.min_value
    },
    scaleMaximum () {
      return this.widgetProps.max_value === undefined ? 100 : this.widgetProps.max_value
    }
  },
  mounted () {
    if (['image', 'animimage', 'lottie'].includes(this.node.type)) Object.assign(this.$el.style, this.mediaStyle)
    if (this.node.type === 'table') this.$el.style.gridTemplateColumns = `repeat(${Math.max(1, Math.min(12, Number(this.widgetProps.column_count) || 2))}, 1fr)`
  },
  watch: {
    mediaStyle: {
      deep: true,
      handler (style) {
        if (['image', 'animimage', 'lottie'].includes(this.node.type) && this.$el) Object.assign(this.$el.style, style)
      }
    }
  },
  methods: {
    positiveNumber (value) {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
    }
  }
}
</script>
