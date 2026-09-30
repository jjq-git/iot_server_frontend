<template>
  <div>
    <!-- List page: shared page shell + Base query, table and pagination controls. -->
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <base-input v-model.trim="query.keyword" @keyup.enter="load" />
      </template>
      <base-table :items="items" :fields="fields" :loading="loading" :load-error="error" @retry="load" />
      <template #footer>
        <base-pagination v-model="query.page" :total-rows="total" :per-page="query.page_size" @input="load" />
      </template>
    </list-page-card>

    <!-- Form page: submission is guarded and feedback goes through the UI service. -->
    <base-card>
      <base-form-group :label="$t('example.name')" required>
        <base-input v-model.trim="form.name" />
      </base-form-group>
      <base-button :loading="saving" @click="save">{{ $t('common.save') }}</base-button>
    </base-card>

    <!-- Settings card: domain state stays in the page, visual primitives stay public. -->
    <base-card :header="$t('example.settings_title')">
      <base-switch v-model="settings.enabled">{{ $t('example.enabled') }}</base-switch>
    </base-card>
  </div>
</template>

<script>
// Documentation-only sketch: replace the example i18n keys and API calls in a real page.
import { runUiTask } from '@/services/ui/task'

export default {
  data: () => ({
    query: { keyword: '', page: 1, page_size: 10 },
    items: [],
    fields: [],
    total: 0,
    loading: false,
    saving: false,
    error: '',
    form: { name: '' },
    settings: { enabled: false }
  }),
  methods: {
    async load () {},
    async save () {
      if (this.saving) return
      await runUiTask(async () => {
        // Call a resource function from src/api here.
      }, {
        successMessage: this.$t('common.save_success'),
        errorMessage: this.$t('common.save_failed'),
        showGlobalLoading: false,
        setPending: value => { this.saving = value }
      })
    }
  }
}
</script>
