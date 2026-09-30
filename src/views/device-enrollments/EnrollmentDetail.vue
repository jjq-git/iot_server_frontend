<template>
  <div class="enrollment-detail">
    <base-alert v-if="loadError" variant="danger" show>
      {{ loadError }}
      <base-button size="sm" variant="outline-danger" class="ml-2" @click="load">{{ $t('common.retry') }}</base-button>
    </base-alert>
    <base-loading v-if="loading" />

    <template v-else-if="enrollment">
      <base-card class="enrollment-hero mb-3">
        <div class="detail-heading">
          <div class="detail-heading__identity">
            <h2 class="enrollment-hero__serial">{{ enrollment.serial }}</h2>
            <div class="text-muted text-monospace detail-uuid">{{ enrollment.uuid }}</div>
          </div>
          <div class="detail-actions enrollment-hero__actions">
            <base-badge :variant="stateVariant(enrollment.state)">{{ stateLabel(enrollment.state) }}</base-badge>
            <base-badge :variant="connectionBadge.variant">{{ connectionBadge.label }}</base-badge>
            <base-button v-if="canClaim" @click="claimVisible = true">{{ $t('device_enrollment.claim.action') }}</base-button>
            <base-button v-if="canConfirmReplacement" variant="warning" @click="openAction('confirm_replacement')">
              {{ $t('device_enrollment.confirm_replacement') }}
            </base-button>
            <base-button v-if="canRematch" variant="outline-primary" :loading="rematching" :disabled="rematching" @click="rematch">{{ $t('device_enrollment.rematch') }}</base-button>
          </div>
        </div>
        <base-alert v-if="connectionLimited" variant="warning" show class="mt-3 mb-0">
          {{ $t('device_enrollment.connection_limited_help') }}
        </base-alert>
      </base-card>

      <b-row class="detail-panels">
        <b-col cols="12" xl="6" class="mb-3">
          <base-card class="detail-panel">
            <h3 class="detail-section-title">{{ $t('device_enrollment.identity') }}</h3>
            <dl class="detail-grid">
              <dt>{{ $t('device_enrollment.host_uuid') }}</dt><dd class="text-monospace">{{ enrollment.host_uuid }}</dd>
              <dt>{{ $t('device_enrollment.hardware_uid') }}</dt><dd>{{ enrollment.host_identity.hardware_uid || '-' }}</dd>
              <dt>{{ $t('device_enrollment.mac') }}</dt><dd>{{ enrollment.host_identity.mac_address || '-' }}</dd>
              <dt>{{ $t('device_enrollment.vendor_product') }}</dt><dd>{{ enrollment.host_identity.vendor_id || '-' }} / {{ enrollment.host_identity.product_code || '-' }}</dd>
              <dt>{{ $t('device_enrollment.version') }}</dt><dd>{{ enrollment.host_identity.hw_version || '-' }} / {{ enrollment.host_identity.sw_version || '-' }}</dd>
            </dl>
          </base-card>
        </b-col>
        <b-col cols="12" xl="6" class="mb-3">
          <base-card class="detail-panel">
            <h3 class="detail-section-title">{{ $t('device_enrollment.match') }}</h3>
            <dl class="detail-grid">
              <dt>{{ $t('device_enrollment.host_model') }}</dt><dd>{{ enrollment.matched_host_model_id || '-' }}</dd>
              <dt>{{ $t('device_enrollment.pod_model') }}</dt><dd>{{ enrollment.matched_pod_model_id || '-' }}</dd>
              <dt>{{ $t('device_enrollment.manufacturer') }}</dt><dd>{{ enrollment.manufacturer_id || '-' }}</dd>
              <dt>{{ $t('device_enrollment.topology_hash') }}</dt><dd class="hash-value">{{ enrollment.topology_hash || '-' }}</dd>
              <dt>{{ $t('device_enrollment.host_record') }}</dt><dd>{{ hostRegistrationLabel }}</dd>
              <dt>{{ $t('device_enrollment.mqtt_connected_at') }}</dt><dd>{{ formatDate(presence && presence.mqtt_connected_at) }}</dd>
              <dt>{{ $t('device_enrollment.last_processed_report') }}</dt><dd>{{ formatDate(enrollment.last_seen_at) }}</dd>
            </dl>
          </base-card>
        </b-col>
      </b-row>

      <base-card class="detail-panel topology-panel mb-3">
        <h3 class="detail-section-title">{{ $t('device_enrollment.topology') }}</h3>
        <base-alert v-if="enrollment.error_code" variant="danger" show>
          <strong>{{ enrollment.error_code }}</strong> · {{ enrollmentErrorLabel(enrollment.error_code) }}
          <div v-if="enrollment.error_detail" class="mt-1">
            {{ $t('device_enrollment.error_detail') }}: {{ enrollment.error_detail }}
          </div>
        </base-alert>
        <base-table :items="nodes" :fields="nodeFields" :empty-text="$t('device_enrollment.no_nodes')" show-empty bordered>
          <template #cell(protocol)="data">{{ data.item.vendor_id }} / {{ data.item.product_code }}</template>
          <template #cell(version)="data">{{ data.item.hw_version || '-' }} / {{ data.item.sw_version || '-' }}</template>
        </base-table>
      </base-card>

      <base-card v-if="canPlatformManage" class="detail-panel risk-panel">
        <h3 class="detail-section-title">{{ $t('device_enrollment.risk_actions') }}</h3>
        <div v-if="hasRiskActions" class="risk-panel__content">
          <p class="risk-panel__help small text-muted">{{ $t('device_enrollment.risk_actions_help') }}</p>
          <div class="detail-actions risk-panel__actions">
            <base-button v-if="canQuarantine" variant="outline-warning" @click="openAction('quarantine')">{{ $t('device_enrollment.quarantine') }}</base-button>
            <base-button v-if="canRelease" variant="outline-success" @click="openAction('release')">{{ $t('device_enrollment.release') }}</base-button>
            <base-button v-if="canRevoke" variant="outline-danger" @click="openAction('revoke')">{{ $t('device_enrollment.revoke') }}</base-button>
          </div>
        </div>
        <base-alert v-if="isRevoked" variant="warning" show class="mb-0">
          <div>{{ revokedHelp }}</div>
          <base-button
            v-if="canOpenFactoryRegistryRecovery"
            class="mt-2"
            size="sm"
            variant="outline-primary"
            @click="openFactoryRegistry"
          >
            {{ $t('device_enrollment.open_factory_registry') }}
          </base-button>
        </base-alert>
      </base-card>
    </template>

    <enrollment-claim-wizard
      v-if="enrollment"
      :visible.sync="claimVisible"
      :enrollment="enrollment"
      @claimed="handleClaimed"
      @refresh="handleWizardRefresh"
    />

    <base-modal
      v-model="actionVisible"
      :title="$t(`device_enrollment.${pendingAction}`)"
      :ok-title="$t('common.confirm')"
      :cancel-title="$t('common.cancel')"
      :ok-disabled="actionReason.trim().length < 3 || actionBusy"
      :busy="actionBusy"
      modal-class="enrollment-action-modal"
      :centered="false"
      :scrollable="false"
      @ok="submitAction"
    >
      <base-alert v-if="actionWarning" :variant="pendingAction === 'revoke' ? 'danger' : 'warning'" show>
        {{ actionWarning }}
      </base-alert>
      <base-form-group :label="$t('device_enrollment.reason')" label-for="enrollment-action-reason" required>
        <base-textarea id="enrollment-action-reason" v-model="actionReason" :rows="3" />
      </base-form-group>
    </base-modal>
  </div>
</template>

<script>
import EnrollmentClaimWizard from './ClaimWizard.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import {
  confirmDeviceReplacement,
  fetchDeviceEnrollment,
  fetchDeviceEnrollmentPresence,
  quarantineDeviceEnrollment,
  releaseDeviceEnrollment,
  rematchDeviceEnrollment,
  revokeDeviceEnrollment
} from '@/api/deviceEnrollments'
import { getCurrentUser, hasPermission, isPlatformAdmin, PERMISSION } from '@/utils/permission'
import { formatDate as formatDateUtil } from '@/utils/format'

function newIdempotencyKey () {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `replacement-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export default {
  name: 'DeviceEnrollmentDetail',
  components: { BaseAlert, BaseFormGroup, BaseTextarea, EnrollmentClaimWizard },
  data () {
    return {
      loading: false,
      rematching: false,
      loadError: '',
      enrollment: null,
      presence: null,
      presenceTimer: null,
      claimVisible: false,
      actionVisible: false,
      actionBusy: false,
      actionReason: '',
      pendingAction: 'quarantine'
    }
  },
  computed: {
    currentUser () { return getCurrentUser() },
    canManage () { return hasPermission(PERMISSION.USER_MANAGE, this.currentUser) },
    canPlatformManage () { return hasPermission(PERMISSION.FACTORY_REGISTRY_MANAGE, this.currentUser) },
    canClaim () { return this.canManage && this.enrollment?.state === 'ready_to_claim' },
    canQuarantine () {
      return !['claimed', 'retired', 'revoked', 'quarantined'].includes(this.enrollment?.state)
    },
    canRelease () { return this.enrollment?.state === 'quarantined' },
    canRevoke () { return this.enrollment?.state !== 'revoked' },
    hasRiskActions () { return this.canQuarantine || this.canRelease || this.canRevoke },
    isRevoked () { return this.enrollment?.state === 'revoked' },
    canOpenFactoryRegistryRecovery () {
      return this.isRevoked && this.enrollment?.error_code === 'FACTORY_REGISTRY_REVOKED'
    },
    revokedHelp () {
      const keyByError = {
        FACTORY_REGISTRY_REVOKED: 'revoked_factory_help',
        REPAIR_REKEY_PENDING: 'revoked_rekey_help',
        MANUAL_REVOKE: 'revoked_manual_help'
      }
      const key = keyByError[this.enrollment?.error_code] || 'revoked_help'
      return this.$t(`device_enrollment.${key}`)
    },
    canRematch () {
      return this.canManage &&
        !['claimed', 'claiming', 'revoked', 'retired', 'quarantined'].includes(this.enrollment?.state)
    },
    connectionLimited () {
      return this.presence?.mqtt_connected === true &&
        (!this.presence.host_registered || ['quarantined', 'revoked', 'retired'].includes(this.enrollment?.state))
    },
    connectionBadge () {
      if (!this.presence || this.presence.mqtt_connected === null) {
        return { variant: 'secondary', label: this.$t('device_enrollment.connection_unavailable') }
      }
      if (this.presence.mqtt_connected === false) {
        return { variant: 'secondary', label: this.$t('device_enrollment.offline') }
      }
      if (this.connectionLimited) {
        return { variant: 'warning', label: this.$t('device_enrollment.online_limited') }
      }
      return { variant: 'success', label: this.$t('device_enrollment.online') }
    },
    hostRegistrationLabel () {
      if (!this.presence || this.presence.host_registered === null) return '-'
      return this.$t(this.presence.host_registered
        ? 'device_enrollment.host_registered'
        : 'device_enrollment.host_unregistered')
    },
    canConfirmReplacement () {
      return isPlatformAdmin(this.currentUser) &&
        this.enrollment?.state === 'conflict' &&
        this.enrollment?.error_code === 'IDENTITY_CONFLICT' &&
        Boolean(this.enrollment?.topology_hash) &&
        (this.enrollment?.topology_snapshot?.nodes?.length || 0) > 0
    },
    actionWarning () {
      const keyByAction = {
        confirm_replacement: 'confirm_replacement_warning',
        quarantine: 'quarantine_warning',
        release: 'release_warning',
        revoke: 'revoke_warning'
      }
      const key = keyByAction[this.pendingAction]
      return key ? this.$t(`device_enrollment.${key}`) : ''
    },
    nodes () { return this.enrollment?.topology_snapshot?.nodes || [] },
    nodeFields () {
      return [
        { key: 'node_pos', label: this.$t('device_enrollment.node_position') },
        { key: 'can_node_id', label: this.$t('device_enrollment.can_id') },
        { key: 'serial', label: this.$t('device_enrollment.serial') },
        { key: 'hardware_uid', label: this.$t('device_enrollment.hardware_uid') },
        { key: 'protocol', label: this.$t('device_enrollment.vendor_product') },
        { key: 'version', label: this.$t('device_enrollment.version') }
      ]
    }
  },
  created () { this.load() },
  beforeDestroy () {
    if (this.presenceTimer) clearInterval(this.presenceTimer)
  },
  methods: {
    async load () {
      this.loading = true
      this.loadError = ''
      try {
        this.enrollment = await fetchDeviceEnrollment(this.$route.params.enrollmentUuid)
        this.loadPresence()
        this.startPresencePolling()
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('device_enrollment.load_failed')
      } finally {
        this.loading = false
      }
    },
    async loadPresence () {
      if (!this.enrollment) return
      try {
        this.presence = await fetchDeviceEnrollmentPresence(this.enrollment.uuid)
      } catch (error) {
        this.presence = {
          mqtt_status: 'unavailable',
          mqtt_connected: null,
          host_registered: null,
          mqtt_connected_at: null
        }
      }
    },
    startPresencePolling () {
      if (this.presenceTimer) clearInterval(this.presenceTimer)
      this.presenceTimer = setInterval(() => this.loadPresence(), 15000)
    },
    formatDate (value) { return formatDateUtil(value) },
    enrollmentErrorLabel (code) {
      const key = `device_enrollment.error_messages.${code}`
      return this.$te(key) ? this.$t(key) : this.$t('device_enrollment.error_fallback')
    },
    stateLabel (state) { return this.$t(`device_enrollment.states.${state}`) },
    stateVariant (state) {
      if (state === 'claimed') return 'success'
      if (state === 'ready_to_claim') return 'primary'
      if (['conflict', 'revoked'].includes(state)) return 'danger'
      if (state === 'quarantined') return 'warning'
      return 'secondary'
    },
    async rematch () {
      if (this.rematching) return
      this.rematching = true
      try {
        this.enrollment = await rematchDeviceEnrollment(this.enrollment.uuid)
        this.$uiToast.success(this.$t('device_enrollment.rematch_success'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('device_enrollment.action_failed'))
      } finally {
        this.rematching = false
      }
    },
    handleClaimed () { this.load() },
    handleWizardRefresh (latest) {
      if (latest) this.enrollment = latest
      else this.load()
    },
    openFactoryRegistry () {
      this.$router.push({ name: 'DeviceFactoryRegistry' }).catch(() => {})
    },
    openAction (action) {
      this.pendingAction = action
      this.actionReason = ''
      this.actionVisible = true
    },
    async submitAction (event) {
      event.preventDefault()
      if (this.actionReason.trim().length < 3) return
      const actions = {
        quarantine: quarantineDeviceEnrollment,
        release: releaseDeviceEnrollment,
        revoke: revokeDeviceEnrollment
      }
      this.actionBusy = true
      try {
        if (this.pendingAction === 'confirm_replacement') {
          await confirmDeviceReplacement(this.enrollment.uuid, {
            idempotency_key: newIdempotencyKey(),
            expected_topology_hash: this.enrollment.topology_hash,
            expected_lock_version: this.enrollment.lock_version,
            reason: this.actionReason.trim()
          })
          await this.load()
          this.$uiToast.success(this.$t('device_enrollment.confirm_replacement_success'))
        } else {
          this.enrollment = await actions[this.pendingAction](this.enrollment.uuid, this.actionReason.trim())
          this.$uiToast.success(this.$t('device_enrollment.action_success'))
        }
        this.actionVisible = false
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('device_enrollment.action_failed'))
      } finally {
        this.actionBusy = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/device-enrollments/enrollment-detail.scss"></style>
