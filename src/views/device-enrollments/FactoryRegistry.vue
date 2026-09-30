<template>
  <div class="factory-registry">
    <base-alert v-if="readinessBlockers.length" variant="warning" show class="registry-blockers">
      <div class="registry-notice registry-notice--top">
        <span class="registry-notice__icon" aria-hidden="true"><app-icon name="exclamation-triangle"  /></span>
        <div>
          <strong>{{ $t('factory_registry.blockers') }}</strong>
          <ul class="registry-blockers__list">
            <li v-for="blocker in readinessBlockers" :key="blocker">{{ blocker }}</li>
          </ul>
        </div>
      </div>
    </base-alert>

    <factory-stations-panel
      v-if="canManageFactoryStations"
      :manufacturers="manufacturers"
      :host-models="hostModels"
      :factory-batches="factoryBatches"
    />

    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <div class="registry-filter-stack">
          <b-form class="factory-registry__filters" @submit.prevent="applyFilters">
            <div class="filter-row">
              <div class="filter-left">
                <base-input
                  v-model.trim="query.search"
                  class="filter-control registry-search"
                  :placeholder="$t('factory_registry.search')"
                  @input="clearAttestationStatus"
                  @keyup.enter="applyFilters"
                />
                <base-icon-button
                  class="registry-attestation__action"
                  :label="$t('factory_registry.attestation_status_action')"
                  :loading="attestationLoading"
                  :disabled="!query.search.trim()"
                  @click="lookupAttestationStatus"
                ><app-icon name="shield-check" /></base-icon-button>
                <base-input
                  v-model.trim="query.factory_batch"
                  class="filter-control"
                  :placeholder="$t('factory_registry.batch')"
                  @keyup.enter="applyFilters"
                />
                <base-select
                  v-model="query.is_active"
                  class="filter-control"
                  :options="activeOptions"
                  @input="applyFilters"
                />
                <div class="filter-actions registry-actions">
                  <base-icon-button class="registry-actions__icon-button" :label="$t('common.reset')" @click="resetFilters"><app-icon name="arrow-counterclockwise" /></base-icon-button>
                  <span class="registry-actions__divider" aria-hidden="true"></span>
                  <input ref="csvInput" class="d-none" type="file" accept=".csv,text/csv" @change="importCsv">
                  <base-icon-button class="registry-actions__icon-button" :label="$t('factory_registry.template')" @click="downloadTemplate"><app-icon name="download" /></base-icon-button>
                  <base-icon-button class="registry-actions__icon-button" :label="$t('factory_registry.import')" @click="$refs.csvInput.click()"><app-icon name="upload" /></base-icon-button>
                  <base-button @click="openCreate"><app-icon name="controller-host-add" /> {{ $t('factory_registry.add') }}</base-button>
                </div>
              </div>
            </div>
          </b-form>
          <div v-if="attestationStatus" class="registry-attestation__result" role="status">
            <span class="registry-attestation__label">{{ $t('factory_registry.attestation_lookup') }}</span>
            <strong>{{ attestationStatus.serial }}</strong>
            <base-badge :variant="attestationStatusVariant(attestationStatus.state)">{{ attestationStatusLabel(attestationStatus.state) }}</base-badge>
            <span v-if="attestationStatus.error_code" class="text-danger">{{ attestationStatusErrorLabel(attestationStatus.error_code) }}</span>
            <dl v-if="attestationStatus.registry_state" class="registry-attestation__stages">
              <div v-for="stage in attestationStageRows" :key="stage.key">
                <dt>{{ $t(`factory_registry.attestation_stage_labels.${stage.key}`) }}</dt>
                <dd>{{ attestationStageValue(stage.value) }}</dd>
              </div>
              <div v-if="attestationExpectedVersion">
                <dt>{{ $t('factory_registry.attestation_stage_labels.expected_version') }}</dt>
                <dd>{{ attestationExpectedVersion }}</dd>
              </div>
              <div>
                <dt>{{ $t('factory_registry.attestation_stage_labels.retryable') }}</dt>
                <dd>{{ $t(attestationStatus.retryable ? 'common.yes' : 'common.no') }}</dd>
              </div>
            </dl>
            <p v-if="attestationStatus.state === 'unregistered' || attestationStatus.state === 'awaiting_public_key'">
              {{ $t('factory_registry.attestation_public_key_help') }}
            </p>
          </div>
          <div v-if="attestationError" class="registry-attestation__error" role="alert">
            <span class="registry-attestation__label">{{ $t('factory_registry.attestation_lookup') }}</span>
            {{ attestationError }}
          </div>
        </div>
      </template>

      <base-table
        :items="items"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        :empty-text="$t('factory_registry.empty')"
        show-empty
        bordered
        @retry="refresh"
      >
        <template #cell(identity)="data">
          <div class="font-weight-bold">{{ data.item.serial }}</div>
          <div class="small text-muted">{{ data.item.expected_mac_address || '-' }}</div>
          <div class="small text-muted text-truncate identity-uid">{{ data.item.expected_efuse_chip_id || '-' }}</div>
        </template>
        <template #cell(production)="data">
          <div>{{ data.item.factory_batch_code || data.item.factory_batch }}</div>
          <div class="small text-muted">{{ data.item.production_date || '-' }}</div>
        </template>
        <template #cell(ownership)="data">
          <div>{{ data.item.manufacturer_name || '-' }}</div>
          <div class="small text-muted">{{ data.item.expected_host_model_code || '-' }} · {{ data.item.expected_host_model_name || '-' }}</div>
        </template>
        <template #cell(readiness)="data">
          <base-badge :variant="readinessVariant(data.item)">{{ readinessLabel(data.item) }}</base-badge>
          <div class="small text-muted mt-1">{{ bootstrapSchemeLabel(data.item.bootstrap_scheme) }}</div>
          <div
            v-if="data.item.readiness_errors.length"
            :class="['small', 'mt-1', activationCompleted(data.item) ? 'text-warning' : 'text-danger']"
          >
            <span v-if="activationCompleted(data.item)">{{ $t('factory_registry.reactivation_required') }}：</span>
            {{ formatLabelList(data.item.readiness_errors.map(readinessErrorLabel)) }}
          </div>
        </template>
        <template #cell(state)="data">
          <base-badge :variant="data.item.is_active ? 'success' : 'danger'">
            {{ $t(data.item.is_active ? 'factory_registry.active' : 'factory_registry.revoked') }}
          </base-badge>
          <div class="small text-muted mt-1">{{ enrollmentStateLabel(data.item.enrollment_state) }}</div>
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button v-if="data.item.is_active" :title="$t('common.edit')" @click="openEdit(data.item)">
              <app-icon name="pencil"  /><span>{{ $t('common.edit') }}</span>
            </base-action-button>
            <base-action-button v-if="data.item.enrollment_uuid" :title="$t('factory_registry.repair_rekey')" @click="openRepairRekey(data.item)">
              <app-icon name="key" /><span>{{ $t('factory_registry.repair_rekey') }}</span>
            </base-action-button>
            <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.serial].filter(Boolean).join(' ') }">
              <template #button-content><app-icon name="list" aria-hidden="true" /></template>
              <b-dropdown-item-button v-if="data.item.is_active" class="text-danger" @click="toggleActive(data.item, false)"><app-icon name="slash-circle" aria-hidden="true" /> {{ $t('factory_registry.revoke') }}</b-dropdown-item-button>
              <b-dropdown-item-button v-else-if="!data.item.enrollment_uuid" @click="openRecovery(data.item)"><app-icon name="arrow-counterclockwise" aria-hidden="true" /> {{ $t('factory_registry.recover_unactivated') }}</b-dropdown-item-button>
              <b-dropdown-item-button v-else @click="toggleActive(data.item, true)"><app-icon name="arrow-counterclockwise" aria-hidden="true" /> {{ $t('factory_registry.reactivate') }}</b-dropdown-item-button>
            </b-dropdown>
          </div>
        </template>
      </base-table>
      <template #footer>
        <base-pagination v-if="total > 0" v-model="query.page" :total-rows="total" :per-page.sync="query.page_size" :show-per-page="true" @input="refresh" />
      </template>
    </list-page-card>

    <base-modal v-model="showEditor" :title="$t(editingUuid ? 'factory_registry.edit' : 'factory_registry.add')" size="xl" @hidden="resetForm" :centered="false" :scrollable="false">
      <div class="registry-form-help">
        <base-alert variant="warning" show class="mb-0">{{ $t('factory_registry.form_help') }}</base-alert>
      </div>
      <b-form id="factory-registry-editor-form" @submit.prevent="submitForm">
        <div class="form-grid">
          <base-form-group :label="$t('factory_registry.serial')" label-for="registry-serial" label-class="required-label">
            <div class="d-flex align-items-center">
              <base-input id="registry-serial" v-model.trim="form.serial" class="flex-grow-1" :disabled="Boolean(editingUuid) || !isD1FactoryModel" :placeholder="isD1FactoryModel ? 'WF2P00D1-<BASE_MAC_12HEX>' : ''" required />
              <base-button v-if="!editingUuid && !isD1FactoryModel && serialIssueFailed" class="ml-2" variant="outline-secondary" :loading="issuingSerial" @click="issueSerial">{{ $t('common.retry') }}</base-button>
            </div>
          </base-form-group>
          <base-form-group :label="$t('factory_registry.manufacturer')" label-for="registry-manufacturer" label-class="required-label">
            <base-select id="registry-manufacturer" v-model="form.manufacturer_id" :options="manufacturerOptions" required @change="clearModelAndBatch" />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.host_model')" label-for="registry-model" label-class="required-label">
            <base-select id="registry-model" v-model="form.expected_host_model_id" :options="hostModelOptions" required @change="form.factory_batch_id = null" />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.batch')" label-for="registry-batch" label-class="required-label">
            <div class="registry-batch-control">
              <base-select id="registry-batch" v-model="form.factory_batch_id" class="registry-batch-control__select" :options="factoryBatchOptions" :disabled="!form.expected_host_model_id" required />
              <base-icon-button
                class="registry-batch-control__create"
                :label="`${$t('common.create')} ${$t('factory_registry.batch')}`"
                @click="openBatchCreate"
              ><app-icon name="plus" /></base-icon-button>
            </div>
          </base-form-group>
          <base-form-group :label="$t('factory_registry.mac')" label-for="registry-mac" label-class="required-label">
            <base-input id="registry-mac" v-model.trim="form.expected_mac_address" placeholder="EC:DA:3B:66:05:E8" required />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.assembly')" label-for="registry-production-date" label-class="required-label">
            <base-input id="registry-production-date" v-model="form.production_date" type="date" required />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.efuse_chip_id')" label-for="registry-efuse-chip-id" label-class="required-label">
            <base-input id="registry-efuse-chip-id" v-model.trim="form.expected_efuse_chip_id" required />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.vendor_id')" label-for="registry-vendor">
            <base-input id="registry-vendor" v-model.trim="form.expected_vendor_id" placeholder="0x44454E47" />
          </base-form-group>
          <base-form-group :label="$t('factory_registry.product_code')" label-for="registry-product">
            <base-input id="registry-product" v-model.trim="form.expected_product_code" placeholder="0x0000C001" />
          </base-form-group>
          <base-form-group class="form-grid__wide" :label="$t('factory_registry.device_pubkey')" label-for="registry-device-pubkey" label-class="required-label">
            <b-form-textarea id="registry-device-pubkey" v-model.trim="form.device_pubkey" rows="5" class="text-monospace" required />
          </base-form-group>
        </div>

        <base-alert v-if="formError" variant="danger" show class="mt-3">{{ formError }}</base-alert>
      </b-form>
      <template #modal-footer>
        <base-button type="button" variant="outline-secondary" @click="showEditor = false">{{ $t('common.cancel') }}</base-button>
        <base-button type="submit" form="factory-registry-editor-form" :disabled="submitting || !form.serial">{{ $t('common.save') }}</base-button>
      </template>
    </base-modal>

    <base-modal v-model="showBatchEditor" :title="`${$t('common.create')} ${$t('factory_registry.batch')}`" @hidden="resetBatchForm">
      <b-form id="factory-batch-editor-form" @submit.prevent="submitBatchForm">
        <base-form-group :label="$t('factory_registry.host_model')" label-for="factory-batch-model" label-class="required-label">
          <base-select id="factory-batch-model" v-model="batchForm.hn_models_hw_id" :options="allHostModelOptions" required />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.batch')" label-for="factory-batch-code" label-class="required-label">
          <base-input id="factory-batch-code" v-model.trim="batchForm.code" placeholder="2026-37" required />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.supplier')" label-for="factory-batch-supplier">
          <base-input id="factory-batch-supplier" v-model.trim="batchForm.supplier" />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.material_lot')" label-for="factory-batch-material-lot">
          <base-input id="factory-batch-material-lot" v-model.trim="batchForm.material_lot" />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.remark')" label-for="factory-batch-remark">
          <b-form-textarea id="factory-batch-remark" v-model.trim="batchForm.remark" rows="3" />
        </base-form-group>
        <base-alert v-if="batchFormError" variant="danger" show>{{ batchFormError }}</base-alert>
      </b-form>
      <template #modal-footer>
        <base-button variant="outline-secondary" @click="showBatchEditor = false">{{ $t('common.cancel') }}</base-button>
        <base-button type="submit" form="factory-batch-editor-form" :disabled="batchSubmitting">{{ $t('common.save') }}</base-button>
      </template>
    </base-modal>

    <base-modal v-model="showBootstrapDelivery" :title="$t('factory_registry.bootstrap_secret')" @hidden="bootstrapDelivery = null">
      <base-alert variant="warning" show>{{ bootstrapDeliveryHelp }}</base-alert>
      <div v-if="bootstrapDelivery">
        <div class="small text-muted">{{ $t(bootstrapDelivery.shared_device_count ? 'factory_registry.product_code' : 'factory_registry.serial') }}</div>
        <div class="font-weight-bold mb-1">{{ bootstrapDelivery.shared_device_count ? bootstrapDelivery.expected_product_code : bootstrapDelivery.serial }}</div>
        <div class="small text-muted mb-3">{{ bootstrapSchemeLabel(bootstrapDelivery.bootstrap_scheme) }}<span v-if="bootstrapDelivery.shared_device_count"> · {{ $t('factory_registry.shared_device_count', { count: bootstrapDelivery.shared_device_count }) }}</span></div>
        <base-form-group :label="$t('factory_registry.bootstrap_secret')">
          <div class="d-flex align-items-center">
            <base-input :value="bootstrapDelivery.bootstrap_password" class="flex-grow-1 text-monospace" readonly />
            <base-button class="ml-2" variant="outline-secondary" @click="copyBootstrapPassword">{{ $t('common.copy') }}</base-button>
          </div>
        </base-form-group>
      </div>
      <template #modal-footer>
        <base-button @click="showBootstrapDelivery = false">{{ $t('common.close') }}</base-button>
      </template>
    </base-modal>

    <base-modal
      v-model="showRecovery"
      :title="$t('factory_registry.recover_unactivated_title')"
      size="lg"
      :centered="false"
      :scrollable="false"
      @hidden="resetRecovery"
    >
      <base-alert variant="warning" show>
        <strong>{{ $t('factory_registry.recover_unactivated_warning_title') }}</strong>
        <div>{{ $t('factory_registry.recover_unactivated_warning') }}</div>
      </base-alert>
      <div v-if="recoveryItem" class="repair-rekey-identity">
        <div><span>{{ $t('factory_registry.serial') }}</span><strong>{{ recoveryItem.serial }}</strong></div>
        <div><span>{{ $t('factory_registry.mac') }}</span><strong>{{ recoveryItem.expected_mac_address || '-' }}</strong></div>
        <div><span>{{ $t('factory_registry.efuse_chip_id') }}</span><strong>{{ recoveryItem.expected_efuse_chip_id || '-' }}</strong></div>
      </div>
      <b-form id="factory-registry-recovery-form" @submit.prevent="submitRecovery">
        <base-form-group :label="$t('factory_registry.host_model')" label-for="recovery-host-model" label-class="required-label">
          <base-select id="recovery-host-model" v-model="recoveryForm.expected_host_model_id" :options="recoveryHostModelOptions" required @change="recoveryForm.factory_batch_id = null" />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.batch')" label-for="recovery-factory-batch" label-class="required-label">
          <base-select id="recovery-factory-batch" v-model="recoveryForm.factory_batch_id" :options="recoveryBatchOptions" required />
        </base-form-group>
        <base-form-group :label="$t('factory_registry.new_device_pubkey')" label-for="recovery-public-key" label-class="required-label">
          <b-form-textarea id="recovery-public-key" v-model.trim="recoveryForm.device_pubkey" rows="6" class="text-monospace" required />
          <small class="form-text text-muted">{{ $t('factory_registry.repair_rekey_public_key_help') }}</small>
        </base-form-group>
        <base-form-group :label="$t('factory_registry.expected_public_key_sha256')" label-for="recovery-fingerprint" label-class="required-label">
          <base-input id="recovery-fingerprint" v-model.trim="recoveryForm.expected_public_key_sha256" class="text-monospace" maxlength="64" required />
          <small class="form-text text-muted">{{ $t('factory_registry.expected_public_key_sha256_help') }}</small>
        </base-form-group>
        <base-form-group :label="$t('factory_registry.recovery_reason')" label-for="recovery-reason" label-class="required-label">
          <b-form-textarea id="recovery-reason" v-model.trim="recoveryForm.reason" rows="3" maxlength="500" required />
        </base-form-group>
        <b-form-checkbox v-model="recoveryForm.bootstrap_material_confirmed">
          {{ $t('factory_registry.bootstrap_material_confirmed') }}
        </b-form-checkbox>
        <base-alert v-if="recoveryError" variant="danger" show class="mt-3">{{ recoveryError }}</base-alert>
      </b-form>
      <template #modal-footer>
        <base-button type="button" variant="outline-secondary" @click="showRecovery = false">{{ $t('common.cancel') }}</base-button>
        <base-button
          type="submit"
          form="factory-registry-recovery-form"
          variant="warning"
          :disabled="!canSubmitRecovery || recoverySubmitting"
        >
          {{ $t('factory_registry.confirm_recovery') }}
        </base-button>
      </template>
    </base-modal>

    <base-modal
      v-model="showRepairRekey"
      :title="$t('factory_registry.repair_rekey_title')"
      size="lg"
      :centered="false"
      :scrollable="false"
      @hidden="resetRepairRekey"
    >
      <base-alert variant="danger" show>
        <strong>{{ $t('factory_registry.repair_rekey_warning_title') }}</strong>
        <div>{{ $t('factory_registry.repair_rekey_warning') }}</div>
      </base-alert>
      <div v-if="repairRekeyItem" class="repair-rekey-identity">
        <div><span>{{ $t('factory_registry.serial') }}</span><strong>{{ repairRekeyItem.serial }}</strong></div>
        <div><span>{{ $t('factory_registry.mac') }}</span><strong>{{ repairRekeyItem.expected_mac_address || '-' }}</strong></div>
        <div><span>{{ $t('factory_registry.efuse_chip_id') }}</span><strong>{{ repairRekeyItem.expected_efuse_chip_id || '-' }}</strong></div>
      </div>
      <b-form id="factory-registry-repair-rekey-form" @submit.prevent="submitRepairRekey">
        <base-form-group :label="$t('factory_registry.new_device_pubkey')" label-for="repair-rekey-public-key" label-class="required-label">
          <b-form-textarea
            id="repair-rekey-public-key"
            v-model.trim="repairRekeyForm.device_pubkey"
            rows="6"
            class="text-monospace"
            required
          />
          <small class="form-text text-muted">{{ $t('factory_registry.repair_rekey_public_key_help') }}</small>
        </base-form-group>
        <base-form-group :label="$t('factory_registry.repair_reason')" label-for="repair-rekey-reason" label-class="required-label">
          <b-form-textarea id="repair-rekey-reason" v-model.trim="repairRekeyForm.reason" rows="3" maxlength="500" required />
        </base-form-group>
        <b-form-checkbox v-model="repairRekeyForm.device_offline_confirmed">
          {{ $t('factory_registry.repair_rekey_offline_confirm') }}
        </b-form-checkbox>
        <base-alert v-if="repairRekeyError" variant="danger" show class="mt-3">{{ repairRekeyError }}</base-alert>
      </b-form>
      <template #modal-footer>
        <base-button type="button" variant="outline-secondary" @click="showRepairRekey = false">{{ $t('common.cancel') }}</base-button>
        <base-button
          type="submit"
          form="factory-registry-repair-rekey-form"
          variant="danger"
          :disabled="!canSubmitRepairRekey || repairRekeySubmitting"
        >
          {{ $t('factory_registry.confirm_repair_rekey') }}
        </base-button>
      </template>
    </base-modal>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import FactoryStationsPanel from './FactoryStationsPanel.vue'
import { fetchCompanies } from '@/api/companies'
import { fetchHnModelHardwareLines } from '@/api/hnModels'
import {
  fetchFactoryRegistry,
  fetchFactoryRegistryReadiness,
  fetchFactoryAttestationStatus,
  issueFactorySerial,
  createFactoryRegistry,
  bulkCreateFactoryRegistry,
  updateFactoryRegistry,
  revokeFactoryRegistry,
  reactivateFactoryRegistry,
  recoverUnactivatedFactoryRegistry,
  confirmFactoryRegistryRepairRekey,
  fetchFactoryBatches,
  createFactoryBatch
} from '@/api/deviceEnrollments'
import toast from '@/services/ui/toast'
import { copyText } from '@/utils/clipboard'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { formatList } from '@/utils/format'

const CSV_FIELDS = [
  'serial', 'factory_batch_id', 'expected_host_model_id', 'production_date',
  'expected_mac_address', 'expected_efuse_chip_id', 'expected_vendor_id',
  'expected_product_code', 'device_pubkey'
]

const CSV_REQUIRED_FIELDS = [
  'serial', 'factory_batch_id', 'expected_host_model_id', 'production_date', 'expected_mac_address',
  'expected_efuse_chip_id', 'device_pubkey'
]

const CSV_LABEL_KEYS = {
  serial: 'factory_registry.serial',
  factory_batch_id: 'factory_registry.batch',
  expected_host_model_id: 'factory_registry.host_model',
  expected_mac_address: 'factory_registry.mac',
  production_date: 'factory_registry.assembly',
  expected_efuse_chip_id: 'factory_registry.efuse_chip_id',
  expected_vendor_id: 'factory_registry.vendor_id',
  expected_product_code: 'factory_registry.product_code',
  device_pubkey: 'factory_registry.device_pubkey'
}

function csvRow (values) {
  return values.map(value => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }).join(',')
}

function parseCsv (text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index += 1 } else if (char === '"') quoted = false
      else value += char
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(value.trim()); value = ''
    } else if (char === '\n') {
      row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ''
    } else if (char !== '\r') {
      value += char
    }
  }
  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function localDateString () {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export default {
  name: 'DeviceFactoryRegistry',
  components: { BaseAlert, ListPageCard, FactoryStationsPanel },
  data () {
    return {
      loading: false,
      attestationStatus: null,
      attestationLoading: false,
      attestationError: '',
      loadError: '',
      submitting: false,
      showEditor: false,
      showRecovery: false,
      showRepairRekey: false,
      showBatchEditor: false,
      showBootstrapDelivery: false,
      editingUuid: null,
      formError: '',
      repairRekeyError: '',
      repairRekeySubmitting: false,
      recoveryError: '',
      recoverySubmitting: false,
      issuingSerial: false,
      serialIssueFailed: false,
      batchSubmitting: false,
      batchFormError: '',
      bootstrapDelivery: null,
      batchForm: {},
      repairRekeyItem: null,
      recoveryItem: null,
      recoveryForm: {
        factory_batch_id: null,
        expected_host_model_id: null,
        device_pubkey: '',
        expected_public_key_sha256: '',
        reason: '',
        bootstrap_material_confirmed: false
      },
      repairRekeyForm: {
        device_pubkey: '',
        reason: '',
        device_offline_confirmed: false
      },
      items: [],
      total: 0,
      readiness: {},
      manufacturers: [],
      hostModels: [],
      factoryBatches: [],
      query: { page: 1, page_size: 20, search: '', factory_batch: '', is_active: null },
      form: {}
    }
  },
  computed: {
    canManageFactoryStations () {
      return hasPermission(PERMISSION.FACTORY_STATION_MANAGE, getCurrentUser())
    },
    isD1FactoryModel () {
      return this.hostModels.some(item => Number(item.id) === Number(this.form.expected_host_model_id) && item.model_code === 'P-00D1')
    },
    bootstrapDeliveryHelp () {
      return this.$t(this.bootstrapDelivery?.bootstrap_scheme === 'product-shared-v1'
        ? 'factory_registry.bootstrap_help_shared'
        : 'factory_registry.bootstrap_help_efuse')
    },
    fields () {
      return [
        { key: 'identity', label: this.$t('factory_registry.identity'), thStyle: { width: '22%', minWidth: '240px' } },
        { key: 'production', label: this.$t('factory_registry.production'), thStyle: { width: '16%', minWidth: '180px' } },
        { key: 'ownership', label: this.$t('factory_registry.ownership'), thStyle: { width: '28%', minWidth: '260px' } },
        { key: 'readiness', label: this.$t('factory_registry.readiness'), thStyle: { width: '14%', minWidth: '165px' } },
        { key: 'state', label: this.$t('factory_registry.state'), thStyle: { width: '12%', minWidth: '130px' } },
        { key: 'actions', label: this.$t('common.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    activeOptions () {
      return [
        { value: null, text: this.$t('factory_registry.all_states') },
        { value: true, text: this.$t('factory_registry.active') },
        { value: false, text: this.$t('factory_registry.revoked') }
      ]
    },
    manufacturerOptions () {
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...this.manufacturers.map(item => ({ value: item.id, text: `${item.company_code} · ${item.company_name}` }))]
    },
    hostModelOptions () {
      const manufacturerId = Number(this.form.manufacturer_id)
      const models = this.hostModels.filter(item => item.company_id == null || Number(item.company_id) === manufacturerId)
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...models.map(item => ({
        value: item.id,
        text: this.$t('factory_registry.host_model_option', {
          code: item.model_code || '-',
          hw: item.hw_version || '-',
          od: '-',
          sw: '-',
          name: item.model_name || '-'
        })
      }))]
    },
    allHostModelOptions () {
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...this.hostModels.map(item => ({
        value: item.id,
        text: `${item.model_code || '-'} · HW ${item.hw_version || '-'} · ${item.model_name || '-'}`
      }))]
    },
    factoryBatchOptions () {
      const hardwareId = Number(this.form.expected_host_model_id)
      const items = this.factoryBatches.filter(item => !hardwareId || Number(item.hn_models_hw_id) === hardwareId)
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...items.map(item => ({
        value: item.id,
        text: `${item.code} · ${item.model_code || '-'} · HW ${item.hw_version || '-'}`
      }))]
    },
    recoveryHostModelOptions () {
      return this.allHostModelOptions
    },
    recoveryBatchOptions () {
      const hardwareId = Number(this.recoveryForm.expected_host_model_id)
      const items = this.factoryBatches.filter(item => !hardwareId || Number(item.hn_models_hw_id) === hardwareId)
      return [{ value: null, text: this.$t('device_enrollment.select') }, ...items.map(item => ({
        value: item.id,
        text: `${item.code} · ${item.model_code || '-'} · HW ${item.hw_version || '-'}`
      }))]
    },
    readinessBlockers () {
      if (!Object.keys(this.readiness).length) return []
      const result = []
      if (!this.readiness.enrollment_enabled) result.push(this.$t('factory_registry.blocker_enrollment'))
      if (!this.readiness.inventory_ingest_enabled) result.push(this.$t('factory_registry.blocker_inventory'))
      if (!this.readiness.mqtt_attestation_enabled) result.push(this.$t('factory_registry.blocker_attestation'))
      if (!this.readiness.bootstrap_master_secret_configured) result.push(this.$t('factory_registry.blocker_bootstrap_secret'))
      if (this.readiness.auto_claim_enabled) result.push(this.$t('factory_registry.blocker_auto_claim'))
      return result
    },
    attestationStageRows () {
      if (!this.attestationStatus) return []
      return [
        { key: 'registry', value: this.attestationStatus.registry_state },
        { key: 'attestation', value: this.attestationStatus.attestation_state },
        { key: 'credential', value: this.attestationStatus.credential_state },
        { key: 'online', value: this.attestationStatus.online_state },
        { key: 'bootstrap', value: this.attestationStatus.bootstrap_state }
      ].filter(item => item.value)
    },
    attestationExpectedVersion () {
      const identity = this.attestationStatus?.expected_identity
      if (!identity) return ''
      const parts = []
      if (identity.hw_version) parts.push(`HW ${identity.hw_version}`)
      if (identity.od_version) parts.push(`OD ${identity.od_version}`)
      if (Array.isArray(identity.sw_versions) && identity.sw_versions.length) {
        parts.push(`SW ${identity.sw_versions.join(', ')}`)
      }
      return parts.join(' · ')
    },
    canSubmitRepairRekey () {
      return Boolean(
        this.repairRekeyItem &&
        this.repairRekeyForm.device_pubkey &&
        this.repairRekeyForm.reason.length >= 8 &&
        this.repairRekeyForm.device_offline_confirmed &&
        Number.isInteger(this.repairRekeyItem.enrollment_lock_version)
      )
    },
    canSubmitRecovery () {
      return Boolean(
        this.recoveryItem &&
        Number(this.recoveryForm.factory_batch_id) > 0 &&
        Number(this.recoveryForm.expected_host_model_id) > 0 &&
        this.recoveryForm.device_pubkey &&
        /^[0-9a-fA-F]{64}$/.test(this.recoveryForm.expected_public_key_sha256) &&
        this.recoveryForm.reason.length >= 8 &&
        this.recoveryForm.bootstrap_material_confirmed
      )
    }
  },
  watch: {
    'form.expected_host_model_id' (modelId) {
      if (this.editingUuid) return
      if (this.isD1FactoryModel) {
        this.form.serial = ''
        this.form.expected_vendor_id = '0x44454E47'
        this.form.expected_product_code = '0x480000D1'
      } else if (modelId && !this.form.serial) {
        if (this.form.expected_product_code === '0x480000D1') this.form.expected_product_code = ''
        this.issueSerial()
      }
    }
  },
  created () {
    this.resetForm()
    this.resetBatchForm()
    this.refresh()
    this.loadOptions()
  },
  methods: {
    attestationStatusLabel (state) {
      return this.$t(`factory_registry.attestation_states.${state}`)
    },
    attestationStatusVariant (state) {
      return { active: 'success', revoked: 'danger', identity_conflict: 'danger' }[state] || 'secondary'
    },
    attestationStageValue (value) {
      return this.$t(`factory_registry.attestation_stage_values.${value}`)
    },
    attestationStatusErrorLabel (code) {
      const key = `factory_registry.errors.${code}`
      const translated = this.$t(key)
      return translated === key ? code : translated
    },
    async lookupAttestationStatus () {
      const serial = this.query.search.trim()
      if (!serial) return
      this.attestationLoading = true
      this.attestationStatus = null
      this.attestationError = ''
      try {
        const status = await fetchFactoryAttestationStatus(serial)
        if (this.query.search.trim() === serial) this.attestationStatus = status
      } catch (error) {
        if (this.query.search.trim() === serial) {
          this.attestationError = this.$getErrorMessage(error) || this.$t('factory_registry.attestation_lookup_failed')
        }
      } finally { this.attestationLoading = false }
    },
    clearAttestationStatus () {
      this.attestationStatus = null
      this.attestationError = ''
    },
    clearModelAndBatch () {
      this.form.expected_host_model_id = null
      this.form.factory_batch_id = null
    },
    bootstrapSchemeLabel (scheme) {
      return this.$t(scheme === 'product-shared-v1'
        ? 'factory_registry.bootstrap_scheme_shared'
        : 'factory_registry.bootstrap_scheme_efuse')
    },
    activationCompleted (item) {
      return ['activated', 'topology_pending', 'ready_to_claim', 'claiming', 'claimed'].includes(item.enrollment_state)
    },
    readinessLabel (item) {
      if (this.activationCompleted(item)) return this.$t('factory_registry.activated')
      if (item.attestation_ready) return this.$t('factory_registry.attestation_ready')
      return this.$t('factory_registry.not_ready')
    },
    readinessVariant (item) {
      return this.activationCompleted(item) || item.attestation_ready ? 'success' : 'secondary'
    },
    readinessErrorLabel (code) { return this.$t(`factory_registry.errors.${code}`) },
    formatLabelList (items) { return formatList(items) },
    enrollmentStateLabel (state) { return state ? this.$t(`device_enrollment.states.${state}`) : this.$t('factory_registry.not_activated') },
    async refresh () {
      if (this.loading) return
      this.loading = true
      this.loadError = ''
      try {
        const params = { ...this.query }
        Object.keys(params).forEach(key => { if (params[key] === '' || params[key] === null) delete params[key] })
        const [list, readiness] = await Promise.all([fetchFactoryRegistry(params), fetchFactoryRegistryReadiness()])
        this.items = list.items || []
        this.total = list.total || 0
        this.readiness = readiness || {}
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('factory_registry.load_failed')
      } finally { this.loading = false }
    },
    async loadOptions () {
      try {
        const [companies, models, batches] = await Promise.all([
          fetchCompanies({ page: 1, page_size: 200, is_active: true }),
          fetchHnModelHardwareLines({ page: 1, page_size: 200, model_type: 'product', status: 'active' }),
          fetchFactoryBatches({ page: 1, page_size: 200, is_active: true })
        ])
        this.manufacturers = (companies.items || []).filter(item => item.is_pod_manufacturer)
        this.hostModels = models.items || []
        this.factoryBatches = batches.items || []
      } catch (error) { toast.error(this.$getErrorMessage(error) || this.$t('factory_registry.options_failed')) }
    },
    applyFilters () { this.query.page = 1; this.refresh() },
    resetFilters () { this.query = { page: 1, page_size: this.query.page_size, search: '', factory_batch: '', is_active: null }; this.clearAttestationStatus(); this.refresh() },
    resetForm () {
      this.editingUuid = null
      this.formError = ''
      this.serialIssueFailed = false
      this.form = {
        serial: '',
        factory_batch_id: null,
        manufacturer_id: null,
        expected_host_model_id: null,
        expected_mac_address: '',
        production_date: localDateString(),
        expected_efuse_chip_id: '',
        expected_vendor_id: '',
        expected_product_code: '',
        device_pubkey: ''
      }
    },
    async openCreate () {
      this.resetForm()
      this.showEditor = true
      await this.issueSerial()
    },
    async issueSerial () {
      if (this.issuingSerial) return
      this.issuingSerial = true
      this.serialIssueFailed = false
      this.formError = ''
      try {
        const result = await issueFactorySerial()
        if (!this.isD1FactoryModel) this.form.serial = result.serial
      } catch (error) {
        this.serialIssueFailed = true
        this.formError = this.$getErrorMessage(error) || this.$t('factory_registry.save_failed')
      } finally { this.issuingSerial = false }
    },
    openRepairRekey (item) {
      this.resetRepairRekey()
      this.repairRekeyItem = item
      this.showRepairRekey = true
    },
    openRecovery (item) {
      this.resetRecovery()
      this.recoveryItem = item
      this.recoveryForm.factory_batch_id = item.factory_batch_id
      this.recoveryForm.expected_host_model_id = item.expected_host_model_id
      this.showRecovery = true
    },
    resetRecovery () {
      this.recoveryError = ''
      this.recoverySubmitting = false
      this.recoveryItem = null
      this.recoveryForm = {
        factory_batch_id: null,
        expected_host_model_id: null,
        device_pubkey: '',
        expected_public_key_sha256: '',
        reason: '',
        bootstrap_material_confirmed: false
      }
    },
    resetRepairRekey () {
      this.repairRekeyError = ''
      this.repairRekeySubmitting = false
      this.repairRekeyItem = null
      this.repairRekeyForm = {
        device_pubkey: '',
        reason: '',
        device_offline_confirmed: false
      }
    },
    openEdit (item) {
      this.editingUuid = item.uuid
      this.form = {
        serial: item.serial,
        factory_batch_id: item.factory_batch_id,
        manufacturer_id: item.manufacturer_id,
        expected_host_model_id: item.expected_host_model_id,
        expected_mac_address: item.expected_mac_address || '',
        production_date: item.production_date || '',
        expected_efuse_chip_id: item.expected_efuse_chip_id || '',
        expected_vendor_id: item.expected_vendor_id || '',
        expected_product_code: item.expected_product_code || '',
        device_pubkey: item.device_pubkey || ''
      }
      this.showEditor = true
    },
    cleanFormPayload () {
      const data = { ...this.form }
      for (const key of ['expected_vendor_id', 'expected_product_code']) {
        if (!data[key]) data[key] = null
      }
      delete data.manufacturer_id
      data.expected_host_model_id = Number(data.expected_host_model_id)
      data.factory_batch_id = Number(data.factory_batch_id)
      return data
    },
    async submitForm () {
      this.submitting = true
      this.formError = ''
      try {
        const data = this.cleanFormPayload()
        if (this.editingUuid) {
          delete data.serial
          await updateFactoryRegistry(this.editingUuid, data)
        } else {
          const result = await createFactoryRegistry(data)
          this.bootstrapDelivery = result
          this.showBootstrapDelivery = true
        }
        toast.success(this.$t('factory_registry.save_success'))
        this.showEditor = false
        await this.refresh()
      } catch (error) {
        this.formError = this.$getErrorMessage(error) || this.$t('factory_registry.save_failed')
      } finally { this.submitting = false }
    },
    resetBatchForm () {
      this.batchFormError = ''
      this.batchForm = {
        hn_models_hw_id: null,
        code: '',
        supplier: '',
        material_lot: '',
        remark: ''
      }
    },
    openBatchCreate () {
      this.resetBatchForm()
      this.batchForm.hn_models_hw_id = this.form.expected_host_model_id || null
      this.showBatchEditor = true
    },
    async submitBatchForm () {
      this.batchSubmitting = true
      this.batchFormError = ''
      try {
        const data = { ...this.batchForm, hn_models_hw_id: Number(this.batchForm.hn_models_hw_id) }
        for (const key of ['supplier', 'material_lot', 'remark']) if (!data[key]) data[key] = null
        const created = await createFactoryBatch(data)
        await this.loadOptions()
        this.form.expected_host_model_id = created.hn_models_hw_id
        this.form.factory_batch_id = created.id
        this.showBatchEditor = false
        toast.success(this.$t('factory_registry.save_success'))
      } catch (error) {
        this.batchFormError = this.$getErrorMessage(error) || this.$t('factory_registry.save_failed')
      } finally { this.batchSubmitting = false }
    },
    async copyBootstrapPassword () {
      if (!this.bootstrapDelivery?.bootstrap_password) return
      try {
        await copyText(this.bootstrapDelivery.bootstrap_password)
        toast.success(this.$t('factory_registry.secret_copied'))
      } catch (error) {
        toast.error(this.$getErrorMessage(error) || this.$t('factory_registry.save_failed'))
      }
    },
    async toggleActive (item, active) {
      const confirmed = await this.$uiConfirm(this.$t(active ? 'factory_registry.reactivate_confirm' : 'factory_registry.revoke_confirm', { serial: item.serial }), { okVariant: active ? 'primary' : 'danger' })
      if (!confirmed) return
      try {
        const reason = active ? 'Production manifest reactivated by platform administrator' : 'Production manifest revoked by platform administrator'
        if (active) await reactivateFactoryRegistry(item.uuid, reason)
        else await revokeFactoryRegistry(item.uuid, reason)
        toast.success(this.$t('factory_registry.save_success'))
        await this.refresh()
      } catch (error) { toast.error(this.$getErrorMessage(error) || this.$t('factory_registry.save_failed')) }
    },
    async submitRepairRekey () {
      if (!this.canSubmitRepairRekey || this.repairRekeySubmitting) return
      this.repairRekeySubmitting = true
      this.repairRekeyError = ''
      try {
        const result = await confirmFactoryRegistryRepairRekey(this.repairRekeyItem.uuid, {
          device_pubkey: this.repairRekeyForm.device_pubkey,
          reason: this.repairRekeyForm.reason,
          expected_lock_version: this.repairRekeyItem.enrollment_lock_version
        })
        toast.success(this.$t('factory_registry.repair_rekey_success', {
          serial: result.serial,
          fingerprint: result.new_public_key_sha256.slice(0, 12)
        }))
        this.showRepairRekey = false
        await this.refresh()
      } catch (error) {
        this.repairRekeyError = this.$getErrorMessage(error) || this.$t('factory_registry.repair_rekey_failed')
      } finally {
        this.repairRekeySubmitting = false
      }
    },
    async submitRecovery () {
      if (!this.canSubmitRecovery || this.recoverySubmitting) return
      this.recoverySubmitting = true
      this.recoveryError = ''
      try {
        const result = await recoverUnactivatedFactoryRegistry(this.recoveryItem.uuid, {
          factory_batch_id: Number(this.recoveryForm.factory_batch_id),
          expected_host_model_id: Number(this.recoveryForm.expected_host_model_id),
          device_pubkey: this.recoveryForm.device_pubkey,
          expected_public_key_sha256: this.recoveryForm.expected_public_key_sha256.toLowerCase(),
          expected_current_factory_batch_id: this.recoveryItem.factory_batch_id,
          expected_current_host_model_id: this.recoveryItem.expected_host_model_id,
          reason: this.recoveryForm.reason,
          bootstrap_material_confirmed: this.recoveryForm.bootstrap_material_confirmed
        })
        toast.success(this.$t('factory_registry.recover_unactivated_success', {
          serial: result.serial,
          fingerprint: result.public_key_sha256.slice(0, 12)
        }))
        this.showRecovery = false
        await this.refresh()
      } catch (error) {
        this.recoveryError = this.$getErrorMessage(error) || this.$t('factory_registry.recover_unactivated_failed')
      } finally {
        this.recoverySubmitting = false
      }
    },
    saveTextFile (name, text, type = 'text/csv;charset=utf-8') {
      const blob = new Blob(['\uFEFF', text], { type })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      link.click()
      URL.revokeObjectURL(url)
    },
    downloadTemplate () {
      const localizedLabels = CSV_FIELDS.map(field => this.$t(CSV_LABEL_KEYS[field]))
      this.saveTextFile('device_factory_registry_template.csv', `${csvRow(localizedLabels)}\n${csvRow(CSV_FIELDS)}\n`)
    },
    async importCsv (event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      try {
        const rows = parseCsv(await file.text())
        const headerIndex = rows.findIndex(row => CSV_REQUIRED_FIELDS.every(field => row.includes(field)))
        if (headerIndex < 0 || rows.length <= headerIndex + 1) throw new Error(this.$t('factory_registry.csv_header_error'))
        const header = rows[headerIndex]
        const items = rows.slice(headerIndex + 1).map(row => {
          const item = Object.fromEntries(header.map((field, index) => [field, row[index] || '']))
          item.expected_host_model_id = Number(item.expected_host_model_id)
          item.factory_batch_id = Number(item.factory_batch_id)
          for (const key of ['expected_vendor_id', 'expected_product_code']) if (!item[key]) item[key] = null
          return item
        })
        const confirmed = await this.$uiConfirm(this.$t('factory_registry.import_confirm', { count: items.length }), { okVariant: 'primary' })
        if (!confirmed) return
        const result = await bulkCreateFactoryRegistry(items)
        if (result.errors?.length) {
          throw new Error(result.errors.map(item => `${this.$t('factory_registry.row')} ${item.row}: ${item.message || item.error}`).join('；'))
        }
        if (result.created?.length) {
          const perDevice = result.created.filter(item => item.bootstrap_scheme !== 'product-shared-v1')
          const shared = result.created.filter(item => item.bootstrap_scheme === 'product-shared-v1')
          const rows = perDevice.map(item => csvRow([item.serial, item.bootstrap_password]))
          if (rows.length) {
            this.saveTextFile('device_bootstrap_passwords.csv', `${csvRow(['serial', 'bootstrap_password'])}\n${rows.join('\n')}\n`)
          }
          if (shared.length) {
            this.bootstrapDelivery = { ...shared[0], shared_device_count: shared.length }
            this.showBootstrapDelivery = true
          }
        }
        toast.success(this.$t('factory_registry.import_success', { count: result.created?.length || 0 }))
        await this.refresh()
      } catch (error) { toast.error(this.$getErrorMessage(error) || this.$t('factory_registry.import_failed')) }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/factory-registry.scss"></style>
