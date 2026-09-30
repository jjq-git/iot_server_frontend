<template>
  <base-card class="dashboard-widget dashboard-widget--table">
    <template #header>
      <div class="dashboard-widget__header">
        <div>
          <h2 class="dashboard-widget__title">{{ title }}</h2>
          <span v-if="subtitle" class="dashboard-widget__subtitle">{{ subtitle }}</span>
        </div>
        <div class="dashboard-widget__actions">
          <base-icon-button :label="$t('common.refresh')" :loading="loading" @click="$emit('refresh')">
            <app-icon name="arrow-clockwise" />
          </base-icon-button>
        </div>
      </div>
    </template>
    <base-table :items="items" :fields="fields" :loading="loading" :load-error="error" @retry="$emit('retry')">
      <template #cell(online_rate)="row">
        <base-badge :variant="rateVariant(row.item.online_rate)">{{ row.item.online_rate }}%</base-badge>
      </template>
    </base-table>
  </base-card>
</template>

<script>
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseIconButton from '@/components/base/BaseIconButton.vue'
import BaseTable from '@/components/base/BaseTable.vue'

export default {
  name: 'TableWidget',
  components: { BaseBadge, BaseCard, BaseIconButton, BaseTable },
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    fields: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  methods: {
    rateVariant (value) {
      if (Number(value) >= 95) return 'success'
      if (Number(value) >= 90) return 'warning'
      return 'danger'
    }
  }
}
</script>
