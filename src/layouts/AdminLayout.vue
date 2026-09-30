<template>
  <div
    class="layout"
    :class="{
      'layout--mobile': isMobile,
      'layout--navigation-open': isMobile && !isCollapsed
    }"
  >
    <a class="skip-link" href="#main-content" @click.prevent="focusMainContent">
      {{ $t('layout.skip_to_content') }}
    </a>

    <button
      v-if="isMobile && !isCollapsed"
      class="layout__overlay"
      type="button"
      :aria-label="$t('layout.collapse_sidebar')"
      @click="closeMobileNavigation"
    />

    <Sidebar
      ref="sidebar"
      id="app-sidebar"
      :collapsed="isCollapsed"
      :hidden="isMobile && isCollapsed"
      :aria-hidden="isMobile && isCollapsed ? 'true' : null"
      v-bind="sidebarAccessibilityAttributes"
      :class="{
        'sidebar--mobile': isMobile,
        'sidebar--open': isMobile && !isCollapsed
      }"
      @toggle="toggleSidebar"
    />

    <div class="layout__main">
      <Topbar
        ref="topbar"
        :collapsed="isCollapsed"
        :hidden="isMobile && isCollapsed"
        @toggle="toggleSidebar"
      />
      <base-alert v-if="isOrganizationSuspended" variant="warning" class="m-3 mb-0" role="status">
        <strong class="d-block">{{ $t('layout.suspended_title') }}</strong>
        {{ $t('layout.suspended_message') }}
      </base-alert>
      <main
        id="main-content"
        ref="mainContent"
        class="layout__content"
        tabindex="-1"
      >
        <AppBreadcrumb class="layout__breadcrumb" />
        <div class="page-card">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<script>
import Sidebar from '@/components/Sidebar.vue'
import Topbar from '@/components/Topbar.vue'
import AppBreadcrumb from '@/components/AppBreadcrumb.vue'
import { getCurrentUser } from '@/utils/permission'

const MOBILE_BREAKPOINT = 992
const SIDEBAR_STORAGE_KEY = 'iot.sidebar.collapsed'
const BODY_NAVIGATION_CLASS = 'has-mobile-navigation-open'

function readDesktopSidebarPreference () {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch (error) {
    return false
  }
}

export default {
  name: 'AdminLayout',
  components: { AppBreadcrumb, Sidebar, Topbar },
  data () {
    return {
      isCollapsed: true,
      isMobile: false,
      desktopCollapsed: false,
      currentUser: getCurrentUser()
    }
  },
  computed: {
    sidebarAccessibilityAttributes () {
      return this.isMobile && this.isCollapsed ? { inert: '' } : {}
    },
    isOrganizationSuspended () {
      return this.currentUser?.company?.status === 'suspended'
    }
  },
  watch: {
    '$route.path' () {
      if (this.isMobile) this.closeMobileNavigation(false)
      this.$nextTick(() => {
        const mainContent = this.$refs.mainContent
        if (!mainContent) return
        mainContent.scrollTop = 0
        mainContent.scrollLeft = 0
        mainContent.focus({ preventScroll: true })
      })
    }
  },
  created () {
    this.desktopCollapsed = readDesktopSidebarPreference()
    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT
    this.isCollapsed = this.isMobile ? true : this.desktopCollapsed
    window.addEventListener('resize', this.checkScreenSize)
    document.addEventListener('keydown', this.handleKeydown)
    this.$eventBus.$on('user-info-updated', this.handleUserInfoUpdate)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.checkScreenSize)
    document.removeEventListener('keydown', this.handleKeydown)
    this.$eventBus.$off('user-info-updated', this.handleUserInfoUpdate)
    document.body.classList.remove(BODY_NAVIGATION_CLASS)
  },
  methods: {
    handleUserInfoUpdate (user) {
      this.currentUser = user || getCurrentUser()
    },
    checkScreenSize () {
      const nextIsMobile = window.innerWidth < MOBILE_BREAKPOINT
      if (nextIsMobile === this.isMobile) return

      this.isMobile = nextIsMobile
      this.isCollapsed = nextIsMobile ? true : this.desktopCollapsed
      this.syncBodyNavigationState()
    },
    toggleSidebar () {
      const openingMobileNavigation = this.isMobile && this.isCollapsed
      this.isCollapsed = !this.isCollapsed

      if (!this.isMobile) {
        this.desktopCollapsed = this.isCollapsed
        try {
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(this.desktopCollapsed))
        } catch (error) {
        }
      }

      this.syncBodyNavigationState()
      if (this.isMobile) {
        this.$nextTick(() => this.focusNavigationToggle(openingMobileNavigation))
      }
    },
    closeMobileNavigation (restoreFocus = true) {
      if (!this.isMobile || this.isCollapsed) return
      this.isCollapsed = true
      this.syncBodyNavigationState()
      if (restoreFocus) {
        this.$nextTick(() => this.focusNavigationToggle(false))
      }
    },
    focusNavigationToggle (sidebarToggle) {
      const component = sidebarToggle ? this.$refs.sidebar : this.$refs.topbar
      const selector = sidebarToggle ? '.sidebar__toggle-btn' : '.topbar__toggle'
      const button = component && component.$el && component.$el.querySelector(selector)
      if (button) button.focus()
    },
    focusMainContent () {
      const mainContent = this.$refs.mainContent
      if (mainContent) mainContent.focus()
    },
    handleKeydown (event) {
      if (event.key === 'Escape' && this.isMobile && !this.isCollapsed) {
        this.closeMobileNavigation()
      }
    },
    syncBodyNavigationState () {
      document.body.classList.toggle(
        BODY_NAVIGATION_CLASS,
        this.isMobile && !this.isCollapsed
      )
    }
  }
}
</script>
