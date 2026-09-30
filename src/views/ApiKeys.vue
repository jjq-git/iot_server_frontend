<template>
  <div class="api-keys">
    <list-page-card :total-rows="keys.length" :per-page="Math.max(keys.length, 1)">
      <template #filters>
        <b-form @submit.stop.prevent="loadKeys">
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              v-model="filterProvider"
              class="filter-control"
              :options="providerFilterOptions"
              @change="loadKeys"
            />
            <div class="filter-actions">
              <base-button variant="outline-secondary" @click="loadKeys">
                <app-icon name="arrow-clockwise"  /> {{ $t('api_keys.actions.refresh') }}
              </base-button>
              <base-button variant="primary" @click="openCreateModal">
                <app-icon name="plus" /> {{ $t('api_keys.actions.add') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="keys"
        :fields="tableFields"
        :loading="loading"
        :load-error="loadError"
        small
        hover
        striped
        :empty-text="$t('api_keys.empty')"
        show-empty
        responsive
        @retry="loadKeys"
      >
        <template #table-busy>
          <div class="text-center my-3">
            <b-spinner small /> {{ $t('api_keys.loading') }}
          </div>
        </template>

        <template #cell(provider)="row">
          <base-badge variant="info">{{ providerLabel(row.item.provider) }}</base-badge>
        </template>

        <template #cell(masked_key)="row">
          <code>{{ row.item.masked_key }}</code>
        </template>

        <template #cell(base_url)="row">
          <small class="text-muted">{{ row.item.base_url || $t('api_keys.default_brackets') }}</small>
        </template>

        <template #cell(model_default)="row">
          <small class="text-muted">{{ row.item.model_default || $t('api_keys.default_brackets') }}</small>
        </template>

        <template #cell(status)="row">
          <base-badge v-if="row.item.is_active" variant="success" class="mr-1">{{ $t('api_keys.status.active') }}</base-badge>
          <base-badge v-else variant="secondary" class="mr-1">{{ $t('api_keys.status.inactive') }}</base-badge>
          <base-badge v-if="row.item.is_enabled" variant="primary">{{ $t('api_keys.status.enabled') }}</base-badge>
          <base-badge v-else variant="warning">{{ $t('api_keys.status.disabled') }}</base-badge>
        </template>

        <template #cell(test)="row">
          <span v-if="!providerSupportsTest(row.item.provider)" class="text-muted">
            {{ $t('api_keys.test_status.unsupported') }}
          </span>
          <span v-else-if="testing[row.item.uuid]">
            <b-spinner small />
          </span>
          <span v-else-if="row.item.last_test_ok === true" class="text-success">
            {{ $t('api_keys.test_status.ok') }} <small>{{ formatLatency(testResult[row.item.uuid]) }}</small>
          </span>
          <span v-else-if="row.item.last_test_ok === false" class="text-danger">
            {{ $t('api_keys.test_status.failed') }}
            <small v-if="row.item.last_test_error" :title="row.item.last_test_error">
              {{ row.item.last_test_error.slice(0, 30) }}
            </small>
          </span>
          <span v-else class="text-muted">{{ $t('api_keys.test_status.untested') }}</span>
          <div v-if="row.item.last_test_at" class="text-muted small">
            {{ formatTime(row.item.last_test_at) }}
          </div>
        </template>

        <template #cell(actions)="row">
          <div class="action-cell action-cell--nowrap">
            <base-action-button
              v-if="providerSupportsTest(row.item.provider)"
              :loading="!!testing[row.item.uuid]"
              :disabled="!!testing[row.item.uuid]"
              :title="$t('api_keys.actions.test')"
              @click="onTest(row.item)"
            >
              <app-icon name="play-circle"  />
              <span>{{ $t('api_keys.actions.test') }}</span>
            </base-action-button>
            <base-action-button
              :title="$t('api_keys.actions.edit')"
              @click="openEditModal(row.item)"
            >
              <app-icon name="pencil"  />
              <span>{{ $t('api_keys.actions.edit') }}</span>
            </base-action-button>
            <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), row.item.name].filter(Boolean).join(' ') }">
              <template #button-content><app-icon name="list" aria-hidden="true" /></template>
              <b-dropdown-item-button :disabled="row.item.is_active || !row.item.is_enabled" @click="onActivate(row.item)"><app-icon name="check-circle" aria-hidden="true" /> {{ $t('api_keys.actions.activate') }}</b-dropdown-item-button>
              <b-dropdown-item-button v-if="canDelete" class="text-danger" @click="onDelete(row.item)"><app-icon name="trash" aria-hidden="true" /> {{ $t('api_keys.actions.delete') }}</b-dropdown-item-button>
            </b-dropdown>
          </div>
        </template>
      </base-table>
    </list-page-card>

    <!-- 添加 / 编辑 Modal -->
    <base-modal
      v-model="modalVisible"
      :title="modalTitle"
      size="md"
      :ok-title="$t('api_keys.modal.ok')"
      :cancel-title="$t('api_keys.modal.cancel')"
      :ok-disabled="!canSubmit || submitting"
      @ok.prevent="onSubmit" :centered="false" :scrollable="false"
    >
      <b-form @submit.prevent="onSubmit">
        <base-form-group required :label="$t('api_keys.modal.field_provider')" label-cols-sm="3" label-size="sm">
          <base-select
            v-model="form.provider"
            :options="providerSelectOptions"
            size="sm"
            :disabled="isEditing"
            @change="onProviderChange"
          />
        </base-form-group>

        <base-form-group required :label="$t('api_keys.modal.field_name')" label-cols-sm="3" label-size="sm">
          <base-input
            v-model.trim="form.name"
            size="sm"
            :placeholder="$t('api_keys.name_placeholder')"
            :state="form.name && form.name.length <= 64 ? null : false" :clearable="false"
          />
        </base-form-group>

        <base-form-group :required="!isEditing" :label="$t('api_keys.modal.field_api_key')" label-cols-sm="3" label-size="sm">
          <base-input
            v-model="form.api_key"
            type="password"
            size="sm"
            :placeholder="isEditing ? $t('api_keys.key_placeholder_edit') : $t('api_keys.key_placeholder_create')"
            autocomplete="new-password" :clearable="false"
          />
        </base-form-group>

        <base-form-group :required="requiresBaseUrl" :label="$t('api_keys.modal.field_base_url')" label-cols-sm="3" label-size="sm">
          <base-input
            v-model.trim="form.base_url"
            size="sm"
            :placeholder="baseUrlPlaceholder" :clearable="false"
          />
        </base-form-group>

        <base-form-group :label="$t('api_keys.modal.field_model')" label-cols-sm="3" label-size="sm">
          <base-input
            v-model.trim="form.model_default"
            size="sm"
            :placeholder="defaultModelHint || $t('api_keys.default_or_blank_base_url_hint')" :clearable="false"
          />
        </base-form-group>

        <base-form-group v-if="!isEditing" label-cols-sm="3" label-size="sm">
          <b-form-checkbox v-model="form.set_active" size="sm">
            {{ $t('api_keys.set_active_label') }}
          </b-form-checkbox>
        </base-form-group>

        <base-form-group v-if="isEditing" label-cols-sm="3" label-size="sm">
          <b-form-checkbox v-model="form.is_enabled" size="sm">
            {{ $t('api_keys.is_enabled_label') }}
          </b-form-checkbox>
        </base-form-group>
      </b-form>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import {
  fetchApiKeys,
  fetchApiKeyProviders,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  activateApiKey,
  testApiKey
} from '@/api/api_keys'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { runUiTask } from '@/services/ui/task'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'ApiKeys',
  components: {
    BaseFormGroup,
    ListPageCard
  },
  data () {
    return {
      keys: [],
      providers: [],
      loading: false,
      loadError: '',
      filterProvider: '',
      modalVisible: false,
      isEditing: false,
      submitting: false,
      editingUuid: null,
      form: {
        provider: 'deepseek',
        name: '',
        api_key: '',
        base_url: '',
        model_default: '',
        set_active: false,
        is_enabled: true
      },
      testing: {},
      testResult: {}
    }
  },
  computed: {
    tableFields () {
      return [
        { key: 'provider', label: this.$t('api_keys.fields.provider') },
        { key: 'name', label: this.$t('api_keys.fields.name') },
        { key: 'masked_key', label: this.$t('api_keys.fields.masked_key') },
        { key: 'base_url', label: this.$t('api_keys.fields.base_url') },
        { key: 'model_default', label: this.$t('api_keys.fields.model_default') },
        { key: 'status', label: this.$t('api_keys.fields.status') },
        { key: 'test', label: this.$t('api_keys.fields.test') },
        {
          key: 'actions',
          label: this.$t('api_keys.fields.actions'),
          class: 'actions-cell',
          thClass: 'actions-cell'
        }
      ]
    },
    canDelete () {
      return hasPermission(PERMISSION.API_KEY_MANAGE, getCurrentUser())
    },
    providerFilterOptions () {
      const opts = [{ value: '', text: this.$t('api_keys.filter_all') }]
      for (const p of this.providers) {
        opts.push({ value: p.provider, text: p.label || p.provider })
      }
      return opts
    },
    providerSelectOptions () {
      return this.providers.map(p => ({ value: p.provider, text: p.label || p.provider }))
    },
    modalTitle () {
      return this.isEditing ? this.$t('api_keys.modal.title_edit') : this.$t('api_keys.modal.title_create')
    },
    currentProviderInfo () {
      return this.providers.find(p => p.provider === this.form.provider) || {}
    },
    defaultBaseUrlHint () {
      return this.currentProviderInfo.default_base_url || ''
    },
    requiresBaseUrl () {
      return Boolean(this.form.provider && this.providers.length && !this.currentProviderInfo.default_base_url)
    },
    baseUrlPlaceholder () {
      if (this.defaultBaseUrlHint) return this.defaultBaseUrlHint
      return this.$t(this.requiresBaseUrl ? 'api_keys.base_url_required' : 'api_keys.default_or_blank_base_url_hint')
    },
    defaultModelHint () {
      return this.currentProviderInfo.default_model || ''
    },
    canSubmit () {
      if (!this.form.provider || !this.form.name) return false
      if (this.form.name.length > 64) return false
      if (this.requiresBaseUrl && !this.form.base_url) return false
      if (!this.isEditing) {
        // 创建时 api_key 必填且 >=8
        if (!this.form.api_key || this.form.api_key.length < 8) return false
      } else if (this.form.api_key && this.form.api_key.length < 8) {
        // 编辑时 api_key 选填,但传了就要 >=8
        return false
      }
      return true
    }
  },
  async mounted () {
    await this.loadProviders()
    await this.loadKeys()
  },
  methods: {
    async loadProviders () {
      try {
        const data = await fetchApiKeyProviders()
        this.providers = (data && data.items) || []
      } catch (err) {
        console.error(this.$t('api_keys.toast.load_provider_failed'), err)
        this.providers = []
      }
    },
    async loadKeys () {
      this.loading = true
      this.loadError = ''
      try {
        const params = {}
        if (this.filterProvider) params.provider = this.filterProvider
        const data = await fetchApiKeys(params)
        this.keys = (data && data.items) || []
      } catch (err) {
        this.loadError = this.$getErrorMessage(err) || this.$t('api_keys.toast.load_failed')
        this.$uiToast.toast(this.loadError, {
          variant: 'danger', title: this.$t('api_keys.toast.title_error')
        })
      } finally {
        this.loading = false
      }
    },
    providerLabel (key) {
      const p = this.providers.find(x => x.provider === key)
      return (p && p.label) || key
    },
    providerSupportsTest (key) {
      const provider = this.providers.find(item => item.provider === key)
      return provider ? provider.test_supported !== false : false
    },
    openCreateModal () {
      this.isEditing = false
      this.editingUuid = null
      this.form = {
        provider: this.providers[0] ? this.providers[0].provider : 'deepseek',
        name: '',
        api_key: '',
        base_url: '',
        model_default: '',
        set_active: false,
        is_enabled: true
      }
      this.modalVisible = true
    },
    openEditModal (item) {
      this.isEditing = true
      this.editingUuid = item.uuid
      this.form = {
        provider: item.provider,
        name: item.name,
        api_key: '',
        base_url: item.base_url || '',
        model_default: item.model_default || '',
        set_active: false,
        is_enabled: item.is_enabled
      }
      this.modalVisible = true
    },
    onProviderChange () {
      // 切换 provider 时,清掉 base_url/model_default 让用户看默认提示
    },
    async onSubmit () {
      if (!this.canSubmit) return
      const successMessage = this.$t(this.isEditing ? 'api_keys.toast.key_updated' : 'api_keys.toast.key_created')
      await runUiTask(async () => {
        if (this.isEditing) {
          const payload = {
            name: this.form.name,
            base_url: this.form.base_url || null,
            model_default: this.form.model_default || null,
            is_enabled: this.form.is_enabled
          }
          if (this.form.api_key) payload.api_key = this.form.api_key
          await updateApiKey(this.editingUuid, payload)
        } else {
          const payload = {
            provider: this.form.provider,
            name: this.form.name,
            api_key: this.form.api_key,
            base_url: this.form.base_url || null,
            model_default: this.form.model_default || null,
            set_active: !!this.form.set_active
          }
          await createApiKey(payload)
        }
        this.modalVisible = false
        await this.loadKeys()
      }, {
        successMessage,
        errorMessage: this.$t('api_keys.toast.submit_failed'),
        successOptions: { title: this.$t('api_keys.toast.title_success') },
        errorOptions: { title: this.$t('api_keys.toast.title_error') },
        showGlobalLoading: false,
        setPending: value => { this.submitting = value }
      })
    },
    async onActivate (item) {
      if (item.is_active || !item.is_enabled) return
      try {
        await activateApiKey(item.uuid)
        this.$uiToast.toast(this.$t('api_keys.toast.activate_success_text', { provider: item.provider, name: item.name }), {
          variant: 'success', title: this.$t('api_keys.toast.activate_success_title')
        })
        await this.loadKeys()
      } catch (err) {
        const msg = this.$getErrorMessage(err) || this.$t('api_keys.toast.activate_failed')
        this.$uiToast.toast(msg, { variant: 'danger', title: this.$t('api_keys.toast.title_error') })
      }
    },
    async onTest (item) {
      if (this.testing[item.uuid] || !this.providerSupportsTest(item.provider)) return
      this.$set(this.testing, item.uuid, true)
      try {
        const data = await testApiKey(item.uuid)
        this.$set(this.testResult, item.uuid, data.latency_ms)
        if (data.ok) {
          const text = data.latency_ms
            ? this.$t('api_keys.toast.test_ok_text_with_latency', { name: item.name, latency: data.latency_ms })
            : this.$t('api_keys.toast.test_ok_text', { name: item.name })
          this.$uiToast.toast(text, { variant: 'success', title: this.$t('api_keys.toast.test_ok_title') })
        } else {
          this.$uiToast.toast(data.error || this.$t('api_keys.toast.test_failed'), {
            variant: 'warning', title: this.$t('api_keys.toast.test_failed_title')
          })
        }
        await this.loadKeys()
      } catch (err) {
        const msg = this.$getErrorMessage(err) || this.$t('api_keys.toast.test_request_failed')
        this.$uiToast.toast(msg, { variant: 'danger', title: this.$t('api_keys.toast.title_error') })
      } finally {
        this.$set(this.testing, item.uuid, false)
      }
    },
    async onDelete (item) {
      const confirmed = await this.$uiConfirm(
        this.$t('api_keys.toast.delete_confirm_msg', { provider: item.provider, name: item.name }),
        {
          title: this.$t('api_keys.toast.delete_confirm_title'),
          okTitle: this.$t('api_keys.toast.delete_confirm_ok'),
          okVariant: 'danger',
          cancelTitle: this.$t('api_keys.toast.delete_confirm_cancel')
        }
      )
      if (!confirmed) return
      try {
        await deleteApiKey(item.uuid)
        this.$uiToast.toast(this.$t('api_keys.toast.key_deleted'), { variant: 'success', title: this.$t('api_keys.toast.title_success') })
        await this.loadKeys()
      } catch (err) {
        const msg = this.$getErrorMessage(err) || this.$t('api_keys.toast.delete_failed')
        this.$uiToast.toast(msg, { variant: 'danger', title: this.$t('api_keys.toast.title_error') })
      }
    },
    formatTime (t) {
      return formatDate(t)
    },
    formatLatency (ms) {
      if (ms == null) return ''
      return `${ms}ms`
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/api-keys.scss"></style>
