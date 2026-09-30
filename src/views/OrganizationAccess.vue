<template>
  <div class="organization-access">
    <base-card class="mb-3">
      <div class="d-flex flex-wrap align-items-end justify-content-between">
        <div class="mr-3">
          <p class="text-muted mb-0">{{ $t('organization_access.subtitle') }}</p>
        </div>
        <base-form-group class="mb-0" :label="$t('organization_access.company_label')" label-for="organization-access-company">
          <base-select
            id="organization-access-company"
            v-model="selectedCompanyId"
            :options="companyOptions"
            :clearable="false"
            @change="changeCompany"
          />
        </base-form-group>
      </div>
    </base-card>

    <base-alert variant="info">
      {{ $t('organization_access.scope_notice', { company: selectedCompanyName }) }}
    </base-alert>
    <base-alert v-if="loadError" variant="danger">
      {{ loadError }}
      <base-button size="sm" variant="outline-danger" class="ml-2" @click="loadAccess">
        {{ $t('common.retry') }}
      </base-button>
    </base-alert>

    <base-card v-if="canManageRoles" class="mb-3">
      <template #header>
        <div class="d-flex align-items-center justify-content-between">
          <strong>{{ $t('organization_access.roles.title') }}</strong>
          <base-button size="sm" @click="openCreateRole">
            <app-icon name="plus" aria-hidden="true" /> {{ $t('organization_access.roles.create_action') }}
          </base-button>
        </div>
      </template>
      <base-table :items="roles" :fields="roleFields" :loading="loading" bordered>
        <template #cell(scope)="data">
          <base-badge :variant="data.item.is_system ? 'secondary' : 'info'">
            {{ $t(data.item.is_system ? 'organization_access.roles.system_scope' : 'organization_access.roles.company_scope') }}
          </base-badge>
        </template>
        <template #cell(permission_codes)="data">
          <span v-if="!data.item.permission_codes.length">-</span>
          <base-badge
            v-for="permission in data.item.permission_codes"
            :key="permission"
            variant="light"
            class="mr-1 mb-1"
          >
            {{ permission }}
          </base-badge>
        </template>
        <template #cell(is_delegable)="data">
          {{ $t(data.item.is_delegable ? 'common.yes' : 'common.no') }}
        </template>
      </base-table>
    </base-card>

    <base-card v-if="canManageMembers">
      <template #header>
        <div class="d-flex align-items-center justify-content-between">
          <strong>{{ $t('organization_access.members.title') }}</strong>
          <base-button size="sm" variant="outline-primary" :loading="loading" @click="loadAccess">
            <app-icon name="arrow-clockwise" aria-hidden="true" /> {{ $t('common.refresh') }}
          </base-button>
        </div>
      </template>
      <base-table :items="membershipRows" :fields="membershipFields" :loading="loading" bordered>
        <template #cell(member)="data">
          <strong>{{ data.item.display_name || data.item.email || $t('organization_access.members.user_fallback', { id: data.item.user_id }) }}</strong>
          <div v-if="data.item.display_name && data.item.email" class="text-muted small">{{ data.item.email }}</div>
        </template>
        <template #cell(status)="data">
          <base-badge :variant="membershipStatusVariant(data.item.status)">
            {{ $t(`organization_access.members.status_${data.item.status}`) }}
          </base-badge>
        </template>
        <template #cell(role)="data">
          {{ data.item.role && data.item.role.name ? data.item.role.name : '-' }}
        </template>
        <template #cell(joined_at)="data">
          {{ formatTimestamp(data.item.joined_at || data.item.invited_at) }}
        </template>
        <template #cell(actions)="data">
          <base-action-button
            :title="$t('organization_access.members.change_role')"
            :disabled="!canChangeMembership(data.item)"
            @click="openMembershipRole(data.item)"
          >
            <app-icon name="person-badge" aria-hidden="true" />
            <span>{{ $t('organization_access.members.change_role') }}</span>
          </base-action-button>
          <base-action-button
            :title="$t('organization_access.members.deactivate')"
            :disabled="!canDeactivateMembership(data.item)"
            @click="openDeactivateMembership(data.item)"
          >
            <app-icon name="person-dash" aria-hidden="true" />
            <span>{{ $t('organization_access.members.deactivate') }}</span>
          </base-action-button>
          <small v-if="isLastActiveAdmin(data.item)" class="d-block text-danger">
            {{ $t('organization_access.members.last_admin') }}
          </small>
        </template>
      </base-table>
    </base-card>

    <base-modal
      v-model="showRoleDialog"
      :title="$t('organization_access.roles.create_title')"
      :ok-title="$t('common.create')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      :ok-disabled="submitting || !roleForm.name.trim()"
      @ok="submitRole"
      @hidden="resetRoleForm"
    >
      <base-form-group :label="$t('organization_access.roles.name_label')" label-for="organization-role-name" required>
        <base-input id="organization-role-name" v-model.trim="roleForm.name" maxlength="128" />
      </base-form-group>
      <base-form-group :label="$t('organization_access.roles.permissions_label')">
        <base-checkbox-group v-model="roleForm.permission_codes" :options="permissionOptions" stacked />
      </base-form-group>
      <base-switch v-model="roleForm.is_delegable">
        {{ $t('organization_access.roles.delegable_label') }}
      </base-switch>
    </base-modal>

    <base-modal
      v-model="showMembershipRoleDialog"
      :title="$t('organization_access.members.change_role_title')"
      :ok-title="$t('common.save')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      :ok-disabled="submitting || !selectedRoleId"
      @ok="submitMembershipRole"
      @hidden="resetMembershipRole"
    >
      <p>{{ $t('organization_access.members.change_role_impact', { member: membershipName(membershipEditing), company: selectedCompanyName }) }}</p>
      <base-form-group :label="$t('organization_access.members.role_label')" label-for="membership-role-select" required>
        <base-select
          id="membership-role-select"
          v-model="selectedRoleId"
          :options="assignableRoleOptions"
          :clearable="false"
        />
      </base-form-group>
    </base-modal>

    <base-modal
      v-model="showDeactivateDialog"
      :title="$t('organization_access.members.deactivate_title')"
      :ok-title="$t('organization_access.members.deactivate')"
      ok-variant="danger"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      @ok="submitDeactivateMembership"
      @hidden="membershipDeactivating = null"
    >
      <base-alert variant="warning">
        {{ $t('organization_access.members.deactivate_impact', { member: membershipName(membershipDeactivating), company: selectedCompanyName }) }}
      </base-alert>
    </base-modal>
  </div>
</template>

<script>
import BaseActionButton from '@/components/base/BaseActionButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseCheckboxGroup from '@/components/base/BaseCheckboxGroup.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseSwitch from '@/components/base/BaseSwitch.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import { fetchCompanies } from '@/api/companies'
import {
  createOrganizationRole,
  deactivateMembership,
  fetchDelegablePermissions,
  fetchOrganizationMemberships,
  fetchOrganizationRoles,
  updateMembershipRole
} from '@/api/authorization'
import { fetchUserSummaries } from '@/api/users'
import { formatDate } from '@/utils/format'
import { hasPermission, isPlatformAdmin, PERMISSION } from '@/utils/permission'

export default {
  name: 'OrganizationAccess',
  components: {
    BaseActionButton,
    BaseAlert,
    BaseBadge,
    BaseButton,
    BaseCard,
    BaseCheckboxGroup,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseSwitch,
    BaseTable
  },
  data () {
    return {
      loading: false,
      submitting: false,
      loadError: '',
      companies: [],
      selectedCompanyId: '',
      roles: [],
      memberships: [],
      userSummaries: [],
      permissions: [],
      showRoleDialog: false,
      roleForm: this.emptyRoleForm(),
      showMembershipRoleDialog: false,
      membershipEditing: null,
      selectedRoleId: '',
      showDeactivateDialog: false,
      membershipDeactivating: null
    }
  },
  computed: {
    currentUser () {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null')
      } catch (error) {
        return null
      }
    },
    canManageRoles () {
      return hasPermission(PERMISSION.COMPANY_ROLE_MANAGE, this.currentUser)
    },
    canManageMembers () {
      return hasPermission(PERMISSION.USER_MANAGE, this.currentUser)
    },
    companyOptions () {
      return this.companies.map(company => ({ value: company.id, text: company.company_name }))
    },
    selectedCompanyName () {
      const company = this.companies.find(item => Number(item.id) === Number(this.selectedCompanyId))
      return company ? company.company_name : `#${this.selectedCompanyId || '-'}`
    },
    permissionOptions () {
      return this.permissions.map(permission => ({ value: permission.code, text: permission.code }))
    },
    assignableRoleOptions () {
      return this.roles.map(role => ({
        value: role.id,
        text: `${role.name} · ${role.permission_codes.join(', ') || this.$t('organization_access.roles.no_permissions')}`
      }))
    },
    membershipRows () {
      const users = new Map(this.userSummaries.map(user => [Number(user.id), user]))
      return this.memberships.map(membership => ({ ...membership, ...(users.get(Number(membership.user_id)) || {}) }))
    },
    activeAdminCount () {
      return this.memberships.filter(item => item.status === 'active' && item.role && item.role.name === 'admin').length
    },
    roleFields () {
      return [
        { key: 'name', label: this.$t('organization_access.roles.name_label') },
        { key: 'scope', label: this.$t('organization_access.roles.scope_label') },
        { key: 'permission_codes', label: this.$t('organization_access.roles.permissions_label') },
        { key: 'is_delegable', label: this.$t('organization_access.roles.delegable_column') }
      ]
    },
    membershipFields () {
      return [
        { key: 'member', label: this.$t('organization_access.members.member_label') },
        { key: 'status', label: this.$t('organization_access.members.status_label') },
        { key: 'role', label: this.$t('organization_access.members.role_label') },
        { key: 'joined_at', label: this.$t('organization_access.members.since_label') },
        { key: 'actions', label: this.$t('organization_access.members.actions_label') }
      ]
    }
  },
  watch: {
    '$route.params.companyId' (value) {
      if (value && Number(value) !== Number(this.selectedCompanyId)) {
        this.selectedCompanyId = Number(value)
        this.loadAccess()
      }
    }
  },
  async created () {
    await this.loadCompanies()
    await this.loadAccess()
  },
  methods: {
    emptyRoleForm () {
      return { name: '', permission_codes: [], is_delegable: true }
    },
    async loadCompanies () {
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200 })
        const items = response.items || response.data || response || []
        this.companies = isPlatformAdmin(this.currentUser)
          ? items
          : items.filter(item => Number(item.id) === Number(this.currentUser && this.currentUser.company_id))
        const routeCompanyId = Number(this.$route.params.companyId)
        const allowedRouteCompany = this.companies.some(item => Number(item.id) === routeCompanyId)
        this.selectedCompanyId = allowedRouteCompany
          ? routeCompanyId
          : (this.currentUser && this.currentUser.company_id) || (this.companies[0] && this.companies[0].id) || ''
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('organization_access.load_failed')
      }
    },
    async loadAccess () {
      if (!this.selectedCompanyId) return
      this.loading = true
      this.loadError = ''
      try {
        const roleRequest = this.canManageRoles
          ? fetchOrganizationRoles(this.selectedCompanyId)
          : Promise.resolve([])
        const membershipRequest = this.canManageMembers
          ? fetchOrganizationMemberships(this.selectedCompanyId)
          : Promise.resolve([])
        const permissionRequest = this.canManageRoles
          ? fetchDelegablePermissions()
          : Promise.resolve([])
        const [roles, memberships, permissions] = await Promise.all([roleRequest, membershipRequest, permissionRequest])
        this.roles = roles || []
        this.memberships = memberships || []
        this.permissions = permissions || []
        const userIds = [...new Set(this.memberships.map(item => item.user_id).filter(Boolean))]
        this.userSummaries = userIds.length ? (await fetchUserSummaries(userIds) || []) : []
      } catch (error) {
        this.loadError = this.$getErrorMessage(error) || this.$t('organization_access.load_failed')
      } finally {
        this.loading = false
      }
    },
    changeCompany (companyId) {
      if (!companyId) return
      this.$router.replace(`/org/company-access/${companyId}`).catch(() => {})
      this.loadAccess()
    },
    openCreateRole () {
      this.roleForm = this.emptyRoleForm()
      this.showRoleDialog = true
    },
    resetRoleForm () {
      this.roleForm = this.emptyRoleForm()
    },
    async submitRole (event) {
      event.preventDefault()
      if (!this.roleForm.name.trim() || this.submitting) return
      this.submitting = true
      try {
        await createOrganizationRole(this.selectedCompanyId, {
          name: this.roleForm.name.trim(),
          permission_codes: [...this.roleForm.permission_codes],
          is_delegable: this.roleForm.is_delegable
        })
        this.showRoleDialog = false
        this.$uiToast.success(this.$t('organization_access.roles.created'))
        await this.loadAccess()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('organization_access.roles.create_failed'))
      } finally {
        this.submitting = false
      }
    },
    isCurrentMembership (membership) {
      return Number(membership && membership.id) === Number(this.currentUser && this.currentUser.membership_id)
    },
    isLastActiveAdmin (membership) {
      return Boolean(membership && membership.status === 'active' && membership.role && membership.role.name === 'admin' && this.activeAdminCount <= 1)
    },
    canChangeMembership (membership) {
      return this.canManageMembers && this.canManageRoles && membership.status === 'active' &&
        !this.isCurrentMembership(membership) && !this.isLastActiveAdmin(membership)
    },
    canDeactivateMembership (membership) {
      return this.canManageMembers && membership.status === 'active' &&
        !this.isCurrentMembership(membership) && !this.isLastActiveAdmin(membership)
    },
    openMembershipRole (membership) {
      if (!this.canChangeMembership(membership)) return
      this.membershipEditing = membership
      this.selectedRoleId = membership.role_id
      this.showMembershipRoleDialog = true
    },
    resetMembershipRole () {
      this.membershipEditing = null
      this.selectedRoleId = ''
    },
    async submitMembershipRole (event) {
      event.preventDefault()
      if (!this.membershipEditing || !this.selectedRoleId || this.submitting) return
      if (this.isLastActiveAdmin(this.membershipEditing)) {
        this.$uiToast.error(this.$t('organization_access.members.last_admin'))
        return
      }
      this.submitting = true
      try {
        await updateMembershipRole(this.membershipEditing.id, this.selectedRoleId)
        this.showMembershipRoleDialog = false
        this.$uiToast.success(this.$t('organization_access.members.role_updated'))
        await this.loadAccess()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('organization_access.members.role_update_failed'))
      } finally {
        this.submitting = false
      }
    },
    openDeactivateMembership (membership) {
      if (!this.canDeactivateMembership(membership)) return
      this.membershipDeactivating = membership
      this.showDeactivateDialog = true
    },
    async submitDeactivateMembership (event) {
      event.preventDefault()
      if (!this.membershipDeactivating || this.submitting) return
      if (this.isLastActiveAdmin(this.membershipDeactivating)) {
        this.$uiToast.error(this.$t('organization_access.members.last_admin'))
        return
      }
      this.submitting = true
      try {
        await deactivateMembership(this.membershipDeactivating.id)
        this.showDeactivateDialog = false
        this.$uiToast.success(this.$t('organization_access.members.deactivated'))
        await this.loadAccess()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('organization_access.members.deactivate_failed'))
      } finally {
        this.submitting = false
      }
    },
    membershipName (membership) {
      if (!membership) return '-'
      const summary = this.membershipRows.find(item => item.id === membership.id)
      return summary ? (summary.display_name || summary.email || `#${summary.user_id}`) : `#${membership.user_id}`
    },
    membershipStatusVariant (status) {
      return { active: 'success', invited: 'warning', inactive: 'secondary' }[status] || 'secondary'
    },
    formatTimestamp (value) {
      return value ? formatDate(value) : '-'
    }
  }
}
</script>
