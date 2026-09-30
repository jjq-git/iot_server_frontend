<template>
  <!-- 用户管理 -->
  <div class="users">
    <base-alert v-if="lastInvitation" variant="success" class="mb-3">
      <div class="d-flex flex-wrap align-items-center justify-content-between">
        <div class="mr-3">
          <strong>{{ $t('users.invitation.delivery_confirmed') }}</strong>
          <div>
            {{ lastInvitation.email }} · {{ companyName(lastInvitation.company_id) }} ·
            {{ getRoleLabel(lastInvitation.role) }} ·
            {{ $t(lastInvitation.is_new_user ? 'users.invitation.new_account' : 'users.invitation.existing_account') }}
          </div>
          <small>{{ $t('users.invitation.expires_at', { value: formatAbsolute(lastInvitation.expires_at) }) }}</small>
        </div>
        <div class="d-flex mt-2 mt-md-0">
          <base-button
            size="sm"
            variant="outline-primary"
            class="mr-2"
            :loading="invitationAction === 'resend'"
            :disabled="Boolean(invitationAction)"
            @click="resendLastInvitation"
          >
            {{ $t('users.invitation.resend_action') }}
          </base-button>
          <base-button
            size="sm"
            variant="outline-danger"
            :loading="invitationAction === 'revoke'"
            :disabled="Boolean(invitationAction)"
            @click="revokeLastInvitation"
          >
            {{ $t('users.invitation.revoke_action') }}
          </base-button>
        </div>
      </div>
    </base-alert>
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <!-- 搜索过滤 -->
        <b-form class="users__filters" @submit.prevent>
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="query.keyword"
                class="filter-control"
                :placeholder="$t('users.filter.keyword_placeholder')"
                @input="onSearchInput"
                @keyup.enter="handleSearch"
              />
              <base-select
                v-model="query.role"
                class="filter-control"
                :options="roleFilterOptions"
                @input="handleSearch"
              />
              <base-select
                v-if="isPlatformAdmin()"
                v-model="query.company_id"
                class="filter-control"
                :options="companyFilterOptions"
                @input="handleSearch"
              />
              <base-select
                v-model="query.is_active"
                class="filter-control"
                :options="activeOptions"
                @input="handleSearch"
              />
              <div class="filter-actions">
                <base-button v-if="canManageOrganizationAccess" variant="outline-primary" @click="openOrganizationAccess">
                  <app-icon name="person-badge" /> {{ $t('users.actions.manage_access') }}
                </base-button>
                <base-button v-if="canCreate()" @click="openCreate">
                  <app-icon name="person-add" /> {{ $t('users.invitation.action') }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
      </template>
      <!-- 用户列表 -->
      <base-table
        :items="users"
        :fields="tableFields"
        :loading="loading"
        :load-error="loadError"
        bordered
        @retry="fetchUsers"
      >
        <template #cell(display_name)="data">
          <div class="user-identity-cell">
            <user-avatar :user="userAvatarData(data.item)" />
            <base-button variant="link" class="p-0 user-name-link" @click="viewDetail(data.item)">
              {{ data.item.display_name || data.item.email }}
            </base-button>
          </div>
        </template>
        <template #cell(role)="data">
          <base-badge :variant="getRoleVariant(data.item.role)">
            {{ getRoleLabel(data.item.role) }}
          </base-badge>
        </template>
        <template #cell(is_active)="data">
          <base-badge :variant="data.item.invitation_pending ? 'warning' : (data.item.is_active ? 'success' : 'secondary')">
            {{ data.item.invitation_pending ? $t('users.status.invited') : (data.item.is_active ? $t('users.status.active') : $t('users.status.inactive')) }}
          </base-badge>
        </template>
        <template #cell(last_login)="data">
          <!-- 后端字段是 last_login_at(列 key 保留 last_login 以兼容已保存的列显隐设置) -->
          <span :title="data.item.last_login_at || ''">{{ formatRelative(data.item.last_login_at) }}</span>
        </template>
        <template #cell(created_at)="data">
          <span :title="data.item.created_at || ''">{{ formatRelative(data.item.created_at) }}</span>
        </template>
        <template #cell(actions)="data">
          <base-action-button
            :title="$t('common.detail')"
            @click="viewDetail(data.item)"
          >
            <app-icon name="eye"  /> <span>{{ $t('common.detail') }}</span>
          </base-action-button>
          <b-dropdown
            v-if="canManageUser(data.item) || canResetPassword(data.item)"
            right
            no-caret
            variant="link"
            class="action-overflow-menu"
            toggle-class="action-overflow-menu__toggle"
            :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.display_name || data.item.email].filter(Boolean).join(' ') }"
          >
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button v-if="canManageUser(data.item)" @click="openChangeRole(data.item)">
              <app-icon name="person-badge" aria-hidden="true" /> {{ $t('users.actions.change_role') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="canResetPassword(data.item)" @click="confirmAdminPasswordReset(data.item)">
              <app-icon name="key" aria-hidden="true" /> {{ $t('users.actions.reset_password') }}
            </b-dropdown-item-button>
          </b-dropdown>
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility
              :columns="userColumns"
              :table-key="'users-table'"
              @update:columns="handleUserColumnsUpdate"
            />
          </div>
        </template>
      </base-table>

      <!-- 分页 -->
      <template #footer>
        <base-pagination
          v-model="query.page"
          :total-rows="total"
          :per-page.sync="query.page_size"
          :show-per-page="true"
          @input="handlePageChange"
        />
      </template>
    </list-page-card>

    <!-- 邀请用户对话框 -->
    <base-modal
      v-model="showFormDialog"
      :title="$t('users.invitation.create_title')"
      size="lg"
      :ok-title="$t('users.invitation.send_action')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      :ok-disabled="submitting"
      @hidden="resetForm"
      @ok="handleFormOk"
      modal-class="model-el dialog-with-header-bg" :centered="false" :scrollable="false"
    >
      <p class="text-muted">{{ $t('users.invitation.help') }}</p>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group
            label-for="users-form-email"
            :label="$t('users.dialog.email_label')"
            required
            :state="fieldState('email')"
            :invalid-feedback="errors.email"
          >
            <base-input
              id="users-form-email"
              v-model="form.email"
              :placeholder="$t('users.dialog.email_placeholder')"
              :state="fieldState('email')"
            />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="users-form-display-name" :label="$t('users.dialog.display_name_label')" required :state="fieldState('display_name')" :invalid-feedback="errors.display_name">
            <base-input
              id="users-form-display-name"
              v-model="form.display_name"
              :placeholder="$t('users.dialog.display_name_placeholder')"
              :state="fieldState('display_name')"
            />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="users-form-role" :label="$t('users.dialog.role_label')">
            <base-select id="users-form-role" v-model="form.role" :options="invitationRoleOptions" />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="users-form-phone" :label="$t('users.dialog.phone_label')">
            <base-input
              id="users-form-phone"
              v-model="form.phone"
              :placeholder="$t('users.dialog.phone_placeholder')"
            />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group
            label-for="users-form-company"
            :label="$t('users.dialog.company_label')"
            required
            :state="fieldState('company_id')"
            :invalid-feedback="errors.company_id"
          >
            <base-select id="users-form-company" v-model="form.company_id" :options="companyOptions" :state="fieldState('company_id')" />
          </base-form-group>
        </b-col>
      </b-row>
    </base-modal>

    <!-- 改角色对话框 -->
    <base-modal
      v-model="showRoleDialog"
      :title="$t('users.dialog.change_role_title')"
      size="md"
      :ok-title="$t('common.save')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      :ok-disabled="submitting"
      @ok="handleRoleOk"
      modal-class="model-el dialog-with-header-bg" :centered="false" :scrollable="false"
    >
      <p v-if="roleEditing" class="mb-3">
        {{ $t('users.dialog.change_role_for', { name: roleEditing.display_name || roleEditing.email }) }}
      </p>
      <b-form-radio-group v-model="newRole" :options="roleFormOptions.filter(o => o.value)" stacked />
    </base-modal>

    <base-modal
      v-model="showPasswordResetDialog"
      :title="$t('users.password_reset.title')"
      :ok-title="$t('users.password_reset.confirm_action')"
      :cancel-title="$t('common.cancel')"
      :busy="submitting"
      :ok-disabled="submitting"
      @ok.prevent="submitAdminPasswordReset"
      @hidden="resetPasswordForm"
    >
      <p>{{ $t('users.password_reset.confirm_message', { name: passwordResetUser && (passwordResetUser.display_name || passwordResetUser.email) }) }}</p>
      <base-alert v-if="passwordResetError" variant="danger">{{ passwordResetError }}</base-alert>
      <p class="text-muted mb-0">{{ $t('users.password_reset.force_change_hint') }}</p>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import rolePermission from '@/mixins/rolePermission'
import localizedColumns from '@/mixins/localizedColumns'
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import {
  listUsers,
  createInvitation,
  revokeInvitation,
  updateUserRole,
  resendInvitation
} from '@/api/users'
import { sendUserPasswordResetEmail } from '@/api/passwordReset'
import { fetchCompanies } from '@/api/companies'
import { fetchOrganizationRoles } from '@/api/authorization'
import { debounce } from '@/utils/debounce'
import { formatDate } from '@/utils/format'
import { canManageUserRow, canWriteRow, hasPermission, isPlatformAdmin, PERMISSION } from '@/utils/permission'

const ROLE_KEYS = ['admin', 'operator', 'data_entry', 'viewer']

// 写入 URL 时持久化的 query 字段清单（与 DEFAULT_QUERY 对齐）
const QUERY_FIELDS = ['page', 'page_size', 'keyword', 'role', 'is_active', 'company_id']

const DEFAULT_QUERY = {
  keyword: '',
  role: '',
  is_active: '',
  company_id: '',
  page: 1,
  page_size: 20
}

export default {
  name: 'Users',
  components: {
    BaseAlert,
    BaseBadge,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BasePagination,
    BaseSelect,
    ColumnVisibility,
    UserAvatar,
    BaseTable,
    ListPageCard
  },
  mixins: [rolePermission, localizedColumns],
  permissionCapabilities: {
    create: PERMISSION.USER_MANAGE,
    edit: PERMISSION.USER_MANAGE
  },
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { userColumns: 'buildUserColumns' },
  data () {
    return {
      loading: false,
      loadError: '',
      submitting: false,
      users: [],
      total: 0,
      companies: [],
      invitationRoles: [],
      query: {
        ...DEFAULT_QUERY
      },
      showFormDialog: false,
      showRoleDialog: false,
      showPasswordResetDialog: false,
      passwordResetUser: null,
      passwordResetError: '',
      roleEditing: null,
      newRole: '',
      lastInvitation: null,
      lastInvitationPayload: null,
      invitationAction: '',
      form: this.makeEmptyForm(),
      errors: {},
      userColumns: this.buildUserColumns()
    }
  },
  computed: {
    roleFilterOptions () {
      return [
        { value: '', text: this.$t('users.filter.role_all') },
        ...ROLE_KEYS.map(key => ({
          value: key,
          text: this.$t(`topbar.roles.${key}`)
        }))
      ]
    },
    roleFormOptions () {
      return [
        { value: '', text: this.$t('users.dialog.role_select') },
        ...ROLE_KEYS.map(key => ({
          value: key,
          text: this.$t(`topbar.roles.${key}`)
        }))
      ]
    },
    activeOptions () {
      return [
        { value: '', text: this.$t('users.filter.active_all') },
        { value: true, text: this.$t('users.filter.active_only') },
        { value: false, text: this.$t('users.filter.inactive_only') }
      ]
    },
    currentUser () {
      try {
        return JSON.parse(localStorage.getItem('user') || 'null')
      } catch (error) {
        return null
      }
    },
    companyOptions () {
      const available = this.isPlatformAdmin()
        ? this.companies
        : this.companies.filter(c => Number(c.id) === Number(this.currentUser && this.currentUser.company_id))
      return [
        { value: '', text: this.$t('users.dialog.company_select') },
        ...available.map(c => ({
          value: c.id,
          text: c.company_name
        }))
      ]
    },
    companyFilterOptions () {
      return [
        { value: '', text: this.$t('users.filter.company_all') },
        ...this.companies.map(c => ({
          value: c.id,
          text: c.company_name
        }))
      ]
    },
    invitationRoleOptions () {
      if (!this.invitationRoles.length) return this.roleFormOptions
      return [
        { value: '', text: this.$t('users.dialog.role_select') },
        ...this.invitationRoles
          .filter(role => role.is_delegable)
          .map(role => ({ value: role.id, text: role.name }))
      ]
    },
    canManageOrganizationAccess () {
      return hasPermission(PERMISSION.USER_MANAGE, this.currentUser)
    },
    tableFields () {
      const fieldConfig = {
        display_name: { key: 'display_name', label: this.$t('users.table.column.display_name'), thStyle: { minWidth: '120px' } },
        email: { key: 'email', label: this.$t('users.table.column.email'), thStyle: { minWidth: '180px' } },
        phone: { key: 'phone', label: this.$t('users.table.column.phone'), thStyle: { width: '130px' } },
        role: { key: 'role', label: this.$t('users.table.column.role'), thStyle: { width: '120px' } },
        company_name: { key: 'company_name', label: this.$t('users.table.column.company'), thStyle: { minWidth: '140px' } },
        is_active: { key: 'is_active', label: this.$t('users.table.column.is_active'), thStyle: { width: '90px' } },
        last_login: { key: 'last_login', label: this.$t('users.table.column.last_login'), thStyle: { width: '160px' } }
      }
      const visibleFields = this.userColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [
        ...visibleFields,
        { key: 'actions', label: this.$t('users.table.column.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  watch: {
    'form.company_id' (companyId) {
      this.loadInvitationRoles(companyId)
    },
    'query.page_size' () {
      this.query.page = 1
      this.fetchUsers()
    },
    // 浏览器前进/后退：URL 变了同步回 this.query.* 并重新拉数据
    $route (to, from) {
      if (to.path !== from.path) return
      const before = JSON.stringify(this.query)
      this._restoreQueryFromUrl()
      if (JSON.stringify(this.query) !== before) {
        this.fetchUsers({ skipUrlSync: true })
      }
    }
  },
  created () {
    // 进入页面：先把 URL query 写回 this.query.*，再发起请求，避免刷新丢状态
    this._restoreQueryFromUrl()
  },
  mounted () {
    this.fetchCompanies()
    this.fetchUsers()
  },
  methods: {
    buildUserColumns () {
      return [
        { prop: 'display_name', label: this.$t('users.table.column.display_name'), visible: true },
        { prop: 'email', label: this.$t('users.table.column.email'), visible: true },
        { prop: 'phone', label: this.$t('users.table.column.phone'), visible: true },
        { prop: 'role', label: this.$t('users.table.column.role'), visible: true },
        { prop: 'company_name', label: this.$t('users.table.column.company'), visible: true },
        { prop: 'is_active', label: this.$t('users.table.column.is_active'), visible: true },
        { prop: 'last_login', label: this.$t('users.table.column.last_login'), visible: true }
      ]
    },
    handleUserColumnsUpdate (updatedColumns) {
      this.userColumns = updatedColumns
    },
    makeEmptyForm () {
      return {
        email: '',
        display_name: '',
        phone: '',
        role: 'viewer',
        company_id: ''
      }
    },

    async loadInvitationRoles (companyId) {
      this.invitationRoles = []
      if (!companyId) return
      try {
        this.invitationRoles = await fetchOrganizationRoles(companyId)
        if (this.invitationRoles.length && !this.invitationRoles.some(role => Number(role.id) === Number(this.form.role))) {
          const viewer = this.invitationRoles.find(role => role.name === 'viewer')
          this.form.role = viewer ? viewer.id : this.invitationRoles[0].id
        }
      } catch (error) {
        this.invitationRoles = []
      }
    },

    isCurrentUser (row) {
      const currentUserUuid = this.currentUser && this.currentUser.uuid
      const currentUserDbId = this.currentUser && (this.currentUser.user_id || this.currentUser.id)
      return Boolean(row && (
        (currentUserUuid && row.uuid === currentUserUuid) ||
        (currentUserDbId && row.id === currentUserDbId)
      ))
    },

    canManageUser (row) {
      // 禁止对自己禁用账号/改角色，避免管理员把自己锁死（自助操作走个人中心）
      return !this.isCurrentUser(row) && canManageUserRow(row, this.currentUser) && this.canEdit(row, 'user')
    },

    canResetPassword (row) {
      return Boolean(
        row &&
        !row.invitation_pending &&
        canManageUserRow(row, this.currentUser) &&
        !this.isCurrentUser(row) &&
        hasPermission(PERMISSION.USER_MANAGE, this.currentUser) &&
        (isPlatformAdmin(this.currentUser) || Number(row.home_company_id) === Number(this.currentUser?.company_id)) &&
        canWriteRow(row, 'user', this.currentUser)
      )
    },

    confirmAdminPasswordReset (row) {
      this.passwordResetUser = row
      this.passwordResetError = ''
      this.showPasswordResetDialog = true
    },
    async submitAdminPasswordReset () {
      if (!this.passwordResetUser || this.submitting) return
      this.submitting = true
      this.passwordResetError = ''
      try {
        await sendUserPasswordResetEmail(
          this.passwordResetUser.uuid,
          this.passwordResetUser.company_id
        )
        this.$uiToast.success(this.$t('users.password_reset.success', {
          name: this.passwordResetUser.display_name || this.passwordResetUser.email
        }))
        this.showPasswordResetDialog = false
        this.fetchUsers()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('users.password_reset.failed'))
      } finally {
        this.submitting = false
      }
    },
    resetPasswordForm () {
      this.passwordResetUser = null
      this.passwordResetError = ''
    },

    userAvatarData (row) {
      if (row.avatar || row.avatar_url || !this.currentUser) return row
      const isCurrentUser = (row.uuid && row.uuid === this.currentUser.uuid) || row.email === this.currentUser.email
      return isCurrentUser ? { ...row, avatar: this.currentUser.avatar || this.currentUser.avatar_url } : row
    },

    // 把 URL query 写回到 this.query.*（按字段类型推断）
    _restoreQueryFromUrl () {
      const q = this.$route.query || {}
      QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const cur = this.query[field]
        if (field === 'role') {
          this.query.role = ROLE_KEYS.includes(v) ? v : ''
        } else if (field === 'company_id') {
          this.query.company_id = this.isPlatformAdmin() ? v : ''
        } else if (typeof cur === 'number') {
          const n = parseInt(v, 10)
          if (!Number.isNaN(n)) this.query[field] = n
        } else if (field === 'is_active') {
          // is_active 默认 ''，但 URL 上回写时要还原成 boolean，保持与 select 选项一致
          if (v === 'true') this.query[field] = true
          else if (v === 'false') this.query[field] = false
          else this.query[field] = ''
        } else {
          this.query[field] = v
        }
      })
    },
    // 把 this.query.* 写回 URL（默认值 / 空值不写入避免污染）
    _syncQueryToUrl () {
      const next = {}
      QUERY_FIELDS.forEach(field => {
        const v = this.query[field]
        if (v === '' || v === null || v === undefined) return
        if (field === 'page' && v === 1) return
        if (field === 'page_size' && v === DEFAULT_QUERY.page_size) return
        next[field] = String(v)
      })
      const cur = this.$route.query || {}
      const sameKeys = Object.keys(cur).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(k => cur[k] === next[k])
      if (sameValues) return
      this.$router.replace({ query: next }).catch(() => {})
    },
    // 搜索框输入 300ms 防抖，自动回到首页并重新拉数据
    onSearchInput: debounce(function () {
      this.query.page = 1
      this.fetchUsers()
    }, 300),

    async fetchUsers (opts = {}) {
      // 拉数据前同步 URL（路由触发的 fetch 跳过避免循环）
      if (!opts.skipUrlSync) {
        this._syncQueryToUrl()
      }
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }
        if (this.query.keyword) params.keyword = this.query.keyword
        if (this.query.role) params.role = this.query.role
        if (this.isPlatformAdmin() && this.query.company_id) params.company_id = this.query.company_id
        if (this.query.is_active === true || this.query.is_active === false) {
          params.is_active = this.query.is_active
        }

        const response = await listUsers(params)
        if (reqId !== this._listReqId) return
        const items = response.items || response.data || response || []
        const total = (response.total !== undefined && response.total !== null) ? response.total : items.length
        this.users = items
        this.total = total
      } catch (error) {
        if (reqId !== this._listReqId) return
        const msg = this.$getErrorMessage(error) || this.$t('users.toast.load_failed')
        this.loadError = msg
        this.$uiToast.error(msg)
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },

    async fetchCompanies () {
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200 })
        const items = response.items || response.data || response || []
        this.companies = items
      } catch (error) {
        this.companies = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.load_failed'))
      }
    },

    handleSearch () {
      this.query.page = 1
      this.fetchUsers()
    },

    handlePageChange (page) {
      this.query.page = page
      this.fetchUsers()
    },

    viewDetail (row) {
      this.$router.push({
        name: 'UserDetail',
        params: { userId: row.uuid },
        query: row.company_id ? { company_id: String(row.company_id) } : {}
      })
    },

    openCreate () {
      this.form = this.makeEmptyForm()
      this.form.company_id = this.query.company_id || (this.currentUser && this.currentUser.company_id) || ''
      this.errors = {}
      this.showFormDialog = true
    },

    resetForm () {
      this.form = this.makeEmptyForm()
      this.errors = {}
    },

    fieldState (key) {
      if (!(key in this.errors)) return null
      return !this.errors[key]
    },

    validateForm () {
      const errors = {}
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!this.form.email) {
        errors.email = this.$t('users.validation.email_required')
      } else if (!emailPattern.test(this.form.email)) {
        errors.email = this.$t('users.validation.email_invalid')
      }
      if (!this.form.display_name) {
        errors.display_name = this.$t('users.invitation.display_name_required')
      }
      if (!this.form.company_id) {
        errors.company_id = this.$t('users.dialog.company_select')
      }

      this.errors = errors
      return Object.keys(errors).length === 0
    },

    handleFormOk (event) {
      event.preventDefault()
      this.submitForm()
    },

    async submitForm () {
      if (!this.validateForm()) return

      this.submitting = true
      try {
        const data = {
          email: this.form.email,
          company_id: this.form.company_id || undefined,
          display_name: this.form.display_name
        }
        if (Number.isInteger(Number(this.form.role)) && this.form.role !== '') data.role_id = Number(this.form.role)
        else data.role = this.form.role || 'viewer'
        if (this.form.phone) data.phone = this.form.phone
        const invitation = await createInvitation(data)
        this.lastInvitation = invitation
        this.lastInvitationPayload = { ...data }
        this.$uiToast.success(this.$t('users.invitation.sent'))
        this.showFormDialog = false
        this.fetchUsers()
      } catch (error) {
        const msg = this.$getErrorMessage(error) || this.$t('users.toast.create_failed')
        this.$uiToast.error(msg)
      } finally {
        this.submitting = false
      }
    },

    async resendLastInvitation () {
      if (!this.lastInvitation || this.invitationAction) return
      this.invitationAction = 'resend'
      try {
        this.lastInvitation = await resendInvitation(this.lastInvitation.uuid)
        this.$uiToast.success(this.$t('users.invitation.resent'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('users.invitation.resend_failed'))
      } finally {
        this.invitationAction = ''
      }
    },

    async revokeLastInvitation () {
      if (!this.lastInvitation || this.invitationAction) return
      this.invitationAction = 'revoke'
      try {
        await revokeInvitation(this.lastInvitation.uuid)
        this.lastInvitation = null
        this.lastInvitationPayload = null
        this.$uiToast.success(this.$t('users.invitation.revoked'))
        this.fetchUsers()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('users.invitation.revoke_failed'))
      } finally {
        this.invitationAction = ''
      }
    },

    openOrganizationAccess () {
      const companyId = this.query.company_id || (this.currentUser && this.currentUser.company_id)
      this.$router.push(companyId ? `/org/company-access/${companyId}` : '/org/company-access')
    },

    openChangeRole (row) {
      this.roleEditing = row
      this.newRole = row.role || ''
      this.showRoleDialog = true
    },

    handleRoleOk (event) {
      event.preventDefault()
      this.submitRoleChange()
    },

    async submitRoleChange () {
      if (!this.roleEditing || !this.newRole) {
        this.showRoleDialog = false
        return
      }
      this.submitting = true
      try {
        await updateUserRole(
          this.roleEditing.uuid,
          this.newRole,
          this.roleEditing.company_id
        )
        this.$uiToast.success(this.$t('users.toast.update_success'))
        this.showRoleDialog = false
        this.fetchUsers()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('users.toast.update_failed'))
      } finally {
        this.submitting = false
      }
    },

    getRoleLabel (role) {
      return ROLE_KEYS.includes(role) ? this.$t(`topbar.roles.${role}`) : (role || '-')
    },

    getRoleVariant (role) {
      const map = {
        admin: 'primary',
        operator: 'warning',
        data_entry: 'info',
        viewer: 'success'
      }
      return map[role] || 'secondary'
    },

    formatRelative (ts) {
      if (!ts) return '-'
      const t = new Date(ts).getTime()
      if (Number.isNaN(t)) return '-'
      const diff = Date.now() - t
      const sec = Math.floor(diff / 1000)
      if (sec < 60) return this.$t('common.time.seconds_ago', { n: sec })
      const min = Math.floor(sec / 60)
      if (min < 60) return this.$t('common.time.minutes_ago', { n: min })
      const hr = Math.floor(min / 60)
      if (hr < 24) return this.$t('common.time.hours_ago', { n: hr })
      const day = Math.floor(hr / 24)
      if (day < 30) return this.$t('common.time.days_ago', { n: day })
      return formatDate(ts)
    },

    formatAbsolute (ts) {
      return ts ? formatDate(ts) : '-'
    },

    companyName (companyId) {
      const company = this.companies.find(item => Number(item.id) === Number(companyId))
      return company ? company.company_name : `#${companyId}`
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/users.scss"></style>
