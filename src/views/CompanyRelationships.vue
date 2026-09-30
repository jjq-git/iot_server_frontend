<template>
  <div class="company-relationships">
    <list-page-card :show-footer="false">
      <template #filters>
        <div class="company-relationships__toolbar">
          <div class="company-relationships__scope">
            <app-icon name="info-circle" aria-hidden="true" />
            <span>{{ $t('company_relationships.scope_notice') }}</span>
          </div>
          <div class="company-relationships__actions">
            <base-button variant="outline-primary" :loading="loading" @click="loadRelationships">
              <app-icon name="arrow-clockwise" aria-hidden="true" />
              {{ $t('common.refresh') }}
            </base-button>
            <base-button v-if="canManage" @click="openRequestDialog">
              <app-icon name="plus" aria-hidden="true" />
              {{ $t('company_relationships.request_action') }}
            </base-button>
          </div>
        </div>
      </template>

      <base-table
        class="company-relationships__table"
        :items="relationships"
        :fields="fields"
        :loading="loading"
        :load-error="loadError"
        :empty-text="$t('company_relationships.empty')"
        @retry="loadRelationships"
      >
        <template #cell(direction)="data">
          <base-badge :variant="isBuyer(data.item) ? 'info' : 'secondary'">
            {{ $t(isBuyer(data.item) ? 'company_relationships.direction_buyer' : 'company_relationships.direction_supplier') }}
          </base-badge>
        </template>
        <template #cell(supplier_company)="data">
          <strong>{{ companyLabel(data.item.supplier_company) }}</strong>
          <div class="text-muted small">{{ data.item.supplier_company.company_code }}</div>
        </template>
        <template #cell(buyer_company)="data">
          <strong>{{ companyLabel(data.item.buyer_company) }}</strong>
          <div class="text-muted small">{{ data.item.buyer_company.company_code }}</div>
        </template>
        <template #cell(status)="data">
          <base-badge :variant="statusVariant(data.item.status)">
            {{ $t(`company_relationships.status.${data.item.status}`) }}
          </base-badge>
        </template>
        <template #cell(response)="data">
          <span v-if="data.item.responded_at">
            {{ formatTimestamp(data.item.responded_at) }}
            <span v-if="data.item.responded_by" class="text-muted small d-block">
              {{ $t('company_relationships.responded_by', { id: data.item.responded_by }) }}
            </span>
          </span>
          <span v-else>-</span>
        </template>
        <template #cell(allow_token_resale)="data">
          <base-switch
            :checked="Boolean(data.item.allow_token_resale)"
            :disabled="!canEditCapability(data.item) || capabilityUpdatingId === data.item.id"
            @change="updateTokenResale(data.item, $event)"
          >
            {{ $t(data.item.allow_token_resale ? 'common.yes' : 'common.no') }}
          </base-switch>
        </template>
        <template #cell(capabilities)="data">
          <div class="capability-list">
            <div
              v-for="capability in capabilityDefinitions"
              :key="capability.key"
              class="capability-row"
            >
              <span class="capability-label">{{ capability.label }}</span>
              <base-select
                v-if="canEditAccessCapability(data.item, capability.key)"
                :value="data.item[capability.key]"
                :options="capabilityOptions(data.item, capability.key)"
                :disabled="capabilityUpdatingKey === capabilityUpdateKey(data.item, capability.key)"
                :aria-label="capability.label"
                class="capability-select"
                @input="updateAccessCapability(data.item, capability.key, $event)"
              />
              <base-badge v-else :variant="capabilityVariant(data.item[capability.key])">
                {{ capabilityStateLabel(data.item[capability.key]) }}
              </base-badge>
            </div>
          </div>
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button
              v-if="canDecide(data.item)"
              :title="$t('company_relationships.accept_action')"
              @click="openActionDialog('accept', data.item)"
            >
              <app-icon name="check2" aria-hidden="true" />
              <span>{{ $t('company_relationships.accept_action') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canDecide(data.item)"
              :title="$t('company_relationships.reject_action')"
              @click="openActionDialog('reject', data.item)"
            >
              <app-icon name="x-lg" aria-hidden="true" />
              <span>{{ $t('company_relationships.reject_action') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canEnd(data.item)"
              :title="$t('company_relationships.end_action')"
              @click="openActionDialog('end', data.item)"
            >
              <app-icon name="slash-circle" aria-hidden="true" />
              <span>{{ $t('company_relationships.end_action') }}</span>
            </base-action-button>
            <span v-if="!canDecide(data.item) && !canEnd(data.item)">-</span>
          </div>
        </template>
      </base-table>
    </list-page-card>

    <base-modal
      v-model="showRequestDialog"
      :title="$t('company_relationships.request_title')"
      :ok-title="$t('company_relationships.request_action')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      @ok="submitRelationshipRequest"
      @hidden="resetRequestDialog"
    >
      <base-alert variant="info">{{ $t('company_relationships.request_help') }}</base-alert>
      <base-form-group
        label-for="relationship-buyer-code"
        :label="$t('company_relationships.buyer_code_label')"
        required
        :state="buyerCodeState"
        :invalid-feedback="$t('company_relationships.buyer_code_required')"
      >
        <base-input
          id="relationship-buyer-code"
          v-model.trim="buyerCompanyCode"
          maxlength="32"
          autocomplete="off"
          :placeholder="$t('company_relationships.buyer_code_placeholder')"
          :state="buyerCodeState"
        />
      </base-form-group>
      <base-alert variant="secondary">{{ $t('company_relationships.capability_request_help') }}</base-alert>
      <base-form-group
        v-for="capability in capabilityDefinitions"
        :key="capability.key"
        :label="capability.label"
        :label-for="`relationship-${capability.key}`"
      >
        <base-select
          :id="`relationship-${capability.key}`"
          v-model="requestCapabilities[capability.key]"
          :options="requestCapabilityOptions"
        />
      </base-form-group>
    </base-modal>

    <base-modal
      v-model="showActionDialog"
      :title="actionDialogTitle"
      :ok-title="actionDialogAction"
      :ok-variant="pendingAction && pendingAction.type === 'accept' ? 'primary' : 'danger'"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      @ok="submitPendingAction"
      @hidden="pendingAction = null"
    >
      <base-alert :variant="pendingAction && pendingAction.type === 'accept' ? 'info' : 'warning'">
        {{ actionDialogMessage }}
      </base-alert>
    </base-modal>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import {
  acceptCompanyRelationship,
  endCompanyRelationship,
  fetchCompanyRelationships,
  rejectCompanyRelationship,
  requestCompanyRelationship,
  updateCompanyRelationshipCapabilities
} from '@/api'
import { formatDate } from '@/utils/format'
import { canWriteCompany, hasPermission, PERMISSION } from '@/utils/permission'

export default {
  name: 'CompanyRelationships',
  components: {
    BaseAlert,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseSwitch,
    BaseTable,
    ListPageCard
  },
  data () {
    return {
      relationships: [],
      loading: false,
      loadError: '',
      submitting: false,
      capabilityUpdatingId: null,
      capabilityUpdatingKey: '',
      showRequestDialog: false,
      buyerCompanyCode: '',
      buyerCodeTouched: false,
      requestCapabilities: {
        status_view: 'buyer_denied',
        history_view: 'buyer_denied',
        remote_control: 'buyer_denied',
        remote_diagnostics: 'buyer_denied',
        firmware_upgrade: 'buyer_denied'
      },
      showActionDialog: false,
      pendingAction: null,
      currentUser: null
    }
  },
  computed: {
    currentCompanyId () {
      return Number(this.currentUser?.company_id)
    },
    canManage () {
      return hasPermission(PERMISSION.COMPANY_RELATIONSHIP_MANAGE, this.currentUser) &&
        canWriteCompany(this.currentCompanyId, this.currentUser)
    },
    buyerCodeState () {
      if (!this.buyerCodeTouched) return null
      const length = this.buyerCompanyCode.trim().length
      return length >= 4 && length <= 32
    },
    capabilityDefinitions () {
      return [
        { key: 'status_view', label: this.$t('company_relationships.capability_status_view') },
        { key: 'history_view', label: this.$t('company_relationships.capability_history_view') },
        { key: 'remote_control', label: this.$t('company_relationships.capability_remote_control') },
        { key: 'remote_diagnostics', label: this.$t('company_relationships.capability_remote_diagnostics') },
        { key: 'firmware_upgrade', label: this.$t('company_relationships.capability_firmware_upgrade') }
      ]
    },
    requestCapabilityOptions () {
      return ['fixed_allowed', 'buyer_allowed', 'buyer_denied'].map(value => ({
        value,
        text: this.capabilityStateLabel(value)
      }))
    },
    fields () {
      return [
        { key: 'direction', label: this.$t('company_relationships.direction'), sortable: true, class: 'relationship-direction-cell' },
        { key: 'supplier_company', label: this.$t('company_relationships.supplier'), sortable: true, class: 'relationship-company-cell' },
        { key: 'buyer_company', label: this.$t('company_relationships.buyer'), sortable: true, class: 'relationship-company-cell' },
        { key: 'status', label: this.$t('company_relationships.status_label'), sortable: true, class: 'relationship-status-cell' },
        { key: 'response', label: this.$t('company_relationships.response'), sortable: false, class: 'relationship-response-cell' },
        { key: 'allow_token_resale', label: this.$t('company_relationships.allow_token_resale'), sortable: true, class: 'relationship-token-cell' },
        { key: 'capabilities', label: this.$t('company_relationships.capabilities'), sortable: false, class: 'relationship-capabilities-cell' },
        { key: 'actions', label: this.$t('common.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    actionDialogTitle () {
      if (!this.pendingAction) return ''
      return this.$t(`company_relationships.${this.pendingAction.type}_title`)
    },
    actionDialogAction () {
      if (!this.pendingAction) return ''
      return this.$t(`company_relationships.${this.pendingAction.type}_action`)
    },
    actionDialogMessage () {
      if (!this.pendingAction) return ''
      const row = this.pendingAction.row
      const counterpart = this.isBuyer(row) ? row.supplier_company : row.buyer_company
      return this.$t(`company_relationships.${this.pendingAction.type}_confirm`, {
        company: this.companyLabel(counterpart)
      })
    }
  },
  created () {
    this.currentUser = this.readCurrentUser()
    this.loadRelationships()
  },
  methods: {
    readCurrentUser () {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null')
      } catch (error) {
        return null
      }
    },
    async loadRelationships () {
      this.loading = true
      this.loadError = ''
      try {
        const response = await fetchCompanyRelationships()
        this.relationships = Array.isArray(response) ? response : []
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('company_relationships.load_failed')
      } finally {
        this.loading = false
      }
    },
    companyLabel (company) {
      return company?.short_name || company?.company_name || '-'
    },
    isBuyer (relationship) {
      return Number(relationship?.buyer_company?.id) === this.currentCompanyId
    },
    isSupplier (relationship) {
      return Number(relationship?.supplier_company?.id) === this.currentCompanyId
    },
    canDecide (relationship) {
      return this.canManage && this.isBuyer(relationship) && relationship.status === 'pending'
    },
    canEnd (relationship) {
      return this.canManage && ['pending', 'active'].includes(relationship.status)
    },
    canEditCapability (relationship) {
      return this.canManage && this.isBuyer(relationship) && relationship.status === 'active'
    },
    canEditAccessCapability (relationship, capability) {
      if (!this.canManage || relationship.status !== 'active') return false
      const value = relationship[capability]
      if (this.isBuyer(relationship)) return ['buyer_allowed', 'buyer_denied'].includes(value)
      return this.isSupplier(relationship) && value === 'fixed_allowed'
    },
    capabilityOptions (relationship, capability) {
      const value = relationship[capability]
      const values = this.isSupplier(relationship) && value === 'fixed_allowed'
        ? ['fixed_allowed', 'buyer_allowed', 'buyer_denied']
        : ['buyer_allowed', 'buyer_denied']
      return values.map(option => ({ value: option, text: this.capabilityStateLabel(option) }))
    },
    capabilityStateLabel (value) {
      return this.$t(`company_relationships.capability_state.${value || 'buyer_denied'}`)
    },
    capabilityVariant (value) {
      return value === 'fixed_allowed' ? 'primary' : value === 'buyer_allowed' ? 'success' : 'secondary'
    },
    capabilityUpdateKey (relationship, capability) {
      return `${relationship.id}:${capability}`
    },
    statusVariant (status) {
      return { pending: 'warning', active: 'success', rejected: 'danger', ended: 'secondary' }[status] || 'secondary'
    },
    formatTimestamp (value) {
      return value ? formatDate(value) : '-'
    },
    openRequestDialog () {
      this.buyerCompanyCode = ''
      this.buyerCodeTouched = false
      this.resetRequestCapabilities()
      this.showRequestDialog = true
    },
    resetRequestDialog () {
      this.buyerCompanyCode = ''
      this.buyerCodeTouched = false
      this.resetRequestCapabilities()
    },
    resetRequestCapabilities () {
      this.requestCapabilities = {
        status_view: 'buyer_denied',
        history_view: 'buyer_denied',
        remote_control: 'buyer_denied',
        remote_diagnostics: 'buyer_denied',
        firmware_upgrade: 'buyer_denied'
      }
    },
    async submitRelationshipRequest (event) {
      event.preventDefault()
      this.buyerCodeTouched = true
      if (!this.buyerCodeState || this.submitting) return
      this.submitting = true
      try {
        await requestCompanyRelationship(
          this.buyerCompanyCode.trim().toUpperCase(),
          { ...this.requestCapabilities }
        )
        this.showRequestDialog = false
        this.$uiToast.success(this.$t('company_relationships.requested'))
        await this.loadRelationships()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('company_relationships.request_failed'))
      } finally {
        this.submitting = false
      }
    },
    openActionDialog (type, row) {
      this.pendingAction = { type, row }
      this.showActionDialog = true
    },
    async submitPendingAction (event) {
      event.preventDefault()
      if (!this.pendingAction || this.submitting) return
      this.submitting = true
      const { type, row } = this.pendingAction
      try {
        if (type === 'accept') await acceptCompanyRelationship(row.id)
        if (type === 'reject') await rejectCompanyRelationship(row.id)
        if (type === 'end') await endCompanyRelationship(row.id)
        this.showActionDialog = false
        this.$uiToast.success(this.$t(`company_relationships.${type}_success`))
        await this.loadRelationships()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t(`company_relationships.${type}_failed`))
      } finally {
        this.submitting = false
      }
    },
    async updateTokenResale (relationship, value) {
      if (!this.canEditCapability(relationship)) return
      this.capabilityUpdatingId = relationship.id
      try {
        const updated = await updateCompanyRelationshipCapabilities(relationship.id, {
          allow_token_resale: Boolean(value)
        })
        this.relationships = this.relationships.map(item => item.id === updated.id ? updated : item)
        this.$uiToast.success(this.$t('company_relationships.capability_updated'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('company_relationships.capability_update_failed'))
      } finally {
        this.capabilityUpdatingId = null
      }
    },
    async updateAccessCapability (relationship, capability, value) {
      if (!this.canEditAccessCapability(relationship, capability) || value === relationship[capability]) return
      this.capabilityUpdatingKey = this.capabilityUpdateKey(relationship, capability)
      try {
        const updated = await updateCompanyRelationshipCapabilities(relationship.id, {
          [capability]: value
        })
        this.relationships = this.relationships.map(item => item.id === updated.id ? updated : item)
        this.$uiToast.success(this.$t('company_relationships.capability_updated'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('company_relationships.capability_update_failed'))
      } finally {
        this.capabilityUpdatingKey = ''
      }
    }
  }
}
</script>

<style scoped src="@/assets/styles/pages/company-relationships.scss"></style>
