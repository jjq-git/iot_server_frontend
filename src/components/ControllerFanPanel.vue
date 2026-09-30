<template>
  <div class="controller-fan-panel">
    <!-- 实时监视 -->
    <base-card class="mb-3" :title="$t('controller_console.fan.monitor')">
      <div class="d-flex flex-wrap align-items-center">
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.fan.rpm') }}</div>
          <div class="h5 mb-0">{{ rpmText }}</div>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.fan.tach') }}</div>
          <div class="h5 mb-0">{{ tachText }}</div>
        </div>
        <div class="mb-2">
          <div class="text-muted small">{{ $t('controller_console.fan.fault') }}</div>
          <div class="mt-1">
            <b-badge :variant="faultVariant">{{ faultText }}</b-badge>
          </div>
        </div>
      </div>
    </base-card>

    <!-- 配置控制 -->
    <base-card :title="$t('controller_console.fan.config')">
      <b-form-checkbox :checked="form.sw" switch class="mb-3" @input="setFanPower">
        {{ $t('controller_console.fan.power') }}
      </b-form-checkbox>

      <base-form-group :label="$t('controller_console.fan.duty') + '：' + form.duty + dutyHint">
        <base-input v-model.number="form.duty" type="range" min="0" max="255" step="1" :disabled="!form.sw" :clearable="false" />
      </base-form-group>

      <base-form-group :label="$t('controller_console.fan.freq') + '：' + form.freq + ' Hz'">
        <base-input
          v-model.number="form.freq"
          type="number"
          min="1000"
          max="40000"
          step="100" :clearable="false"
        />
      </base-form-group>

      <p class="text-muted small mb-3">{{ $t('controller_console.fan.note') }}</p>

      <div class="d-flex">
        <base-button variant="primary" :disabled="sending" @click="apply">
          <b-spinner v-if="sending" small /> {{ $t('controller_console.apply') }}
        </base-button>
      </div>
    </base-card>
  </div>
</template>

<script>
import { sendRawCommand } from '@/api/controller'

export default {
  name: 'ControllerFanPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.fan 子树,WS 推送时实时更新
    fan: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      form: { duty: 0, freq: 25000, sw: false }
    }
  },
  computed: {
    rpmText () {
      const v = this.fan.rpm
      return v != null ? v + ' RPM' : '--'
    },
    tachText () {
      const v = this.fan.tach
      return v != null ? String(v) : '--'
    },
    faultVariant () {
      return this.fan.fanFault ? 'danger' : 'success'
    },
    faultText () {
      return this.fan.fanFault
        ? this.$t('controller_console.fan.fault_stall')
        : this.$t('controller_console.fan.fault_ok')
    },
    dutyHint () {
      if (this.form.duty === 0) return ' (' + this.$t('controller_console.fan.duty_stop') + ')'
      if (this.form.duty === 255) return ' (' + this.$t('controller_console.fan.duty_full') + ')'
      return ''
    }
  },
  methods: {
    setFanPower (value) {
      this.form.sw = value === true
      if (!this.form.sw) this.form.duty = 0
    },
    async apply () {
      const duty = this.form.sw ? this.form.duty : 0
      if (!this.form.sw) this.form.duty = duty
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, {
          op: 'fan',
          duty,
          freq: this.form.freq,
          sw: this.form.sw ? 1 : 0
        })
        this.$uiToast.success(this.$t('controller_console.toast.queued'))
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.send_failed') +
          (this.$getErrorMessage(e)))
      } finally {
        this.sending = false
      }
    }
  }
}
</script>

<style scoped>
.controller-fan-panel >>> input[type='number'] {
  max-width: 200px;
}
</style>
