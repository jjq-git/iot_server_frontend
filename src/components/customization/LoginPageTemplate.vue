<template>
  <div
    class="custom-login-page"
    :class="[`custom-login-page--${normalizedConfig.layout}`, { 'is-preview': preview }]"
    :style="themeStyle"
  >
    <section class="custom-login-page__visual" :style="visualStyle">
      <div class="custom-login-page__brand">
        <img v-if="logoUrl" :src="logoUrl" alt="" class="custom-login-page__logo">
        <span v-else class="custom-login-page__mark" aria-hidden="true">{{ brandInitials }}</span>
        <span>{{ companyName }}</span>
      </div>
      <div v-if="isBrandStatementLayout" class="custom-login-page__statement">
        <h2>{{ displayContent.heroTitle }}</h2>
        <div>{{ displayContent.heroSubtitle }}</div>
        <p>{{ displayContent.heroDescription }}</p>
      </div>
      <footer v-if="isBrandStatementLayout" class="custom-login-page__visual-footer">
        {{ displayContent.copyright }}
      </footer>
    </section>

    <section class="custom-login-page__panel">
      <div class="custom-login-page__form-wrap">
        <div class="custom-login-page__kicker">{{ displayContent.kicker }}</div>
        <h1>{{ displayContent.title }}</h1>
        <p v-if="!isBrandStatementLayout">{{ displayContent.description }}</p>

        <form @submit.prevent="$emit('submit')">
          <label>
            <span>{{ $t('auth.login_page.account_label') }}</span>
            <span class="custom-login-page__input">
              <app-icon name="person" />
              <input
                :value="email"
                type="email"
                :disabled="preview"
                :placeholder="$t('auth.login_page.prototype_account_placeholder')"
                autocomplete="email"
                @input="$emit('update:email', $event.target.value)"
              >
            </span>
          </label>

          <label>
            <span>{{ $t('auth.login_page.password_label') }}</span>
            <span class="custom-login-page__input">
              <app-icon name="lock" />
              <input
                :value="password"
                :type="showPassword ? 'text' : 'password'"
                :disabled="preview"
                :placeholder="$t('auth.login_page.password_placeholder')"
                autocomplete="current-password"
                @input="$emit('update:password', $event.target.value)"
              >
              <button
                type="button"
                :disabled="preview"
                :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                :aria-pressed="showPassword ? 'true' : 'false'"
                @click="$emit('update:show-password', !showPassword)"
              >
                <app-icon :name="showPassword ? 'eye-slash' : 'eye'" />
              </button>
            </span>
          </label>

          <div v-if="normalizedConfig.options.show_remember_me" class="custom-login-page__options">
            <button
              v-if="normalizedConfig.options.show_remember_me"
              type="button"
              :disabled="preview"
              :aria-pressed="rememberLogin ? 'true' : 'false'"
              class="custom-login-page__remember"
              @click="$emit('update:remember-login', !rememberLogin)"
            >
              <span :class="['custom-login-page__checkbox', { 'is-checked': rememberLogin }]">
                <app-icon v-if="rememberLogin" name="check" />
              </span>
              {{ $t('auth.login_page.remember_login') }}
            </button>
          </div>

          <button class="custom-login-page__submit" type="submit" :disabled="loading || preview">
            <span>{{ loading ? $t('common.loading') : $t('auth.login_page.submit') }}</span>
            <app-icon name="box-arrow-right" />
          </button>
        </form>

        <slot name="after-form" />
      </div>

      <footer v-if="!isBrandStatementLayout">{{ displayContent.copyright }}</footer>
    </section>
  </div>
</template>

<script>
import { createLoginPageConfig, normalizeAssetUrl } from '@/services/customization/templateConfig'

const colorWithAlpha = (value, alpha) => {
  const match = String(value || '').trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) return `rgb(8 31 31 / ${alpha})`
  const hex = match[1]
  return `rgb(${parseInt(hex.slice(0, 2), 16)} ${parseInt(hex.slice(2, 4), 16)} ${parseInt(hex.slice(4, 6), 16)} / ${alpha})`
}

const SYSTEM_PRIMARY_COLOR = '#078484'

export default {
  name: 'LoginPageTemplate',
  props: {
    config: { type: Object, default: () => createLoginPageConfig() },
    branding: { type: Object, default: () => ({}) },
    email: { type: String, default: '' },
    password: { type: String, default: '' },
    showPassword: { type: Boolean, default: false },
    rememberLogin: { type: Boolean, default: true },
    loading: { type: Boolean, default: false },
    preview: { type: Boolean, default: false }
  },
  computed: {
    normalizedConfig () {
      const defaults = createLoginPageConfig()
      return {
        ...defaults,
        ...this.config,
        theme: { ...defaults.theme, ...(this.config.theme || {}) },
        assets: { ...defaults.assets, ...(this.config.assets || {}) },
        content: { ...defaults.content, ...(this.config.content || {}) },
        options: { ...defaults.options, ...(this.config.options || {}) }
      }
    },
    displayContent () {
      return {
        kicker: this.normalizedConfig.content.kicker || this.$t('auth.login_page.sign_in'),
        title: this.normalizedConfig.content.title || this.$t('auth.login_page.management_title'),
        description: this.normalizedConfig.content.description || this.$t('auth.login_page.management_description'),
        copyright: this.normalizedConfig.content.copyright || this.$t('auth.login_page.support_copyright'),
        heroTitle: this.normalizedConfig.content.hero_title || this.$t('auth.login_page.brand_statement_title'),
        heroSubtitle: this.normalizedConfig.content.hero_subtitle || this.$t('auth.login_page.brand_statement_subtitle'),
        heroDescription: this.normalizedConfig.content.hero_description || this.$t('auth.login_page.brand_statement_description')
      }
    },
    isBrandStatementLayout () {
      return this.normalizedConfig.layout === 'brand_statement'
    },
    companyName () {
      return this.branding.company_name || this.branding.name || this.$t('sidebar.default_brand')
    },
    brandInitials () {
      return this.companyName.trim().slice(0, 2).toUpperCase() || 'IO'
    },
    logoUrl () {
      const brandLogo = normalizeAssetUrl(this.branding.logo || this.branding.logo_url)
      if (this.normalizedConfig.options.use_brand_logo !== false) return brandLogo
      return normalizeAssetUrl(this.normalizedConfig.assets.logo_url)
    },
    effectivePrimaryColor () {
      const brandPrimary = this.branding.primary_color || this.branding.primaryColor
      if (this.normalizedConfig.options.use_brand_primary_color !== false) {
        return brandPrimary || SYSTEM_PRIMARY_COLOR
      }
      return this.normalizedConfig.theme.primary_color || brandPrimary || SYSTEM_PRIMARY_COLOR
    },
    themeStyle () {
      return {
        '--custom-login-primary': this.effectivePrimaryColor,
        '--custom-login-panel': this.normalizedConfig.theme.panel_color,
        '--custom-login-text': this.normalizedConfig.theme.text_color
      }
    },
    visualStyle () {
      const backgroundUrl = normalizeAssetUrl(this.normalizedConfig.assets.background_url)
      const backgroundColor = this.normalizedConfig.theme.background_color || this.effectivePrimaryColor
      return backgroundUrl
        ? {
            backgroundColor,
            backgroundImage: `linear-gradient(${colorWithAlpha(backgroundColor, 0.56)}, ${colorWithAlpha(backgroundColor, 0.56)}), url("${backgroundUrl}")`
          }
        : { backgroundColor, backgroundImage: 'none' }
    }
  }
}
</script>
