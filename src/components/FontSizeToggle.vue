<template>
  <b-form-select
    class="font-size-select"
    :value="current"
    :options="options"
    :aria-label="$t('font_size_toggle.aria_label')"
    @change="select"
  />
</template>

<script>
import { getFontSize, setFontSize, DEFAULT_FONT_SIZE } from '@/utils/font-size'

export default {
  name: 'FontSizeToggle',
  data () {
    return {
      current: getFontSize()
    }
  },
  computed: {
    options () {
      return [
        { value: 'small', text: this.$t('font_size_toggle.small') },
        { value: 'medium', text: this.$t('font_size_toggle.medium') },
        { value: 'large', text: this.$t('font_size_toggle.large') }
      ]
    }
  },
  mounted () {
    // 跨 tab 同步：另一个 tab 切换字号，本 tab 也更新高亮态
    this._onStorage = (e) => {
      if (e.key && e.key.endsWith('_font_size')) {
        this.current = getFontSize()
      }
    }
    window.addEventListener('storage', this._onStorage)
  },
  beforeDestroy () {
    if (this._onStorage) {
      window.removeEventListener('storage', this._onStorage)
    }
  },
  methods: {
    select (size) {
      this.current = setFontSize(size || DEFAULT_FONT_SIZE)
    }
  }
}
</script>

<style scoped>
.font-size-select {
  width: 100%;
  height: var(--control-height-menu);
  padding-right: var(--control-height-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-control);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  box-shadow: none;
}

.font-size-select:hover,
.font-size-select:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand) 12%, transparent);
}

[data-theme="dark"] .font-size-select {
  border-color: var(--color-border-light);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
}
</style>
