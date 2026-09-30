<template>
  <div class="login-view">
    <demo-role-picker
      v-if="demoMode"
      :scenarios="demoScenarios"
      :loading="loading"
      :error="errorMsg"
      @select="handleDemoScenario"
    />
    <login-page-template
      v-else-if="customLoginConfig"
      :config="customLoginConfig"
      :branding="customLoginBranding"
      :email.sync="form.email"
      :password.sync="form.password"
      :show-password.sync="showPassword"
      :remember-login.sync="rememberLogin"
      :loading="loading"
      @submit="handleSubmit"
    >
      <template #after-form>
        <login-test-accounts
          :accounts="testAccounts"
          :password="testAccountPassword"
          @select="useTestAccount"
          @copy="copyTestCredential"
        />
      </template>
    </login-page-template>

    <div v-else-if="customTemplate" ref="customLoginContainer" class="custom-login-wrapper"></div>

    <main v-else class="login-page">
      <section class="login-visual" :aria-label="$t('auth.login_page.platform_brand')">
        <div class="login-platform-brand">
          <span class="login-platform-mark" aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="currentColor">
              <path d="M50,50l16.57-7.03C67.49,45.13,68,47.5,68,50c0,9.94-8.06,18-18,18c-9.94,0-18-8.06-18-18s8.06-18,18-18c2.39,0,4.66.47,6.74,1.32L50,50z M83.14,35.93C84.98,40.25,86,45.01,86,50c0,19.88-16.12,36-36,36c-19.88,0-36-16.12-36-36S30.12,14,50,14c4.77,0,9.32.94,13.49,2.62l3.37-8.34C61.65,6.17,55.96,5,50,5C25.15,5,5,25.15,5,50s20.15,45,45,45s45-20.15,45-45c0-6.24-1.27-12.18-3.57-17.59L83.14,35.93z M76.41,13.57l-13.68,23.7l23.7-13.68c-2.8-3.84-6.18-7.22-10.02-10.02z" />
            </svg>
          </span>
          <span class="login-platform-name">{{ $t('auth.login_page.platform_brand') }}</span>
        </div>
      </section>

      <section class="login-panel">
        <div class="login-panel-spacer"></div>

        <div class="login-form-wrap">
          <div class="login-kicker">{{ $t('auth.login_page.sign_in') }}</div>
          <h1 class="login-title">{{ $t('auth.login_page.management_title') }}</h1>
          <p class="login-description">{{ $t('auth.login_page.management_description') }}</p>

          <div v-if="activeCompanySlug" class="company-slug-hint">
            {{ $t('auth.login_page.company_slug_label', { slug: activeCompanySlug }) }}
          </div>

          <form class="login-form" @submit.prevent="handleSubmit">
            <label class="login-field" for="email-input">
              <span class="login-field-label">{{ $t('auth.login_page.account_label') }}</span>
              <span class="login-input-shell login-input-shell--brand">
                <app-icon name="person" />
                <input
                  id="email-input"
                  v-model.trim="form.email"
                  type="email"
                  :placeholder="$t('auth.login_page.prototype_account_placeholder')"
                  autocomplete="email"
                >
              </span>
            </label>

            <label class="login-field" for="password-input">
              <span class="login-field-label">{{ $t('auth.login_page.password_label') }}</span>
              <span class="login-input-shell login-input-shell--brand">
                <app-icon name="lock" />
                <input
                  id="password-input"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  :placeholder="$t('auth.login_page.password_placeholder')"
                  autocomplete="current-password"
                >
                <button
                  class="login-password-toggle"
                  type="button"
                  :aria-label="showPassword ? $t('common.hide') : $t('common.show')"
                  :aria-pressed="showPassword ? 'true' : 'false'"
                  @click="showPassword = !showPassword"
                >
                  <app-icon :name="showPassword ? 'eye-slash' : 'eye'" />
                </button>
              </span>
            </label>

            <div class="login-options">
              <button
                class="login-remember"
                type="button"
                :aria-pressed="rememberLogin ? 'true' : 'false'"
                @click="rememberLogin = !rememberLogin"
              >
                <span class="login-checkbox" :class="{ 'is-checked': rememberLogin }" aria-hidden="true">
                  <app-icon name="check" />
                </span>
                <span>{{ $t('auth.login_page.remember_login') }}</span>
              </button>
              <router-link to="/forgot-password" class="login-forgot-password">
                {{ $t('auth.login_page.forgot_password') }}
              </router-link>
            </div>

            <div v-if="errorMsg" class="login-error" role="alert">
              {{ errorMsg }}
            </div>

            <button class="login-submit" type="submit" :disabled="loading">
              <span>{{ loading ? $t('common.loading') : $t('auth.login_page.submit') }}</span>
              <app-icon name="arrow-right" />
            </button>
          </form>

          <login-test-accounts
            :accounts="testAccounts"
            :password="testAccountPassword"
            @select="useTestAccount"
            @copy="copyTestCredential"
          />
        </div>

        <div class="login-panel-spacer"></div>
        <footer class="login-footer">
          <span>{{ $t('auth.login_page.support_copyright') }}</span>
        </footer>
      </section>
    </main>

  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { login } from '@/api'
import { fetchPublicCompanyDashboardConfig } from '@/api/company-dashboard-config'
import DOMPurify from 'dompurify'
import LoginPageTemplate from '@/components/customization/LoginPageTemplate.vue'
import LoginTestAccounts from '@/components/customization/LoginTestAccounts.vue'
import { clearDashboardQueryCache } from '@/services/dashboard/queryCache'
import { parseTemplateConfig } from '@/services/customization/templateConfig'
import { copyText } from '@/utils/clipboard'
import { appConfig } from '@/utils/config'
import {
  buildLoginTemplateLookup,
  normalizeLoginCompanySlug,
  rememberLoginEntry,
  resolveLoginCompanySlug
} from '@/utils/loginEntry'
import { sanitizeTemplateCss } from '@/utils/templateSanitizer'
import { persistCurrentUser } from '@/utils/sessionContext'
import { updateThemeColor, updateThemeFont } from '@/utils/theme'
import { getDemoSessionService, isDemoMode } from '@/app-mode/runtime'

const loginTemplateSanitizeConfig = {
  USE_PROFILES: { html: true },
  // 样式只允许走单独的 css_content + sanitizeTemplateCss,避免 HTML 内 CSS 绕过。
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'applet', 'base', 'meta', 'link', 'svg', 'math'],
  FORBID_ATTR: [
    'style', 'srcdoc', 'nonce',
    'action', 'method', 'enctype', 'accept-charset',
    'formaction', 'formmethod', 'formtarget', 'formenctype'
  ]
}

const DEV_TEST_ACCOUNTS = Object.freeze([
  { email: 'admin@example.com', companyId: 1, role: 'admin' },
  { email: 'admin_mf10@example.com', companyId: 10, role: 'admin' },
  { email: 'maintainer_mf10@example.com', companyId: 10, role: 'operator' },
  { email: 'data_entry_mf10@example.com', companyId: 10, role: 'data_entry' },
  { email: 'admin_br20@example.com', companyId: 20, role: 'admin' },
  { email: 'viewer_br20@example.com', companyId: 20, role: 'viewer' },
  { email: 'admin_mf30@example.com', companyId: 30, role: 'admin' },
  { email: 'maintainer_mf30@example.com', companyId: 30, role: 'operator' }
])

export default {
  name: 'Login',
  components: { LoginPageTemplate, LoginTestAccounts },
  data () {
    const isDevelopment = process.env.NODE_ENV !== 'production'
    const runtimeTestAccountPassword = typeof appConfig.config.testAccountPassword === 'string'
      ? appConfig.config.testAccountPassword
      : ''
    const runtimeTestAccounts = Array.isArray(appConfig.config.testAccounts)
      ? appConfig.config.testAccounts.filter(account => (
        account &&
        typeof account.email === 'string' &&
        Number.isFinite(Number(account.companyId)) &&
        ['admin', 'operator', 'data_entry', 'viewer'].includes(account.role)
      ))
      : []
    const testAccountPassword = runtimeTestAccountPassword
    const testAccounts = isDevelopment
      ? (runtimeTestAccounts.length ? runtimeTestAccounts : DEV_TEST_ACCOUNTS)
      : (testAccountPassword ? runtimeTestAccounts : [])

    return {
      demoMode: isDemoMode(),
      demoScenarios: getDemoSessionService()?.scenarios || [],
      form: {
        email: '',
        password: ''
      },
      loading: false,
      errorMsg: '',
      showPassword: false,
      rememberLogin: true,
      companySlug: '',
      resolvedCompanySlug: '',
      // 自定义登录页模板
      customTemplate: null,
      customLoginBranding: {},
      templateStyleElement: null,
      customTemplateForm: null,
      customTemplateSubmitHandler: null,
      testAccountPassword,
      testAccounts
    }
  },
  computed: {
    activeCompanySlug () {
      return this.resolvedCompanySlug || this.companySlug
    },
    customLoginConfig () {
      if (!this.customTemplate?.html) return null
      return parseTemplateConfig(this.customTemplate.html, 'login_page')
    }
  },
  created () {
    // 获取路由中的 companySlug 参数
    this.companySlug = normalizeLoginCompanySlug(this.$route.params.companySlug)
    this.resolvedCompanySlug = this.companySlug
    // 记录本次登录入口，供退出登录、登录态过期和改密后重新登录使用。
    // 直接访问公共登录页时清除旧值，避免沿用上一次公司的入口。
    rememberLoginEntry(this.companySlug)
    // 总是尝试加载公司自定义登录页模板（以完整入口 URL 识别公司，旧 slug 路由仅兼容）。
    this.loadCustomLoginTemplate()
  },
  methods: {
    async handleDemoScenario (scenarioId) {
      if (this.loading) return
      this.loading = true
      this.errorMsg = ''
      try {
        const service = getDemoSessionService()
        if (!service) throw new Error('Demo session service is unavailable')
        service.selectScenario(scenarioId)
        const { getCurrentUser } = await import('@/api/user')
        const user = await getCurrentUser()
        persistCurrentUser(user)
        clearDashboardQueryCache()
        await this.$router.push('/dashboard')
      } catch (error) {
        const message = this.$getErrorMessage(error) || this.$t('demo.start_failed')
        this.errorMsg = message
        this.$uiToast.error(message)
      } finally {
        this.loading = false
      }
    },
    useTestAccount (account) {
      this.form.email = account.email
      if (this.testAccountPassword) {
        this.form.password = this.testAccountPassword
      }
    },
    async copyTestCredential (value) {
      try {
        await copyText(value)
        this.$uiToast.success(this.$t('auth.login_page.copy_success', { text: value }))
      } catch (error) {
        this.$uiToast.error(this.$t('auth.login_page.copy_failed'))
      }
    },
    /**
     * 加载自定义登录页模板
     * 通过完整入口 URL 自动识别公司，旧 companySlug 路由保留兼容。
     */
    async loadCustomLoginTemplate () {
      try {
        const params = buildLoginTemplateLookup({
          companySlug: this.companySlug,
          href: `${window.location.origin}${window.location.pathname}`,
          hostname: window.location.hostname
        })

        const template = await fetchPublicCompanyDashboardConfig(params)
        // 自定义域名没有路由 slug；以后端实际解析出的公司标识作为登录租户上下文。
        this.resolvedCompanySlug = resolveLoginCompanySlug(template, this.companySlug)
        // company 提供名称、标识等基础信息，branding 才是最终生效的品牌配置。
        // 部分 company 字段可能为 null，必须让 branding 后合并，避免有效的
        // Logo 和主题色被 null 覆盖后错误回退到系统默认样式。
        this.customLoginBranding = {
          ...(template.company || {}),
          ...(template.branding || {})
        }
        if (template.branding) {
          localStorage.setItem('company_branding', JSON.stringify(template.branding))
          // 更新主题色
          updateThemeColor(template.branding.primary_color || template.branding.primaryColor)
          updateThemeFont(template.branding.font_family || template.branding.fontFamily)
        }
        if (template.company) {
          localStorage.setItem('company_info', JSON.stringify(template.company))
        }
        if (template && template.templates && template.templates[0]) {
          // 兼容两种响应格式
          this.customTemplate = template.templates[0]
          // 保存 branding 配置到本地
          // 等待 DOM 渲染后注入内容和样式
          if (!this.customLoginConfig) {
            this.$nextTick(() => {
              this.injectCustomTemplate()
            })
          }
        }
      } catch (error) {
        // 加载失败，使用默认登录页
        console.error('自定义登录页加载失败，使用默认页面:', error.message)
        this.customTemplate = null
        this.resolvedCompanySlug = this.companySlug
      }
    },

    /**
     * 注入自定义模板内容和样式
     */
    injectCustomTemplate () {
      if (!this.customTemplate || this.customLoginConfig || !this.$refs.customLoginContainer) return

      const container = this.$refs.customLoginContainer

      if (this.customTemplateForm && this.customTemplateSubmitHandler) {
        this.customTemplateForm.removeEventListener('submit', this.customTemplateSubmitHandler)
        this.customTemplateForm = null
        this.customTemplateSubmitHandler = null
      }

      // 注入 HTML
      container.innerHTML = DOMPurify.sanitize(
        String(this.customTemplate.html || ''),
        loginTemplateSanitizeConfig
      )

      // 旧式 HTML 登录模板必须提供一个可由前端接管的登录表单。
      // 若历史数据只有展示内容（例如调试占位文本），必须回退默认登录页，
      // 否则用户看得到模板却没有任何登录入口。
      const forms = container.querySelectorAll('form')
      const form = forms[0]
      const emailInput = form && form.querySelector('input[name="email"], input[name="account"], input[name="username"]')
      const passwordInput = form && form.querySelector('input[name="password"]')
      if (forms.length !== 1 || !emailInput || !passwordInput) {
        console.error('自定义登录页缺少唯一且完整的登录表单，已回退默认登录页')
        container.replaceChildren()
        this.customTemplate = null
        return
      }

      // 结构通过校验后才注入 CSS，避免无效模板的样式污染默认登录页。
      if (this.customTemplate.css) {
        if (this.templateStyleElement) {
          this.templateStyleElement.remove()
        }
        this.templateStyleElement = document.createElement('style')
        this.templateStyleElement.textContent = sanitizeTemplateCss(this.customTemplate.css)
        document.head.appendChild(this.templateStyleElement)
      }

      // 纵深防御：即使服务端或历史数据漏清洗，也禁止浏览器执行原生提交。
      const forbiddenNativeSubmitAttrs = [
        'action', 'method', 'target', 'enctype', 'accept-charset',
        'formaction', 'formmethod', 'formtarget', 'formenctype'
      ]
      forbiddenNativeSubmitAttrs.forEach(attr => form.removeAttribute(attr))
      form.querySelectorAll('[formaction], [formmethod], [formtarget], [formenctype]').forEach(element => {
        element.removeAttribute('formaction')
        element.removeAttribute('formmethod')
        element.removeAttribute('formtarget')
        element.removeAttribute('formenctype')
      })
      this.customTemplateForm = form
      this.customTemplateSubmitHandler = (e) => {
        e.preventDefault()
        this.handleCustomLogin(form)
      }
      form.addEventListener('submit', this.customTemplateSubmitHandler)
    },

    /**
     * 处理自定义表单登录
     */
    handleCustomLogin (form) {
      const formData = new FormData(form)
      const data = {
        email: formData.get('email') || formData.get('account') || formData.get('username'),
        password: formData.get('password')
      }

      if (!data.email || !data.password) {
        // 尝试从 input 的 value 获取
        const emailInput = form.querySelector('input[name="email"], input[name="account"], input[name="username"]')
        const passwordInput = form.querySelector('input[name="password"]')
        data.email = data.email || (emailInput && emailInput.value)
        data.password = data.password || (passwordInput && passwordInput.value)
      }

      if (!data.email || !data.password) {
        this.$uiToast.warning(this.$t('auth.login_page.validation_account_password_required'))
        return
      }

      this.form = data
      this.submitLogin(data)
    },

    /**
     * 提交登录
     */
    async submitLogin (data) {
      if (this.loading) return

      this.loading = true
      this.errorMsg = ''
      try {
        const res = await login({
          email: data.email,
          password: data.password
        })

        if (res && res.access_token) {
          clearDashboardQueryCache()
          localStorage.setItem('token', res.access_token)
        }

        if (res && res.user) {
          persistCurrentUser(res.user)

          try {
            const { getCurrentUser } = await import('@/api/user')
            const userInfo = await getCurrentUser()
            if (userInfo) {
              if (userInfo.avatar && !userInfo.avatar.startsWith('http') && !userInfo.avatar.startsWith('/')) {
                userInfo.avatar = '/' + userInfo.avatar
              }
              persistCurrentUser(userInfo)
            }
          } catch (e) {
          }
        }

        // must_change_password=true 时跳改密页（厂家/新建账号首次登录默认强制改密），
        // 否则进 dashboard 会被后端 E2013 拦截器拦回登录页死循环。
        if (res && res.must_change_password) {
          this.$uiToast.info(this.$t('auth.must_change_password_first'))
          this.$router.push('/user/profile?force_change_password=1')
        } else {
          this.$router.push(typeof this.$route.query.redirect === 'string' ? this.$route.query.redirect : '/dashboard')
        }
      } catch (error) {
        const msg =
          this.$getErrorMessage(error) || this.$t('auth.login_page.submit_failed')
        this.errorMsg = msg
        this.$uiToast.error(msg)
      } finally {
        this.loading = false
      }
    },

    validateLoginForm () {
      if (!this.form.email) {
        this.$uiToast.warning(this.$t('auth.login_page.validation_account_required'))
        return false
      }

      if (!this.form.password) {
        this.$uiToast.warning(this.$t('auth.login_page.validation_password_required'))
        return false
      }

      return true
    },
    async handleSubmit () {
      if (!this.validateLoginForm() || this.loading) return
      await this.submitLogin(this.form)
    }
  },
  beforeDestroy () {
    if (this.customTemplateForm && this.customTemplateSubmitHandler) {
      this.customTemplateForm.removeEventListener('submit', this.customTemplateSubmitHandler)
      this.customTemplateForm = null
      this.customTemplateSubmitHandler = null
    }
    // 清理自定义模板样式
    if (this.templateStyleElement) {
      this.templateStyleElement.remove()
      this.templateStyleElement = null
    }
  }
}
</script>
