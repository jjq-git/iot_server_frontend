<template>
  <!-- 公司管理 -->
  <div class="companies">
    <!-- 公司管理页面 -->
    <div>
      <section class="interaction-stats" :aria-label="$t('companies.stats.summary')">
        <article class="interaction-stat interaction-stat--brand">
          <span class="interaction-stat__icon"><app-icon name="building"  /></span>
          <span class="interaction-stat__label">{{ $t('companies.stats.company_total') }}</span>
          <strong class="interaction-stat__value">{{ companySummaryStats.companyTotal }}</strong>
        </article>
        <!-- 账号总数/停用账号卡已移除:公司列表契约不含账号统计字段,恒显 0 属误导 -->
        <article class="interaction-stat interaction-stat--success">
          <span class="interaction-stat__icon"><app-icon name="check2-square"  /></span>
          <span class="interaction-stat__label">{{ $t('companies.stats.active_rate') }}</span>
          <strong class="interaction-stat__value">{{ companySummaryStats.activeRate }}%</strong>
        </article>
      </section>

      <list-page-card :total-rows="companyTotal" :page="companyQuery.page" :per-page="companyQuery.page_size">
        <template #filters>
          <b-form class="companies__filters" @submit.prevent>
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="companyQuery.keyword"
                class="filter-control"
                :placeholder="$t('companies.filter.keyword_placeholder')"
                @keyup.enter="handleCompanySearch"
                @input="onSearchInput"
              />
              <base-select
                v-model="companyQuery.is_active"
                class="filter-control"
                :options="companyStatusOptions"
                @input="handleCompanySearch"
              />
              <div class="filter-actions">
                <base-button v-if="canCreate()" @click="showCompanyDialog = true">
                  <app-icon name="building" class="mr-1" />
                  {{ $t('companies.actions.create_company') }}
                </base-button>
              </div>
            </div>
          </div>
          </b-form>
        </template>

        <!-- 公司列表 -->

          <base-table
            :key="companyTableKey"
            :items="companyTreeData"
            :fields="companyTableFields"
            :loading="companyLoading"
            :load-error="companyLoadError"
            @retry="fetchCompanyData"
          >
            <template #cell(short_name)="data">
              <div class="company-name-cell">
                <span class="company-name-cell__avatar">{{ companyInitial(data.item) }}</span>
                <span class="company-name-cell__copy">
                  <base-button variant="link" class="p-0 company-name-link" @click="viewCompanyDetail(data.item)">
                    {{ data.item.short_name || data.item.company_name || '-' }}
                  </base-button>
                  <small>{{ getCompanyTypeLabel(data.item.company_type) }}</small>
                </span>
              </div>
            </template>
            <template #cell(company_type)="data">
              <div class="company-attributes-tags">
                <span>{{ getCompanyTypeLabel(data.item.company_type) }}</span>
              </div>
            </template>
            <template #cell(company_attributes)="data">
              <div class="company-attributes-tags">
                <base-badge v-if="data.item.is_pod_manufacturer || data.item.is_manufacturer" variant="success">{{ $t('companies.company_attribute.is_pod_manufacturer') }}</base-badge>
                <base-badge v-if="data.item.is_brand" variant="warning">{{ $t('companies.company_attribute.is_brand') }}</base-badge>
                <base-badge v-if="data.item.is_channel_partner || data.item.is_distributor || data.item.is_agent" variant="info">{{ $t('companies.company_attribute.is_channel_partner') }}</base-badge>
                <base-badge v-if="data.item.is_enduser" variant="primary">{{ $t('companies.company_attribute.is_enduser') }}</base-badge>
                <base-badge v-if="data.item.is_household" variant="secondary">{{ $t('companies.company_attribute.is_household') }}</base-badge>
                <base-badge v-if="data.item.is_school" variant="secondary">{{ $t('companies.company_attribute.is_school') }}</base-badge>
              </div>
            </template>
            <template #cell(login_entry)="data">
              <div v-if="getLoginEntry(data.item)" class="company-login-entry">
                <a
                  :href="getLoginEntry(data.item)"
                  :title="getLoginEntry(data.item)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="company-login-entry__link"
                >
                  <app-icon name="box-arrow-up-right" aria-hidden="true" />
                  <span>{{ getLoginEntryLabel(data.item) }}</span>
                </a>
                <button
                  type="button"
                  class="company-login-entry__copy"
                  :title="$t('companies.actions.copy_login_entry')"
                  :aria-label="$t('companies.actions.copy_login_entry')"
                  @click="copyLoginEntry(data.item)"
                >
                  <app-icon name="files"  />
                </button>
              </div>
              <span v-else class="company-login-entry__unset">
                <app-icon name="slash-circle" aria-hidden="true" />
                {{ $t('companies.table.login_entry_unset') }}
              </span>
            </template>
            <template #cell(is_active)="data">
              <base-badge :variant="data.item.is_active ? 'success' : 'secondary'">
                {{ $t(data.item.is_active ? 'common.active' : 'common.inactive') }}
              </base-badge>
            </template>
            <template #cell(created_at)="data">
              {{ formatDate(data.item.created_at) }}
            </template>
            <template #head(actions)>
              <div class="column-visibility-header">
                <column-visibility
                  :columns="companyColumns"
                  :table-key="'companies-table'"
                  @update:columns="handleCompanyColumnsUpdate"
                />
              </div>
            </template>
            <template #cell(actions)="data">
              <base-action-button @click="viewCompanyDetail(data.item)" :title="$t('common.view')"> <app-icon name="eye"  /> <span>{{ $t('common.view') }}</span> </base-action-button>
              <base-action-button @click="viewCompanyLogs(data.item)" :title="$t('companies.icons.view_logs')"> <app-icon name="journal-text"  /> <span>{{ $t('companies.icons.view_logs') }}</span> </base-action-button>
            </template>
          </base-table>

        <template #footer>
          <base-pagination
            v-model="companyQuery.page"
            :total-rows="companyTotal"
            :per-page.sync="companyQuery.page_size"
            :show-per-page="true"
            @input="handlePageChange"
          />
        </template>
      </list-page-card>

      <!-- 创建公司对话�?-->
      <base-modal
        v-model="showCompanyDialog"
        :title="$t(createdCompanyPendingInvite ? 'companies.create_dialog.invite_retry_title' : 'companies.create_dialog.title')"
        size="lg"
        :ok-title="$t(createdCompanyPendingInvite ? 'companies.create_dialog.invite_retry_action' : 'companies.create_dialog.create_and_invite_action')"
        :cancel-title="$t('common.cancel')"
        :busy="companyCreating"
        :ok-disabled="companyCreating"
        @hidden="resetCompanyForm"
        @ok="handleCreateCompanyModalOk"
        modal-class="model-el dialog-with-header-bg company-create-modal" :centered="false" :scrollable="false"
      >
        <base-alert v-if="createdCompanyPendingInvite" variant="warning">
          {{ $t('companies.create_dialog.company_created_invite_pending', { company: createdCompanyPendingInvite.short_name || createdCompanyPendingInvite.company_name }) }}
        </base-alert>

        <div v-if="!createdCompanyPendingInvite">
        <b-row>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-name" :label="$t('companies.create_dialog.company_name_label')" required :state="companyFieldState('company_name')" :invalid-feedback="companyErrors.company_name">
              <base-input id="companies-create-name" v-model="companyForm.company_name" :placeholder="$t('companies.create_dialog.company_name_placeholder')" :state="companyFieldState('company_name')" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-short-name" :label="$t('companies.create_dialog.short_name_label')" required :state="companyFieldState('short_name')" :invalid-feedback="companyErrors.short_name">
              <base-input id="companies-create-short-name" v-model.trim="companyForm.short_name" maxlength="100" :placeholder="$t('companies.create_dialog.short_name_placeholder')" :state="companyFieldState('short_name')" />
            </base-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-domain" :label="$t('companies.create_dialog.domain_label')" :state="companyFieldState('domain')" :invalid-feedback="companyErrors.domain">
              <base-input id="companies-create-domain" v-model.trim="companyForm.domain" type="url" :placeholder="$t('companies.create_dialog.domain_placeholder')" :state="companyFieldState('domain')" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-slogan" :label="$t('companies.create_dialog.slogan_label')">
              <base-input id="companies-create-slogan" v-model.trim="companyForm.slogan" maxlength="255" :placeholder="$t('companies.create_dialog.slogan_placeholder')" />
            </base-form-group>
          </b-col>
        </b-row>

        <base-form-group :label="$t('companies.create_dialog.contact_label')">
          <b-row>
            <b-col cols="12" md="4">
              <base-input v-model="companyForm.contact_person" :placeholder="$t('companies.create_dialog.contact_person_placeholder')" />
            </b-col>
            <b-col cols="12" md="4">
              <base-input v-model="companyForm.contact_email" :placeholder="$t('companies.create_dialog.contact_email_placeholder')" />
            </b-col>
            <b-col cols="12" md="4">
              <base-input v-model="companyForm.contact_phone" :placeholder="$t('companies.create_dialog.contact_phone_placeholder')" />
            </b-col>
          </b-row>
        </base-form-group>

        <div class="company-create-classification">
          <base-form-group
            class="company-create-classification__attributes"
            :label="$t('companies.create_dialog.attributes_label')"
            required
            :state="companyFieldState('companyAttributes')"
            :invalid-feedback="companyErrors.companyAttributes"
          >
            <b-form-checkbox-group
              id="checkbox-group-1"
              v-model="companyForm.companyAttributes"
              class="company-create-classification__options"
              :options="companyAttributeOptions"
              :disabled="companyForm.is_household || companyForm.is_school"
              @input="handleCompanyAttributesChange"
            ></b-form-checkbox-group>
          </base-form-group>

          <b-row v-if="companyForm.companyAttributes.includes('is_enduser')" class="company-create-classification__row">
            <b-col cols="12" md="6">
              <base-form-group class="company-create-classification__field" :label="$t('companies.create_dialog.household_label')">
                <b-form-radio-group
                  v-model="enduserKind"
                  class="company-create-classification__options"
                  :options="enduserKindOptions"
                />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group
                class="company-create-classification__field"
                label-for="companies-create-pod-usage"
                :label="$t('companies.create_dialog.pod_usage_label')"
                :description="$t('companies.create_dialog.pod_usage_help')"
                :required="companyForm.companyAttributes.includes('is_enduser')"
                :state="companyFieldState('pod_usage')"
                :invalid-feedback="companyErrors.pod_usage"
              >
                <base-select
                  id="companies-create-pod-usage"
                  v-model="companyForm.pod_usage"
                  :options="podUsageOptions"
                  :disabled="!companyForm.companyAttributes.includes('is_enduser')"
                  :clearable="false"
                />
              </base-form-group>
            </b-col>
          </b-row>
        </div>
        </div>

        <h3 class="h6 mt-4">{{ $t('companies.create_dialog.first_admin_title') }}</h3>
        <p class="text-muted">{{ $t('companies.create_dialog.first_admin_help') }}</p>
        <b-row>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-admin-email" :label="$t('companies.create_dialog.admin_email_label')" required :state="companyFieldState('admin_email')" :invalid-feedback="companyErrors.admin_email">
              <base-input id="companies-create-admin-email" v-model.trim="companyForm.admin_email" type="email" autocomplete="email" :placeholder="$t('companies.create_dialog.admin_email_placeholder')" :state="companyFieldState('admin_email')" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group label-for="companies-create-admin-name" :label="$t('companies.create_dialog.admin_name_label')" required :state="companyFieldState('admin_display_name')" :invalid-feedback="companyErrors.admin_display_name">
              <base-input id="companies-create-admin-name" v-model.trim="companyForm.admin_display_name" autocomplete="name" :placeholder="$t('companies.create_dialog.admin_name_placeholder')" :state="companyFieldState('admin_display_name')" />
            </base-form-group>
          </b-col>
        </b-row>
      </base-modal>
    </div>

    <!-- 变更日志对话�?-->
    <ChangeLogDialog
      :visible.sync="logDialogVisible"
      :loading="logLoading"
      :change-log="currentLogData"
      @close="handleLogClose"
    />
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import rolePermission from '@/mixins/rolePermission'
import unsavedGuard from '@/mixins/unsavedGuard'
import localizedColumns from '@/mixins/localizedColumns'
import {
  fetchCompanies,
  createCompany,
  getCurrentUser,
  getRefreshToken
} from '@/api'
import { persistCurrentUser } from '@/utils/sessionContext'
import { debounce } from '@/utils/debounce'
import { copyText } from '@/utils/clipboard'
import { formatDate as formatDateUtil } from '@/utils/format'
import { getCompanyLoginUrl, normalizeCompanyLoginUrl } from '@/utils/loginEntry'
import { normalizeCompanyType } from '@/utils/companyType'
import { PERMISSION } from '@/utils/permission'
import { createInvitation } from '@/api/users'

// 写入 URL 时持久化�?query 字段清单（与 DEFAULT_QUERY 对齐�?
const QUERY_FIELDS = ['page', 'page_size', 'keyword', 'is_active']

const DEFAULT_QUERY = {
  page: 1,
  page_size: 10,
  keyword: '',
  is_active: ''
}

export default {
  name: 'Companies',
  permissionCapabilities: {
    create: PERMISSION.COMPANY_RELATIONSHIP_MANAGE
  },
  components: {
    BaseAlert,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BasePagination,
    BaseSelect,
    BaseTable,
    ColumnVisibility,
    ChangeLogDialog,
    ListPageCard
  },
  mixins: [rolePermission, unsavedGuard, localizedColumns],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { companyColumns: 'buildCompanyColumns' },
  data () {
    return {

      // 公司相关数据
      companyLoading: false,
      companyLoadError: '',
      companyCreating: false,
      createdCompanyPendingInvite: null,
      formDirtyFlag: false,
      showCompanyDialog: false,
      companyTotal: 0,
      companyData: [],
      companyTreeData: [],
      companyTableKey: 0,
      companyColumns: [],
      companyQuery: {
        ...DEFAULT_QUERY
      },
      companyForm: {
        company_name: '',
        short_name: '',
        domain: '',
        slogan: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        companyAttributes: [],
        businessType: 'pod',
        is_household: false,
        is_school: false,
        pod_usage: null,
        admin_email: '',
        admin_display_name: ''
      },
      companyErrors: {},

      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null,
      // 搜索防抖定时�?
      searchTimer: null
    }
  },
  computed: {
    companySummaryStats () {
      // 公司列表契约无账号统计字段,激活率按当前页公司的 is_active 计算
      const companies = this.companyData || []
      const activeCompanies = companies.filter(company => company.is_active !== false).length
      return {
        companyTotal: this.companyTotal,
        activeRate: companies.length ? Math.round((activeCompanies / companies.length) * 100) : 0
      }
    },
    companyStatusOptions () {
      return [
        { value: '', text: this.$t('companies.filter.select_status') },
        { value: true, text: this.$t('common.is_active') },
        { value: false, text: this.$t('common.is_inactive') }
      ]
    },
    companyAttributeOptions () {
      return [
        { value: 'is_pod_manufacturer', text: this.$t('companies.company_attribute.is_pod_manufacturer') },
        { value: 'is_brand', text: this.$t('companies.company_attribute.is_brand') },
        { value: 'is_channel_partner', text: this.$t('companies.company_attribute.is_channel_partner') },
        { value: 'is_enduser', text: this.$t('companies.company_attribute.is_enduser') }
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
    enduserKind: {
      get () {
        if (this.companyForm.is_household) return 'household'
        if (this.companyForm.is_school) return 'school'
        return 'company'
      },
      set (value) {
        this.companyForm.is_household = value === 'household'
        this.companyForm.is_school = value === 'school'
      }
    },
    enduserKindOptions () {
      return [
        { value: 'company', text: this.$t('companies.company_attribute.enterprise') },
        { value: 'household', text: this.$t('companies.company_attribute.is_household') },
        { value: 'school', text: this.$t('companies.company_attribute.is_school') }
      ]
    },
    companyTableFields () {
      const fieldConfig = {
        short_name: { key: 'short_name', label: this.$t('companies.table.company_name'), thStyle: { minWidth: '190px' }, sortable: true },
        company_name: { key: 'company_name', label: this.$t('companies.table.company_name'), thStyle: { minWidth: '110px' }, sortable: true },
        company_code: { key: 'company_code', label: this.$t('companies.table.company_code'), thStyle: { minWidth: '100px' }, sortable: true },
        company_type: { key: 'company_type', label: this.$t('companies.table.company_type'), thStyle: { minWidth: '110px' }, sortable: true },
        company_attributes: { key: 'company_attributes', label: this.$t('companies.table.company_attributes'), thStyle: { minWidth: '140px' }, sortable: true },
        contact_person: { key: 'contact_person', label: this.$t('companies.table.contact_person'), thStyle: { width: '100px' }, sortable: true },
        contact_email: { key: 'contact_email', label: this.$t('companies.table.contact_email'), thStyle: { minWidth: '140px' }, sortable: true },
        contact_phone: { key: 'contact_phone', label: this.$t('companies.table.contact_phone'), thStyle: { width: '120px' }, sortable: true },
        address: { key: 'address', label: this.$t('companies.table.address'), thStyle: { minWidth: '150px' }, sortable: true },
        login_entry: { key: 'login_entry', label: this.$t('companies.table.login_entry'), thStyle: { minWidth: '240px' } },
        slogan: { key: 'slogan', label: this.$t('companies.table.slogan'), thStyle: { minWidth: '160px' }, sortable: true },
        is_active: { key: 'is_active', label: this.$t('companies.table.is_active'), thStyle: { minWidth: '80px' }, sortable: true },
        created_at: { key: 'created_at', label: this.$t('companies.table.created_at'), thStyle: { minWidth: '160px' }, sortable: true }
      }

      const visibleFields = this.companyColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])

      return [
        ...visibleFields,
        { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  watch: {
    'companyQuery.page_size' () {
      this.companyQuery.page = 1
      this.fetchCompanyData()
    },
    // 浏览器前�?后退：URL 变了同步�?this.companyQuery.* 并重新拉数据
    $route (to, from) {
      if (to.path !== from.path) return
      const before = JSON.stringify(this.companyQuery)
      this._restoreQueryFromUrl()
      if (JSON.stringify(this.companyQuery) !== before) {
        this.fetchCompanyData({ skipUrlSync: true })
      }
    },
    // 公司表单变化时标�?dirty（unsavedGuard mixin 用）
    companyForm: {
      deep: true,
      handler () {
        if (this.showCompanyDialog) {
          this.formDirtyFlag = true
        }
      }
    },
    showCompanyDialog (val) {
      if (!val) {
        this.formDirtyFlag = false
      } else {
        this.$nextTick(() => { this.formDirtyFlag = false })
      }
    }
  },
  created () {
    this.companyColumns = this.buildCompanyColumns()
    // 进入页面：先�?URL query 写回 this.companyQuery.*，再发起请求，避免刷新丢状�?
    this._restoreQueryFromUrl()
    this.fetchCompanyData()
  },
  methods: {
    buildCompanyColumns () {
      return [
        { prop: 'short_name', label: this.$t('companies.table.short_name'), visible: true },
        { prop: 'company_name', label: this.$t('companies.table.company_name'), visible: false },
        { prop: 'company_code', label: this.$t('companies.table.company_code'), visible: true },
        { prop: 'company_type', label: this.$t('companies.table.company_type'), visible: true },
        { prop: 'company_attributes', label: this.$t('companies.table.company_attributes'), visible: true },
        { prop: 'contact_person', label: this.$t('companies.table.contact_person'), visible: false },
        { prop: 'contact_email', label: this.$t('companies.table.contact_email'), visible: false },
        { prop: 'contact_phone', label: this.$t('companies.table.contact_phone'), visible: false },
        { prop: 'address', label: this.$t('companies.table.address'), visible: false },
        { prop: 'login_entry', label: this.$t('companies.table.login_entry'), visible: true },
        { prop: 'slogan', label: this.$t('companies.table.slogan'), visible: false },
        { prop: 'is_active', label: this.$t('companies.table.is_active'), visible: true },
        { prop: 'created_at', label: this.$t('companies.table.created_at'), visible: true }
      ]
    },
    // unsavedGuard mixin 接入：仅在公司编辑弹�?+ 表单脏时拦截
    isFormDirty () {
      return this.showCompanyDialog && this.formDirtyFlag === true
    },

    // �?URL query 写回�?this.companyQuery.*（按字段类型推断�?
    _restoreQueryFromUrl () {
      const q = this.$route.query || {}
      QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const cur = this.companyQuery[field]
        if (typeof cur === 'number') {
          const n = parseInt(v, 10)
          if (!Number.isNaN(n)) this.companyQuery[field] = n
        } else if (field === 'is_active') {
          // is_active 默认 ''，但 URL 上回写时要还原成 boolean，保持与 select 选项一�?
          if (v === 'true') this.companyQuery[field] = true
          else if (v === 'false') this.companyQuery[field] = false
          else this.companyQuery[field] = ''
        } else {
          this.companyQuery[field] = v
        }
      })
    },
    // �?this.companyQuery.* 写回 URL（默认�?/ 空值不写入避免污染�?
    _syncQueryToUrl () {
      const next = {}
      QUERY_FIELDS.forEach(field => {
        const v = this.companyQuery[field]
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
    // 搜索框输�?300ms 防抖，自动回到首页并重新拉数�?
    onSearchInput: debounce(function () {
      this.companyQuery.page = 1
      this.fetchCompanyData()
    }, 300),

    async fetchCompanyData (opts = {}) {
      // 拉数据前同步 URL（路由触发的 fetch 跳过避免循环�?
      if (!opts.skipUrlSync) {
        this._syncQueryToUrl()
      }
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.companyLoading = true
      this.companyLoadError = ''
      try {
        // 调用真实 API
        const params = {
          page: this.companyQuery.page,
          page_size: this.companyQuery.page_size
        }

        if (this.companyQuery.keyword) {
          params.keyword = this.companyQuery.keyword
        }

        if (this.companyQuery.is_active === false || this.companyQuery.is_active) {
          params.is_active = this.companyQuery.is_active
        }

        const response = await fetchCompanies(params)
        if (reqId !== this._listReqId) return

        // API 返回格式可能�?{ items, total } 或直接返回数�?
        const items = response.items || response.data || response
        const total = (response.total !== undefined && response.total !== null) ? response.total : items.length

        this.companyData = items
        this.companyTotal = total

        this.companyTreeData = items
      } catch (error) {
        if (reqId !== this._listReqId) return
        const msg = this.$getErrorMessage(error) || this.$t('companies.toast.load_failed')
        this.companyLoadError = msg
        this.$uiToast.error(msg)
      } finally {
        if (reqId === this._listReqId) this.companyLoading = false
      }
    },

    handlePageChange (page) {
      this.companyQuery.page = page
      this.fetchCompanyData()
    },
    handleCompanySearch () {
      this.companyQuery.page = 1
      this.fetchCompanyData()
    },

    resetCompanyFilters () {
      this.companyQuery = { ...DEFAULT_QUERY }
      this.fetchCompanyData()
    },

    handleCompanyPageChange (page) {
      this.companyQuery.page = page
      this.fetchCompanyData()
    },

    handleCompanySizeChange (size) {
      this.companyQuery.page_size = size
      this.companyQuery.page = 1
      this.fetchCompanyData()
    },

    getCompanyTypeLabel (type) {
      const normalized = normalizeCompanyType(type)
      return normalized ? this.$t(`companies.company_type.${normalized}`) : type
    },
    companyInitial (company) {
      const name = company.short_name || company.company_name || ''
      return name.trim().charAt(0) || '-'
    },

    getCompanyTypeTag (type) {
      const map = {
        PF: 'primary',
        MF: 'success',
        BR: 'warning',
        CP: 'info',
        EU: ''
      }
      return map[normalizeCompanyType(type)] || ''
    },

    handleCompanyColumnsUpdate (updatedColumns) {
      this.companyColumns = updatedColumns
      // 强制表格重新渲染以更新列显示
      this.companyTableKey += 1
    },

    isColumnVisible (prop) {
      const column = this.companyColumns.find(col => col.prop === prop)
      return column ? column.visible : false
    },

    getLoginEntry (company) {
      return getCompanyLoginUrl(company)
    },

    getLoginEntryLabel (company) {
      return getCompanyLoginUrl(company)
    },

    async copyLoginEntry (company) {
      try {
        await copyText(this.getLoginEntry(company))
        this.$uiToast.success(this.$t('companies.toast.login_entry_copied'))
      } catch (error) {
        this.$uiToast.error(this.$t('companies.toast.login_entry_copy_failed'))
      }
    },

    viewCompanyDetail (row) {
      this.$router.push(`/org/companies/${row.uuid}`)
    },

    resetCompanyForm () {
      this.createdCompanyPendingInvite = null
      this.companyForm = {
        company_name: '',
        short_name: '',
        company_type: '',
        domain: '',
        slogan: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        companyAttributes: [],
        businessType: 'pod',
        is_household: false,
        is_school: false,
        pod_usage: null,
        admin_email: '',
        admin_display_name: ''
      }
      this.companyErrors = {}
    },

    // 处理公司属性变化：最终用户不能和其他属性同时选择
    handleCompanyAttributesChange (values) {
      const isEnduserSelected = values.includes('is_enduser')
      const otherAttributes = ['is_pod_manufacturer', 'is_brand', 'is_channel_partner']

      if (isEnduserSelected) {
        // 如果选择了最终用户，检查是否还选择了其他属�?
        const hasOtherSelected = otherAttributes.some(attr => values.includes(attr))
        if (hasOtherSelected) {
          this.$uiToast.warning(this.$t('companies.toast.enduser_conflict'))
          this.companyForm.companyAttributes = ['is_enduser']
        }
      } else {
        // 如果选择了其他属性，确保没有选择最终用户（这种情况理论上不会发生，但作为保护）
        // 这里不需要额外处理，因为 is_enduser 不在 values �?
      }
      const finalValues = this.companyForm.companyAttributes
      const finalIsEnduser = finalValues.includes('is_enduser')
      if (!finalIsEnduser) {
        this.companyForm.is_household = false
        this.companyForm.is_school = false
        this.companyForm.pod_usage = null
      }
    },

    companyFieldState (field) {
      if (!(field in this.companyErrors)) {
        return null
      }
      return !this.companyErrors[field]
    },

    validateCompanyForm () {
      const errors = {}

      if (!this.createdCompanyPendingInvite && !this.companyForm.company_name) {
        errors.company_name = this.$t('companies.validation.company_name_required')
      }
      if (!this.createdCompanyPendingInvite && !this.companyForm.short_name) {
        errors.short_name = this.$t('companies.validation.short_name_required')
      }
      if (!this.createdCompanyPendingInvite && this.companyForm.domain && !normalizeCompanyLoginUrl(this.companyForm.domain)) {
        errors.domain = this.$t('companies.validation.domain_invalid')
      }
      if (!this.createdCompanyPendingInvite && !this.companyForm.companyAttributes.length) {
        errors.companyAttributes = this.$t('companies.validation.company_attribute_required')
      }
      if (!this.createdCompanyPendingInvite && this.companyForm.companyAttributes.includes('is_enduser') && !this.companyForm.pod_usage) {
        errors.pod_usage = this.$t('companies.validation.pod_usage_required')
      }
      if (!this.companyForm.admin_email) {
        errors.admin_email = this.$t('companies.create_dialog.admin_email_required')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.companyForm.admin_email)) {
        errors.admin_email = this.$t('companies.create_dialog.admin_email_invalid')
      }
      if (!this.companyForm.admin_display_name) {
        errors.admin_display_name = this.$t('companies.create_dialog.admin_name_required')
      }

      this.companyErrors = errors
      return Object.keys(errors).length === 0
    },

    handleCreateCompanyModalOk (event) {
      event.preventDefault()
      this.createCompany()
    },

    async createCompany () {
      if (!this.validateCompanyForm()) {
        return
      }

      this.companyCreating = true
      let submitData = null
      try {
        let createdCompany = this.createdCompanyPendingInvite
        if (!createdCompany) {
          // 公司创建成功后立即保留返回对象；邀请失败后的重试不得重复创建公司。
          submitData = {
            company_name: this.companyForm.company_name,
            short_name: this.companyForm.short_name,
            is_pod_manufacturer: this.companyForm.companyAttributes.includes('is_pod_manufacturer'),
            is_brand: this.companyForm.companyAttributes.includes('is_brand'),
            is_channel_partner: this.companyForm.companyAttributes.includes('is_channel_partner'),
            is_enduser: this.companyForm.companyAttributes.includes('is_enduser'),
            is_household: this.companyForm.is_household,
            is_school: this.companyForm.is_school,
            pod_usage: this.companyForm.companyAttributes.includes('is_enduser') ? this.companyForm.pod_usage : null
          }

          if (this.companyForm.domain) submitData.domain = normalizeCompanyLoginUrl(this.companyForm.domain)
          if (this.companyForm.slogan) submitData.slogan = this.companyForm.slogan
          if (this.companyForm.contact_person) submitData.contact_person = this.companyForm.contact_person
          if (this.companyForm.contact_email) submitData.contact_email = this.companyForm.contact_email
          if (this.companyForm.contact_phone) submitData.contact_phone = this.companyForm.contact_phone
          createdCompany = await createCompany(submitData)
          this.createdCompanyPendingInvite = createdCompany
        }

        try {
          await createInvitation({
            email: this.companyForm.admin_email,
            display_name: this.companyForm.admin_display_name,
            company_id: createdCompany.id,
            role: 'admin'
          })
        } catch (error) {
          await this.fetchCompanyData()
          const detail = this.$getErrorMessage(error) || this.$t('companies.toast.company_create_failed')
          this.$uiToast.error(this.$t('companies.create_dialog.company_created_invite_failed', { detail }))
          return
        }

        this.$uiToast.success(this.$t('companies.create_dialog.create_and_invite_success'))
        this.formDirtyFlag = false
        this.showCompanyDialog = false

        await this.fetchCompanyData()
        await this.refreshUserInfo()
      } catch (error) {
        const errorMsg = this.$getErrorMessage(error) || this.$t('companies.toast.company_create_failed')
        this.$uiToast.error(errorMsg)

        if (error.response?.data?.errors) {
          const errors = error.response.data.errors
          Object.keys(errors).forEach(key => {
            this.$uiToast.error(`${key}: ${errors[key].join(', ')}`)
          })
        }
      } finally {
        this.companyCreating = false
      }
    },

    async refreshUserInfo () {
      // 刷新用户信息并更�?JWT token（更�?allowed_companies�?
      try {
        // 1. 调用刷新 token API，获取包含最�?allowed_companies 的新 token
        const tokenResp = await getRefreshToken()
        if (tokenResp && tokenResp.access_token) {
          // 2. 更新 localStorage 中的 token
          localStorage.setItem('token', tokenResp.access_token)

          // 3. 获取最新用户信�?
          const userResp = await getCurrentUser()
          if (userResp) {
            // 4. 更新 localStorage 中的用户信息
            persistCurrentUser(userResp)

            // 5. 刷新列表
            await this.fetchCompanyData()
          }
        }
      } catch (error) {

        // 不阻断主流程，只记录错误
      }
    },

    formatDate (dateString) {
      return formatDateUtil(dateString)
    },

    // 查看公司变更日志
    async viewCompanyLogs (row) {
      this.logLoading = false
      this.currentLogData = null
      this.logDialogVisible = true

      // 直接使用列表中的 change_log 数据
      if (row.change_log) {
        this.currentLogData = row.change_log
      } else {
        // 如果没有 change_log 数据，显示提�?
        this.$uiToast.info(this.$t('companies.expand.no_log'))
        this.currentLogData = {
          changes: [],
          current: {
            company_name: row.company_name,
            company_code: row.company_code,
            is_active: row.is_active
          }
        }
      }
    },

    // 关闭日志对话�?
    handleLogClose () {
      // 可以在这里添加关闭后的清理逻辑
    }
  },
  beforeDestroy () {
    // 清理定时�?
    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
    }
  }
}
</script>
