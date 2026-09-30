<template>
  <div class="device-onboarding">
    <nav class="device-onboarding__tabs" :aria-label="$t('device_onboarding.title')">
      <button
        v-if="canManageFactoryRegistry"
        type="button"
        :class="{ 'is-active': activeView === 'registry' }"
        @click="openPath('/devices/factory-registry')"
      >
        <app-icon name="clipboard-check" />
        <span>{{ $t('device_onboarding.tabs.registered') }}</span>
        <small>{{ $t('device_onboarding.tabs.registered_help') }}</small>
      </button>
      <button
        v-if="canSeeEnrollments"
        type="button"
        :class="{ 'is-active': activeView === 'enrollments' }"
        @click="openPath('/devices/enrollments')"
      >
        <app-icon name="broadcast" />
        <span>{{ $t('device_onboarding.tabs.pending') }}</span>
        <small>{{ $t('device_onboarding.tabs.pending_help') }}</small>
      </button>
    </nav>

    <device-enrollment-list v-if="activeView === 'enrollments'" />
    <device-factory-registry v-else />
  </div>
</template>

<script>
import DeviceEnrollmentList from './EnrollmentList.vue'
import DeviceFactoryRegistry from './FactoryRegistry.vue'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'

export default {
  name: 'DeviceOnboardingWorkbench',
  components: { DeviceEnrollmentList, DeviceFactoryRegistry },
  computed: {
    currentUser () {
      return getCurrentUser()
    },
    canSeeEnrollments () {
      return hasPermission(PERMISSION.DEVICE_ENROLLMENT_VIEW, this.currentUser)
    },
    canManageFactoryRegistry () {
      return hasPermission(PERMISSION.FACTORY_REGISTRY_MANAGE, this.currentUser)
    },
    activeView () {
      if (this.$route.name === 'DeviceFactoryRegistry' && this.canManageFactoryRegistry) return 'registry'
      if (this.canSeeEnrollments) return 'enrollments'
      return 'registry'
    }
  },
  methods: {
    openPath (path) {
      if (path && this.$route.path !== path) this.$router.push(path).catch(() => {})
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/onboarding-workbench.scss"></style>
