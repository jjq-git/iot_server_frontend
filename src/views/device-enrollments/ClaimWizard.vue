<template>
  <base-modal
    :visible="visible"
    size="xl"
    :title="$t('device_enrollment.claim.title')"
    hide-footer
    modal-class="enrollment-claim-modal"
    :centered="false"
    :scrollable="false"
    @hidden="handleHidden"
  >
    <div class="claim-steps" role="list">
      <div
        v-for="item in steps"
        :key="item.number"
        class="claim-step"
        :class="{ 'claim-step--active': step === item.number, 'claim-step--done': step > item.number }"
        role="listitem"
      >
        <span class="claim-step-number">{{ item.number }}</span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <base-alert v-if="optionsError" variant="danger" show>{{ optionsError }}</base-alert>
    <base-alert v-if="claimError" variant="warning" show>{{ claimError }}</base-alert>

    <section v-if="step === 1" class="claim-panel">
      <h5>{{ $t('device_enrollment.claim.identity_step') }}</h5>
      <dl class="claim-detail-grid">
        <dt>{{ $t('device_enrollment.serial') }}</dt><dd>{{ enrollment.serial }}</dd>
        <dt>{{ $t('device_enrollment.host_uuid') }}</dt><dd class="text-monospace">{{ enrollment.host_uuid }}</dd>
        <dt>{{ $t('device_enrollment.hardware_uid') }}</dt><dd>{{ enrollment.host_identity.hardware_uid || '-' }}</dd>
        <dt>{{ $t('device_enrollment.mac') }}</dt><dd>{{ enrollment.host_identity.mac_address || '-' }}</dd>
        <dt>{{ $t('device_enrollment.vendor_product') }}</dt><dd>{{ enrollment.host_identity.vendor_id || '-' }} / {{ enrollment.host_identity.product_code || '-' }}</dd>
        <dt>{{ $t('device_enrollment.version') }}</dt><dd>{{ enrollment.host_identity.hw_version || '-' }} / {{ enrollment.host_identity.sw_version || '-' }}</dd>
      </dl>
    </section>

    <section v-else-if="step === 2" class="claim-panel">
      <h5>{{ $t('device_enrollment.claim.topology_step') }}</h5>
      <dl class="claim-detail-grid mb-3">
        <dt>{{ $t('device_enrollment.host_model') }}</dt><dd>{{ enrollment.matched_host_model_id || '-' }}</dd>
        <dt>{{ $t('device_enrollment.pod_model') }}</dt><dd>{{ enrollment.matched_pod_model_id || '-' }}</dd>
        <dt>{{ $t('device_enrollment.topology_hash') }}</dt><dd class="claim-hash">{{ enrollment.topology_hash || '-' }}</dd>
      </dl>
      <base-table
        :items="slotAssignments"
        :fields="slotFields"
        :empty-text="$t('device_enrollment.claim.no_slots')"
        show-empty
        bordered
        small
      />
    </section>

    <section v-else-if="step === 3" class="claim-panel">
      <h5>{{ $t('device_enrollment.claim.ownership_step') }}</h5>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.manufacturer')" required>
            <base-select v-model="form.manufacturer_id" :options="manufacturerOptions" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.brand')">
            <base-select v-model="form.brand_id" :options="brandOptions" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.channel_partner')">
            <base-select v-model="form.channel_partner_id" :options="channelPartnerOptions" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.enduser')">
            <base-select v-model="form.enduser_id" :options="enduserOptions" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.pod_model')" required>
            <base-select v-model="form.pod_model_id" :options="podModelOptions" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.pod_name')">
            <base-input v-model.trim="form.pod_name" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.claim.location')">
            <base-select v-model="form.location_id" :options="locationOptions" />
          </base-form-group>
        </b-col>
      </b-row>
      <base-form-group :label="$t('device_enrollment.claim.remark')">
        <base-textarea v-model.trim="form.remark" :rows="2" />
      </base-form-group>
    </section>

    <section v-else class="claim-panel">
      <h5>{{ $t('device_enrollment.claim.review_step') }}</h5>
      <base-alert v-if="preflight && preflight.ok" variant="success" show>
        {{ $t('device_enrollment.claim.preflight_ok') }}
      </base-alert>
      <base-alert v-else variant="danger" show>
        <div class="font-weight-bold mb-1">{{ $t('device_enrollment.claim.preflight_failed') }}</div>
        <ul class="mb-0 pl-3">
          <li v-for="(error, index) in (preflight && preflight.errors) || []" :key="index">
            {{ error.message || error.error || $t('device_enrollment.unknown_error') }}
          </li>
        </ul>
      </base-alert>
      <dl class="claim-detail-grid">
        <dt>{{ $t('device_enrollment.claim.manufacturer') }}</dt><dd>{{ companyName(form.manufacturer_id) }}</dd>
        <dt>{{ $t('device_enrollment.claim.company_path') }}</dt><dd>{{ selectedCompanyPath }}</dd>
        <dt>{{ $t('device_enrollment.claim.pod_model') }}</dt><dd>{{ podModelName(form.pod_model_id) }}</dd>
        <dt>{{ $t('device_enrollment.claim.pod_name') }}</dt><dd>{{ form.pod_name || '-' }}</dd>
        <dt>{{ $t('device_enrollment.claim.location') }}</dt><dd>{{ locationName(form.location_id) }}</dd>
        <dt>{{ $t('device_enrollment.claim.slots') }}</dt><dd>{{ slotAssignments.length }}</dd>
      </dl>
    </section>

    <div class="claim-footer">
      <base-button variant="outline-secondary" :disabled="submitting" @click="close">
        {{ $t('common.cancel') }}
      </base-button>
      <div class="claim-footer-actions">
        <base-button v-if="step > 1" variant="outline-secondary" :disabled="submitting" @click="step -= 1">
          {{ $t('common.previous') }}
        </base-button>
        <base-button v-if="step < 4" :disabled="submitting || optionsLoading || (step === 3 && !canSubmit)" @click="nextStep">
          {{ $t('common.next') }}
        </base-button>
        <base-button v-else variant="outline-secondary" :disabled="submitting" @click="runPreflight(false)">
          {{ $t('device_enrollment.claim.preflight') }}
        </base-button>
        <base-button v-if="step === 4" :disabled="submitting || !preflight || !preflight.ok" @click="submitClaim">
          {{ $t('device_enrollment.claim.submit') }}
        </base-button>
      </div>
    </div>
  </base-modal>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import { fetchCompanies } from '@/api/companies'
import { fetchLocations } from '@/api/locations'
import { fetchPodModels } from '@/api/podModels'
import { claimDeviceEnrollment, fetchDeviceEnrollment, preflightDeviceEnrollment } from '@/api/deviceEnrollments'

function listFromResponse (response) {
  if (Array.isArray(response)) return response
  return response?.items || response?.list || response?.data?.items || response?.data?.list || []
}

function newIdempotencyKey () {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `claim-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default {
  name: 'EnrollmentClaimWizard',
  components: { BaseAlert, BaseFormGroup, BaseTextarea },
  props: {
    visible: { type: Boolean, default: false },
    enrollment: { type: Object, required: true }
  },
  data () {
    return {
      step: 1,
      submitting: false,
      optionsLoading: false,
      optionsError: '',
      claimError: '',
      companies: [],
      podModels: [],
      locations: [],
      preflight: null,
      form: this.emptyForm()
    }
  },
  computed: {
    steps () {
      return [
        { number: 1, label: this.$t('device_enrollment.claim.identity_step') },
        { number: 2, label: this.$t('device_enrollment.claim.topology_step') },
        { number: 3, label: this.$t('device_enrollment.claim.ownership_step') },
        { number: 4, label: this.$t('device_enrollment.claim.review_step') }
      ]
    },
    manufacturerOptions () { return this.companyOptions('is_pod_manufacturer') },
    brandOptions () { return this.companyOptions('is_brand') },
    channelPartnerOptions () { return this.companyOptions('is_channel_partner') },
    enduserOptions () { return this.companyOptions('is_enduser') },
    podModelOptions () {
      return [
        { value: null, text: this.$t('device_enrollment.select') },
        ...this.podModels
          .filter(item => String(item.id) === String(this.enrollment.matched_pod_model_id))
          .map(item => ({ value: item.id, text: `${item.code || '-'} · ${item.name || '-'}` }))
      ]
    },
    locationOptions () {
      return [
        { value: null, text: this.$t('device_enrollment.claim.no_location') },
        ...this.locations.map(item => ({ value: item.id || item.uuid, text: item.name || item.location_name || item.address || item.uuid }))
      ]
    },
    slotAssignments () {
      return (this.enrollment.match_result?.slot_assignments || []).map(item => ({
        slot_code: item.slot_code,
        node_hardware_uid: item.node_hardware_uid,
        can_node_id: item.can_node_id ?? '-'
      }))
    },
    slotFields () {
      return [
        { key: 'slot_code', label: this.$t('device_enrollment.claim.slot') },
        { key: 'node_hardware_uid', label: this.$t('device_enrollment.claim.node_uid') },
        { key: 'can_node_id', label: this.$t('device_enrollment.claim.can_id') }
      ]
    },
    canSubmit () {
      return Boolean(this.form.manufacturer_id && this.form.pod_model_id && this.enrollment.topology_hash)
    },
    selectedCompanyPath () {
      const ids = [this.form.brand_id, this.form.channel_partner_id, this.form.enduser_id].filter(Boolean)
      return ids.length ? ids.map(this.companyName).join(' → ') : '-'
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler (value) { if (value) this.prepare() }
    },
    form: {
      deep: true,
      handler () { this.preflight = null }
    }
  },
  methods: {
    emptyForm () {
      return {
        manufacturer_id: null,
        brand_id: null,
        channel_partner_id: null,
        enduser_id: null,
        pod_model_id: null,
        pod_name: '',
        location_id: null,
        remark: '',
        idempotency_key: newIdempotencyKey()
      }
    },
    companyOptions (flag) {
      const options = this.companies.filter(item => item[flag] && item.is_active !== false)
      return [
        { value: null, text: this.$t('device_enrollment.claim.none') },
        ...options.map(item => ({ value: item.id, text: item.short_name || item.company_name || item.company_code }))
      ]
    },
    companyName (id) {
      const item = this.companies.find(company => String(company.id) === String(id))
      return item ? (item.short_name || item.company_name || item.company_code) : '-'
    },
    podModelName (id) {
      const item = this.podModels.find(model => String(model.id) === String(id))
      return item ? `${item.code || '-'} · ${item.name || '-'}` : '-'
    },
    locationName (id) {
      const item = this.locations.find(location => String(location.id || location.uuid) === String(id))
      return item ? (item.name || item.location_name || item.address || item.uuid) : '-'
    },
    async prepare () {
      this.step = 1
      this.preflight = null
      this.optionsError = ''
      this.claimError = ''
      this.form = {
        ...this.emptyForm(),
        manufacturer_id: this.enrollment.manufacturer_id || null,
        pod_model_id: this.enrollment.matched_pod_model_id || null,
        pod_name: this.enrollment.host_identity?.serial || this.enrollment.serial || ''
      }
      this.optionsLoading = true
      try {
        const [companies, models, locations] = await Promise.all([
          fetchCompanies({ page: 1, page_size: 200, is_active: true }),
          fetchPodModels({ page: 1, page_size: 200, is_active: true }),
          fetchLocations({ page: 1, page_size: 200 })
        ])
        this.companies = listFromResponse(companies)
        this.podModels = listFromResponse(models)
        this.locations = listFromResponse(locations)
      } catch (error) {
        this.optionsError = this.$getErrorMessage(error) || this.$t('device_enrollment.load_options_failed')
      } finally {
        this.optionsLoading = false
      }
    },
    claimPayload () {
      return {
        idempotency_key: this.form.idempotency_key,
        expected_topology_hash: this.enrollment.topology_hash,
        expected_lock_version: this.enrollment.lock_version,
        pod_model_id: this.form.pod_model_id,
        pod_name: this.form.pod_name || null,
        manufacturer_id: this.form.manufacturer_id,
        brand_id: this.form.brand_id || null,
        channel_partner_id: this.form.channel_partner_id || null,
        enduser_id: this.form.enduser_id || null,
        location_id: this.form.location_id || null,
        slot_assignments: this.slotAssignments.map(item => ({
          node_hardware_uid: item.node_hardware_uid,
          slot_code: item.slot_code
        })),
        remark: this.form.remark || null
      }
    },
    async nextStep () {
      if (this.step < 3) {
        this.step += 1
        return
      }
      await this.runPreflight(true)
    },
    async runPreflight (goToReview) {
      if (!this.canSubmit) return false
      this.submitting = true
      this.claimError = ''
      try {
        this.preflight = await preflightDeviceEnrollment(this.enrollment.uuid, this.claimPayload())
        if (this.preflight.ok) {
          this.$uiToast.success(this.$t('device_enrollment.claim.preflight_ok'))
          if (goToReview) this.step = 4
        } else {
          const details = (this.preflight.errors || [])
            .map(item => item.message || item.error)
            .filter(Boolean)
            .join('；')
          this.claimError = details || this.$t('device_enrollment.claim.preflight_failed')
          this.$uiToast.error(this.claimError)
        }
        return this.preflight.ok
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('device_enrollment.claim.preflight_failed'))
        return false
      } finally {
        this.submitting = false
      }
    },
    async submitClaim () {
      if (!this.preflight?.ok) return
      this.submitting = true
      try {
        const result = await claimDeviceEnrollment(this.enrollment.uuid, this.claimPayload())
        this.$uiToast.success(this.$t('device_enrollment.claim.success'))
        this.$emit('claimed', result)
        this.close()
      } catch (error) {
        const detail = error.response?.data?.detail
        this.claimError = this.$getErrorMessage(error) || this.$t('device_enrollment.claim.failed')
        this.$uiToast.error(this.claimError)
        await this.recoverAfterClaimFailure(detail?.error)
      } finally {
        this.submitting = false
      }
    },
    async recoverAfterClaimFailure (errorCode) {
      try {
        const latest = await fetchDeviceEnrollment(this.enrollment.uuid)
        const topologyChanged = latest.topology_hash !== this.enrollment.topology_hash
        this.$emit('refresh', latest)
        if (latest.state === 'claimed') {
          this.$uiToast.success(this.$t('device_enrollment.claim.success'))
          this.$emit('claimed', latest)
          this.close()
          return
        }
        if (errorCode === 'TOPOLOGY_CHANGED' || topologyChanged) {
          this.preflight = null
          this.step = 2
        }
      } catch (_) {
        this.$emit('refresh')
      }
    },
    close () { this.$emit('update:visible', false) },
    handleHidden () { this.close() }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/claim-wizard.scss"></style>
