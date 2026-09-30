<template>
  <aside
    :class="['sidebar', { 'sidebar--collapsed': collapsed }]"
  >
    <div class="sidebar__brand">
      <span :class="['sidebar__logo-mark', { 'sidebar__logo-mark--custom': brandingLogo }]">
        <img
          v-if="brandingLogo"
          :src="brandingLogo"
          class="sidebar__logo-img sidebar__logo-img--custom"
          alt=""
          loading="lazy"
        />
        <pod-brand-mark v-else class="sidebar__logo-img" />
      </span>
      <div v-if="!collapsed" class="sidebar__brand-copy">
        <div class="sidebar__title">{{ brandingCompanyName || $t('sidebar.default_brand') }}</div>
        <div class="sidebar__subtitle">{{ brandingSlogan || 'IoT Platform' }}</div>
      </div>
    </div>

    <button
      v-if="!hidden"
      class="sidebar__toggle-btn"
      type="button"
      aria-controls="app-sidebar"
      :aria-expanded="!collapsed"
      @click="$emit('toggle')"
      :title="collapsed ? $t('layout.expand_sidebar') : $t('layout.collapse_sidebar')"
    >
      <app-icon :name="collapsed ? 'chevron-right' : 'chevron-left'" />
      <span class="sr-only">{{ collapsed ? $t('layout.expand_sidebar') : $t('layout.collapse_sidebar') }}</span>
    </button>

    <div class="sidebar__menu">
      <nav class="sidebar-nav">
        <button
          v-if="hasPermission(MENU_KEY.DASHBOARD)"
          class="sidebar-item"
          :class="{ 'is-active': isActive('/dashboard') }"
          type="button"
          :title="$t('sidebar.menu.charts')"
          :aria-label="$t('sidebar.menu.charts')"
          @click="navigateTo('/dashboard')"
        >
          <span class="sidebar-item__icon"><app-icon name="speedometer2" /></span>
          <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.charts') }}</span>
        </button>

        <div v-if="canSeeCustomers" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.customers')"
            :aria-label="$t('sidebar.menu.customers')"
            @click="handleGroupClick('customers', customerFallback)"
          >
            <span class="sidebar-item__icon"><app-icon name="customer-company-users" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.customers') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.customers }"
            />
          </button>
          <div v-show="!collapsed && openGroups.customers" class="sidebar-subnav">
            <button
              v-if="hasPermission(MENU_KEY.COMPANIES)"
              class="sidebar-subitem"
              :class="{ 'is-active': activePath.startsWith('/org/companies') }"
              type="button"
              :title="$t('sidebar.menu.companies')"
              :aria-label="$t('sidebar.menu.companies')"
              @click="navigateTo('/org/companies')"
            >
              <app-icon name="building" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.companies') }}</span>
            </button>
            <button
              v-if="!demoMode && hasPermission(MENU_KEY.COMPANY_RELATIONSHIPS)"
              class="sidebar-subitem"
              :class="{ 'is-active': activePath.startsWith('/org/company-relationships') }"
              type="button"
              :title="$t('sidebar.menu.company_relationships')"
              :aria-label="$t('sidebar.menu.company_relationships')"
              @click="navigateTo('/org/company-relationships')"
            >
              <app-icon name="link-45deg" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.company_relationships') }}</span>
            </button>
            <button
              v-if="hasPermission(MENU_KEY.USERS)"
              class="sidebar-subitem"
              :class="{ 'is-active': activePath.startsWith('/org/users') }"
              type="button"
              :title="$t('sidebar.menu.users')"
              :aria-label="$t('sidebar.menu.users')"
              @click="navigateTo('/org/users')"
            >
              <app-icon name="people" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.users') }}</span>
            </button>
          </div>
        </div>

        <div v-if="canSeeDeviceMenus" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t(deviceGroupTitleKey)"
            :aria-label="$t(deviceGroupTitleKey)"
            @click="handleGroupClick('device', deviceGroupFallback)"
          >
            <span class="sidebar-item__icon"><app-icon name="controller-system" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t(deviceGroupTitleKey) }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.device }"
            />
          </button>
          <div v-show="!collapsed && openGroups.device" class="sidebar-subnav">
            <button
              v-if="canSeeOnboarding"
              class="sidebar-subitem"
              :class="{ 'is-active': isOnboardingActive }"
              type="button"
              :title="$t('device_onboarding.title')"
              :aria-label="$t('device_onboarding.title')"
              @click="navigateTo(onboardingPath)"
            >
              <app-icon name="broadcast" class="sidebar-subitem__icon" />
              <span>{{ $t('device_onboarding.title') }}</span>
            </button>
            <button
              v-if="canSeeHnModels"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/devices/hn-models') }"
              type="button"
              :title="$t('sidebar.menu.model_table')"
              :aria-label="$t('sidebar.menu.model_table')"
              @click="navigateTo('/devices/hn-models')"
            >
              <app-icon name="product-model" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.model_table') }}</span>
            </button>
            <button
              v-if="canSeeHosts"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/devices/hosts') }"
              type="button"
              :title="$t('sidebar.menu.host_table')"
              :aria-label="$t('sidebar.menu.host_table')"
              @click="navigateTo('/devices/hosts')"
            >
              <app-icon name="controller-host" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.host_table') }}</span>
            </button>
            <button
              v-if="canSeeNodes"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/devices/nodes') }"
              type="button"
              :title="$t('sidebar.menu.node_table')"
              :aria-label="$t('sidebar.menu.node_table')"
              @click="navigateTo('/devices/nodes')"
            >
              <app-icon name="controller-node" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.node_table') }}</span>
            </button>
          </div>
        </div>

        <div v-if="hasPermission(MENU_KEY.PODS) || hasPermission(MENU_KEY.MEETINGS)" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t(podsMenuKey)"
            :aria-label="$t(podsMenuKey)"
            @click="handleGroupClick('pods', podsLandingPath)"
          >
            <span class="sidebar-item__icon"><app-icon name="soundproof-pod" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t(podsMenuKey) }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.pods }"
            />
          </button>
          <div v-show="!collapsed && openGroups.pods" class="sidebar-subnav">
            <button
              v-if="hasPermission(MENU_KEY.PODS)"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/pods/pod-models') }"
              type="button"
              :title="$t('sidebar.menu.model_list')"
              :aria-label="$t('sidebar.menu.model_list')"
              @click="navigateTo('/pods/pod-models')"
            >
              <app-icon name="product-model" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.model_list') }}</span>
            </button>
            <button
              v-if="hasPermission(MENU_KEY.PODS)"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/pods') }"
              type="button"
              :title="$t('sidebar.menu.list')"
              :aria-label="$t('sidebar.menu.list')"
              @click="navigateTo('/pods')"
            >
              <app-icon name="soundproof-pod" modifier="list" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.list') }}</span>
            </button>
            <button
              v-if="hasPermission(MENU_KEY.MEETINGS)"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/pod-bookings') }"
              type="button"
              :title="$t('meeting.menu')"
              :aria-label="$t('meeting.menu')"
              @click="navigateTo('/pod-bookings')"
            >
              <app-icon name="calendar3" class="sidebar-subitem__icon" />
              <span>{{ $t('meeting.menu') }}</span>
            </button>
            <button
              v-if="canManageMeetings"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/pod-bookings/settings') }"
              type="button"
              :title="$t('meeting.settings_menu')"
              :aria-label="$t('meeting.settings_menu')"
              @click="navigateTo('/pod-bookings/settings')"
            >
              <app-icon name="gear" class="sidebar-subitem__icon" />
              <span>{{ $t('meeting.settings_menu') }}</span>
            </button>
          </div>
        </div>

        <div v-if="hasPermission(MENU_KEY.FILES)" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.files_logs')"
            :aria-label="$t('sidebar.menu.files_logs')"
            @click="handleGroupClick('files', '/files')"
          >
            <span class="sidebar-item__icon"><app-icon name="folder2-open" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.files_logs') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.files }"
            />
          </button>
          <div v-show="!collapsed && openGroups.files" class="sidebar-subnav">
            <button
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/files') }"
              type="button"
              :title="$t('sidebar.menu.files')"
              :aria-label="$t('sidebar.menu.files')"
              @click="navigateTo('/files')"
            >
              <app-icon name="files" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.files') }}</span>
            </button>
          </div>
        </div>

        <!-- 历史数据 group（独立顶级；用户操作/设备日志/EMCY/传感器） -->
        <div v-if="!collapsed && canSeeHistory" class="sidebar-section-label">DATA</div>
        <div v-if="canSeeHistory" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.history')"
            :aria-label="$t('sidebar.menu.history')"
            @click="handleGroupClick('history', historyGroupFallback)"
          >
            <span class="sidebar-item__icon"><app-icon name="clock-history" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.history') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.history }"
            />
          </button>
          <div v-show="!collapsed && openGroups.history" class="sidebar-subnav">
            <button
              v-if="canSeeAudit"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/history/audit') }"
              type="button"
              :title="$t('sidebar.menu.user_audit')"
              :aria-label="$t('sidebar.menu.user_audit')"
              @click="navigateTo('/history/audit')"
            >
              <app-icon name="journal-text" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.user_audit') }}</span>
            </button>
            <button
              v-if="canSeeDeviceLogs"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/history/serial') }"
              type="button"
              :title="$t('sidebar.menu.device_logs')"
              :aria-label="$t('sidebar.menu.device_logs')"
              @click="navigateTo('/history/serial')"
            >
              <app-icon name="terminal" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.device_logs') }}</span>
            </button>
            <button
              v-if="canSeeDeviceLogs"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/history/emcy') }"
              type="button"
              :title="$t('sidebar.menu.emcy_alerts')"
              :aria-label="$t('sidebar.menu.emcy_alerts')"
              @click="navigateTo('/history/emcy')"
            >
              <app-icon name="exclamation-octagon" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.emcy_alerts') }}</span>
            </button>
            <button
              v-if="!demoMode && canSeeDeviceLogs"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/history/alerts') }"
              type="button"
              :title="$t('sidebar.menu.alert_events')"
              :aria-label="$t('sidebar.menu.alert_events')"
              @click="navigateTo('/history/alerts')"
            >
              <app-icon name="bell" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.alert_events') }}</span>
            </button>
            <button
              v-if="canSeeSensorHistory"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/history/sensors') }"
              type="button"
              :title="$t('sidebar.menu.sensor_data')"
              :aria-label="$t('sidebar.menu.sensor_data')"
              @click="navigateTo('/history/sensors')"
            >
              <app-icon name="graph-up" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.sensor_data') }}</span>
            </button>
          </div>
        </div>

        <!-- 系统调试：按设备运维与平台诊断能力展示子项 -->
        <div v-if="!collapsed && canSeeSystemSection" class="sidebar-section-label sidebar-section-label--divider">SYSTEM</div>
        <div v-if="hasPermission(MENU_KEY.COMPANY_DASHBOARD_CONFIG)" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.custom_ui')"
            :aria-label="$t('sidebar.menu.custom_ui')"
            @click="handleGroupClick('customUi', '/org/company-dashboard-config')"
          >
            <span class="sidebar-item__icon"><app-icon name="web-interface" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.custom_ui') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.customUi }"
            />
          </button>
          <div v-show="!collapsed && openGroups.customUi" class="sidebar-subnav">
            <button
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/org/company-dashboard-config') }"
              type="button"
              :title="$t('sidebar.menu.config_center')"
              :aria-label="$t('sidebar.menu.config_center')"
              @click="navigateTo('/org/company-dashboard-config')"
            >
              <app-icon name="web-interface" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.config_center') }}</span>
            </button>
          </div>
        </div>
        <div v-if="!demoMode && (canSeeDebug || isPlatformAdminRole)" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.system_debug')"
            :aria-label="$t('sidebar.menu.system_debug')"
            @click="handleGroupClick('sysdebug', debugLandingPath)"
          >
            <span class="sidebar-item__icon"><app-icon name="system-platform" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.system_debug') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.sysdebug }"
            />
          </button>
          <div v-show="!collapsed && openGroups.sysdebug" class="sidebar-subnav">
            <!-- 设备管理（调试视角：主机与节点统一面板） -->
            <button
              v-if="isPlatformAdminRole"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/api-keys') }"
              type="button"
              :title="$t('sidebar.menu.api_keys')"
              :aria-label="$t('sidebar.menu.api_keys')"
              @click="navigateTo('/api-keys')"
            >
              <app-icon name="key" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.api_keys') }}</span>
            </button>
            <button
              v-if="canOperateDevices"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/devices') }"
              type="button"
              :title="$t('sidebar.menu.device_admin')"
              :aria-label="$t('sidebar.menu.device_admin')"
              @click="navigateTo('/debug/devices')"
            >
              <app-icon name="controller-system" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.device_admin') }}</span>
            </button>
            <!-- 业务运维 -->
            <button
              v-if="canViewOta"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/ota-console') }"
              type="button"
              :title="$t('sidebar.menu.ota_console')"
              :aria-label="$t('sidebar.menu.ota_console')"
              @click="navigateTo('/debug/ota-console')"
            >
              <app-icon name="arrow-up-circle" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.ota_console') }}</span>
            </button>
            <button
              v-if="canViewFirmwares"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/firmwares') }"
              type="button"
              :title="$t('sidebar.menu.firmwares')"
              :aria-label="$t('sidebar.menu.firmwares')"
              @click="navigateTo('/debug/firmwares')"
            >
              <app-icon name="cpu" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.firmwares') }}</span>
            </button>
            <button
              v-if="canOperateDevices"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/device-language') }"
              type="button"
              :title="$t('sidebar.menu.device_language')"
              :aria-label="$t('sidebar.menu.device_language')"
              @click="navigateTo('/debug/device-language')"
            >
              <app-icon name="translate" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.device_language') }}</span>
            </button>
            <button
              v-if="canSeeIconLibrary"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/admin/icon-library') }"
              type="button"
              :title="$t('sidebar.menu.icon_library')"
              :aria-label="$t('sidebar.menu.icon_library')"
              @click="navigateTo('/admin/icon-library')"
            >
              <app-icon name="grid" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.icon_library') }}</span>
            </button>
            <!-- 单片机开发联调类 -->
            <button
              v-if="canOperateDevices"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/od') }"
              type="button"
              :title="$t('sidebar.menu.od_diagnose')"
              :aria-label="$t('sidebar.menu.od_diagnose')"
              @click="navigateTo('/debug/od')"
            >
              <app-icon name="tools" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.od_diagnose') }}</span>
            </button>
            <button
              v-if="canOperateDevices"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/device-control') }"
              type="button"
              :title="$t('sidebar.menu.device_console')"
              :aria-label="$t('sidebar.menu.device_console')"
              @click="navigateTo('/debug/device-control')"
            >
              <app-icon name="window" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.device_console') }}</span>
            </button>
            <button
              v-if="canUsePlatformDiagnostics"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/controller-console') }"
              type="button"
              :title="$t('route.controller_console.title')"
              :aria-label="$t('route.controller_console.title')"
              @click="navigateTo('/debug/controller-console')"
            >
              <app-icon name="controller-console" class="sidebar-subitem__icon" />
              <span>{{ $t('route.controller_console.title') }}</span>
            </button>
            <button
              v-if="canUsePlatformDiagnostics"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/mqtt-stream') }"
              type="button"
              :title="$t('sidebar.menu.mqtt_stream')"
              :aria-label="$t('sidebar.menu.mqtt_stream')"
              @click="navigateTo('/debug/mqtt-stream')"
            >
              <app-icon name="arrow-repeat" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.mqtt_stream') }}</span>
            </button>
            <button
              v-if="canOperateDevices"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/debug/credentials') }"
              type="button"
              :title="$t('sidebar.menu.credentials')"
              :aria-label="$t('sidebar.menu.credentials')"
              @click="navigateTo('/debug/credentials')"
            >
              <app-icon name="key" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.credentials') }}</span>
            </button>
          </div>
        </div>

        <!-- MQTT(EMQX dashboard 代理) -->
        <div v-if="canSeeMqttAdmin" class="sidebar-group">
          <button
            class="sidebar-item sidebar-item--group"
            type="button"
            :title="$t('sidebar.menu.mqtt')"
            :aria-label="$t('sidebar.menu.mqtt')"
            @click="handleGroupClick('mqttServer', '/mqtt-server')"
          >
            <span class="sidebar-item__icon"><app-icon name="mqtt-broker" /></span>
            <span v-if="!collapsed" class="sidebar-item__label">{{ $t('sidebar.menu.mqtt') }}</span>
            <app-icon
              v-if="!collapsed"
              name="chevron-down"
              class="sidebar-item__caret"
              :class="{ 'is-open': openGroups.mqttServer }"
            />
          </button>
          <div v-show="!collapsed && openGroups.mqttServer" class="sidebar-subnav">
            <button
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/mqtt-server') }"
              type="button"
              :title="$t('sidebar.menu.overview')"
              :aria-label="$t('sidebar.menu.overview')"
              @click="navigateTo('/mqtt-server')"
            >
              <app-icon name="speedometer2" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.overview') }}</span>
            </button>
            <button
              v-if="isPlatformAdminRole"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/mqtt-server/clients') }"
              type="button"
              :title="$t('sidebar.menu.clients')"
              :aria-label="$t('sidebar.menu.clients')"
              @click="navigateTo('/mqtt-server/clients')"
            >
              <app-icon name="person-badge" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.clients') }}</span>
            </button>
            <button
              v-if="isPlatformAdminRole"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/mqtt-server/subscriptions') }"
              type="button"
              :title="$t('sidebar.menu.subscriptions')"
              :aria-label="$t('sidebar.menu.subscriptions')"
              @click="navigateTo('/mqtt-server/subscriptions')"
            >
              <app-icon name="check2-square" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.subscriptions') }}</span>
            </button>
            <button
              v-if="isPlatformAdminRole"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/mqtt-server/topics') }"
              type="button"
              :title="$t('sidebar.menu.topics')"
              :aria-label="$t('sidebar.menu.topics')"
              @click="navigateTo('/mqtt-server/topics')"
            >
              <app-icon name="layers" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.topics') }}</span>
            </button>
            <button
              v-if="isPlatformAdminRole"
              class="sidebar-subitem"
              :class="{ 'is-active': isActive('/mqtt-server/banned') }"
              type="button"
              :title="$t('sidebar.menu.blacklist')"
              :aria-label="$t('sidebar.menu.blacklist')"
              @click="navigateTo('/mqtt-server/banned')"
            >
              <app-icon name="slash-circle" class="sidebar-subitem__icon" />
              <span>{{ $t('sidebar.menu.blacklist') }}</span>
            </button>
          </div>
        </div>
      </nav>
    </div>

  </aside>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  getRoutePermission,
  hasAnyPermission,
  hasMenuPermission,
  hasPermission as userHasPermission,
  MENU_KEY,
  PERMISSION
} from '@/utils/permission'
import { getIconLibraryAvailability } from '@/api/iconLibrary'
import { isDemoMode } from '@/app-mode/runtime'
import PodBrandMark from '@/components/shared/PodBrandMark.vue'

export default {
  name: 'Sidebar',
  components: { PodBrandMark },
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
      // 暴露给模板，避免在视图层硬编码权限 key
      MENU_KEY,
      PERMISSION,
      openGroups: {
        customers: false,
        customUi: false,
        device: false,
        pods: false,
        files: false,
        history: false,
        sysdebug: false,
        mqttServer: false
      },
      localUser: null,
      localBranding: null,
      localCompanyInfo: null,
      hasIconLibrary: false
    }
  },
  computed: {
    demoMode () {
      return isDemoMode()
    },
    companyBranding () {
      return this.localBranding
    },
    brandingLogo () {
      return this.companyBranding?.logo_url || this.companyBranding?.logo || ''
    },
    brandingCompanyName () {
      return this.localCompanyInfo?.short_name || this.localCompanyInfo?.company_name || ''
    },
    brandingSlogan () {
      return this.localCompanyInfo?.slogan || ''
    },
    activePath () {
      const path = this.$route.path
      if (path.startsWith('/pod-bookings/settings')) return '/pod-bookings/settings'
      if (path.startsWith('/pod-bookings')) return '/pod-bookings'
      if (path.startsWith('/devices/hosts/')) return '/devices/hosts'
      if (path.startsWith('/devices/nodes/')) return '/devices/nodes'
      if (path.startsWith('/devices/enrollments/')) return '/devices/enrollments'
      if (path.startsWith('/pods/')) {
        if (path.startsWith('/pods/pod-models')) return '/pods/pod-models'
        return '/pods'
      }
      if (path.startsWith('/org/company-dashboard-config/')) return '/org/company-dashboard-config'
      // MQTT 服务器子路由保持精确匹配，不做归并
      return path
    },
    currentUser () {
      if (this.localUser) return this.localUser
      try {
        const userStr = localStorage.getItem('user')
        if (!userStr) return null
        return JSON.parse(userStr)
      } catch (error) {
        return null
      }
    },
    canSeeHnModels () {
      return this.canAccessRoute('DevicesHnModels')
    },
    canSeeHosts () {
      return this.canAccessRoute('DevicesHosts')
    },
    canSeeNodes () {
      return this.canAccessRoute('DevicesNodes')
    },
    canSeeDeviceMenus () {
      return this.canSeeHnModels || this.canSeeHosts || this.canSeeNodes || this.canSeeOnboarding
    },
    canSeeCustomers () {
      return this.hasPermission(MENU_KEY.COMPANIES) || (!this.demoMode && this.hasPermission(MENU_KEY.COMPANY_RELATIONSHIPS)) || this.hasPermission(MENU_KEY.USERS)
    },
    customerFallback () {
      if (this.hasPermission(MENU_KEY.COMPANIES)) return '/org/companies'
      if (!this.demoMode && this.hasPermission(MENU_KEY.COMPANY_RELATIONSHIPS)) return '/org/company-relationships'
      return '/org/users'
    },
    canSeeEnrollments () {
      return this.hasCapability(PERMISSION.DEVICE_ENROLLMENT_VIEW)
    },
    podsLandingPath () {
      return this.hasPermission(MENU_KEY.PODS) ? '/pods' : '/pod-bookings'
    },
    canManageFactoryRegistry () {
      return this.hasCapability(PERMISSION.FACTORY_REGISTRY_MANAGE)
    },
    canSeeOnboarding () {
      return !this.demoMode && (this.canSeeEnrollments || this.canManageFactoryRegistry)
    },
    onboardingPath () {
      return this.canSeeEnrollments ? '/devices/enrollments' : '/devices/factory-registry'
    },
    isOnboardingActive () {
      return this.activePath === '/devices/enrollments' || this.activePath === '/devices/factory-registry'
    },
    deviceGroupTitleKey () {
      return 'sidebar.menu.device_mgmt'
    },
    deviceGroupFallback () {
      if (this.canSeeOnboarding) return this.onboardingPath
      if (this.canSeeHnModels) return '/devices/hn-models'
      if (this.canSeeHosts) return '/devices/hosts'
      return '/devices/nodes'
    },
    podsMenuKey () {
      return 'sidebar.menu.pods_mgmt'
    },
    canSeeDebug () {
      if (this.demoMode) return false
      return hasAnyPermission(
        [PERMISSION.DEVICE_OPERATE, PERMISSION.PLATFORM_DIAGNOSE, PERMISSION.OTA_VIEW, PERMISSION.FIRMWARE_VIEW],
        this.currentUser
      )
    },
    canViewOta () {
      return !this.demoMode && this.hasCapability(PERMISSION.OTA_VIEW)
    },
    canViewFirmwares () {
      return !this.demoMode && this.hasCapability(PERMISSION.FIRMWARE_VIEW)
    },
    debugLandingPath () {
      if (this.canViewOta) return '/debug/ota-console'
      if (this.canViewFirmwares) return '/debug/firmwares'
      if (this.canOperateDevices) return '/debug/devices'
      return '/debug/controller-console'
    },
    canOperateDevices () {
      return !this.demoMode && this.hasCapability(PERMISSION.DEVICE_OPERATE)
    },
    canUsePlatformDiagnostics () {
      return this.hasCapability(PERMISSION.PLATFORM_DIAGNOSE)
    },
    canSeeMqttAdmin () {
      return this.hasCapability(PERMISSION.MQTT_ADMIN)
    },
    canSeeSystemSection () {
      return this.hasPermission(MENU_KEY.COMPANY_DASHBOARD_CONFIG) ||
        (!this.demoMode && (this.canSeeDebug || this.isPlatformAdminRole || this.canSeeMqttAdmin))
    },
    canSeeAudit () {
      return this.canAccessRoute('HistoryAudit')
    },
    canSeeDeviceLogs () {
      return this.canAccessRoute('HistorySerial')
    },
    canSeeSensorHistory () {
      return this.canAccessRoute('HistorySensors')
    },
    canSeeHistory () {
      return this.canSeeAudit || this.canSeeDeviceLogs || this.canSeeSensorHistory
    },
    historyGroupFallback () {
      if (this.canSeeAudit) return '/history/audit'
      if (this.canSeeDeviceLogs) return '/history/serial'
      return '/history/sensors'
    },
    canManageMeetings () {
      return this.hasCapability(PERMISSION.POD_MAINTAIN)
    },
    canSeeIconLibrary () {
      return this.isPlatformAdminRole && this.hasIconLibrary
    },
    isPlatformAdminRole () {
      return this.hasCapability(PERMISSION.API_KEY_MANAGE)
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler () {
        this.syncGroupStateWithRoute()
      }
    }
  },
  async created () {
    this.localUser = this.readStoredUser()
    this.localBranding = this.readStoredJson('company_branding')
    this.localCompanyInfo = this.readStoredJson('company_info')
    this.$eventBus.$on('user-info-updated', this.handleUserInfoUpdate)
    this.$eventBus.$on('branding-updated', this.handleBrandingUpdate)
    this.syncGroupStateWithRoute()
    this.checkIconLibraryAvailability()
  },
  mounted () {
    window.addEventListener('storage', this.handleStorageChange)
  },
  beforeDestroy () {
    this.$eventBus.$off('user-info-updated', this.handleUserInfoUpdate)
    this.$eventBus.$off('branding-updated', this.handleBrandingUpdate)
    window.removeEventListener('storage', this.handleStorageChange)
  },
  methods: {
    readStoredUser () {
      try {
        const userStr = localStorage.getItem('user')
        return userStr ? JSON.parse(userStr) : null
      } catch (error) {
        return null
      }
    },
    readStoredJson (key) {
      try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : null
      } catch (error) {
        return null
      }
    },
    handleUserInfoUpdate (userData) {
      this.localUser = userData
      this.checkIconLibraryAvailability()
    },
    handleBrandingUpdate (branding) {
      this.localBranding = branding || this.readStoredJson('company_branding')
    },
    handleStorageChange (event) {
      if (!event || event.key === 'user') {
        this.localUser = this.readStoredUser()
        this.checkIconLibraryAvailability()
      }
      if (!event || event.key === 'company_branding') {
        this.localBranding = this.readStoredJson('company_branding')
      }
      if (!event || event.key === 'company_info') {
        this.localCompanyInfo = this.readStoredJson('company_info')
      }
    },
    hasPermission (menuKey) {
      return hasMenuPermission(menuKey, this.currentUser)
    },
    hasCapability (permission) {
      return userHasPermission(permission, this.currentUser)
    },
    canAccessRoute (routeName) {
      const permission = getRoutePermission(routeName)
      return Boolean(permission && this.hasCapability(permission))
    },
    async checkIconLibraryAvailability () {
      this.hasIconLibrary = false
      if (!this.isPlatformAdminRole) return
      try {
        const response = await getIconLibraryAvailability()
        const data = response?.data || response || {}
        this.hasIconLibrary = data.available === true
      } catch (error) {
        this.hasIconLibrary = false
      }
    },
    isActive (path) {
      return this.activePath === path
    },
    isGroupActive (key) {
      if (key === 'customers') {
        return this.activePath.startsWith('/org/companies') || this.activePath.startsWith('/org/company-relationships') || this.activePath.startsWith('/org/users')
      }
      if (key === 'customUi') {
        return this.activePath === '/org/company-dashboard-config'
      }
      if (key === 'device') {
        return this.activePath.startsWith('/devices/')
      }
      if (key === 'pods') return this.activePath === '/pods' || this.activePath.startsWith('/pods/') || this.activePath.startsWith('/pod-bookings')
      if (key === 'files') return this.activePath === '/files'
      if (key === 'history') return this.activePath.startsWith('/history/') || this.activePath.startsWith('/audit/')
      // sysdebug 合并自原 system + debug
      if (key === 'sysdebug') {
        return this.activePath.startsWith('/debug/') ||
               this.activePath.startsWith('/system/') ||
               this.activePath === '/admin/icon-library' ||
               this.activePath === '/api-keys' ||
               this.activePath.startsWith('/api-keys/')
      }
      if (key === 'mqttServer') return this.activePath === '/mqtt-server' || this.activePath.startsWith('/mqtt-server/')
      return false
    },
    syncGroupStateWithRoute () {
      if (this.isGroupActive('customers')) this.openGroups.customers = true
      if (this.isGroupActive('customUi')) this.openGroups.customUi = true
      if (this.isGroupActive('device')) this.openGroups.device = true
      if (this.isGroupActive('pods')) this.openGroups.pods = true
      if (this.isGroupActive('files')) this.openGroups.files = true
      if (this.isGroupActive('history')) this.openGroups.history = true
      if (this.isGroupActive('sysdebug')) this.openGroups.sysdebug = true
      if (this.isGroupActive('mqttServer')) this.openGroups.mqttServer = true
    },
    handleGroupClick (key, fallbackPath) {
      if (this.collapsed) {
        this.navigateTo(fallbackPath)
        return
      }
      this.openGroups[key] = !this.openGroups[key]
    },
    navigateTo (path) {
      if (this.$route.path !== path) {
        this.$router.push(path).catch(() => {})
      }
      if (window.innerWidth < 992 && !this.collapsed) {
        this.$emit('toggle')
      }
    }
  }
}
</script>
