<template>
  <div class="device-widget" :class="`device-widget--${type}`">
    <div class="device-widget__header">
      <span>{{ widget.label }}</span>
      <small v-if="widget.unit && type !== 'slider'">{{ widget.unit }}</small>
    </div>

    <template v-if="type === 'readout'">
      <output class="device-widget__value">{{ formatted(primaryValue) }}</output>
    </template>

    <base-button v-else-if="type === 'button'" :disabled="disabled" @click="$emit('invoke', widget)">
      {{ widget.label }}
    </base-button>

    <b-form-checkbox v-else-if="type === 'switch'" :checked="asBoolean(primaryValue)" switch :disabled="disabled" @input="setPrimary">
      {{ $t(asBoolean(primaryValue) ? 'pod_control_panel.module_dialog.switch_on' : 'pod_control_panel.module_dialog.switch_off') }}
    </b-form-checkbox>

    <base-badge v-else-if="type === 'badge'" variant="info">{{ optionText(primaryValue) }}</base-badge>

    <div v-else-if="type === 'gauge'" class="device-widget__gauge">
      <meter :min="minimum" :max="maximum" :value="numberValue(primaryValue)" />
      <span>{{ formatted(primaryValue) }}</span>
    </div>

    <div v-else-if="type === 'slider'" class="device-widget__slider">
      <div class="device-widget__slider-track">
        <base-input class="device-widget__range" type="range" :style="sliderStyle" :value="sliderValue" :min="minimum" :max="maximum" :disabled="disabled" @input="setPrimary" :clearable="false" />
        <div class="device-widget__slider-scale" aria-hidden="true">
          <span>{{ minimum }}</span>
          <span>{{ maximum }}</span>
        </div>
      </div>
      <div
        class="device-widget__slider-value"
        :class="{ 'device-widget__slider-value--with-unit': widget.unit }"
      >
        <base-input :clearable="false" type="number" :value="primaryValue" :min="minimum" :max="maximum" :disabled="disabled" @input="setPrimary" />
        <span v-if="widget.unit">{{ widget.unit }}</span>
      </div>
    </div>

    <b-input-group v-else-if="type === 'stepper'" class="device-widget__stepper">
      <b-input-group-prepend><base-button variant="outline-secondary" :disabled="disabled" @click="step(-1)">-</base-button></b-input-group-prepend>
      <base-input :clearable="false" type="number" :value="primaryValue" :min="minimum" :max="maximum" :disabled="disabled" @input="setPrimary" />
      <b-input-group-append><base-button variant="outline-secondary" :disabled="disabled" @click="step(1)">+</base-button></b-input-group-append>
    </b-input-group>

    <input v-else-if="type === 'color_picker'" type="color" class="device-widget__color" :value="colorValue" :disabled="disabled" @input="setColor($event.target.value)" />

    <div v-else-if="type === 'channel_switch'" class="device-widget__channels">
      <b-form-checkbox v-for="field in widget.fields" :key="field.attr_code" :checked="asBoolean(valueOf(field))" switch :disabled="disabled || !editable(field)" @input="setField(field, $event)">
        {{ field.attr_name }}
      </b-form-checkbox>
    </div>

    <base-select v-else-if="type === 'dropdown'" :value="primaryValue" :options="selectOptions" :disabled="disabled" @input="setPrimary" />

    <div v-else-if="type === 'progress_bar'" class="device-widget__progress">
      <b-progress :value="numberValue(primaryValue)" :max="maximum || 100" />
      <span>{{ formatted(primaryValue) }}</span>
    </div>

    <div v-else-if="type === 'chart'" class="device-widget__chart">
      <div v-if="widget.time_windows && widget.time_windows.length" class="device-widget__windows">
        <button v-for="window in widget.time_windows" :key="window" type="button" :class="{ active: chartWindow === window }" @click="chartWindow = window">{{ windowLabel(window) }}</button>
      </div>
      <svg viewBox="0 0 240 64" role="img" :aria-label="widget.label">
        <polyline :points="chartPoints" fill="none" stroke="currentColor" stroke-width="3" />
      </svg>
      <span>{{ formatted(latestChartValue) }}</span>
    </div>

    <base-input v-else type="text" :value="primaryValue" :maxlength="maximumLength" :disabled="disabled" @input="setPrimary" />
  </div>
</template>

<script>
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import { sliderDisplayValue } from '@/utils/control-validation.mjs'
import { fieldForRole, normalizeWidgetType, optionList } from '@/utils/widget-contract.mjs'

export default {
  name: 'DeviceWidget',
  components: { BaseBadge, BaseButton, BaseInput, BaseSelect },
  props: {
    widget: { type: Object, required: true },
    values: { type: Object, required: true },
    disabled: { type: Boolean, default: false }
  },
  data () {
    return { chartWindow: (this.widget.time_windows || [])[0] || 'hour' }
  },
  computed: {
    type () { return normalizeWidgetType(this.widget.widget) },
    primaryField () {
      return fieldForRole(this.widget, 'val') || fieldForRole(this.widget, 'state_idx') || fieldForRole(this.widget, 'sel_idx') || this.widget.fields[0]
    },
    primaryValue () { return this.valueOf(this.primaryField) },
    minimum () { return this.roleNumber('min', this.primaryField?.min_val, 0) },
    maximum () { return this.roleNumber('max', this.primaryField?.max_val, 100) },
    sliderValue () { return sliderDisplayValue(this.primaryValue, this.minimum, this.maximum) },
    sliderProgress () {
      const range = this.maximum - this.minimum
      if (range <= 0) return 0
      return Math.min(100, Math.max(0, ((this.sliderValue - this.minimum) / range) * 100))
    },
    sliderStyle () { return { '--slider-progress': `${this.sliderProgress}%` } },
    maximumLength () { return this.roleNumber('max_len', 255, 255) },
    selectOptions () { return optionList(this.widget.options || this.primaryField?.options) },
    colorValue () {
      const hex = ['r', 'g', 'b'].map(role => this.roleNumber(role, 0, 0).toString(16).padStart(2, '0')).join('')
      return `#${hex}`
    },
    chartValues () {
      const value = this.primaryValue
      const values = Array.isArray(value) ? value : (value?.values || value?.series || [value])
      return values.map(item => Number(item?.value ?? item)).filter(Number.isFinite).slice(-30)
    },
    latestChartValue () { return this.chartValues[this.chartValues.length - 1] },
    chartPoints () {
      if (!this.chartValues.length) return ''
      const min = Math.min(...this.chartValues)
      const max = Math.max(...this.chartValues)
      const range = max - min || 1
      return this.chartValues.map((value, index) => {
        const x = this.chartValues.length === 1 ? 120 : (index * 236) / (this.chartValues.length - 1) + 2
        const y = 60 - ((value - min) / range) * 56
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    }
  },
  methods: {
    valueOf (field) { return field ? this.values[field.attr_code] : null },
    editable (field) { return field?.access_type === 'RW' || field?.access_type === 'WO' || field?.web_editable },
    setField (field, value) { if (field) this.$emit('change', { field, value }) },
    setPrimary (value) { this.setField(this.primaryField, value) },
    numberValue (value) { const number = Number(value); return Number.isFinite(number) ? number : 0 },
    asBoolean (value) { return value === true || value === 1 || value === '1' || value === 'true' },
    roleNumber (role, fallback, defaultValue) {
      const field = fieldForRole(this.widget, role)
      const value = field ? this.valueOf(field) ?? field.default_val : fallback
      const number = Number(value)
      return Number.isFinite(number) ? number : defaultValue
    },
    step (delta) {
      const next = Math.min(this.maximum, Math.max(this.minimum, this.numberValue(this.primaryValue) + delta))
      this.setPrimary(next)
    },
    setColor (hex) {
      const values = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16))
      ;['r', 'g', 'b'].forEach((role, index) => this.setField(fieldForRole(this.widget, role), values[index]))
    },
    optionText (value) {
      const match = this.selectOptions.find(item => String(item.value) === String(value))
      return match ? match.text : this.formatted(value)
    },
    formatted (value) {
      if (value === undefined || value === null || value === '') return '-'
      if (typeof value === 'boolean') {
        return this.$t(value ? 'pod_control_panel.module_dialog.switch_on' : 'pod_control_panel.module_dialog.switch_off')
      }
      return `${typeof value === 'object' ? JSON.stringify(value) : value}${this.widget.unit ? ` ${this.widget.unit}` : ''}`
    },
    windowLabel (value) { return ({ hour: '1h', day: '1d', month: '1m', year: '1y' })[value] || value }
  }
}
</script>
