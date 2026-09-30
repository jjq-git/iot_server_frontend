<template>
  <header class="topbar" :class="{ 'topbar--demo': demoMode }">
    <div class="topbar__left">
      <base-icon-button
        v-if="hidden"
        class="topbar__toggle"
        aria-controls="app-sidebar"
        aria-expanded="false"
        @click="$emit('toggle')"
        :label="$t('layout.expand_sidebar')"
      >
        <app-icon name="menu" aria-hidden="true" />
      </base-icon-button>
      <span class="topbar__page-icon" aria-hidden="true">
        <app-icon :name="pageIcon" />
      </span>
      <div class="topbar__page-heading">
        <h1 class="topbar__page-title">{{ pageTitle }}</h1>
        <b-dropdown
          v-if="isDashboard"
          ref="dashboardRangeDropdown"
          no-caret
          variant="link"
          class="topbar__range"
          toggle-class="topbar__page-subtitle topbar__page-subtitle-button"
          menu-class="topbar-range-menu"
          :toggle-attrs="{ 'aria-label': pageSubtitle, title: pageSubtitle }"
        >
          <template #button-content>
            <span>{{ pageSubtitle }}</span>
            <app-icon name="chevron-down" class="topbar__range-chevron" aria-hidden="true" />
          </template>
          <b-dropdown-form
            form-class="topbar-range-menu__form"
            @submit.stop.prevent="applyDashboardRange"
          >
            <div class="topbar-range-menu__field">
              <label class="topbar-range-menu__label" for="dashboard-range-start">
                {{ $t('dashboard.dynamic.start_date') }}
              </label>
              <base-input
                id="dashboard-range-start"
                v-model="dashboardRangeStart"
                type="date"
                size="sm"
                :max="dashboardRangeEnd || null" :clearable="false"
              />
            </div>
            <span class="topbar-range-menu__separator" aria-hidden="true">—</span>
            <div class="topbar-range-menu__field">
              <label class="topbar-range-menu__label" for="dashboard-range-end">
                {{ $t('dashboard.dynamic.end_date') }}
              </label>
              <base-input
                id="dashboard-range-end"
                v-model="dashboardRangeEnd"
                type="date"
                size="sm"
                :min="dashboardRangeStart || null" :clearable="false"
              />
            </div>
            <base-button
              type="submit"
              size="sm"
              variant="primary"
              class="topbar-range-menu__apply"
              :disabled="!isDashboardRangeValid"
            >
              {{ $t('common.confirm') }}
            </base-button>
          </b-dropdown-form>
        </b-dropdown>
        <div v-else class="topbar__page-subtitle">{{ pageSubtitle }}</div>
      </div>
    </div>

    <div class="topbar__right">
      <demo-toolbar v-if="demoMode" />
      <theme-toggle class="topbar__theme" />
      <button
        v-if="!demoMode"
        class="topbar__notification"
        type="button"
        :title="$t('route.notifications.title')"
        :aria-label="$t('route.notifications.title')"
        @click="goNotifications"
      >
        <app-icon name="bell" :modifier="notificationCount ? 'dot' : ''" />
        <span v-if="notificationCount" class="topbar__notification-count">{{ notificationCount }}</span>
      </button>
      <b-dropdown
        right
        no-caret
        variant="link"
        toggle-class="topbar__user-trigger"
        menu-class="topbar-user-menu"
        :toggle-attrs="{
          'aria-label': $t('topbar.user_menu.profile'),
          title: $t('topbar.user_menu.profile')
        }"
      >
        <template #button-content>
          <span class="topbar__user">
            <img
              v-if="avatarDisplayUrl && !avatarLoadFailed"
              :src="avatarDisplayUrl"
              class="topbar-avatar-image"
              alt=""
              @error="handleAvatarError"
            />
            <span v-else class="topbar__avatar-initials">
              {{ userInitials }}
            </span>
          </span>
        </template>

        <b-dropdown-text class="p-0">
          <button type="button" class="user-menu-header" @click="goInfo">
            <span class="user-menu-avatar">
              <img v-if="avatarDisplayUrl && !avatarLoadFailed" :src="avatarDisplayUrl" class="avatar-circle-image" loading="lazy" @error="handleAvatarError" />
              <span v-else class="avatar-circle">
                {{ userInitials }}
              </span>
            </span>
            <span class="user-menu-info">
              <span class="user-menu-name">{{ userName }}</span>
              <span class="user-menu-username">{{ user ? user.username : '-' }}</span>
            </span>
          </button>
        </b-dropdown-text>

        <b-dropdown-divider />

        <b-dropdown-text class="user-menu-details">
          <div v-if="organizationContexts.length > 1" class="detail-row detail-row--organization">
            <label class="detail-label" for="topbar-organization-select">
              {{ $t('topbar.user_menu.switch_organization') }}
            </label>
            <base-select
              id="topbar-organization-select"
              v-model="activeOrganizationId"
              class="topbar__organization-select"
              :options="organizationOptions"
              :disabled="switchingOrganization"
              :clearable="false"
              :aria-label="$t('topbar.user_menu.switch_organization')"
              @input="handleOrganizationSwitch"
            />
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ $t(activeOrganizationLabelKey) }}</span>
            <span class="detail-value">{{ user ? user.company_name : '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ $t('topbar.user_menu.role') }}</span>
            <span class="detail-value">{{ getUserRoleLabel(user ? user.role : null) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">{{ $t('users.table.column.last_login') }}</span>
            <span class="detail-value">{{ userLastLogin }}</span>
          </div>
        </b-dropdown-text>

        <b-dropdown-divider />

        <b-dropdown-item v-if="!demoMode" @click="handleCommand('profile')">
          <app-icon name="person" class="mr-2" />
          {{ $t('topbar.user_menu.profile') }}
        </b-dropdown-item>
        <b-dropdown-item @click="handleCommand('logout')">
          <app-icon name="box-arrow-right" class="mr-2" />
          {{ $t('nav.logout') }}
        </b-dropdown-item>
      </b-dropdown>
    </div>
  </header>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import ThemeToggle from '@/components/ThemeToggle.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import { fetchAuthorizationContexts, switchOrganization } from '@/api/authorization'
import { fetchAuthenticatedImage, normalizeImageUrl } from '@/utils/imageUrlHelper'
import { clearDashboardQueryCache } from '@/services/dashboard/queryCache'
import { getLoginEntryPath } from '@/utils/loginEntry'
import { isPlatformAdmin } from '@/utils/permission'
import { clearSessionContext, persistCurrentUser } from '@/utils/sessionContext'
import { isDemoMode } from '@/app-mode/runtime'

const PAGE_PRESENTATION = [
  ['/org/company-dashboard-config', 'company_dashboard_config', 'platform'],
  ['/notifications', 'notifications', 'platform'],
  ['/org/company-relationships', 'company_relationships', 'platform'],
  ['/org/companies', 'org_companies', 'platform'],
  ['/org/users', 'org_users', 'platform'],
  ['/user/profile', 'user_profile', 'platform'],
  ['/devices/hn-models', 'hn_models', 'device'],
  ['/devices/hosts', 'hosts', 'device'],
  ['/devices/nodes', 'nodes', 'device'],
  ['/pods/pod-models', 'pod_models', 'management'],
  ['/pods', 'pods', 'management'],
  ['/files', 'files', 'management'],
  ['/history/audit', 'audit', 'data'],
  ['/audit', 'audit', 'data'],
  ['/history/serial', 'serial', 'data'],
  ['/history/emcy', 'emcy', 'data'],
  ['/history/alerts', 'alerts', 'data'],
  ['/history/sensors', 'sensors', 'data'],
  ['/debug/devices', 'debug_devices', 'system'],
  ['/debug/ota-console', 'ota_console', 'system'],
  ['/debug/firmwares', 'firmwares', 'system'],
  ['/debug/device-language', 'device_language', 'system'],
  ['/debug/od', 'od', 'system'],
  ['/debug/device-control', 'device_control', 'system'],
  ['/debug/mqtt-stream', 'mqtt_stream', 'system'],
  ['/debug/credentials', 'credentials', 'system'],
  ['/api-keys', 'api_keys', 'system'],
  ['/mqtt-server/clients', 'mqtt_clients', 'system'],
  ['/mqtt-server/subscriptions', 'mqtt_subscriptions', 'system'],
  ['/mqtt-server/topics', 'mqtt_topics', 'system'],
  ['/mqtt-server/banned', 'mqtt_banned', 'system'],
  ['/mqtt-server', 'mqtt_server', 'system'],
  ['/dashboard', 'dashboard', 'platform']
]

export default {
  name: 'Topbar',
  components: {
    BaseSelect,
    ThemeToggle
  },
  props: {
    collapsed: {
      type: Boolean,
      default: false
    },
    hidden: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      localUser: null,
      avatarDisplayUrl: '',
      managedAvatarUrl: '',
      avatarLoadFailed: false,
      avatarRequestId: 0,
      pageTitleOverride: '',
      pageSubtitleOverride: '',
      dashboardRangeStart: null,
      dashboardRangeEnd: null,
      organizationContexts: [],
      activeOrganizationId: null,
      switchingOrganization: false
    }
  },
  created () {
    this.localUser = this.user
    this.$eventBus.$on('user-info-updated', this.handleUserInfoUpdate)
    this.$eventBus.$on('page-title-updated', this.handlePageTitleUpdate)
    this.$eventBus.$on('page-subtitle-updated', this.handlePageSubtitleUpdate)
    this.$eventBus.$on('dashboard-range-updated', this.handleDashboardRangeUpdate)
    this.loadOrganizationContexts()
  },
  beforeDestroy () {
    this.$eventBus.$off('user-info-updated', this.handleUserInfoUpdate)
    this.$eventBus.$off('page-title-updated', this.handlePageTitleUpdate)
    this.$eventBus.$off('page-subtitle-updated', this.handlePageSubtitleUpdate)
    this.$eventBus.$off('dashboard-range-updated', this.handleDashboardRangeUpdate)
    this.avatarRequestId += 1
    this.releaseManagedAvatar()
  },
  computed: {
    demoMode () {
      return isDemoMode()
    },
    user () {
      if (this.localUser) {
        return this.localUser
      }
      try {
        const userStr = localStorage.getItem('user')
        return userStr ? JSON.parse(userStr) : null
      } catch (error) {
        return null
      }
    },
    avatarSource () {
      if (!this.user || !this.user.avatar) {
        return ''
      }
      return normalizeImageUrl(this.user.avatar)
    },
    userName () {
      const fallback = this.$t('topbar.default_user_name')
      if (!this.user) return fallback
      return this.user.display_name || this.user.username || fallback
    },
    activeOrganizationLabelKey () {
      if (this.user?.company?.is_household) return 'topbar.user_menu.household'
      if (this.user?.company?.is_school) return 'topbar.user_menu.school'
      return 'topbar.user_menu.company'
    },
    userInitials () {
      if (!this.user) return 'U'
      if (isPlatformAdmin(this.user)) return 'PA'
      const name = this.user.display_name || this.user.username || ''
      if (!name.trim()) return 'U'
      const normalizedName = name.trim()
      const firstChar = normalizedName.charAt(0)
      if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        return firstChar
      }
      const parts = normalizedName.split(/[\s_-]+/).filter(Boolean)
      return parts.slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
    },
    pagePresentation () {
      const path = this.$route.path
      const match = PAGE_PRESENTATION.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))
      const titleKey = this.$route.meta && this.$route.meta.title
      const descriptionKey = this.$route.meta && this.$route.meta.description
      return {
        title: titleKey ? this.$t(titleKey) : '',
        subtitle: match
          ? this.$t(`topbar.page_descriptions.${match[1]}`)
          : (descriptionKey ? this.$t(descriptionKey) : '')
      }
    },
    pageTitle () {
      return this.pageTitleOverride || this.pagePresentation.title
    },
    pageSubtitle () {
      return this.pageSubtitleOverride || this.pagePresentation.subtitle
    },
    pageIcon () {
      return (this.$route.meta && this.$route.meta.icon) || 'grid'
    },
    isDashboardRangeValid () {
      return Boolean(
        this.dashboardRangeStart &&
        this.dashboardRangeEnd &&
        this.dashboardRangeStart <= this.dashboardRangeEnd
      )
    },
    isDashboard () {
      return this.$route.path.startsWith('/dashboard')
    },
    userLastLogin () {
      if (!this.user) return '-'
      const value = this.user.last_login_at || this.user.last_login
      if (!value) return '-'

      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return value

      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    },
    notificationCount () {
      return 0
    },
    organizationOptions () {
      return this.organizationContexts.map(context => ({
        value: context.company_id,
        text: context.company_name
      }))
    }
  },
  watch: {
    '$route.path' () {
      this.pageTitleOverride = ''
      this.pageSubtitleOverride = ''
    },
    avatarSource: {
      immediate: true,
      handler (source) {
        this.loadAvatar(source)
      }
    }
  },
  methods: {
    async loadOrganizationContexts () {
      if (this.demoMode) return
      try {
        const contexts = await fetchAuthorizationContexts()
        this.organizationContexts = Array.isArray(contexts) ? contexts : []
        this.activeOrganizationId = Number(this.user?.company_id) || null
      } catch (error) {
        this.organizationContexts = []
      }
    },
    async handleOrganizationSwitch (companyId) {
      const targetCompanyId = Number(companyId)
      const currentCompanyId = Number(this.user?.company_id)
      if (!targetCompanyId || targetCompanyId === currentCompanyId || this.switchingOrganization) return
      this.switchingOrganization = true
      try {
        const response = await switchOrganization(targetCompanyId)
        if (!response?.access_token || !response?.user) throw new Error('Invalid organization switch response')
        localStorage.setItem('token', response.access_token)
        persistCurrentUser(response.user)
        clearDashboardQueryCache()
        window.location.reload()
      } catch (error) {
        this.activeOrganizationId = currentCompanyId || null
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('topbar.user_menu.switch_organization_failed'))
      } finally {
        this.switchingOrganization = false
      }
    },
    handlePageTitleUpdate (title) {
      this.pageTitleOverride = title || ''
    },
    handlePageSubtitleUpdate (subtitle) {
      this.pageSubtitleOverride = subtitle || ''
    },
    handleDashboardRangeUpdate ({ start, end } = {}) {
      this.dashboardRangeStart = this.toDateInputValue(start)
      this.dashboardRangeEnd = this.toDateInputValue(end)
    },
    applyDashboardRange () {
      if (!this.isDashboardRangeValid) return
      this.$eventBus.$emit('dashboard-range-change', {
        start: this.fromDateInputValue(this.dashboardRangeStart),
        end: this.fromDateInputValue(this.dashboardRangeEnd, true)
      })
      if (this.$refs.dashboardRangeDropdown) this.$refs.dashboardRangeDropdown.hide()
    },
    toDateInputValue (value) {
      if (!value) return ''
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return ''

      const pad = number => String(number).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    },
    fromDateInputValue (value, endOfDay = false) {
      const [year, month, day] = value.split('-').map(Number)
      return endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59, 999)
        : new Date(year, month - 1, day)
    },
    releaseManagedAvatar () {
      if (this.managedAvatarUrl) {
        URL.revokeObjectURL(this.managedAvatarUrl)
        this.managedAvatarUrl = ''
      }
    },
    async loadAvatar (source, forceRefresh = false) {
      const requestId = ++this.avatarRequestId
      this.avatarLoadFailed = false
      this.releaseManagedAvatar()
      this.avatarDisplayUrl = ''
      if (!source) return

      const separator = source.includes('?') ? '&' : '?'
      const requestSource = forceRefresh && !/^(data:|blob:)/i.test(source)
        ? `${source}${separator}_avatar=${Date.now()}`
        : source
      const displayUrl = await fetchAuthenticatedImage(requestSource)
      if (requestId !== this.avatarRequestId) {
        if (displayUrl !== requestSource && displayUrl.startsWith('blob:')) {
          URL.revokeObjectURL(displayUrl)
        }
        return
      }

      this.avatarDisplayUrl = displayUrl
      if (displayUrl !== requestSource && displayUrl.startsWith('blob:')) {
        this.managedAvatarUrl = displayUrl
      }
    },
    handleAvatarError () {
      this.avatarLoadFailed = true
    },
    handleUserInfoUpdate (userData) {
      const previousAvatar = this.avatarSource
      this.localUser = userData
      this.$nextTick(() => {
        if (this.avatarSource && this.avatarSource === previousAvatar) {
          this.loadAvatar(this.avatarSource, true)
        }
      })
    },
    getUserRoleLabel (role) {
      if (!role) return '-'
      const key = `topbar.roles.${role}`
      const translated = this.$t(key)
      return translated === key ? role : translated
    },
    handleCommand (command) {
      if (command === 'profile') {
        if (this.$route.path !== '/user/profile') {
          this.$router.push('/user/profile').catch(() => {})
        }
      } else if (command === 'logout') {
        const loginPath = getLoginEntryPath()
        clearDashboardQueryCache()
        clearSessionContext()
        this.$router.push(loginPath).catch(() => {})
      }
    },
    goInfo () {
      if (this.$route.path !== '/user/profile') {
        this.$router.push('/user/profile').catch(() => {})
      }
    },
    goNotifications () {
      if (this.$route.path !== '/notifications') {
        this.$router.push('/notifications').catch(() => {})
      }
    }
  }
}
</script>
