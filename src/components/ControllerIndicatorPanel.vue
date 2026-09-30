<template>
  <div class="controller-indicator-panel">
    <!-- 配置控制(纯控制面板,无监视) -->
    <base-card :title="$t('controller_console.indicator.config')">
      <!-- 模式:0灭/1单色/2动画 -->
      <base-form-group :label="$t('controller_console.indicator.mode')">
        <b-form-radio-group v-model.number="form.mode" buttons button-variant="outline-primary">
          <b-form-radio :value="0">{{ $t('controller_console.indicator.mode_off') }}</b-form-radio>
          <b-form-radio :value="1">{{ $t('controller_console.indicator.mode_solid') }}</b-form-radio>
          <b-form-radio :value="2">{{ $t('controller_console.indicator.mode_anim') }}</b-form-radio>
        </b-form-radio-group>
      </base-form-group>

      <!-- 颜色:单色/动画时显示 -->
      <base-form-group
        v-if="form.mode !== 0"
        :label="$t('controller_console.indicator.color') + '：' + form.color.toUpperCase()"
      >
        <base-input v-model="form.color" type="color" :clearable="false" />
      </base-form-group>

      <!-- 全局亮度 -->
      <base-form-group :label="$t('controller_console.indicator.bright') + '：' + form.bright">
        <base-input v-model.number="form.bright" type="range" min="0" max="255" step="1" :clearable="false" />
      </base-form-group>

      <!-- 灯珠数 -->
      <base-form-group :label="$t('controller_console.indicator.pixels')">
        <base-input v-model.number="form.pixels" type="number" min="1" max="100" step="1" :clearable="false" />
      </base-form-group>

      <!-- 动画专属配置 -->
      <template v-if="form.mode === 2">
        <hr />
        <base-form-group :label="$t('controller_console.indicator.anim')">
          <b-form-select v-model.number="form.anim">
            <b-form-select-option :value="0">{{ $t('controller_console.indicator.anim_marquee') }}</b-form-select-option>
            <b-form-select-option :value="1">{{ $t('controller_console.indicator.anim_rainbow') }}</b-form-select-option>
            <b-form-select-option :value="2">{{ $t('controller_console.indicator.anim_breath') }}</b-form-select-option>
            <b-form-select-option :value="3">{{ $t('controller_console.indicator.anim_comet') }}</b-form-select-option>
            <b-form-select-option :value="4">{{ $t('controller_console.indicator.anim_strobe') }}</b-form-select-option>
          </b-form-select>
        </base-form-group>

        <base-form-group :label="$t('controller_console.indicator.speed') + '：' + form.speed">
          <base-input v-model.number="form.speed" type="range" min="1" max="255" step="1" :clearable="false" />
        </base-form-group>

        <b-form-checkbox v-model="form.loop" switch class="mb-3">
          {{ $t('controller_console.indicator.loop') }}
        </b-form-checkbox>

        <base-form-group :label="$t('controller_console.indicator.loop_cnt')">
          <base-input v-model.number="form.loopCnt" type="number" min="0" step="1" :disabled="form.loop" :clearable="false" />
          <b-form-text>{{ $t('controller_console.indicator.loop_cnt_hint') }}</b-form-text>
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
  name: 'ControllerIndicatorPanel',
  props: {
    podUuid: { type: String, required: true },
    // 来自父组件的 status.controller.indicator 子树;本面板纯控制无上报,保留以与其它面板签名一致并预留未来扩展
    indicator: { type: Object, default: () => ({}) }
  },
  data () {
    return {
      sending: false,
      form: {
        mode: 1,
        color: '#00ff00',
        bright: 128,
        pixels: 8,
        anim: 0,
        speed: 80,
        loop: true,
        loopCnt: 0
      }
    }
  },
  computed: {
    // 把 #rrggbb 解析成 {r,g,b} 整数
    rgb () {
      const hex = (this.form.color || '#000000').replace('#', '')
      return {
        r: parseInt(hex.slice(0, 2), 16) || 0,
        g: parseInt(hex.slice(2, 4), 16) || 0,
        b: parseInt(hex.slice(4, 6), 16) || 0
      }
    }
  },
  methods: {
    async apply () {
      this.sending = true
      try {
        const { r, g, b } = this.rgb
        await sendRawCommand(this.podUuid, {
          op: 'ws2811',
          mode: this.form.mode,
          r,
          g,
          b,
          bright: this.form.bright,
          pixels: this.form.pixels,
          anim: this.form.anim,
          speed: this.form.speed,
          loop: this.form.loop ? 1 : 0,
          loopCnt: this.form.loopCnt
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
.controller-indicator-panel hr {
  margin: 0.75rem 0;
}
</style>
