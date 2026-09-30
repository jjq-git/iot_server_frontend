<template>
  <div class="controller-light-panel">
    <!-- 冷暖 LED 无状态上报,只有控制 card -->
    <base-card :title="$t('controller_console.light.config')">
      <!-- 模式选择:0 直驱 / 1 联动 / 2 渐变 -->
      <base-form-group :label="$t('controller_console.light.mode')">
        <b-form-radio-group
          v-model.number="form.mode"
          buttons
          button-variant="outline-primary"
          :options="modeOptions"
        />
      </base-form-group>

      <!-- 直驱模式:暖色 + 冷色 -->
      <template v-if="form.mode === 0">
        <base-form-group :label="$t('controller_console.light.warm') + '：' + form.warm">
          <base-input v-model.number="form.warm" type="range" min="0" max="255" step="1" :clearable="false" />
        </base-form-group>
        <base-form-group :label="$t('controller_console.light.cool') + '：' + form.cool">
          <base-input v-model.number="form.cool" type="range" min="0" max="255" step="1" :clearable="false" />
        </base-form-group>
      </template>

      <!-- 联动模式:亮度 + 色温 -->
      <template v-else-if="form.mode === 1">
        <base-form-group :label="$t('controller_console.light.bright') + '：' + form.bright">
          <base-input v-model.number="form.bright" type="range" min="0" max="255" step="1" :clearable="false" />
        </base-form-group>
        <base-form-group :label="$t('controller_console.light.temp') + '：' + tempText">
          <base-input v-model.number="form.temp" type="range" min="0" max="255" step="1" :clearable="false" />
          <div class="d-flex justify-content-between small text-muted">
            <span>{{ $t('controller_console.light.temp_warm') }}</span>
            <span>{{ $t('controller_console.light.temp_cool') }}</span>
          </div>
        </base-form-group>
      </template>

      <!-- 渐变模式:渐变时长(×10ms) -->
      <template v-else-if="form.mode === 2">
        <base-form-group :label="$t('controller_console.light.fade') + '：' + fadeText">
          <base-input v-model.number="form.fade" type="range" min="0" max="255" step="1" :clearable="false" />
        </base-form-group>
      </template>

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
  name: 'ControllerLightPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的状态子树,WS 推送时实时更新。
    // 注意:LED/ws2811 后端无状态上报(只归 radar/fan/sys/ina/regs),
    // 本面板纯控制,该 prop 仅为接口对齐保留。
    light: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      form: {
        mode: 0, // 0 直驱 / 1 联动 / 2 渐变
        warm: 128, // 直驱:暖色 0-255
        cool: 128, // 直驱:冷色 0-255
        bright: 200, // 联动:亮度 0-255
        temp: 128, // 联动:色温 0-255(0 全暖 / 255 全冷)
        fade: 50 // 渐变:时长 0-255(×10ms)
      }
    }
  },
  computed: {
    modeOptions () {
      return [
        { text: this.$t('controller_console.light.mode_direct'), value: 0 },
        { text: this.$t('controller_console.light.mode_link'), value: 1 },
        { text: this.$t('controller_console.light.mode_fade'), value: 2 }
      ]
    },
    tempText () {
      // 0 全暖 -> 255 全冷,折算百分比辅助阅读
      const pct = Math.round((this.form.temp / 255) * 100)
      return this.form.temp + ' (' + pct + '% ' + this.$t('controller_console.light.temp_cool') + ')'
    },
    fadeText () {
      // 单位 ×10ms,折算毫秒辅助阅读
      return this.form.fade + ' (' + (this.form.fade * 10) + ' ms)'
    }
  },
  methods: {
    async apply () {
      this.sending = true
      try {
        await sendRawCommand(this.podUuid, {
          op: 'led',
          mode: this.form.mode,
          warm: this.form.warm,
          cool: this.form.cool,
          bright: this.form.bright,
          temp: this.form.temp,
          fade: this.form.fade
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
.controller-light-panel >>> .btn-group {
  flex-wrap: wrap;
}
</style>
