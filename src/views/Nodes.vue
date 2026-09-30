<template>
  <!-- 节点管理：列表 + 创建 + 绑定 -->
  <div class="nodes">
    <manual-device-entry-notice />
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <!-- 搜索过滤 -->
        <b-form class="nodes__filters" @submit.prevent="handleSearch">
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="query.search"
                class="filter-control"
                :placeholder="$t('nodes.filters.search_placeholder')"
                @input="onSearchInput"
                @keyup.enter="handleSearch"
              />
              <base-select
                v-model="query.status"
                class="filter-control"
                :options="statusOptions"
                @input="handleSearch"
              />
              <base-select
                v-model="query.is_active"
                class="filter-control"
                :options="activeOptions"
                @input="handleSearch"
              />
              <div class="filter-actions">
                <base-button v-if="canCreate()" @click="openCreateDialog">
                  <app-icon name="plus" />
                  {{ $t('device_enrollment.manual_entry.action') }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
      </template>

      <!-- 节点列表 -->
      <base-table :items="tableData" :fields="visibleTableFields" :loading="loading" :load-error="loadError" bordered @retry="fetchData">
        <template #cell(status)="data">
          <base-badge :variant="statusTagType(data.item.status)">
            {{ statusLabel(data.item.status) }}
          </base-badge>
        </template>
        <template #cell(last_seen)="data">
          {{ formatDateTime(data.item.last_seen) }}
        </template>
        <template #cell(is_active)="data">
          <base-badge :variant="data.item.is_active ? 'success' : 'secondary'">
            {{ data.item.is_active ? $t('nodes.active_status.active') : $t('nodes.active_status.inactive') }}
          </base-badge>
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility
              :columns="nodeColumns"
              :table-key="'nodes-table'"
              @update:columns="handleNodeColumnsUpdate"
            />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button @click="viewDetail(data.item)" :title="$t('nodes.actions.view_detail')"> <app-icon name="eye"  /> <span>{{ $t('nodes.actions.view_detail') }}</span> </base-action-button>
          <base-action-button @click="viewLogs(data.item)" :title="$t('nodes.actions.view_logs')"> <app-icon name="journal-text"  /> <span>{{ $t('nodes.actions.view_logs') }}</span> </base-action-button>
          <b-dropdown
            right
            no-caret
            variant="link"
            class="action-overflow-menu"
            toggle-class="action-overflow-menu__toggle"
            :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.serial_no || data.item.uuid].filter(Boolean).join(' ') }"
          >
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button @click="checkFirmware(data.item)">
              <app-icon name="tools" aria-hidden="true" /> {{ $t('nodes.actions.check_firmware') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="data.item.is_active && canShipHost() && !data.item.shipped_at && !data.item.manufacturer_id" @click="showShipDialog(data.item)">
              <app-icon name="truck" aria-hidden="true" /> {{ $t('nodes.actions.ship_to_factory') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="canRetireDevice(data.item)" class="text-danger" @click="confirmRetire(data.item)">
              <app-icon name="archive" aria-hidden="true" /> {{ $t('common.retire') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="canRestoreDevice(data.item)" @click="confirmRestore(data.item)">
              <app-icon name="arrow-counterclockwise" aria-hidden="true" /> {{ $t('common.restore') }}
            </b-dropdown-item-button>
          </b-dropdown>
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

    <!-- 出货给厂家对话框 -->
    <base-modal
      id="nodes-ship-modal"
      v-model="shipDialogVisible"
      :title="$t('nodes.ship_dialog.title')"
      :ok-title="$t('nodes.ship_dialog.ok_title')"
      :cancel-title="$t('nodes.ship_dialog.cancel_title')"
      :busy="shipping"
      :ok-disabled="shipping"
      @hidden="resetShipForm"
      @ok="handleShipModalOk"
      modal-class="model-el dialog-with-header-bg"
    >
      <base-form-group label-for="nodes-ship-target-company" :label="$t('nodes.ship_dialog.target_company_label')" required :state="shipFieldState('target_company_id')" :invalid-feedback="shipErrors.target_company_id">
        <base-select
          id="nodes-ship-target-company"
          v-model="shipForm.target_company_id"
          :options="companySelectOptions"
          :state="shipFieldState('target_company_id')"
        />
      </base-form-group>
    </base-modal>
    <!-- 创建节点对话框 -->
    <base-modal
      v-model="showCreateDialog"
      :title="$t('device_enrollment.manual_entry.action')"
      size="lg"
      :ok-title="$t('device_enrollment.manual_entry.action')"
      :cancel-title="$t('nodes.create_dialog.cancel_title')"
      :busy="creating"
      :ok-disabled="creating"
      @hidden="resetForm"
      @ok="handleCreateModalOk"
      modal-class="model-el dialog-with-header-bg" :centered="false" :scrollable="false"
    >
      <div class="text-muted mb-3">{{ $t('device_enrollment.manual_entry.description') }}</div>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="nodes-create-mac" :label="$t('nodes.create_dialog.mac_label')" required :state="createFieldState('mac_address')" :invalid-feedback="createErrors.mac_address">
            <base-input id="nodes-create-mac" v-model="form.mac_address" :placeholder="$t('nodes.create_dialog.mac_placeholder')" :state="createFieldState('mac_address')" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="nodes-create-product-code" :label="$t('nodes.create_dialog.product_code_label')">
            <base-input id="nodes-create-product-code" v-model="form.product_code" :placeholder="$t('nodes.create_dialog.product_code_placeholder')" />
          </base-form-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="nodes-create-hn-model" :label="$t('nodes.create_dialog.hn_model_label')" required :state="createFieldState('hn_model_id')" :invalid-feedback="createErrors.hn_model_id">
            <base-select
              id="nodes-create-hn-model"
              v-model="form.hn_model_id"
              :options="hardwareModelSelectOptions"
              :state="createFieldState('hn_model_id')"
            />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="nodes-create-sw-ver" :label="$t('nodes.create_dialog.sw_ver_label')">
            <base-input id="nodes-create-sw-ver" v-model="form.sw_ver" :placeholder="$t('nodes.create_dialog.sw_ver_placeholder')" />
          </base-form-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="nodes-create-hw-ver" :label="$t('nodes.create_dialog.hw_ver_label')">
            <base-input id="nodes-create-hw-ver" v-model="form.hw_ver" :placeholder="$t('nodes.create_dialog.hw_ver_placeholder')" />
          </base-form-group>
        </b-col>
      </b-row>
      <base-form-group label-for="nodes-create-remark" :label="$t('nodes.create_dialog.remark_label')">
        <base-textarea
          id="nodes-create-remark"
          v-model="form.remark"
          :rows="3"
          :placeholder="$t('nodes.create_dialog.remark_placeholder')"
        />
      </base-form-group>
    </base-modal>

    <!-- 变更日志对话框 -->
    <ChangeLogDialog
      :visible.sync="logDialogVisible"
      :loading="logLoading"
      :change-log="currentLogData"
    />
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import ManualDeviceEntryNotice from '@/components/ManualDeviceEntryNotice.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import rolePermission from '@/mixins/rolePermission'
import localizedColumns from '@/mixins/localizedColumns'
import { fetchNodes, fetchNodeDetail, createNode, fetchHnModels, checkNodeFirmware, shipNode, retireNode, restoreNode } from '@/api'
import { normalizeImageUrl as normalizeImageUrlHelper } from '@/utils/imageUrlHelper'
import { debounce } from '@/utils/debounce'
import { formatDate } from '@/utils/format'
import { hasPermission, PERMISSION } from '@/utils/permission'

// URL query 持久化字段（与 query 对象同名）。默认值不写 URL。
const URL_QUERY_FIELDS = ['page', 'page_size', 'search', 'status', 'is_active']
const URL_QUERY_DEFAULTS = { page: 1, page_size: 10, search: '', status: '', is_active: '' }

export default {
  name: 'Nodes',
  permissionCapabilities: {
    create: PERMISSION.PLATFORM_DEVICE_MANAGE,
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BasePagination,
    BaseSelect,
    BaseTextarea,
    ColumnVisibility,
    ChangeLogDialog,
    ManualDeviceEntryNotice,
    ListPageCard
  },
  mixins: [rolePermission, localizedColumns],
  localizedColumns: { nodeColumns: 'buildNodeColumns' },
  data () {
    return {
      loading: false,
      loadError: '',
      creating: false,
      showCreateDialog: false,
      total: 0,
      tableData: [],
      nodeTypeOptions: [],
      hardwareModelOptions: [],
      query: {
        page: 1,
        page_size: 10,
        search: '',
        status: '',
        is_active: ''
      },
      form: {
        serial_number: '',
        mac_address: '',
        hn_model_id: '',
        hw_ver: '',
        sw_ver: '1.0.0',
        product_code: '',
        remark: ''
      },
      createErrors: {},
      nodeColumns: [
        { prop: 'serial_number', label: '', visible: true },
        { prop: 'mac_address', label: '', visible: true },
        { prop: 'hn_model_name', label: '', visible: true },
        { prop: 'hw_ver', label: '', visible: true },
        { prop: 'sw_ver', label: '', visible: true },
        { prop: 'manufacturer_name', label: '', visible: true },
        { prop: 'status', label: '', visible: false },
        // { prop: 'can_node_id', label: 'CAN 地址', visible: true },
        { prop: 'last_seen', label: '', visible: false },
        { prop: 'is_active', label: '', visible: true }
      ],
      // 出货相关
      shipDialogVisible: false,
      shipping: false,
      shipForm: {
        uuid: '',
        target_company_id: ''
      },
      shipErrors: {},
      companyOptions: [],

      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null
    }
  },
  computed: {
    statusOptions () {
      return [
        { value: '', text: this.$t('nodes.status_options.all') },
        { value: 'online', text: this.$t('nodes.status_options.online') },
        { value: 'offline', text: this.$t('nodes.status_options.offline') }
      ]
    },
    activeOptions () {
      return [
        { value: '', text: this.$t('nodes.active_options.all') },
        { value: true, text: this.$t('nodes.active_options.active') },
        { value: false, text: this.$t('nodes.active_options.inactive') }
      ]
    },
    companySelectOptions () {
      return [
        { value: '', text: this.$t('nodes.ship_dialog.company_placeholder') },
        ...this.companyOptions.map(company => ({
          value: company.id,
          text: company.company_name
        }))
      ]
    },
    hardwareModelSelectOptions () {
      return [
        { value: '', text: this.$t('nodes.create_dialog.hn_model_placeholder') },
        ...this.hardwareModelOptions.map(model => ({
          value: model.uuid || model.id,
          text: model.model_name
        }))
      ]
    },
    visibleTableFields () {
      const fieldConfig = {
        serial_number: { key: 'serial_no', label: this.$t('nodes.table.serial_number'), thStyle: { minWidth: '140px' } },
        hn_model_name: { key: 'hn_model_name', label: this.$t('nodes.table.hn_model_name'), thStyle: { minWidth: '160px' } },
        mac_address: { key: 'mac_address', label: this.$t('nodes.table.mac_address'), thStyle: { minWidth: '160px' } },
        hw_ver: { key: 'hw_ver', label: this.$t('nodes.table.hw_ver'), thStyle: { minWidth: '120px' } },
        manufacturer_name: { key: 'manufacturer_name', label: this.$t('nodes.table.manufacturer_name'), thStyle: { minWidth: '180px' } },
        sw_ver: { key: 'sw_ver', label: this.$t('nodes.table.sw_ver'), thStyle: { minWidth: '120px' } },
        status: { key: 'status', label: this.$t('nodes.table.status'), thStyle: { width: '110px' } },
        last_seen: { key: 'last_seen', label: this.$t('nodes.table.last_seen'), thStyle: { minWidth: '180px' } },
        is_active: { key: 'is_active', label: this.$t('nodes.table.is_active'), thStyle: { minWidth: '110px' } }
      }

      const visibleFields = this.nodeColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    }
  },
  created () {
    this.nodeColumns = this.buildNodeColumns()
    this._restoreFromUrl()
    this.fetchData()
    this.loadOptions()
    this.fetchCompanyOptions()
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
    }
  },
  methods: {
    async openCreateDialog () {
      await this.loadOptions()
      this.showCreateDialog = true
    },
    canRetireDevice (row) {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser) && row?.is_active === true
    },
    canRestoreDevice (row) {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser) && row?.is_active === false
    },
    async confirmRetire (row) {
      const confirmed = await this.$uiConfirm(`${this.$t('common.retire')}: ${row.serial_no || row.uuid}`, {
        title: this.$t('common.confirm'),
        okVariant: 'danger',
        okTitle: this.$t('common.confirm'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await retireNode(row.uuid)
        this.$uiToast.success(this.$t('common.operation_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    async confirmRestore (row) {
      const confirmed = await this.$uiConfirm(`${this.$t('common.restore')}: ${row.serial_no || row.uuid}`, {
        title: this.$t('common.confirm'),
        okTitle: this.$t('common.restore'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await restoreNode(row.uuid)
        this.$uiToast.success(this.$t('common.operation_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    canCreate () {
      try {
        return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser)
      } catch (error) {
        return false
      }
    },
    buildNodeColumns () {
      return [
        { prop: 'serial_number', label: this.$t('nodes.table.serial_number'), visible: true },
        { prop: 'mac_address', label: this.$t('nodes.table.mac_address'), visible: true },
        { prop: 'hn_model_name', label: this.$t('nodes.table.hn_model_name'), visible: true },
        { prop: 'hw_ver', label: this.$t('nodes.table.hw_ver'), visible: true },
        { prop: 'sw_ver', label: this.$t('nodes.table.sw_ver'), visible: true },
        { prop: 'manufacturer_name', label: this.$t('nodes.table.manufacturer_name'), visible: true },
        { prop: 'status', label: this.$t('nodes.table.status'), visible: false },
        { prop: 'last_seen', label: this.$t('nodes.table.last_seen'), visible: false },
        { prop: 'is_active', label: this.$t('nodes.table.is_active'), visible: true }
      ]
    },
    async fetchData () {
      this._syncToUrl()
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }

        if (this.query.search) {
          params.search = this.query.search
        }

        if (this.query.status) {
          params.status = this.query.status
        }

        if (this.query.is_active !== '') {
          params.is_active = this.query.is_active
        }

        const response = await fetchNodes(params)
        if (reqId !== this._listReqId) return

        const items = response.items || response.data || response
        const total = response.total || items.length

        this.tableData = items
        this.total = total
      } catch (error) {
        if (reqId !== this._listReqId) return
        const msg = this.$getErrorMessage(error) || this.$t('nodes.toast.load_failed')
        this.loadError = msg
        this.$uiToast.error(msg)
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },
    async loadOptions () {
      try {
        // 加载硬件型号（只加载节点型号）
        const includeSample = this.isPlatformAdmin()
        const modelsResponse = await fetchHnModels({
          is_host: false,
          status: includeSample ? undefined : 'active',
          page: 1,
          page_size: 200
        })
        const items = modelsResponse.items || modelsResponse.data || modelsResponse || []
        const allowedStatuses = includeSample ? ['sample', 'active'] : ['active']

        this.hardwareModelOptions = items.filter(model => allowedStatuses.includes(model.status))
      } catch (error) {
        this.$uiToast.error(this.$t('nodes.toast.load_hw_failed'))
      }
    },
    handleSearch () {
      this.query.page = 1
      this.fetchData()
    },
    onSearchInput: debounce(function () {
      this.query.page = 1
      this.fetchData()
    }, 300),
    // 从 URL query 恢复筛选条件，进入页面/前进后退时调用
    _restoreFromUrl () {
      const q = this.$route.query || {}
      URL_QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const def = URL_QUERY_DEFAULTS[field]
        // 数值字段（page / page_size）转 int，保留默认值兜底
        if (typeof def === 'number') {
          const n = parseInt(v, 10)
          this.query[field] = Number.isNaN(n) ? def : n
        } else {
          // 字符串字段：is_active 是 'true'/'false' 字符串，业务侧用 truthy 判断 OK
          this.query[field] = v
        }
      })
    },
    // 把当前 query 写回 URL（默认值不写，避免 ?page=1&page_size=10 污染）
    _syncToUrl () {
      const next = {}
      URL_QUERY_FIELDS.forEach(field => {
        const v = this.query[field]
        const def = URL_QUERY_DEFAULTS[field]
        if (v === '' || v === null || v === undefined) return
        if (v === def) return
        next[field] = String(v)
      })
      const cur = this.$route.query || {}
      const sameKeys = Object.keys(cur).sort().join(',') === Object.keys(next).sort().join(',')
      const sameValues = sameKeys && Object.keys(next).every(k => cur[k] === next[k])
      if (sameValues) return
      this.$router.replace({ query: next }).catch(() => {})
    },
    resetFilters () {
      this.query = {
        page: 1,
        page_size: 10,
        search: '',
        status: '',
        is_active: ''
      }
      this.fetchData()
    },
    handlePageChange (page) {
      this.query.page = page
      this.fetchData()
    },
    handleSizeChange (size) {
      this.query.page_size = size
      this.query.page = 1
      this.fetchData()
    },
    handleNodeColumnsUpdate (updatedColumns) {
      this.nodeColumns = updatedColumns
    },
    statusLabel (status) {
      const map = {
        online: this.$t('nodes.status_label.online'),
        offline: this.$t('nodes.status_label.offline'),
        maintenance: this.$t('nodes.status_label.maintenance')
      }
      return map[status] || status
    },
    statusTagType (status) {
      if (status === 'online') return 'success'
      if (status === 'maintenance') return 'warning'
      if (status === 'offline') return 'info'
      return 'info'
    },
    formatDateTime (dateString) {
      return formatDate(dateString)
    },
    normalizeImageUrl (url) {
      return normalizeImageUrlHelper(url)
    },
    viewDetail (row) {
      this.$router.push(`/devices/nodes/${row.uuid}`)
    },
    async viewLogs (row) {
      this.logLoading = true
      this.currentLogData = null
      this.logDialogVisible = true
      try {
        const detail = await fetchNodeDetail(row.uuid)
        this.currentLogData = detail.change_log || { changes: [], current: { is_active: detail.is_active } }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('nodes.toast.load_failed'))
      } finally {
        this.logLoading = false
      }
    },
    async checkFirmware (row) {
      try {
        const result = await checkNodeFirmware(row.uuid)
        if (result.has_update) {
          this.$uiToast.warning(`${this.$t('nodes.actions.check_firmware')}: ${result.current_version || '-'} → ${result.latest_version}`)
        } else {
          this.$uiToast.success(this.$t('nodes.toast.firmware_latest'))
        }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('nodes.toast.firmware_check_failed'))
      }
    },

    resetForm () {
      this.form = {
        // serial_number: '',
        mac_address: '',
        hn_model_id: '',
        hw_ver: '',
        sw_ver: '1.0.0',
        product_code: '',
        remark: ''
      }
      this.createErrors = {}
    },
    createFieldState (field) {
      if (!(field in this.createErrors)) {
        return null
      }
      return !this.createErrors[field]
    },
    validateCreateForm () {
      const errors = {}
      if (!this.form.mac_address) {
        errors.mac_address = this.$t('nodes.validate.mac_required')
      } else if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(this.form.mac_address)) {
        errors.mac_address = this.$t('hosts.validation.mac_format')
      }
      if (!this.form.hn_model_id) {
        errors.hn_model_id = this.$t('nodes.validate.hn_model_required')
      }
      this.createErrors = errors
      return Object.keys(errors).length === 0
    },
    handleCreateModalOk (event) {
      event.preventDefault()
      this.createNode()
    },
    async createNode () {
      if (!this.validateCreateForm()) {
        return
      }

      this.creating = true
      try {
        const submitData = {
          mac_address: this.form.mac_address.toUpperCase(),
          hn_model_id: this.form.hn_model_id,
          hw_ver: this.form.hw_ver,
          sw_ver: this.form.sw_ver,
          product_code: this.form.product_code,
          remark: this.form.remark
        }

        await createNode(submitData)
        this.$uiToast.success(this.$t('nodes.toast.create_success'))
        this.showCreateDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('nodes.toast.create_failed'))
      } finally {
        this.creating = false
      }
    },

    // 出货相关方法
    async fetchCompanyOptions () {
      try {
        const { fetchCompanies } = await import('@/api')
        const items = []
        let page = 1
        let total = 0
        do {
          const response = await fetchCompanies({ page, page_size: 200 })
          const pageItems = response.items || response.data || response || []
          items.push(...pageItems)
          total = response.total === undefined ? items.length : response.total
          page += 1
        } while (items.length < total)
        // 过滤出厂家类型的公司
        this.companyOptions = items
          .filter(item => item.is_pod_manufacturer && item.is_active !== false)
          .map(item => ({
            id: item.id,
            company_name: item.company_name
          }))
      } catch (error) {
        this.companyOptions = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.load_failed'))
      }
    },

    showShipDialog (row) {
      this.shipForm = {
        uuid: row.uuid || row.id,
        target_company_id: ''
      }
      this.shipErrors = {}
      this.shipDialogVisible = true
    },

    resetShipForm () {
      this.shipForm = {
        uuid: '',
        target_company_id: ''
      }
      this.shipErrors = {}
    },
    shipFieldState (field) {
      if (!(field in this.shipErrors)) {
        return null
      }
      return !this.shipErrors[field]
    },
    validateShipForm () {
      const errors = {}
      if (!this.shipForm.target_company_id) {
        errors.target_company_id = this.$t('nodes.validate.target_company_required')
      }
      this.shipErrors = errors
      return Object.keys(errors).length === 0
    },
    handleShipModalOk (event) {
      event.preventDefault()
      this.confirmShip()
    },
    async confirmShip () {
      if (!this.validateShipForm()) {
        return
      }

      this.shipping = true
      try {
        await shipNode(this.shipForm.uuid, {
          target_company_id: this.shipForm.target_company_id
        })

        this.$uiToast.success(this.$t('nodes.toast.ship_success'))
        this.shipDialogVisible = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('nodes.toast.ship_failed'))
      } finally {
        this.shipping = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/nodes.scss"></style>
