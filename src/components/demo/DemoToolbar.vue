<template>
  <div class="demo-toolbar" role="group" :aria-label="$t('demo.toolbar_label')">
    <span class="demo-toolbar__badge">{{ $t('demo.badge') }}</span>
    <base-select
      v-model="scenarioId"
      class="demo-toolbar__select"
      :options="scenarioOptions"
      :aria-label="$t('demo.switch_scenario')"
      @input="switchScenario"
    />
    <base-icon-button
      :label="$t('demo.reset_data')"
      :loading="resetting"
      @click="resetData"
    >
      <app-icon name="arrow-clockwise" aria-hidden="true" />
    </base-icon-button>
  </div>
</template>

<script>
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import { clearDashboardQueryCache } from '@/services/dashboard/queryCache'
import { resetDemoDatabase } from '@/demo/database'
import { clearDemoSession, getCurrentDemoScenario, selectDemoScenario, DEMO_SCENARIOS } from '@/demo/session'
import { disconnectAllDemoRealtime } from '@realtime-mode-entry'

export default {
  name: 'DemoToolbar',
  components: { BaseIconButton, BaseSelect },
  data () {
    return {
      scenarioId: getCurrentDemoScenario()?.id || '',
      resetting: false
    }
  },
  computed: {
    scenarioOptions () {
      return DEMO_SCENARIOS.map(scenario => ({ value: scenario.id, text: this.$t(scenario.labelKey) }))
    }
  },
  methods: {
    switchScenario (scenarioId) {
      if (!scenarioId) return
      disconnectAllDemoRealtime()
      clearDashboardQueryCache()
      selectDemoScenario(scenarioId)
      this.$router.replace('/dashboard').then(() => window.location.reload(), () => window.location.reload())
    },
    async resetData () {
      if (this.resetting) return
      const confirmed = await this.$uiConfirm(this.$t('demo.reset_confirm'), {
        title: this.$t('demo.reset_data'),
        okTitle: this.$t('common.confirm'),
        cancelTitle: this.$t('common.cancel'),
        okVariant: 'danger'
      })
      if (!confirmed) return
      this.resetting = true
      try {
        disconnectAllDemoRealtime()
        await resetDemoDatabase()
        clearDashboardQueryCache()
        clearDemoSession()
        this.$router.replace('/login').then(() => window.location.reload(), () => window.location.reload())
      } catch (error) {
        this.$uiToast.error(this.$t('demo.reset_failed'))
        this.resetting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.demo-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-right: var(--space-sm);
  border-right: 1px solid var(--color-border-divider);
}

.demo-toolbar__badge {
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background: var(--color-brand-soft);
  color: var(--color-brand);
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.demo-toolbar__select {
  width: 150px;
}

@media (width <= 820px) {
  .demo-toolbar__badge {
    display: none;
  }

  .demo-toolbar__select {
    width: 120px;
  }
}
</style>
