<template>
  <!-- floating=true 时显示右下角主题切换按钮 -->
  <div
    class="tt-controls"
    :class="{ 'tt-controls--floating': floating }"
  >
    <!-- 浮动模式只保留浅色/深色快速切换，不显示设置面板 -->
    <button
      v-if="floating"
      type="button"
      class="tt-fab"
      :title="modeTip"
      :aria-label="modeTip"
      @click="onCycleClick"
    >
      <!-- 仿 ota_manager 原版,只两态: 浅色显示月亮(暗示点了变暗),深色显示太阳(暗示点了变亮) -->
      <app-icon v-show="actualTheme === 'light'" name="moon" size="var(--icon-size-lg)" />
      <app-icon v-show="actualTheme === 'dark'" name="sun" size="var(--icon-size-lg)" />
    </button>

    <!-- 内联模式：原版样式 -->
    <template v-else>
      <button
        type="button"
        class="tt-btn"
        :title="modeTip"
        :aria-label="modeTip"
        @click="onCycleClick"
      >
        <app-icon v-show="actualTheme === 'light'" name="moon" size="var(--icon-size-md)" />
        <app-icon v-show="actualTheme === 'dark'" name="sun" size="var(--icon-size-md)" />
      </button>
    </template>
  </div>
</template>

<script>
import {
  getMode,
  getTheme,
  cycleMode,
  applyTheme,
  bindCrossTabSync,
  bindSystemThemeListener
} from '@/utils/dark-theme'

const MODE_TIP_KEYS = {
  light: 'theme_toggle.tip_light',
  dark: 'theme_toggle.tip_dark',
  auto: 'theme_toggle.tip_auto'
}

export default {
  name: 'ThemeToggle',
  props: {
    // 是否渲染成右下角浮动按钮
    floating: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      // 用户选的 mode：'light' | 'dark' | 'auto'
      mode: 'light',
      // 实际生效的主题(用于按钮图标显示;auto 模式下解析为 light 或 dark)
      actualTheme: 'light'
    }
  },
  computed: {
    modeTip () {
      const key = MODE_TIP_KEYS[this.mode]
      return key ? this.$t(key) : this.$t('theme_toggle.tip_default')
    }
  },
  mounted () {
    // 先把 <html data-theme> 与遮罩按存储值刷一遍，再把状态同步到组件
    applyTheme()
    this.refreshFromStore()
    // 跨 tab 改主题/亮度时回灌到本组件
    bindCrossTabSync(() => this.refreshFromStore())
    // 系统主题变化时（auto 模式）回灌
    bindSystemThemeListener(() => this.refreshFromStore())
  },
  methods: {
    refreshFromStore () {
      this.mode = getMode()
      this.actualTheme = getTheme() // auto 解析为系统当前色
    },
    onCycleClick () {
      cycleMode()
      this.refreshFromStore()
    }
  }
}
</script>

<!-- 样式由 src/assets/styles/dark-theme.scss 全局定义，组件内不写样式 -->
