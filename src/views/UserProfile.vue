<template>
  <div class="user-profile">
    <section class="user-profile__summary">
      <div class="user-profile__avatar-wrap">
        <button
          type="button"
          class="user-profile__avatar"
          :disabled="avatarBusy"
          :title="userInfo.avatar ? $t('user_profile.avatar.right_click_delete') : $t('user_profile.avatar.click_upload')"
          @click="triggerAvatarUpload"
          @contextmenu.prevent="showAvatarContextMenu"
        >
          <img
            v-if="avatarDisplayUrl && !avatarLoadFailed"
            :src="avatarDisplayUrl"
            class="user-profile__avatar-image"
            loading="lazy"
            @error="handleAvatarError"
          />
          <span v-else>{{ userInitials }}</span>
        </button>
        <span class="user-profile__avatar-action" aria-hidden="true">
          <app-icon name="camera"  />
        </span>
        <input
          ref="avatarUploadInput"
          type="file"
          accept="image/*"
          class="d-none"
          @change="handleAvatarChange"
        />
      </div>

      <div class="user-profile__summary-copy">
        <div class="user-profile__identity">
          <div v-if="editingField === 'display_name'" class="user-profile__name-editor" @click.stop>
            <base-input
              ref="editInput"
              v-model.trim="editValue"
              size="sm"
              :placeholder="$t('user_profile.form_placeholder.display_name')"
              @blur="saveEdit('display_name')"
              @keyup.enter="saveEdit('display_name')"
            />
          </div>
          <h2 v-else class="user-profile__name" v-editable-trigger="{ label: $t('common.edit'), activate: () => startEdit('display_name') }">
            {{ userInfo.display_name || userInfo.email || $t('user_profile.default_user') }}
          </h2>
          <base-badge :variant="getRoleBadgeVariant(userInfo.role)">
            {{ getRoleLabel(userInfo.role) }}
          </base-badge>
          <base-badge :variant="userInfo.is_active ? 'success' : 'danger'">
            {{ userInfo.is_active ? $t('user_profile.status.normal') : $t('user_profile.status.disabled') }}
          </base-badge>
        </div>
        <div class="user-profile__meta">
          {{ userInfo.email || '-' }}
          · {{ $t('user_profile.fields.created_at') }} {{ formatDateTime(userInfo.created_at) }}
          · {{ $t('users.table.column.last_login') }} {{ lastLoginTime }}
        </div>
      </div>

      <div class="user-profile__summary-actions">
        <base-button variant="link" size="sm" @click="showLoginLogDialog">
          <app-icon name="clock-history" />
          {{ $t('user_profile.login_log.title') }}
        </base-button>
        <base-button variant="link" size="sm" @click="showPasswordDialog">
          <app-icon name="lock"  />
          {{ $t('user_profile.actions.change_password') }}
        </base-button>
      </div>
    </section>

    <div class="user-profile__grid">
      <section class="user-profile__panel">
        <header class="user-profile__panel-header">
          <app-icon name="person"  />
          <h2 class="user-profile__panel-title">{{ $t('route.user_profile.title') }}</h2>
          <span class="user-profile__panel-hint">{{ $t('common.edit') }}</span>
        </header>
        <div class="user-profile__fields">
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.fields.email') }}</span>
            <span class="user-profile__field-value">{{ userInfo.email || '-' }}</span>
          </div>
          <div class="user-profile__field" v-editable-trigger="{ label: $t('common.edit'), activate: () => startEdit('phone') }">
            <span class="user-profile__field-label">{{ $t('user_profile.fields.phone') }}</span>
            <div v-if="editingField === 'phone'" class="user-profile__field-editor" @click.stop>
              <base-input
                ref="editInput"
                v-model.trim="editValue"
                size="sm"
                :placeholder="$t('user_profile.form_placeholder.phone')"
                @blur="saveEdit('phone')"
                @keyup.enter="saveEdit('phone')"
              />
            </div>
            <span v-else class="user-profile__field-value user-profile__field-value--editable">
              {{ userInfo.phone || '-' }}
            </span>
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.fields.account_status') }}</span>
            <base-badge :variant="userInfo.is_active ? 'success' : 'danger'">
              {{ userInfo.is_active ? $t('user_profile.status.normal') : $t('user_profile.status.disabled') }}
            </base-badge>
          </div>
        </div>
      </section>

      <section class="user-profile__panel">
        <header class="user-profile__panel-header">
          <app-icon name="building"  />
          <h2 class="user-profile__panel-title">{{ $t('user_profile.company_card.title') }}</h2>
        </header>
        <div class="user-profile__fields">
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.fields.company') }}</span>
            <span class="user-profile__field-value">{{ userInfo.company_name || '-' }}</span>
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.company_card.company_id') }}</span>
            <span class="user-profile__field-value">{{ userInfo.company_id || '-' }}</span>
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.company_card.company_type') }}</span>
            <base-badge :variant="getCompanyBadgeVariant(userInfo.company_type)">
              {{ getCompanyTypeLabel(userInfo.company_type) }}
            </base-badge>
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.company_card.user_role') }}</span>
            <span class="user-profile__field-value">{{ getRoleLabel(userInfo.role) }}</span>
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('user_profile.company_card.join_at') }}</span>
            <span class="user-profile__field-value">{{ formatDateTime(userInfo.created_at) }}</span>
          </div>
        </div>
      </section>

      <section class="user-profile__panel">
        <header class="user-profile__panel-header">
          <app-icon name="translate"  />
          <h2 class="user-profile__panel-title">{{ $t('common.switch_language') }}</h2>
        </header>
        <div class="user-profile__fields">
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('common.switch_language') }}</span>
            <language-switcher class="user-profile__settings-control" />
          </div>
          <div class="user-profile__field">
            <span class="user-profile__field-label">{{ $t('font_size_toggle.aria_label') }}</span>
            <font-size-toggle class="user-profile__settings-control" />
          </div>
        </div>
      </section>
    </div>

    <base-modal
      id="user-profile-login-log-modal"
      v-model="loginLogDialogVisible"
      :title="$t('user_profile.login_log.title')"
      size="xl"
      hide-footer
      modal-class="profile-modal"
    >
      <div class="user-profile__login-toolbar">
        <span class="user-profile__login-count">{{ loginLogTotal }}</span>
        <base-button
          variant="outline-secondary"
          size="sm"
          :title="$t('common.refresh')"
          :disabled="loginLogLoading"
          @click="fetchLoginLogs"
        >
          <app-icon name="arrow-clockwise"  />
          <span class="sr-only">{{ $t('common.refresh') }}</span>
        </base-button>
      </div>
      <div class="user-profile__login-body">
        <div v-if="loginLogLoading" class="user-profile__login-loading">
          <b-spinner small variant="primary" class="mr-2" />
          {{ $t('user_profile.login_log.loading') }}
        </div>
        <base-table
          v-else
          :items="loginLogList"
          :fields="loginLogFields"
          responsive
          class="user-profile__log-table"
        >
          <template #cell(login_time)="row">
            <span>{{ formatDateTime(row.item.login_time) }}</span>
          </template>
          <template #cell(ip_address)="row">
            {{ row.item.ip_address || '-' }}
          </template>
          <template #cell(location)="row">
            {{ row.item.location || '-' }}
          </template>
          <template #cell(device)="row">
            {{ row.item.device || '-' }}
          </template>
          <template #cell(success)="row">
            <base-badge :variant="row.item.success ? 'success' : 'danger'">
              {{ row.item.success ? $t('user_profile.login_log.success_yes') : $t('user_profile.login_log.success_no') }}
            </base-badge>
          </template>
        </base-table>
        <base-pagination
          v-if="loginLogTotal > 0"
          v-model="loginLogPage"
          :total-rows="loginLogTotal"
          :per-page.sync="loginLogPageSize"
          :show-per-page="true"
          @input="handleLoginLogPageChange"
        />
      </div>
    </base-modal>

    <base-modal
      id="user-profile-password-modal"
      v-model="passwordDialogVisible"
      :title="$t('user_profile.password_modal.title')"
      :ok-title="$t('user_profile.password_modal.ok')"
      :cancel-title="$t('user_profile.password_modal.cancel')"
      :ok-disabled="passwordLoading"
      :busy="passwordLoading"
      :no-close-on-esc="forceChangePassword"
      :no-close-on-backdrop="forceChangePassword"
      :hide-header-close="forceChangePassword"
      :cancel-disabled="forceChangePassword"
      modal-class="profile-modal"
      @ok="handlePasswordModalOk"
      @hidden="resetPasswordForm"
    >
      <b-form @submit.stop.prevent="handleChangePassword">
        <base-form-group :label="$t('user_profile.password_modal.label_old')" required label-for="old-password-input">
          <base-password-input
            id="old-password-input"
            v-model="passwordForm.old_password"
            :placeholder="$t('user_profile.password_modal.placeholder_old')"
            autocomplete="current-password"
          />
        </base-form-group>
        <base-form-group :label="$t('user_profile.password_modal.label_new')" required label-for="new-password-input">
          <base-password-input
            id="new-password-input"
            v-model="passwordForm.new_password"
            :placeholder="$t('user_profile.password_modal.placeholder_new')"
            autocomplete="new-password"
          />
        </base-form-group>
        <base-form-group :label="$t('user_profile.password_modal.label_confirm')" required label-for="confirm-password-input">
          <base-password-input
            id="confirm-password-input"
            v-model="passwordForm.confirm_password"
            :placeholder="$t('user_profile.password_modal.placeholder_confirm')"
            autocomplete="new-password"
          />
        </base-form-group>
      </b-form>
    </base-modal>
  </div>
</template>

<script>
import { getCurrentUser, updateCurrentUser, updatePassword, fetchLoginLogs } from '@/api/user'
import { fetchAuthenticatedImage, normalizeImageUrl } from '@/utils/imageUrlHelper'
import { formatDate } from '@/utils/format'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePasswordInput from '@/components/base/BasePasswordInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import FontSizeToggle from '@/components/FontSizeToggle.vue'
import { clearDashboardQueryCache } from '@/services/dashboard/queryCache'
import { getLoginEntryPath } from '@/utils/loginEntry'
import { isPlatformAdmin } from '@/utils/permission'
import { normalizeCompanyType } from '@/utils/companyType'
import { persistCurrentUser } from '@/utils/sessionContext'

export default {
  name: 'UserProfile',
  components: {
    BaseButton,
    BaseModal,
    BaseFormGroup,
    BaseInput,
    BasePasswordInput,
    BasePagination,
    LanguageSwitcher,
    FontSizeToggle
  },
  data () {
    return {
      passwordLoading: false,
      loginLogLoading: false,
      avatarBusy: false,
      // 头像 URL 取不到图时回退到首字母，避免只剩一个空圆圈看不出出了什么问题
      avatarLoadFailed: false,
      avatarDisplayUrl: '',
      managedAvatarUrl: '',
      avatarRequestId: 0,
      passwordDialogVisible: false,
      forceChangePassword: false,
      loginLogDialogVisible: false,
      loginLogsLoaded: false,
      userInfo: {},
      editingField: null,
      editValue: '',
      editLoading: false,
      passwordForm: {
        old_password: '',
        new_password: '',
        confirm_password: ''
      },
      loginLogList: [],
      loginLogTotal: 0,
      loginLogPage: 1,
      loginLogPageSize: 10
    }
  },
  computed: {
    lastLoginTime () {
      const latest = this.userInfo.last_login_at
      return latest ? this.formatDateTime(latest) : '-'
    },
    loginLogFields () {
      return [
        { key: 'login_time', label: this.$t('user_profile.login_log.fields.login_time'), thStyle: { width: '170px' } },
        { key: 'ip_address', label: this.$t('user_profile.login_log.fields.ip_address'), thStyle: { width: '140px' } },
        { key: 'location', label: this.$t('user_profile.login_log.fields.location'), thStyle: { minWidth: '160px' } },
        { key: 'device', label: this.$t('user_profile.login_log.fields.device'), thStyle: { minWidth: '200px' } },
        { key: 'success', label: this.$t('user_profile.login_log.fields.success'), thStyle: { width: '80px' } }
      ]
    },
    userInitials () {
      if (isPlatformAdmin(this.userInfo)) return 'PA'
      const name = this.userInfo.display_name || this.userInfo.email || ''
      if (!name.trim()) return 'U'
      const normalizedName = name.trim()
      const firstChar = normalizedName.charAt(0)
      if (/[\u4e00-\u9fa5]/.test(firstChar)) {
        return firstChar
      }
      const parts = normalizedName.split(/[\s_-]+/).filter(Boolean)
      return parts.slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase()
    },
    avatarSource () {
      if (!this.userInfo.avatar) return ''
      return normalizeImageUrl(this.userInfo.avatar)
    }
  },
  watch: {
    loginLogPageSize () {
      if (!this.loginLogDialogVisible) return
      this.loginLogPage = 1
      this.fetchLoginLogs()
    },
    avatarSource: {
      immediate: true,
      handler (source) {
        this.loadAvatar(source)
      }
    }
  },
  created () {
    this.loadUserInfo()
    // 强制改密入口：登录后 must_change_password=true 时 Login.vue 会带 query 跳过来，
    // 这里自动弹改密对话框，避免用户对着空白页迷路
    if (this.$route.query.force_change_password) {
      this.forceChangePassword = true
      this.$nextTick(() => {
        this.passwordDialogVisible = true
      })
    }
  },
  beforeDestroy () {
    this.avatarRequestId += 1
    this.releaseManagedAvatar()
  },
  methods: {
    releaseManagedAvatar () {
      if (this.managedAvatarUrl) {
        URL.revokeObjectURL(this.managedAvatarUrl)
        this.managedAvatarUrl = ''
      }
    },
    async loadAvatar (source, forceRefresh = false) {
      const requestId = ++this.avatarRequestId
      this.avatarLoadFailed = false
      this.releaseManagedAvatar()
      this.avatarDisplayUrl = ''
      if (!source) return

      const separator = source.includes('?') ? '&' : '?'
      const requestSource = forceRefresh && !/^(data:|blob:)/i.test(source)
        ? `${source}${separator}_avatar=${Date.now()}`
        : source
      const displayUrl = await fetchAuthenticatedImage(requestSource)
      if (requestId !== this.avatarRequestId) {
        if (displayUrl !== requestSource && displayUrl.startsWith('blob:')) {
          URL.revokeObjectURL(displayUrl)
        }
        return
      }

      this.avatarDisplayUrl = displayUrl
      if (displayUrl !== requestSource && displayUrl.startsWith('blob:')) {
        this.managedAvatarUrl = displayUrl
      }
    },
    syncUserState (patch = {}) {
      let storedUser = {}
      try {
        storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      } catch (error) {
        localStorage.removeItem('user')
      }
      const userData = {
        ...storedUser,
        ...patch
      }
      persistCurrentUser(userData)
      this.$eventBus.$emit('user-info-updated', userData)
    },
    triggerAvatarUpload () {
      if (!this.avatarBusy && this.$refs.avatarUploadInput) {
        this.$refs.avatarUploadInput.click()
      }
    },
    handleAvatarError () {
      this.avatarLoadFailed = true
      console.warn('[UserProfile] 头像加载失败，已回退到首字母:', this.avatarSource)
    },
    async handleAvatarChange (event) {
      const file = event.target.files[0]
      if (!file) return

      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      if (!validImageTypes.includes(file.type)) {
        this.$uiToast.error(this.$t('user_profile.toast.image_type_invalid'))
        event.target.value = ''
        return
      }

      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        this.$uiToast.error(this.$t('user_profile.toast.image_too_large'))
        event.target.value = ''
        return
      }

      this.avatarBusy = true
      try {
        const formData = new FormData()
        formData.append('file', file)

        const { uploadAvatar } = await import('@/api/user')
        const response = await uploadAvatar(formData)
        const responseAvatar = response?.avatar_url || response?.avatar || response?.url ||
          response?.data?.avatar_url || response?.data?.avatar || response?.data?.url

        // 以服务端最新用户信息为准，兼容上传接口只返回成功状态、不返回 URL 的情况。
        let refreshedUser = null
        try {
          refreshedUser = await getCurrentUser()
        } catch (error) {
          // 上传已经成功时，刷新用户信息失败不应覆盖上传接口返回的头像地址。
        }
        // 上传接口返回的是刚创建文件的规范下载 URL；优先使用它，避免旧版
        // /users/me 仍返回 uploads\\avatars\\... 磁盘路径时把有效地址覆盖掉。
        const avatarUrl = responseAvatar || refreshedUser?.avatar
        if (typeof avatarUrl !== 'string' || !avatarUrl) {
          throw new Error(this.$t('user_profile.toast.upload_failed'))
        }

        this.avatarLoadFailed = false
        this.userInfo = {
          ...this.userInfo,
          ...(refreshedUser || {}),
          avatar: avatarUrl
        }
        await this.loadAvatar(normalizeImageUrl(avatarUrl), true)
        this.syncUserState(this.userInfo)
        this.$uiToast.success(this.$t('user_profile.toast.upload_success'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_profile.toast.upload_failed'))
      } finally {
        this.avatarBusy = false
        event.target.value = ''
      }
    },
    async showAvatarContextMenu (event) {
      if (!this.userInfo.avatar || this.avatarBusy) return
      event.preventDefault()
      try {
        const confirmed = await this.$uiConfirm(this.$t('user_profile.avatar.delete_confirm_msg'), {
          title: this.$t('user_profile.avatar.delete_confirm_title'),
          okTitle: this.$t('user_profile.avatar.delete_confirm_ok'),
          cancelTitle: this.$t('user_profile.avatar.delete_confirm_cancel'),
          okVariant: 'danger'
        })
        if (confirmed) {
          await this.deleteAvatar()
        }
      } catch (error) {
      }
    },
    async deleteAvatar () {
      this.avatarBusy = true
      try {
        const { deleteAvatar } = await import('@/api/user')
        await deleteAvatar()
        this.$set(this.userInfo, 'avatar', null)
        this.syncUserState({ ...this.userInfo, avatar: null })
        this.$uiToast.success(this.$t('user_profile.toast.delete_avatar_success'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_profile.toast.delete_avatar_failed'))
      } finally {
        this.avatarBusy = false
      }
    },
    async loadUserInfo () {
      try {
        const response = await getCurrentUser()
        this.avatarLoadFailed = false
        this.userInfo = {
          ...response
        }
        this.syncUserState(this.userInfo)
      } catch (error) {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          this.userInfo = JSON.parse(userStr)
        }
      }
    },
    getRoleBadgeVariant (role) {
      const roleMap = {
        admin: 'primary',
        operator: 'success',
        data_entry: 'warning',
        viewer: 'secondary'
      }
      return roleMap[role] || 'secondary'
    },
    getRoleLabel (role) {
      const roleMap = {
        admin: this.$t('user_profile.role_label.admin'),
        operator: this.$t('user_profile.role_label.operator'),
        data_entry: this.$t('user_profile.role_label.data_entry'),
        viewer: this.$t('user_profile.role_label.viewer')
      }
      return roleMap[role] || role || this.$t('user_profile.role_label.unknown')
    },
    getCompanyBadgeVariant (companyType) {
      const normalized = normalizeCompanyType(companyType)
      const typeMap = {
        PF: 'danger',
        MF: 'primary',
        BR: 'success',
        CP: 'info',
        EU: 'secondary'
      }
      return typeMap[normalized] || 'secondary'
    },
    getCompanyTypeLabel (companyType) {
      const normalized = normalizeCompanyType(companyType)
      const typeMap = {
        PF: this.$t('user_profile.company_type_label.PF'),
        MF: this.$t('user_profile.company_type_label.MF'),
        BR: this.$t('user_profile.company_type_label.BR'),
        CP: this.$t('user_profile.company_type_label.CP'),
        EU: this.$t('user_profile.company_type_label.EU'),
        pod: this.$t('user_profile.company_type_label.pod'),
        display: this.$t('user_profile.company_type_label.display')
      }
      return typeMap[normalized || companyType] || companyType || '-'
    },
    formatDateTime (dateString) {
      return formatDate(dateString, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    resetPasswordForm () {
      this.passwordForm = {
        old_password: '',
        new_password: '',
        confirm_password: ''
      }
      this.passwordDialogVisible = false
    },
    showPasswordDialog () {
      this.forceChangePassword = false
      this.passwordDialogVisible = true
    },
    showLoginLogDialog () {
      this.loginLogDialogVisible = true
      if (!this.loginLogsLoaded) this.fetchLoginLogs()
    },
    handleLoginLogPageChange (page) {
      this.loginLogPage = page
      this.fetchLoginLogs()
    },
    startEdit (field) {
      this.editingField = field
      this.editValue = this.userInfo[field] || ''
      this.$nextTick(() => {
        if (this.$refs.editInput) {
          this.$refs.editInput.focus()
        }
      })
    },
    async saveEdit (field) {
      const oldValue = this.userInfo[field]
      if (this.editValue === oldValue) {
        this.editingField = null
        return
      }

      if (field === 'phone' && this.editValue && !/^1[3-9]\d{9}$/.test(this.editValue)) {
        this.$uiToast.warning(this.$t('user_profile.toast.phone_invalid'))
        this.editValue = oldValue
        this.editingField = null
        return
      }

      this.editLoading = true
      try {
        const updateData = { [field]: this.editValue }
        await updateCurrentUser(updateData)
        this.userInfo[field] = this.editValue
        this.syncUserState(this.userInfo)
        this.$uiToast.success(this.$t('user_profile.toast.modify_success'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_profile.toast.modify_failed'))
        this.editValue = oldValue
      } finally {
        this.editingField = null
        this.editLoading = false
      }
    },
    validatePasswordForm () {
      if (!this.passwordForm.old_password) {
        this.$uiToast.warning(this.$t('user_profile.toast.old_password_required'))
        return false
      }
      if (!this.passwordForm.new_password || this.passwordForm.new_password.length < 6) {
        this.$uiToast.warning(this.$t('user_profile.toast.new_password_too_short'))
        return false
      }
      if (this.passwordForm.confirm_password !== this.passwordForm.new_password) {
        this.$uiToast.warning(this.$t('user_profile.toast.password_mismatch'))
        return false
      }
      return true
    },
    handlePasswordModalOk (evt) {
      evt.preventDefault()
      this.handleChangePassword()
    },
    async handleChangePassword () {
      if (!this.validatePasswordForm()) return
      this.passwordLoading = true
      try {
        await updatePassword({
          old_password: this.passwordForm.old_password,
          new_password: this.passwordForm.new_password
        })
        this.$uiToast.success(this.$t('user_profile.toast.change_password_success'))
        this.passwordDialogVisible = false
        this.resetPasswordForm()
        setTimeout(() => {
          const loginPath = getLoginEntryPath()
          clearDashboardQueryCache()
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          this.$router.push(loginPath).catch(() => {})
        }, 1500)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_profile.toast.change_password_failed'))
      } finally {
        this.passwordLoading = false
      }
    },
    async fetchLoginLogs () {
      this.loginLogLoading = true
      try {
        const response = await fetchLoginLogs({
          page: this.loginLogPage,
          page_size: this.loginLogPageSize
        })
        this.loginLogList = response.items || []
        this.loginLogTotal = response.total || 0
        this.loginLogsLoaded = true
      } catch (error) {
        this.loginLogList = []
      } finally {
        this.loginLogLoading = false
      }
    }
  }
}
</script>
