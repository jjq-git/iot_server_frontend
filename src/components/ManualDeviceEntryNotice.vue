<template>
  <base-alert variant="info" show class="manual-entry-notice">
    <div class="manual-entry-notice__content">
      <div>
        <strong>{{ $t('device_enrollment.manual_entry.title') }}</strong>
        <div>{{ $t('device_enrollment.manual_entry.description') }}</div>
      </div>
      <base-button size="sm" variant="outline-primary" @click="openEnrollment">
        {{ $t('device_enrollment.manual_entry.open_workbench') }}
      </base-button>
    </div>
  </base-alert>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'

export default {
  name: 'ManualDeviceEntryNotice',
  components: { BaseAlert, BaseButton },
  methods: {
    openEnrollment () {
      if (this.$route.path !== '/devices/enrollments') this.$router.push('/devices/enrollments')
    }
  }
}
</script>

<style scoped>
.manual-entry-notice__content {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
}

@media (width <= 767px) {
  .manual-entry-notice__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
