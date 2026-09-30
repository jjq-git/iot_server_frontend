/* eslint-disable import/first, camelcase */
// 资源基准路径（路由懒加载 chunk 等动态资源的前缀）。
//
// 默认不覆盖，交给 webpack 的 output.publicPath: "auto"——它在运行时按当前脚本自身的
// URL 推导前缀，站点挂在根路径 `/` 还是子路径 `/iot/` 都能正确加载 chunk。
//
// 这里曾硬编码为 `production ? '/iot/' : '/'`，导致部署到根路径时出现很迷惑的故障：
// 首屏正常（index.html 用相对路径引脚本），但一进路由，懒加载 chunk 仍去 `/iot/js/*` → 404
// → 触发下方 router.onError 兜底 → 跳到服务器上不存在的真实路径 → 白屏。
//
// 只有把静态资源单独放到 CDN 或与页面不同源时，才用 VUE_APP_BASE_PATH 显式覆盖，
// 值必须以 '/' 结尾，例如 https://cdn.example.com/iot/
if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_PATH) {
  // eslint-disable-next-line no-undef, no-global-assign
  __webpack_public_path__ = process.env.VUE_APP_BASE_PATH
}

// 应用入口：
// - 注册 BootstrapVue
// - 引入全局样式
// - 初始化路由
import Vue from 'vue'
import {
  AlertPlugin,
  BadgePlugin,
  BreadcrumbPlugin,
  ButtonGroupPlugin,
  ButtonPlugin,
  CardPlugin,
  DropdownPlugin,
  FormCheckboxPlugin,
  FormDatepickerPlugin,
  FormFilePlugin,
  FormGroupPlugin,
  FormInputPlugin,
  FormPlugin,
  FormRadioPlugin,
  FormSelectPlugin,
  FormTextareaPlugin,
  ImagePlugin,
  InputGroupPlugin,
  LayoutPlugin,
  LinkPlugin,
  ListGroupPlugin,
  ModalPlugin,
  OverlayPlugin,
  PaginationPlugin,
  ProgressPlugin,
  SpinnerPlugin,
  TablePlugin,
  TabsPlugin,
  ToastPlugin
} from 'bootstrap-vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import '@/assets/styles/index.scss'
import '@/assets/styles/dark-theme.scss'

import App from '@/App.vue'
import router from '@/router'
import i18n, { ensureLocaleLoaded, initialLocaleCode } from '@/locales'
import { bootstrapAppModeInfrastructure } from '@app-mode-entry'
import { validateAppStartup } from '@/app-mode/validate'
import { synchronizeSessionAppMode } from '@/app-mode/runtime'
import { renderStartupError } from '@/app-mode/startupError'

// 启动期同步 <html lang>:public/index.html 写死 zh-CN,这里第一时间对齐当前 locale
// 后续 setLocale() / bootstrap 内 await ensureLocaleLoaded 后会再同步一次,确保切换不掉队
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLocaleCode || i18n.locale
}
import rolePermission from '@/mixins/rolePermission'
import { appConfig } from '@/utils/config'
import { initTheme } from '@/utils/theme'
import {
  applyThemeASAP,
  applyTheme as applyDarkTheme,
  bindCrossTabSync,
  bindSystemThemeListener
} from '@/utils/dark-theme'
import {
  applyFontSizeASAP,
  bindFontSizeCrossTabSync
} from '@/utils/font-size'

// 防闪白：Vue 实例化前就把 data-theme 设到 <html>
applyThemeASAP()
// 字号同样：先应用，避免 Vue 渲染后再切换造成闪烁
applyFontSizeASAP()
// 跨标签页同步：A 标签切深色，B 标签也立刻跟随
bindCrossTabSync(() => applyDarkTheme())
bindFontSizeCrossTabSync()
// 系统主题变化：auto 模式自动跟随
bindSystemThemeListener(() => applyDarkTheme())
import * as toast from '@/services/ui/toast'
import { confirm } from '@/services/ui/confirm'
import { getErrorMessage } from '@/services/error'

Vue.config.productionTip = false
Vue.use(AlertPlugin)
Vue.use(BadgePlugin)
Vue.use(BreadcrumbPlugin)
Vue.use(ButtonPlugin)
Vue.use(ButtonGroupPlugin)
Vue.use(CardPlugin)
Vue.use(DropdownPlugin)
Vue.use(FormPlugin)
Vue.use(FormCheckboxPlugin)
Vue.use(FormDatepickerPlugin)
Vue.use(FormFilePlugin)
Vue.use(FormGroupPlugin)
Vue.use(FormInputPlugin)
Vue.use(FormRadioPlugin)
Vue.use(FormSelectPlugin)
Vue.use(FormTextareaPlugin)
Vue.use(ImagePlugin)
Vue.use(InputGroupPlugin)
Vue.use(LayoutPlugin)
Vue.use(LinkPlugin)
Vue.use(ListGroupPlugin)
Vue.use(ModalPlugin)
Vue.use(OverlayPlugin)
Vue.use(PaginationPlugin)
Vue.use(ProgressPlugin)
Vue.use(SpinnerPlugin)
Vue.use(TablePlugin)
Vue.use(TabsPlugin)
Vue.use(ToastPlugin)
Vue.mixin(rolePermission)

// 注册基础组件
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseActionButton from '@/components/base/BaseActionButton.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseLoading from '@/components/base/BaseLoading.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import PageSectionCard from '@/components/shared/PageSectionCard.vue'
import editableTrigger from '@/directives/editableTrigger'

Vue.component('BaseCard', BaseCard)
Vue.component('BaseButton', BaseButton)
Vue.component('BaseIconButton', BaseIconButton)
Vue.component('BaseActionButton', BaseActionButton)
Vue.component('BaseInput', BaseInput)
Vue.component('BaseSelect', BaseSelect)
Vue.component('BasePagination', BasePagination)
Vue.component('BaseTable', BaseTable)
Vue.component('BaseBadge', BaseBadge)
Vue.component('BaseLoading', BaseLoading)
Vue.component('BaseSwitch', BaseSwitch)
Vue.component('BaseFormGroup', BaseFormGroup)
Vue.component('BaseModal', BaseModal)
Vue.component('AppIcon', AppIcon)
Vue.component('PageSectionCard', PageSectionCard)
Vue.directive('editable-trigger', editableTrigger)

// 全局 filter：按当前 i18n locale 输出千分位数字（如 1,234,567 / 1.234.567）
// 用法：{{ value | formatNumber }}；非数字/空值原样返回，避免误改文本
Vue.filter('formatNumber', (value) => {
  if (value === null || value === undefined || value === '') return value
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  try {
    return new Intl.NumberFormat(i18n.locale).format(num)
  } catch (e) {
    return num.toString()
  }
})

// 创建全局事件总线，用于组件间通信
Vue.prototype.$eventBus = new Vue()
Vue.prototype.$uiToast = toast
Vue.prototype.$uiConfirm = confirm
Vue.prototype.$getErrorMessage = getErrorMessage

const bootstrap = async () => {
  /* global __BUILD_APP_MODE__, __DEMO_DEV_HOSTS__ */
  const buildAppMode = __BUILD_APP_MODE__
  try {
    const runtimeConfig = await appConfig.load()
    const appMode = validateAppStartup({
      buildAppMode,
      runtimeConfig,
      hostname: window.location.hostname,
      isDevelopment: process.env.NODE_ENV === 'development',
      demoDevHosts: __DEMO_DEV_HOSTS__
    })
    synchronizeSessionAppMode(appMode)
    await bootstrapAppModeInfrastructure()

    // 初始化主题色
    initTheme()
    // 初始 locale（非 zh-CN 时）按需异步加载 messages，加载完才挂载 Vue 实例，
    // 防止首屏出现 "目标语言未加载 → 渲染中文 fallback → 切换" 的闪烁
    if (initialLocaleCode && initialLocaleCode !== i18n.locale) {
      try {
        await ensureLocaleLoaded(initialLocaleCode)
        i18n.locale = initialLocaleCode
        if (typeof document !== 'undefined') {
          document.documentElement.lang = initialLocaleCode
        }
      } catch (err) {
        // 初始语言加载失败时退回 fallback（zh-CN），不阻塞应用启动
        console.warn('[i18n] initial locale load failed, fallback to', i18n.locale, err)
      }
    } else if (typeof document !== 'undefined') {
      document.documentElement.lang = i18n.locale
    }
    const app = new Vue({
      router,
      i18n,
      render: h => h(App)
    }).$mount('#app')
    // 初始化 Toast 服务（必须在 Vue 实例创建后）
    toast.init(app)
  } catch (error) {
    renderStartupError(error, {
      buildAppMode,
      runtimeAppMode: appConfig.getAppMode(),
      host: typeof window !== 'undefined' ? window.location.hostname : '-'
    })
  }
}

bootstrap()
