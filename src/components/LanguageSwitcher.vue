<template>
  <div class="lang-switcher">
    <b-form-select
      class="lang-switcher__select"
      :value="current"
      :options="selectOptions"
      :disabled="loading"
      :aria-label="$t('common.switch_language')"
      @change="select"
    />
    <b-spinner v-if="loading" small class="lang-switcher__spinner" />
  </div>
</template>

<script>
import { SUPPORTED_LOCALES, setLocale, ensureLocaleLoaded } from '@/locales'

export default {
  name: 'LanguageSwitcher',
  data () {
    return {
      current: this.$i18n.locale,
      options: SUPPORTED_LOCALES,
      // 切换语言期间为 true，避免连点 + UI 闪烁
      loading: false
    }
  },
  computed: {
    selectOptions () {
      return this.options.map(option => ({
        value: option.code,
        text: option.nativeName
      }))
    }
  },
  mounted () {
    // 跨标签页同步：另一标签 setLocale 后 localStorage 触发 storage 事件
    // 这里也要 await 加载 messages 再切，否则会出现 fallback 闪烁
    this._onStorage = async (e) => {
      if (e.key === 'locale' && e.newValue && e.newValue !== this.current) {
        try {
          await ensureLocaleLoaded(e.newValue)
          this.$i18n.locale = e.newValue
          this.current = e.newValue
          if (typeof document !== 'undefined') {
            document.documentElement.lang = e.newValue
          }
        } catch (err) {
          console.warn('[i18n] cross-tab locale sync failed:', err)
        }
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
    async select (code) {
      if (code === this.current || this.loading) return
      this.loading = true
      try {
        await setLocale(code)
        this.current = code
        if (this.$eventBus) {
          this.$eventBus.$emit('locale-changed', code)
        }
      } catch (err) {
        console.warn('[i18n] setLocale failed:', err)
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.lang-switcher {
  position: relative;
  width: 100%;
}

.lang-switcher__select {
  width: 100%;
  height: var(--control-height-menu);
  padding-right: var(--control-height-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-control);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
  box-shadow: none;
}

.lang-switcher__select:hover,
.lang-switcher__select:focus {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-brand) 12%, transparent);
}

.lang-switcher__spinner {
  position: absolute;
  top: 11px;
  right: 34px;
  color: var(--color-brand);
}

[data-theme="dark"] .lang-switcher__select {
  border-color: var(--color-border-light);
  background-color: var(--color-bg-card);
  color: var(--color-text-primary);
}
</style>
