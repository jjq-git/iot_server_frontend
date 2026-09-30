<template>
  <base-card no-body class="factory-stations-panel">
    <div class="factory-stations-panel__header">
      <div>
        <h2>{{ $t('factory_stations.title') }}</h2>
        <p>{{ $t('factory_stations.help') }}</p>
      </div>
      <base-button @click="openCreate"><app-icon name="plus" /> {{ $t('factory_stations.add') }}</base-button>
    </div>

    <base-table
      :items="items"
      :fields="fields"
      :loading="loading"
      :load-error="loadError"
      :empty-text="$t('factory_stations.empty')"
      show-empty
      bordered
      @retry="refresh"
    >
      <template #cell(identity)="data">
        <strong>{{ data.item.station_code }}</strong>
        <div class="small text-muted">{{ data.item.display_name }}</div>
      </template>
      <template #cell(scope)="data">
        <div>{{ manufacturerLabel(data.item.manufacturer_id) }}</div>
        <div class="small text-muted">{{ modelLabel(data.item.expected_host_model_id) }}</div>
        <div class="small text-muted">{{ batchLabel(data.item.factory_batch_id) }} · {{ data.item.expected_product_code }}</div>
      </template>
      <template #cell(validity)="data">
        <base-badge :variant="data.item.is_active ? 'success' : 'danger'">
          {{ $t(data.item.is_active ? 'factory_registry.active' : 'factory_registry.revoked') }}
        </base-badge>
        <div class="small text-muted mt-1">{{ expiryLabel(data.item.expires_at) }}</div>
      </template>
      <template #cell(last_used_at)="data">
        {{ data.item.last_used_at ? formatDateTime(data.item.last_used_at) : '-' }}
      </template>
      <template #cell(actions)="data">
        <base-action-button
          v-if="data.item.is_active"
          :title="$t('factory_stations.revoke')"
          @click="revoke(data.item)"
        >
          <app-icon name="slash-circle" /><span>{{ $t('factory_stations.revoke') }}</span>
        </base-action-button>
      </template>
    </base-table>

    <base-modal v-model="showEditor" :title="$t('factory_stations.add')" @hidden="resetForm">
      <base-alert variant="warning" show>{{ $t('factory_stations.scope_help') }}</base-alert>
      <b-form id="factory-station-form" @submit.prevent="submit">
        <base-form-group :label="$t('factory_stations.station_code')" label-for="station-code" label-class="required-label">
          <base-input id="station-code" v-model.trim="form.station_code" maxlength="64" required />
        </base-form-group>
        <base-form-group :label="$t('factory_stations.display_name')" label-for="station-name" label-class="required-label">
          <base-input id="station-name" v-model.trim="form.display_name" maxlength="128" required />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.manufacturer')" label-for="station-manufacturer" label-class="required-label">
          <base-select id="station-manufacturer" v-model="form.manufacturer_id" :options="manufacturerOptions" required @change="clearModel" />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.host_model')" label-for="station-model" label-class="required-label">
          <base-select id="station-model" v-model="form.expected_host_model_id" :options="modelOptions" required @change="selectModel" />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.batch')" label-for="station-batch" label-class="required-label">
          <base-select id="station-batch" v-model="form.factory_batch_id" :options="batchOptions" required />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.product_code')" label-for="station-product">
          <base-input id="station-product" :value="form.expected_product_code" readonly />
        </base-form-group>
        <base-form-group :label="$t('factory_stations.expires_at')" label-for="station-expires">
          <base-input id="station-expires" v-model="form.expires_at" type="datetime-local" />
        </base-form-group>
        <base-alert v-if="formError" variant="danger" show>{{ formError }}</base-alert>
      </b-form>
      <template #modal-footer>
        <base-button variant="outline-secondary" @click="showEditor = false">{{ $t('common.cancel') }}</base-button>
        <base-button type="submit" form="factory-station-form" :disabled="submitting || !canSubmit">{{ $t('common.save') }}</base-button>
      </template>
    </base-modal>

    <base-modal v-model="showToken" :title="$t('factory_stations.token_title')" @hidden="tokenRecord = null">
      <base-alert variant="warning" show>{{ $t('factory_stations.token_help') }}</base-alert>
      <base-form-group v-if="tokenRecord" :label="tokenRecord.station_code">
        <div class="factory-stations-panel__token">
          <base-input :value="tokenRecord.station_token" class="text-monospace" readonly />
          <base-button variant="outline-secondary" @click="copyToken">{{ $t('common.copy') }}</base-button>
        </div>
      </base-form-group>
      <template #modal-footer>
        <base-button @click="showToken = false">{{ $t('common.close') }}</base-button>
      </template>
    </base-modal>
  </base-card>
</template>

<script>
import {
  createFactoryStation,
  fetchFactoryStations,
  revokeFactoryStation
} from '@/api/deviceEnrollments'
import toast from '@/services/ui/toast'
import { copyText } from '@/utils/clipboard'
import { formatDate } from '@/utils/format'

export default {
  name: 'FactoryStationsPanel',
  props: {
    manufacturers: { type: Array, default: () => [] },
    hostModels: { type: Array, default: () => [] },
    factoryBatches: { type: Array, default: () => [] }
  },
  data () {
    return {
      items: [],
      loading: false,
      loadError: '',
      submitting: false,
      formError: '',
      showEditor: false,
      showToken: false,
      tokenRecord: null,
      form: {}
    }
  },
  computed: {
    fields () {
      return [
        { key: 'identity', label: this.$t('factory_stations.identity') },
        { key: 'scope', label: this.$t('factory_stations.scope') },
        { key: 'validity', label: this.$t('factory_stations.validity') },
        { key: 'last_used_at', label: this.$t('factory_stations.last_used_at') },
        { key: 'actions', label: this.$t('common.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    manufacturerOptions () {
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...this.manufacturers.map(item => ({
        value: item.id,
        text: `${item.company_code} · ${item.company_name}`
      }))]
    },
    modelOptions () {
      const manufacturerId = Number(this.form.manufacturer_id)
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...this.hostModels
        .filter(item => Number(item.company_id) === manufacturerId)
        .map(item => ({
          value: item.id,
          text: `${item.model_code || '-'} · HW ${item.hw_version || '-'} · ${item.model_name || '-'}`
        }))]
    },
    batchOptions () {
      const modelId = Number(this.form.expected_host_model_id)
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...this.factoryBatches
        .filter(item => Number(item.hn_models_hw_id) === modelId)
        .map(item => ({ value: item.id, text: item.code }))]
    },
    canSubmit () {
      return Boolean(
        this.form.station_code &&
        this.form.display_name &&
        Number(this.form.manufacturer_id) > 0 &&
        Number(this.form.expected_host_model_id) > 0 &&
        Number(this.form.factory_batch_id) > 0 &&
        this.form.expected_product_code
      )
    }
  },
  created () {
    this.resetForm()
    this.refresh()
  },
  methods: {
    resetForm () {
      this.formError = ''
      this.form = {
        station_code: '',
        display_name: '',
        manufacturer_id: null,
        expected_host_model_id: null,
        factory_batch_id: null,
        expected_product_code: '',
        expires_at: ''
      }
    },
    openCreate () {
      this.resetForm()
      this.showEditor = true
    },
    clearModel () {
      this.form.expected_host_model_id = null
      this.form.factory_batch_id = null
      this.form.expected_product_code = ''
    },
    selectModel () {
      const model = this.hostModels.find(item => Number(item.id) === Number(this.form.expected_host_model_id))
      this.form.factory_batch_id = null
      this.form.expected_product_code = model?.product_code || ''
    },
    manufacturerLabel (id) {
      const item = this.manufacturers.find(company => Number(company.id) === Number(id))
      return item ? `${item.company_code} · ${item.company_name}` : `#${id}`
    },
    modelLabel (id) {
      const item = this.hostModels.find(model => Number(model.id) === Number(id))
      return item ? `${item.model_code || '-'} · HW ${item.hw_version || '-'}` : `#${id}`
    },
    batchLabel (id) {
      return this.factoryBatches.find(batch => Number(batch.id) === Number(id))?.code || `#${id}`
    },
    expiryLabel (value) {
      return value ? this.formatDateTime(value) : this.$t('factory_stations.never_expires')
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    async refresh () {
      if (this.loading) return
      this.loading = true
      this.loadError = ''
      try {
        const result = await fetchFactoryStations()
        this.items = result.items || []
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('factory_stations.load_failed')
      } finally { this.loading = false }
    },
    async submit () {
      if (!this.canSubmit || this.submitting) return
      this.submitting = true
      this.formError = ''
      try {
        const payload = {
          ...this.form,
          manufacturer_id: Number(this.form.manufacturer_id),
          expected_host_model_id: Number(this.form.expected_host_model_id),
          factory_batch_id: Number(this.form.factory_batch_id),
          expires_at: this.form.expires_at ? new Date(this.form.expires_at).toISOString() : null
        }
        const result = await createFactoryStation(payload)
        this.tokenRecord = result
        this.showEditor = false
        this.showToken = true
        toast.success(this.$t('factory_stations.create_success'))
        await this.refresh()
      } catch (error) {
        this.formError = this.$getErrorMessage(error) || this.$t('factory_stations.save_failed')
      } finally { this.submitting = false }
    },
    async revoke (item) {
      const confirmed = await this.$uiConfirm(
        this.$t('factory_stations.revoke_confirm', { code: item.station_code }),
        { okVariant: 'danger' }
      )
      if (!confirmed) return
      try {
        await revokeFactoryStation(item.uuid)
        toast.success(this.$t('factory_stations.revoke_success'))
        await this.refresh()
      } catch (error) {
        toast.error(this.$getErrorMessage(error) || this.$t('factory_stations.save_failed'))
      }
    },
    async copyToken () {
      if (!this.tokenRecord?.station_token) return
      try {
        await copyText(this.tokenRecord.station_token)
        toast.success(this.$t('factory_stations.token_copied'))
      } catch (error) {
        toast.error(this.$getErrorMessage(error) || this.$t('factory_stations.save_failed'))
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/factory-stations-panel.scss"></style>
