<template>
  <div class="controller-radar-panel">
    <!-- 实时监视 -->
    <base-card class="mb-3" :title="$t('controller_console.radar.monitor')">
      <div class="d-flex flex-wrap align-items-center">
        <div class="text-center mr-4 mb-2">
          <div
            class="radar-lamp"
            :class="{ 'lamp-on': radar.present }"
          ></div>
          <div class="small mt-1">
            {{ radar.present ? $t('controller_console.radar.present') : $t('controller_console.radar.absent') }}
          </div>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.radar.count') }}</div>
          <div class="h5 mb-0">{{ radar.cnt != null ? radar.cnt : '--' }}</div>
        </div>
        <div class="mr-4 mb-2">
          <div class="text-muted small">{{ $t('controller_console.radar.last_ms') }}</div>
          <div class="h5 mb-0">{{ lastMsText }}</div>
        </div>
        <div class="mb-2">
          <div class="text-muted small">{{ $t('controller_console.radar.model') }}</div>
          <div class="h5 mb-0">{{ modelText }}</div>
        </div>
      </div>
    </base-card>

    <!-- 配置控制 -->
    <base-card :title="$t('controller_console.radar.config')">
      <base-form-group :label="$t('controller_console.radar.sens') + '：' + form.sens">
        <base-input v-model.number="form.sens" type="range" min="0" max="10" step="1" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('controller_console.radar.dist') + '：' + form.dist + ' m'">
        <base-input v-model.number="form.dist" type="range" min="1" max="8" step="1" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('controller_console.radar.hold') + '：' + form.hold + ' ms'">
        <base-input v-model.number="form.hold" type="range" min="0" max="60000" step="500" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('controller_console.radar.unatt') + '：' + form.unatt + ' s'">
        <base-input v-model.number="form.unatt" type="range" min="0" max="3600" step="10" :clearable="false" />
      </base-form-group>
      <b-form-checkbox v-model="form.enable" switch class="mb-3">
        {{ $t('controller_console.radar.report_enable') }}
      </b-form-checkbox>

      <div class="d-flex">
        <base-button variant="primary" :disabled="sending" @click="apply">
          <b-spinner v-if="sending" small /> {{ $t('controller_console.apply') }}
        </base-button>
        <base-button variant="outline-secondary" class="ml-2" :disabled="sending" @click="readConfig">
          {{ $t('controller_console.radar.read') }}
        </base-button>
      </div>
    </base-card>
  </div>
</template>

<script>
import { sendRawCommand } from '@/api/controller'

export default {
  name: 'ControllerRadarPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.radar 子树,WS 推送时实时更新
    radar: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      form: { sens: 8, dist: 4, hold: 2000, unatt: 60, enable: true }
    }
  },
  computed: {
    lastMsText () {
      const v = this.radar.lastMs
      if (v == null) return '--'
      return v >= 65535 ? '≥65.5 s' : (v / 1000).toFixed(1) + ' s'
    },
    modelText () {
      const m = this.radar.model
      if (m == null) return '--'
      return m === 0x10 ? 'RFP2402P26' : '0x' + Number(m).toString(16)
    }
  },
  methods: {
    async apply () {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, {
          op: 'radar.cfg',
          sens: this.form.sens,
          dist: this.form.dist,
          hold: this.form.hold,
          unatt: this.form.unatt,
          enable: this.form.enable ? 1 : 0
        })
        this.$uiToast.success(this.$t('controller_console.toast.queued'))
      } catch (e) {
        this.$uiToast.error(this.$t('controller_console.toast.send_failed') +
          (this.$getErrorMessage(e)))
      } finally {
        this.sending = false
      }
    },
    async readConfig () {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, { op: 'radar.read' })
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
.radar-lamp {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-border-strong);
  margin: 0 auto;
  transition: background 0.3s;
}

.radar-lamp.lamp-on {
  background: var(--color-success);
  box-shadow: 0 0 12px var(--color-success);
}
</style>
