<template>
  <div class="company-detail detail-page">
    <div class="card-style-b">
      <div class="waterfall-container">
        <div class="detail-page__column">
          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="building" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.basic_info') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.company_code') }}</div>
              <div class="detail-row__content">
                <div class="value-wrapper editable-b">
                  <span class="value-text">{{ company.company_code || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.company_name') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'company_name'" class="edit-input-wrapper">
                  <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('company_name')" @blur="saveFieldEditB('company_name')" :clearable="false" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('company_name', company.company_name) }">
                  <span class="value-text">{{ company.company_name || '-' }}</span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.short_name') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'short_name'" class="edit-input-wrapper">
                  <base-input v-model="editValueB" size="sm" maxlength="100" @keyup.enter="saveFieldEditB('short_name')" @blur="saveFieldEditB('short_name')" :clearable="false" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('short_name', company.short_name) }">
                  <span class="value-text">{{ company.short_name || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="person" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.contact_info') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.contact_person') }}</div>
              <div class="detail-row__content">
                <div class="contact-item">
                  <div v-if="editingFieldB === 'contact_person'" class="edit-input-wrapper">
                    <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('contact_person')" @blur="saveFieldEditB('contact_person')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('contact_person', company.contact_person) }">
                    <span class="value-text">{{ company.contact_person || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.contact_email') }}</div>
              <div class="detail-row__content">
                <div class="contact-item">
                  <div v-if="editingFieldB === 'contact_email'" class="edit-input-wrapper">
                    <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('contact_email')" @blur="saveFieldEditB('contact_email')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('contact_email', company.contact_email) }">
                    <span class="value-text">{{ company.contact_email || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.contact_phone') }}</div>
              <div class="detail-row__content">
                <div class="contact-item">
                  <div v-if="editingFieldB === 'contact_phone'" class="edit-input-wrapper">
                    <base-input v-model="editValueB" size="sm" @keyup.enter="saveFieldEditB('contact_phone')" @blur="saveFieldEditB('contact_phone')" :clearable="false" />
                  </div>
                  <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('contact_phone', company.contact_phone) }">
                    <span class="value-text">{{ company.contact_phone || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.address') }}</div>
              <div class="detail-row__content">
                <div class="contact-item">
                  <div class="value-wrapper">
                    <span class="value-text">{{ company.address || '-' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div class="detail-page__column">
          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="people" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.company_attr') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.company_attr') }}</div>
              <div class="detail-row__content">
                <div class="type-tags-wrapper value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: handleTypeDblClickB }">
                  <b-form-checkbox-group
                    v-model="companyTypeDisplayB"
                    :options="companyTypeOptions"
                    :disabled="editingFieldB !== 'company_type'"
                    @input="handleTypeChangeB"
                  />
                  <base-select
                    v-if="editingFieldB === 'company_type' && editValueB.includes('EU')"
                    v-model="identityPodUsageDraft"
                    class="mt-2"
                    :options="podUsageOptions"
                    :placeholder="$t('companies.validation.pod_usage_required')"
                    :clearable="false"
                  />
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('companies.company_attribute.is_household') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'is_household'" class="edit-input-wrapper">
                  <base-switch v-model="editValueB" @change="handleHouseholdChangeB">
                    {{ $t(editValueB ? 'common.yes' : 'common.no') }}
                  </base-switch>
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission || company.is_platform || !company.is_enduser, activate: () => startEditB('is_household', company.is_household) }">
                  <base-badge :variant="company.is_household ? 'secondary' : 'info'">
                    {{ $t(company.is_household ? 'common.yes' : 'common.no') }}
                  </base-badge>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('companies.company_attribute.is_school') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'is_school'" class="edit-input-wrapper">
                  <base-switch v-model="editValueB" @change="handleSchoolChangeB">
                    {{ $t(editValueB ? 'common.yes' : 'common.no') }}
                  </base-switch>
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission || company.is_platform || !company.is_enduser, activate: () => startEditB('is_school', company.is_school) }">
                  <base-badge :variant="company.is_school ? 'secondary' : 'info'">
                    {{ $t(company.is_school ? 'common.yes' : 'common.no') }}
                  </base-badge>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('companies.create_dialog.pod_usage_label') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'pod_usage'" class="edit-input-wrapper">
                  <base-select
                    v-model="editValueB"
                    :options="podUsageOptions"
                    :clearable="false"
                    @change="saveFieldEditDirectB('pod_usage', $event)"
                  />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission || !company.is_enduser, activate: () => startEditB('pod_usage', company.pod_usage) }">
                  <span class="value-text">{{ podUsageLabel }}</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="link-45deg" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.domain_info') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.domain') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'domain'" class="edit-input-wrapper">
                  <base-input v-model.trim="editValueB" type="url" size="sm" @keyup.enter="saveFieldEditB('domain')" @blur="saveFieldEditB('domain')" :clearable="false" />
                </div>
                <div v-else-if="loginEntry" class="company-login-entry editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('domain', company.domain) }">
                  <a
                    :href="loginEntry"
                    :title="loginEntry"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="company-login-entry__link"
                  >
                    <app-icon name="box-arrow-up-right" aria-hidden="true" />
                    <span>{{ loginEntry }}</span>
                  </a>
                  <button
                    type="button"
                    class="company-login-entry__copy"
                    :title="$t('company_detail.domain.copy_entry')"
                    :aria-label="$t('company_detail.domain.copy_entry')"
                    @click="copyLoginEntry"
                  >
                    <app-icon name="files"  />
                  </button>
                </div>
                <span v-else class="company-login-entry__unset">
                  <app-icon name="slash-circle" aria-hidden="true" />
                  {{ $t('company_detail.domain.entry_unset') }}
                </span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.slogan') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'slogan'" class="edit-input-wrapper">
                  <base-input v-model.trim="editValueB" maxlength="255" size="sm" @keyup.enter="saveFieldEditB('slogan')" @blur="saveFieldEditB('slogan')" :clearable="false" />
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('slogan', company.slogan) }">
                  <span class="value-text">{{ company.slogan || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div class="section-b">
          <div class="section-header-b">
            <app-icon name="gear" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.system_info') }}</span>
          </div>
          <div class="detail-list">
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.uuid') }}</div>
              <div class="detail-row__content">
                <span class="uuid-text">{{ company.uuid || '-' }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.created_at') }}</div>
              <div class="detail-row__content">
                <span class="value-text">{{ formatDate(company.created_at) }}</span>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.status') }}</div>
              <div class="detail-row__content">
                <div v-if="editingFieldB === 'is_active'" class="edit-input-wrapper">
                  <base-switch v-model="editValueB" @change="handleStatusChangeB">
                    {{ editValueB ? $t('company_detail.active_status.active') : $t('company_detail.active_status.inactive') }}
                  </base-switch>
                </div>
                <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('is_active', company.is_active !== false) }">
                  <span class="value-text">
                    <base-badge :variant="company.is_active === false ? 'danger' : 'success'">
                      {{ company.is_active === false ? $t('company_detail.active_status.inactive_badge') : $t('company_detail.active_status.active_badge') }}
                    </base-badge>
                  </span>
                </div>
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-row__label">{{ $t('company_detail.field.updated_at') }}</div>
              <div class="detail-row__content">
                <span class="value-text">{{ formatDate(company.updated_at) }}</span>
              </div>
            </div>
          </div>
          </div>

          <div v-if="company.remark" class="section-b">
          <div class="section-header-b">
            <app-icon name="journal-text" class="section-icon" />
            <span class="section-title-b">{{ $t('company_detail.section.remark') }}</span>
          </div>
          <div v-if="editingFieldB === 'remark'" class="edit-input-wrapper">
            <b-form-textarea v-model="editValueB" :rows="2" @blur="saveFieldEditB('remark')" />
          </div>
          <div v-else class="remark-content-b value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !hasEditPermission, activate: () => startEditB('remark', company.remark) }">
            <span class="value-text">{{ company.remark }}</span>
          </div>
          </div>
        </div>
      </div>
    </div>
    <base-modal
      v-model="showStatusDialog"
      :title="$t(pendingCompanyStatus ? 'company_status_change.activate_title' : 'company_status_change.deactivate_title')"
      :ok-title="$t(pendingCompanyStatus ? 'company_status_change.activate_action' : 'company_status_change.deactivate_action')"
      :ok-variant="pendingCompanyStatus ? 'primary' : 'danger'"
      :cancel-title="$t('common.cancel')"
      @ok="submitStatusChange"
      @hidden="cancelStatusChange"
    >
      <base-alert :variant="pendingCompanyStatus ? 'info' : 'warning'">
        {{ $t(pendingCompanyStatus ? 'company_status_change.activate_impact' : 'company_status_change.deactivate_impact', { company: company.company_name || '-' }) }}
      </base-alert>
    </base-modal>
  </div>
</template>

<script>
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import { fetchCompanyDetail, updateCompany } from '@/api'
import { copyText } from '@/utils/clipboard'
import { formatDate as formatDateUtil, formatList } from '@/utils/format'
import { getCompanyLoginUrl, normalizeCompanyLoginUrl } from '@/utils/loginEntry'
import { canWriteCompany, hasPermission, isPlatformAdmin, PERMISSION } from '@/utils/permission'
import { normalizeCompanyType, normalizeCompanyTypeList } from '@/utils/companyType'

export default {
  name: 'CompanyDetail',
  components: { BaseAlert, BaseModal },
  data () {
    return {
      loading: false,
      company: {},
      hasEditPermission: false,
      // 样式版本 B 的编辑状态
      editingFieldB: null,
      editValueB: null,
      showStatusDialog: false,
      pendingCompanyStatus: null,
      identityPodUsageDraft: null
    }
  },
  computed: {
    companyId () {
      return this.$route.params.companyId
    },
    loginEntry () {
      return getCompanyLoginUrl(this.company)
    },
    companyTypeOptions () {
      return [
        { value: 'MF', text: this.$t('company_detail.company_type.MF') },
        { value: 'BR', text: this.$t('company_detail.company_type.BR') },
        { value: 'CP', text: this.$t('company_detail.company_type.CP') },
        { value: 'EU', text: this.$t('company_detail.company_type.EU') }
      ]
    },
    podUsageOptions () {
      return [
        { value: null, text: this.$t('companies.pod_usage.not_applicable') },
        { value: 'internal', text: this.$t('companies.pod_usage.internal') },
        { value: 'rental', text: this.$t('companies.pod_usage.rental') },
        { value: 'both', text: this.$t('companies.pod_usage.both') }
      ]
    },
    podUsageLabel () {
      const value = this.company.pod_usage
      return value ? this.$t(`companies.pod_usage.${value}`) : this.$t('companies.pod_usage.not_applicable')
    },
    companyTypeDisplayB: {
      get () {
        return this.editingFieldB === 'company_type' ? this.editValueB : this.getCompanyTypeArrayB()
      },
      set (value) {
        this.editValueB = value
      }
    }
  },
  created () {
    this.loadCurrentUser()
    this.fetchCompanyDetail()
  },
  methods: {
    async loadCurrentUser () {
      try {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          this.currentUser = JSON.parse(userStr)
        }
      } catch (error) {

      }
    },
    async fetchCompanyDetail () {
      this.loading = true
      try {
        const response = await fetchCompanyDetail(this.companyId)
        this.company = response
        this.$nextTick(() => {
          this.checkPermission()
        })
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.load_failed'))
      } finally {
        this.loading = false
      }
    },

    checkPermission () {
      const targetCompanyId = this.company?.id
      this.hasEditPermission = hasPermission(PERMISSION.COMPANY_RELATIONSHIP_MANAGE, this.currentUser) && (
        isPlatformAdmin(this.currentUser) ||
        canWriteCompany(targetCompanyId, this.currentUser)
      )
    },

    async copyLoginEntry () {
      try {
        await copyText(this.loginEntry)
        this.$uiToast.success(this.$t('company_detail.toast.login_entry_copied'))
      } catch (error) {
        this.$uiToast.error(this.$t('company_detail.toast.login_entry_copy_failed'))
      }
    },

    getCompanyTypeLabel (type) {
      const normalized = normalizeCompanyType(type)
      const map = {
        PF: this.$t('company_detail.company_type.PF'),
        MF: this.$t('company_detail.company_type.MF'),
        BR: this.$t('company_detail.company_type.BR'),
        CP: this.$t('company_detail.company_type.CP'),
        EU: this.$t('company_detail.company_type.EU')
      }
      return map[normalized] || type
    },

    getCompanyTypeTag (type) {
      const map = {
        PF: 'primary',
        MF: 'success',
        BR: 'warning',
        CP: 'info',
        EU: 'danger'
      }
      return map[normalizeCompanyType(type)] || ''
    },

    formatDate (dateString) {
      return formatDateUtil(dateString)
    },

    // ==================== 样式版本 B 的编辑方法 ====================
    startEditB (field, value) {
      if (!this.hasEditPermission) return
      this.editingFieldB = field
      // 公司类型是多选模式，需要转换为数组
      if (field === 'company_type') {
        this.editValueB = this.getCompanyTypeArrayB()
        this.identityPodUsageDraft = this.company.pod_usage || null
      } else if (field === 'is_active' || field === 'is_household' || field === 'is_school') {
        // 状态字段特殊处理，确保布尔值正确传递
        this.editValueB = value !== false && value !== 'false'
      } else {
        this.editValueB = value || ''
      }
    },

    handleAttributeChangeB (value) {
      // 选择后立即保存，直接使用参数值
      this.saveFieldEditDirectB('company_attributes', value)
    },

    handleTypeDblClickB () {
      if (!this.hasEditPermission) return
      if (this.editingFieldB === 'company_type') {
        // 已在编辑模式，保存并退出
        this.saveFieldEditB('company_type')
      } else {
        // 进入编辑模式
        this.startEditB('company_type', this.company.company_type)
      }
    },

    handleTypeChangeB (value) {
      // 公司类型多选模式：不立即保存，等待用户再次双击或按回车保存
      // 值的变化会通过 v-model 同步到 editValueB

      // 处理最终用户不能和其他属性同时选择
      const isEnduserSelected = value.includes('EU')
      const otherTypes = ['MF', 'BR', 'CP']

      if (isEnduserSelected) {
        // 如果选择了最终用户，检查是否还选择了其他类型
        const hasOtherSelected = otherTypes.some(type => value.includes(type))
        if (hasOtherSelected) {
          this.$uiToast.warning(this.$t('company_detail.toast.enduser_exclusive'))
          this.companyTypeDisplayB = ['EU']
        }
      } else {
        this.identityPodUsageDraft = null
      }
    },

    handleStatusChangeB (value) {
      this.pendingCompanyStatus = Boolean(value)
      this.showStatusDialog = true
    },

    submitStatusChange (event) {
      event.preventDefault()
      const value = this.pendingCompanyStatus
      this.pendingCompanyStatus = null
      this.showStatusDialog = false
      this.saveFieldEditDirectB('is_active', value)
    },

    cancelStatusChange () {
      if (this.pendingCompanyStatus === null) return
      this.pendingCompanyStatus = null
      this.editValueB = this.company.is_active !== false
      this.editingFieldB = null
    },

    handleHouseholdChangeB (value) {
      this.saveFieldEditDirectB('is_household', value)
    },

    handleSchoolChangeB (value) {
      this.saveFieldEditDirectB('is_school', value)
    },

    async saveFieldEditB (field) {
      // 从 editValueB 读取值的版本（用于 @blur 事件）
      if (!this.editingFieldB) return
      this.saveFieldEditDirectB(this.editingFieldB, this.editValueB)
    },

    async saveFieldEditDirectB (field, saveValue) {
      if (!field) return

      // 格式验证
      if (field === 'contact_email') {
        if (saveValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saveValue)) {
          this.$uiToast.error(this.$t('company_detail.toast.invalid_email'))
          return
        }
      } else if (field === 'contact_phone') {
        // 手机号验证：支持中国大陆 11 位手机号和国际手机号
        const cleanPhone = saveValue.replace(/\s/g, '')
        if (saveValue && !/^((\+|00)[1-9]\d{0,3})?1[3-9]\d{9}$/.test(cleanPhone)) {
          this.$uiToast.error(this.$t('company_detail.toast.invalid_phone'))
          return
        }
      } else if (field === 'domain') {
        if (saveValue && !normalizeCompanyLoginUrl(saveValue)) {
          this.$uiToast.error(this.$t('company_detail.toast.invalid_domain'))
          return
        }
      }

      try {
        // 准备更新数据
        const updateData = {}

        if (field === 'company_type') {
          // 多选模式：根据选中的类型更新对应的布尔字段
          const typeList = normalizeCompanyTypeList(saveValue)

          // 映射关系
          const typeMap = {
            MF: 'is_pod_manufacturer',
            BR: 'is_brand',
            CP: 'is_channel_partner',
            EU: 'is_enduser'
          }

          // 先清空所有属性
          updateData.is_pod_manufacturer = false
          updateData.is_brand = false
          updateData.is_channel_partner = false
          updateData.is_enduser = false
          if (!typeList.includes('EU')) {
            updateData.is_household = false
            updateData.is_school = false
            updateData.pod_usage = null
          } else {
            if (!this.identityPodUsageDraft) {
              this.$uiToast.error(this.$t('companies.validation.pod_usage_required'))
              return
            }
            updateData.pod_usage = this.identityPodUsageDraft
          }

          // 设置选中的属性
          typeList.forEach(type => {
            if (typeMap[type]) {
              updateData[typeMap[type]] = true
            }
          })
        } else if (field === 'is_active') {
          updateData.is_active = saveValue
        } else if (field === 'is_household') {
          updateData.is_household = saveValue
          if (saveValue) {
            updateData.is_school = false
          }
        } else if (field === 'is_school') {
          updateData.is_school = saveValue
          if (saveValue) {
            updateData.is_household = false
          }
        } else if (field === 'company_attributes') {
          // 单选模式：先清空所有属性，再设置选中的属性
          updateData.is_pod_manufacturer = false
          updateData.is_brand = false
          updateData.is_channel_partner = false
          updateData.is_enduser = false
          if (saveValue) {
            updateData[saveValue] = true
          }
        } else {
          // 其他文本字段直接更新
          updateData[field] = field === 'domain' && saveValue ? normalizeCompanyLoginUrl(saveValue) : (saveValue || null)
        }

        // 调用真实 API
        const updatedCompany = await updateCompany(this.companyId, updateData)
        this.company = { ...this.company, ...updatedCompany }

        this.$uiToast.success(this.$t('company_detail.toast.update_success'))
        this.editingFieldB = null
        this.editValueB = null
        this.identityPodUsageDraft = null
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('company_detail.toast.update_failed'))
        this.editingFieldB = null
        this.editValueB = null
        this.identityPodUsageDraft = null
      }
    },

    getCompanyAttributesArrayB () {
      if (this.company.is_pod_manufacturer || this.company.is_manufacturer) return 'is_pod_manufacturer'
      if (this.company.is_brand) return 'is_brand'
      if (this.company.is_channel_partner || this.company.is_distributor || this.company.is_agent) return 'is_channel_partner'
      if (this.company.is_enduser) return 'is_enduser'
      return ''
    },

    getCompanyTypeArrayB () {
      // 根据接口返回的布尔字段生成数组
      const types = []
      if (this.company.is_pod_manufacturer || this.company.is_manufacturer) types.push('MF')
      if (this.company.is_brand) types.push('BR')
      if (this.company.is_channel_partner || this.company.is_distributor || this.company.is_agent) types.push('CP')
      if (this.company.is_enduser) types.push('EU')
      // 同时也支持 company_type 字段（逗号分隔的字符串）
      if (this.company.company_type && !types.length) {
        return normalizeCompanyTypeList(this.company.company_type)
      }
      return types
    },

    getCompanyTypeLabelsB () {
      // 获取所有选中的类型标签
      const types = this.getCompanyTypeArrayB()
      return formatList(types.map(type => this.getCompanyTypeLabel(type)))
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/company-detail.scss"></style>
