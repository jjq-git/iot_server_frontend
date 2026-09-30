<template>
  <div class="user-detail detail-page">
    <div class="card-style-b">
      <div class="waterfall-container">
        <div class="detail-page__column">
          <div class="section-b">
          <div class="section-header-b user-detail__account-header">
            <app-icon name="person" class="section-icon" />
            <span class="section-title-b">{{ $t('user_detail.sections.account') }}</span>
            <user-avatar class="user-detail__avatar" :user="avatarUser" />
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.email') }}</div>
              <div class="detail-row__content">
                <div class="value-wrapper">
                  <span class="value-text">{{ user.email || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.phone') }}</div>
              <div class="detail-row__content">
                <div class="contact-item">
                  <div v-if="editingFieldB === 'phone'" class="edit-input-wrapper">
                    <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('phone')" @blur="saveFieldEditB('phone')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('phone'), activate: () => startEditB('phone', user.phone) }">
                    <span class="value-text">{{ user.phone || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.display_name') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'display_name'" class="edit-input-wrapper">
                  <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('display_name')" @blur="saveFieldEditB('display_name')" :clearable="false" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('display_name'), activate: () => startEditB('display_name', user.display_name) }">
                  <span class="value-text">{{ user.display_name || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.company') }}</div>
              <div class="detail-row__content">
                <div class="value-wrapper">
                  <span class="value-text">{{ user.company_name || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="shield-lock" class="section-icon" />
            <span class="section-title-b">{{ $t('user_detail.sections.role') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.role') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'role'" class="edit-input-wrapper">
                  <base-select v-model="editValueB" :options="roleSelectOptions" @input="handleRoleChangeB" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('role'), activate: () => startEditB('role', user.role) }">
                  <span class="value-text">
                    <base-badge :variant="getUserRoleTag(user.role) || 'secondary'">
                      {{ getUserRoleLabel(user.role) }}
                    </base-badge>
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.locale') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'locale'" class="edit-input-wrapper">
                  <base-select v-model="editValueB" :options="localeSelectOptions" @input="handleLocaleChangeB" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('locale'), activate: () => startEditB('locale', user.locale) }">
                  <span class="value-text">{{ getLocaleLabel(user.locale) }}</span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.timezone') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'timezone'" class="edit-input-wrapper">
                  <base-select v-model="editValueB" :options="timezoneSelectOptions" @input="handleTimezoneChangeB" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('timezone'), activate: () => startEditB('timezone', user.timezone) }">
                  <span class="value-text">{{ user.timezone || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div class="detail-page__column">
          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="calendar3" class="section-icon" />
            <span class="section-title-b">{{ $t('user_detail.sections.login') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.last_login') }}</div>
              <div class="detail-row__content">
                <span class="value-text">{{ formatDate(user.last_login_at) }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.last_login_ip') }}</div>
              <div class="detail-row__content">
                <span class="uuid-text">{{ user.last_login_ip || '-' }}</span>
              </div>
            </div>
          </div>
          </div>

          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="gear" class="section-icon" />
            <span class="section-title-b">{{ $t('user_detail.sections.system') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.uuid') }}</div>
              <div class="detail-row__content">
                <span class="uuid-text">{{ user.uuid || '-' }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.created_at') }}</div>
              <div class="detail-row__content">
                <span class="value-text">{{ formatDate(user.created_at) }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.status') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'is_active'" class="edit-input-wrapper">
                  <base-switch v-model="editValueB" @change="handleStatusChangeB">
                    {{ editValueB ? $t('user_detail.status_label.active') : $t('user_detail.status_label.inactive') }}
                  </base-switch>
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditField('is_active'), activate: () => startEditB('is_active', user.is_active) }">
                  <span class="value-text">
                    <base-badge :variant="user.is_active === false || user.is_active === 'false' ? 'danger' : 'success'">
                      {{ user.is_active === false || user.is_active === 'false' ? $t('user_detail.status_label.is_inactive') : $t('user_detail.status_label.is_active') }}
                    </base-badge>
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('user_detail.fields.updated_at') }}</div>
              <div class="detail-row__content">
                <span class="value-text">{{ formatDate(user.updated_at) }}</span>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BaseSelect from '@/components/base/BaseSelect.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { fetchUserDetail, updateCurrentUser, updateUser, updateUserRole } from '@/api'
import { formatDate as formatDateUtil } from '@/utils/format'
import { canManageUserRow, isPlatformAdmin } from '@/utils/permission'
import unsavedGuard from '@/mixins/unsavedGuard'

const SELF_EDITABLE_FIELDS = Object.freeze(['display_name', 'phone', 'locale', 'timezone'])
const ADMIN_EDITABLE_FIELDS = Object.freeze(['display_name', 'is_active', 'role'])

export default {
  name: 'UserDetail',
  components: {
    BaseSelect,
    UserAvatar
  },
  mixins: [unsavedGuard],
  data () {
    return {
      loading: false,
      user: {},
      currentUser: {},
      hasEditPermission: false,
      // 样式版本 B 的编辑状态
      editingFieldB: null,
      editValueB: null
    }
  },
  computed: {
    userId () {
      return this.$route.params.userId
    },
    avatarUser () {
      if (this.user.avatar || this.user.avatar_url || !this.currentUser) return this.user

      const isCurrentUser =
        (this.user.uuid && this.user.uuid === this.currentUser.uuid) ||
        (this.user.id && this.user.id === this.currentUser.id) ||
        (this.user.username && this.user.username === this.currentUser.username)

      if (!isCurrentUser) return this.user

      return {
        ...this.user,
        avatar: this.currentUser.avatar || this.currentUser.avatar_url
      }
    },
    roleSelectOptions () {
      return [
        { value: 'admin', text: this.$t('user_detail.role_label.admin') },
        { value: 'operator', text: this.$t('user_detail.role_label.operator') },
        { value: 'data_entry', text: this.$t('user_detail.role_label.data_entry') },
        { value: 'viewer', text: this.$t('user_detail.role_label.viewer') }
      ]
    },
    localeSelectOptions () {
      return [
        { value: 'zh-CN', text: this.$t('user_detail.locale_label.zh_cn') },
        { value: 'en-US', text: this.$t('user_detail.locale_label.en_us') }
      ]
    },
    timezoneSelectOptions () {
      return [
        { value: 'Asia/Shanghai', text: 'Asia/Shanghai' },
        { value: 'UTC', text: 'UTC' },
        { value: 'America/New_York', text: 'America/New_York' }
      ]
    }
  },
  created () {
    this.loadCurrentUser()
    this.fetchUserDetail()
  },
  methods: {
    // unsavedGuard mixin 接入：行内编辑某字段未保存时拦截路由切换/页面关闭
    isFormDirty () {
      return this.editingFieldB !== null
    },
    async loadCurrentUser () {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          this.currentUser = JSON.parse(userStr)
        }
      } catch (error) {
        this.currentUser = null
      }
    },
    async fetchUserDetail () {
      this.loading = true
      try {
        const response = await fetchUserDetail(this.userId, this.$route.query.company_id)
        this.user = response

        // 加载完用户详情后检查权限
        this.$nextTick(() => {
          this.checkPermission()
        })
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_detail.toast.fetch_failed'))
      } finally {
        this.loading = false
      }
    },

    checkPermission () {
      this.hasEditPermission = canManageUserRow(this.user, this.currentUser)
    },

    isViewingCurrentUser () {
      const targetIds = [this.user.uuid, this.user.user_id, this.user.id]
        .filter(value => value !== null && value !== undefined && value !== '')
        .map(String)
      const currentIds = [this.currentUser?.uuid, this.currentUser?.user_id, this.currentUser?.id]
        .filter(value => value !== null && value !== undefined && value !== '')
        .map(String)
      return targetIds.some(id => currentIds.includes(id))
    },

    canEditField (field) {
      const isSelf = this.isViewingCurrentUser()
      if (isSelf && SELF_EDITABLE_FIELDS.includes(field)) return true
      if (!this.hasEditPermission || !ADMIN_EDITABLE_FIELDS.includes(field)) return false
      if (field === 'is_active') return !isSelf && isPlatformAdmin(this.currentUser)
      if (field === 'display_name') {
        return isPlatformAdmin(this.currentUser) ||
          Number(this.user.home_company_id) === Number(this.currentUser?.company_id)
      }
      return !isSelf
    },

    // ==================== 样式版本 B 的编辑方法 ====================
    getUserRoleLabel (role) {
      const map = {
        admin: this.$t('user_detail.role_label.admin'),
        operator: this.$t('user_detail.role_label.operator'),
        data_entry: this.$t('user_detail.role_label.data_entry'),
        viewer: this.$t('user_detail.role_label.viewer')
      }
      return map[role] || role
    },

    getUserRoleTag (role) {
      const map = {
        admin: 'primary',
        operator: 'warning',
        data_entry: 'info',
        viewer: 'success'
      }
      return map[role] || ''
    },

    getLocaleLabel (locale) {
      const map = {
        'zh-CN': this.$t('user_detail.locale_label.zh_cn'),
        'en-US': this.$t('user_detail.locale_label.en_us')
      }
      return map[locale] || locale || '-'
    },

    formatDate (dateString) {
      return formatDateUtil(dateString)
    },

    startEditB (field, value) {
      if (!this.canEditField(field)) return
      this.editingFieldB = field
      // 状态字段特殊处理，确保布尔值正确传递
      if (field === 'is_active') {
        this.editValueB = value !== false && value !== 'false'
      } else {
        this.editValueB = value || ''
      }
    },

    handleRoleChangeB (value) {
      // 调用专门的角色更新接口
      this.saveRoleEditDirectB(value)
    },

    async saveRoleEditDirectB (roleValue) {
      try {
        await updateUserRole(this.userId, roleValue, this.user.company_id)

        // 更新本地数据
        this.user.role = roleValue
        this.user.updated_at = new Date().toISOString()

        this.$uiToast.success(this.$t('user_detail.toast.role_update_success'))
        this.editingFieldB = null
        this.editValueB = null
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_detail.toast.role_update_failed'))
        this.editingFieldB = null
        this.editValueB = null
      }
    },

    handleLocaleChangeB (value) {
      this.saveFieldEditDirectB('locale', value)
    },

    handleTimezoneChangeB (value) {
      this.saveFieldEditDirectB('timezone', value)
    },

    handleStatusChangeB (value) {
      this.saveFieldEditDirectB('is_active', value)
    },

    async saveFieldEditB (field) {
      if (!this.editingFieldB) return
      this.saveFieldEditDirectB(this.editingFieldB, this.editValueB)
    },

    async saveFieldEditDirectB (field, saveValue, extraData) {
      if (!field || !this.canEditField(field)) return

      // 格式验证
      if (field === 'phone') {
        // 手机号验证：支持中国大陆 11 位手机号和国际手机号
        const cleanPhone = saveValue.replace(/\s/g, '')
        if (saveValue && !/^((\+|00)[1-9]\d{0,3})?1[3-9]\d{9}$/.test(cleanPhone)) {
          this.$uiToast.error(this.$t('user_detail.rules.phone_invalid'))
          return
        }
      }

      try {
        // 准备更新数据
        const updateData = {
          [field]: saveValue
        }

        // 调用 API
        const selfServiceEdit = this.isViewingCurrentUser() && SELF_EDITABLE_FIELDS.includes(field)
        if (selfServiceEdit) await updateCurrentUser(updateData)
        else await updateUser(this.userId, updateData, this.user.company_id)

        // 更新本地数据
        if (field === 'role') {
          this.user.role = saveValue
        } else if (field === 'locale') {
          this.user.locale = saveValue
        } else if (field === 'timezone') {
          this.user.timezone = saveValue
        } else if (field === 'company_id') {
          this.user.company_id = saveValue
          if (extraData) {
            this.user.company_name = extraData
          }
        } else if (field === 'is_active') {
          this.user.is_active = saveValue
        } else {
          this.user[field] = saveValue || ''
        }
        this.user.updated_at = new Date().toISOString()

        if (selfServiceEdit) this.syncCurrentUserState({ [field]: saveValue })

        this.$uiToast.success(this.$t('user_detail.toast.field_update_success'))
        this.editingFieldB = null
        this.editValueB = null
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('user_detail.toast.field_update_failed'))
        this.editingFieldB = null
        this.editValueB = null
      }
    },

    syncCurrentUserState (patch) {
      const userData = { ...this.currentUser, ...patch }
      this.currentUser = userData
      localStorage.setItem('user', JSON.stringify(userData))
      this.$eventBus.$emit('user-info-updated', userData)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/user-detail.scss"></style>
