<template>
  <div class="hosts">
    <manual-device-entry-notice />
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="hosts__filters" @submit.prevent="handleSearch">
          <div class="filter-row">
            <div class="filter-left">
              <base-input
                v-model.trim="query.search"
                class="filter-control"
                :placeholder="$t('hosts.filter.search_placeholder')"
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
              <base-select
                v-model="query.sort"
                class="filter-control"
                :options="sortOptions"
                @input="handleSearch"
              />
              <div class="filter-actions">
                <base-button v-if="canCreate()" @click="openCreateDialog">
                  <app-icon name="controller-host-add" />
                  {{ $t('device_enrollment.manual_entry.action') }}
                </base-button>
              </div>
            </div>
          </div>
        </b-form>
      </template>

      <base-table
        :items="tableData"
        :fields="visibleTableFields"
        :loading="loading"
        :load-error="loadError"
        bordered
        @retry="fetchData"
      >
        <template #cell(status)="data">
          <div class="host-status-badges">
            <base-badge :variant="statusTagType(data.item.status)">
              {{ statusLabel(data.item.status) }}
            </base-badge>
            <base-badge v-if="data.item.topology_pending" variant="warning">
              {{ $t('hosts.status.topology_pending') }}
            </base-badge>
          </div>
        </template>
        <template #cell(last_seen)="data">
          {{ formatDateTime(data.item.last_seen) }}
        </template>
        <template #cell(is_active)="data">
          <base-badge :variant="data.item.is_active ? 'success' : 'secondary'">
            {{ $t(data.item.is_active ? 'hosts.status.active' : 'hosts.status.inactive') }}
          </base-badge>
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility
              :columns="hostColumns"
              :table-key="'hosts-table'"
              @update:columns="handleHostColumnsUpdate"
            />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button @click="viewDetail(data.item)" :title="$t('common.detail')"> <app-icon name="eye"  /> <span>{{ $t('common.detail') }}</span> </base-action-button>
          <base-action-button @click="viewLogs(data.item)" :title="$t('hosts.actions.view_logs')"> <app-icon name="journal-text"  /> <span>{{ $t('hosts.actions.view_logs') }}</span> </base-action-button>
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
              <app-icon name="tools" aria-hidden="true" /> {{ $t('hosts.actions.check_firmware') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="data.item.is_active && canShipHost() && !data.item.shipped_at && !data.item.manufacturer_id" @click="showShipDialog(data.item)">
              <app-icon name="truck" aria-hidden="true" /> {{ $t('hosts.actions.ship') }}
            </b-dropdown-item-button>
            <b-dropdown-item-button v-if="canConfirmReceipt(data.item)" @click="confirmReceipt(data.item)">
              <app-icon name="check-circle" aria-hidden="true" /> {{ $t('hosts.actions.confirm_receipt') }}
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

    <base-modal
      id="hosts-ship-modal"
      v-model="shipDialogVisible"
      :title="$t('hosts.ship_dialog.title')"
      :ok-title="$t('hosts.ship_dialog.confirm_ok')"
      :cancel-title="$t('common.cancel')"
      :busy="shipping"
      :ok-disabled="shipping"
      @hidden="resetShipForm"
      @ok="handleShipModalOk"
      modal-class="model-el dialog-with-header-bg"
    >
      <base-alert variant="warning" class="mb-3">
        <div>
          <strong>{{ $t('hosts.ship_dialog.precheck_title') }}</strong>
          <ul class="mb-0 mt-2 pl-3">
            <li>{{ $t('hosts.ship_dialog.precheck_1') }}</li>
            <li>{{ $t('hosts.ship_dialog.precheck_2') }}</li>
            <li>{{ $t('hosts.ship_dialog.precheck_3') }}</li>
            <li>{{ $t('hosts.ship_dialog.precheck_4') }}</li>
          </ul>
        </div>
      </base-alert>

      <base-form-group label-for="hosts-ship-target-company" :label="$t('hosts.ship_dialog.target_company')" required :state="shipFieldState('target_company_id')" :invalid-feedback="shipErrors.target_company_id">
        <base-select
          id="hosts-ship-target-company"
          v-model="shipForm.target_company_id"
          :options="companySelectOptions"
          :state="shipFieldState('target_company_id')"
        />
      </base-form-group>
    </base-modal>

    <base-modal
      id="hosts-create-modal"
      v-model="showCreateDialog"
      :title="$t('device_enrollment.manual_entry.action')"
      size="lg"
      :ok-title="$t('device_enrollment.manual_entry.action')"
      :cancel-title="$t('common.cancel')"
      :busy="creating"
      :ok-disabled="creating"
      @hidden="resetCreateForm"
      @ok="handleCreateModalOk"
      modal-class="model-el dialog-with-header-bg"
    >
      <div class="text-muted mb-3">{{ $t('device_enrollment.manual_entry.description') }}</div>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="hosts-create-hw-ver" :label="$t('hosts.form.hw_ver')" required :state="createFieldState('hw_ver')" :invalid-feedback="createErrors.hw_ver">
            <base-input id="hosts-create-hw-ver" v-model="createForm.hw_ver" :placeholder="$t('hosts.form.hw_ver_placeholder')" :state="createFieldState('hw_ver')" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="hosts-create-sw-ver" :label="$t('hosts.form.sw_ver')" required :state="createFieldState('sw_ver')" :invalid-feedback="createErrors.sw_ver">
            <base-input id="hosts-create-sw-ver" v-model="createForm.sw_ver" :placeholder="$t('hosts.form.sw_ver_placeholder')" :state="createFieldState('sw_ver')" />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="hosts-create-product-code" :label="$t('hosts.form.product_code')" required :state="createFieldState('product_code')" :invalid-feedback="createErrors.product_code">
            <base-input id="hosts-create-product-code" v-model="createForm.product_code" :placeholder="$t('hosts.form.product_code_placeholder')" :state="createFieldState('product_code')" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="hosts-create-hn-model" :label="$t('hosts.form.hn_model')" required :state="createFieldState('hn_model_id')" :invalid-feedback="createErrors.hn_model_id">
            <base-select id="hosts-create-hn-model" v-model="createForm.hn_model_id" :options="hnModelSelectOptions" :state="createFieldState('hn_model_id')" />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="hosts-create-mac-address" :label="$t('hosts.form.mac_address')" required :state="createFieldState('mac_address')" :invalid-feedback="createErrors.mac_address">
            <base-input id="hosts-create-mac-address" v-model="createForm.mac_address" :placeholder="$t('hosts.form.mac_address_placeholder')" :state="createFieldState('mac_address')" />
          </base-form-group>
        </b-col>
      </b-row>

      <base-form-group label-for="hosts-create-remark" :label="$t('hosts.form.remark')">
        <base-textarea id="hosts-create-remark" v-model="createForm.remark" :rows="2" :placeholder="$t('hosts.form.remark_placeholder')" />
      </base-form-group>
    </base-modal>

    <!-- 变更日志对话框 -->
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
import { fetchHosts, fetchHostDetail, createHost, fetchHnModelOptions, checkFirmwareUpdate, shipHost, confirmHostReceipt, retireHost, restoreHost } from '@/api'
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import ManualDeviceEntryNotice from '@/components/ManualDeviceEntryNotice.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import rolePermission from '@/mixins/rolePermission'
import localizedColumns from '@/mixins/localizedColumns'
import BaseModal from '@/components/base/BaseModal.vue'
import { legacyRealtimeManager as wsManager } from '@realtime-mode-entry'
import { debounce } from '@/utils/debounce'
import { formatDate } from '@/utils/format'
import { hasPermission, PERMISSION } from '@/utils/permission'

// 写入 URL 时持久化的 query 字段清单（与 DEFAULT_QUERY 对齐）
const QUERY_FIELDS = ['page', 'page_size', 'search', 'status', 'sort', 'is_active']

const DEFAULT_QUERY = {
  page: 1,
  page_size: 10,
  search: '',
  status: '',
  sort: '-last_seen',
  is_active: ''
}

export default {
  name: 'Hosts',
  permissionCapabilities: {
    create: PERMISSION.PLATFORM_DEVICE_MANAGE,
    edit: PERMISSION.USER_MANAGE
  },
  components: {
    ColumnVisibility,
    ChangeLogDialog,
    ManualDeviceEntryNotice,
    BaseAlert,
    BaseFormGroup,
    BaseInput,
    BasePagination,
    BaseSelect,
    BaseTextarea,
    BaseModal,
    ListPageCard
  },
  mixins: [rolePermission, localizedColumns],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { hostColumns: 'buildHostColumns' },
  data () {
    return {
      loading: false,
      loadError: '',
      creating: false,
      total: 0,
      tableData: [],
      query: {
        ...DEFAULT_QUERY
      },
      hostColumns: this.buildHostColumns(),
      showCreateDialog: false,
      createForm: {
        hw_ver: '',
        sw_ver: '',
        product_code: '',
        serial_no: '',
        mac_address: '',
        hn_model_id: '',
        remark: ''
      },
      hnModelOptions: [],
      // 出货相关
      shipDialogVisible: false,
      shipping: false,
      shipForm: {
        uuid: '',
        target_company_id: ''
      },
      createErrors: {},
      shipErrors: {},
      companyOptions: [],
      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null,
      // WebSocket 相关
      wsConnected: false
    }
  },
  computed: {
    visibleTableFields () {
      const fieldConfig = {
        // 1280×800 笔记本下原 minWidth 累加 ~1100+ px 撑超容器导致 Actions 列被挤出右侧不可见。
        // 收紧到累加 ~830 px，自适应余量给操作列。
        serial_no: { key: 'serial_no', label: this.$t('hosts.column.serial_no'), thStyle: { minWidth: '130px' } },
        hn_model_name: { key: 'hn_model_name', label: this.$t('hosts.column.hn_model_name'), thStyle: { minWidth: '120px' } },
        mac_address: { key: 'mac_address', label: this.$t('hosts.column.mac_address'), thStyle: { minWidth: '130px' } },
        hw_ver: { key: 'hw_ver', label: this.$t('hosts.column.hw_ver'), thStyle: { minWidth: '70px' } },
        sw_ver: { key: 'sw_ver', label: this.$t('hosts.column.sw_ver'), thStyle: { minWidth: '90px' } },
        manufacturer_name: { key: 'manufacturer_name', label: this.$t('hosts.column.manufacturer'), thStyle: { minWidth: '120px' } },
        status: { key: 'status', label: this.$t('hosts.column.status'), thStyle: { width: '90px' } },
        last_seen: { key: 'last_seen', label: this.$t('hosts.column.last_seen'), thStyle: { minWidth: '130px' } },
        is_active: { key: 'is_active', label: this.$t('hosts.column.is_active'), thStyle: { minWidth: '80px' } }
      }
      const visibleFields = this.hostColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      // 主机操作列含 4 个图标（详情/日志/工具/发货），最少需 160px 才能完整显示，
      // 之前 110px 在 1280×800 笔记本上会被裁切看不到末尾按钮。
      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    },
    statusOptions () {
      return [
        { text: this.$t('hosts.filter.status_all'), value: '' },
        { text: this.$t('common.status.online'), value: 'online' },
        { text: this.$t('common.status.offline'), value: 'offline' },
        { text: this.$t('hosts.status.maintenance'), value: 'maintenance' }
      ]
    },
    activeOptions () {
      return [
        { text: this.$t('hosts.filter.active_all'), value: '' },
        { text: this.$t('hosts.status.active'), value: true },
        { text: this.$t('hosts.status.inactive'), value: false }
      ]
    },
    sortOptions () {
      return [
        { text: this.$t('hosts.sort.last_seen_desc'), value: '-last_seen' },
        { text: this.$t('hosts.sort.last_seen_asc'), value: 'last_seen' },
        { text: this.$t('hosts.sort.serial_asc'), value: 'serial_no' },
        { text: this.$t('hosts.sort.serial_desc'), value: '-serial_no' },
        { text: this.$t('hosts.sort.created_desc'), value: '-created_at' },
        { text: this.$t('hosts.sort.created_asc'), value: 'created_at' }
      ]
    },
    hnModelSelectOptions () {
      return [
        { text: this.$t('hosts.form.hn_model_placeholder'), value: '' },
        ...this.hnModelOptions.map(model => ({
          text: model.name,
          value: model.id
        }))
      ]
    },
    companySelectOptions () {
      return [
        { text: this.$t('hosts.ship_dialog.target_company_placeholder'), value: '' },
        ...this.companyOptions.map(company => ({
          text: company.company_name,
          value: company.id
        }))
      ]
    }
  },
  created () {
    // 进入页面：先把 URL query 写回 this.query.*，再发起请求，避免刷新丢状态
    this._restoreQueryFromUrl()
    this.fetchData()
    this.fetchModelOptions()
    this.fetchCompanyOptions()
  },
  mounted () {
    // 组件挂载后连接 WebSocket
    this.connectWebSocket()
  },
  beforeDestroy () {
    // 组件销毁前断开 WebSocket
    this.disconnectWebSocket()
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
    },
    // 浏览器前进/后退：URL 变了同步回 this.query.* 并重新拉数据
    $route (to, from) {
      if (to.path !== from.path) return
      const before = JSON.stringify(this.query)
      this._restoreQueryFromUrl()
      if (JSON.stringify(this.query) !== before) {
        this.fetchData({ skipUrlSync: true })
      }
    }
  },
  methods: {
    async openCreateDialog () {
      await this.fetchModelOptions()
      this.showCreateDialog = true
    },
    canRetireDevice (row) {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser) && row?.is_active === true
    },
    canRestoreDevice (row) {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser) && row?.is_active === false
    },
    canConfirmReceipt (row) {
      if (!row?.is_active || !row?.shipped_at || row?.received_at) return false
      if (!hasPermission(PERMISSION.POD_RECEIVE, this.permissionUser)) return false
      return this.isPlatformAdmin() || String(row.manufacturer_id) === String(this.permissionUser?.company_id)
    },
    async confirmReceipt (row) {
      const confirmed = await this.$uiConfirm(
        this.$t('hosts.receipt_confirm.message', { serial: row.serial_no || row.uuid }),
        {
          title: this.$t('hosts.receipt_confirm.title'),
          okTitle: this.$t('hosts.actions.confirm_receipt'),
          cancelTitle: this.$t('common.cancel')
        }
      )
      if (!confirmed) return
      try {
        await confirmHostReceipt(row.uuid)
        this.$uiToast.success(this.$t('common.operation_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
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
        await retireHost(row.uuid)
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
        const result = await restoreHost(row.uuid)
        if (result.credential_state === 'not_managed') {
          this.$uiToast.warning(this.$t('common.restore_without_credential'))
        } else {
          this.$uiToast.success(this.$t('common.operation_success'))
        }
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    buildHostColumns () {
      return [
        { prop: 'serial_no', label: this.$t('hosts.column.serial_no'), visible: true },
        { prop: 'hn_model_name', label: this.$t('hosts.column.hn_model_name'), visible: true },
        { prop: 'mac_address', label: this.$t('hosts.column.mac_address'), visible: true },
        { prop: 'hw_ver', label: this.$t('hosts.column.hw_ver'), visible: true },
        { prop: 'sw_ver', label: this.$t('hosts.column.sw_type'), visible: true },
        { prop: 'manufacturer_name', label: this.$t('hosts.column.manufacturer'), visible: true },
        { prop: 'status', label: this.$t('hosts.column.status'), visible: false },
        { prop: 'last_seen', label: this.$t('hosts.column.last_seen'), visible: false },
        // firmware_version 后端主机列表无此字段且无 fieldConfig 实现,列开关是死开关,已移除
        { prop: 'is_active', label: this.$t('hosts.column.is_active'), visible: true }
      ]
    },
    canCreate () {
      return hasPermission(PERMISSION.PLATFORM_DEVICE_MANAGE, this.permissionUser)
    },
    // 把 URL query 写回到 this.query.*（按字段类型推断）
    _restoreQueryFromUrl () {
      const q = this.$route.query || {}
      QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const cur = this.query[field]
        if (typeof cur === 'number') {
          const n = parseInt(v, 10)
          if (!Number.isNaN(n)) this.query[field] = n
        } else if (typeof cur === 'boolean') {
          this.query[field] = v === 'true' || v === '1'
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
        if (field === 'sort' && v === DEFAULT_QUERY.sort) return
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
      this.fetchData()
    }, 300),
    async fetchData (opts = {}) {
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

        if (this.query.search) {
          params.search = this.query.search
        }

        if (this.query.status) {
          params.status = this.query.status
        }

        if (this.query.is_active !== '') {
          params.is_active = this.query.is_active
        }

        if (this.query.sort) {
          params.sort = this.query.sort
        }

        const response = await fetchHosts(params)
        if (reqId !== this._listReqId) return

        const items = response.items || response.data || response
        const total = response.total || items.length

        this.tableData = items
        this.total = total

        // 数据加载成功后订阅主机状态
        this.$nextTick(() => {
          this.subscribeHosts()
        })
      } catch (error) {
        if (reqId !== this._listReqId) return
        const msg = this.$getErrorMessage(error) || this.$t('hosts.toast.list_load_failed')
        this.loadError = msg
        this.$uiToast.error(msg)
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },
    async fetchModelOptions () {
      try {
        const response = await fetchHnModelOptions({ includeSample: this.isPlatformAdmin() })
        this.hnModelOptions = response || []
      } catch (error) {
        this.hnModelOptions = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.load_failed'))
      }
    },
    handleSearch () {
      this.query.page = 1
      this.fetchData()
    },
    resetFilters () {
      this.query = { ...DEFAULT_QUERY }
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
    handleHostColumnsUpdate (updatedColumns) {
      this.hostColumns = updatedColumns
    },
    statusLabel (status) {
      const map = {
        online: this.$t('common.status.online'),
        offline: this.$t('common.status.offline'),
        maintenance: this.$t('hosts.status.maintenance')
      }
      return map[status] || this.$t('common.unknown')
    },
    statusTagType (status) {
      if (status === 'online') return 'success'
      if (status === 'maintenance') return 'warning'
      if (status === 'offline') return 'info'
      return 'info'
    },
    formatDateTime (value) {
      return formatDate(value)
    },
    viewDetail (row) {
      const id = row.uuid
      if (!id) return
      this.$router.push(`/devices/hosts/${encodeURIComponent(id)}`)
    },

    async checkFirmware (row) {
      const hostId = row.uuid || row.device_id || row.mac_address
      if (!hostId) {
        this.$uiToast.error(this.$t('hosts.toast.host_id_missing'))
        return
      }
      try {
        const result = await checkFirmwareUpdate(hostId)
        if (result.has_update) {
          this.$uiToast.warning(this.$t('hosts.toast.firmware_new', { latest: result.latest_version, current: result.current_version }))
        } else {
          this.$uiToast.success(this.$t('hosts.toast.firmware_latest'))
        }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hosts.toast.firmware_check_failed'))
      }
    },

    resetCreateForm () {
      this.createForm = {
        hw_ver: '',
        sw_ver: '',
        product_code: '',
        // serial_no: '',
        mac_address: '',
        hn_model_id: '',
        remark: ''
      }
      this.createErrors = {}
    },
    createFieldState (field) {
      return this.createErrors[field] ? false : null
    },
    shipFieldState (field) {
      return this.shipErrors[field] ? false : null
    },
    validateCreateForm () {
      const errors = {}
      if (!this.createForm.hw_ver) errors.hw_ver = this.$t('hosts.validation.hw_ver_required')
      if (!this.createForm.sw_ver) errors.sw_ver = this.$t('hosts.validation.sw_ver_required')
      if (!this.createForm.product_code) errors.product_code = this.$t('hosts.validation.product_code_required')
      if (!this.createForm.hn_model_id) errors.hn_model_id = this.$t('hosts.validation.hn_model_required')
      if (!this.createForm.mac_address) {
        errors.mac_address = this.$t('hosts.validation.mac_required')
      } else if (!/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(this.createForm.mac_address)) {
        errors.mac_address = this.$t('hosts.validation.mac_format')
      }
      this.createErrors = errors
      return Object.keys(errors).length === 0
    },
    handleCreateModalOk (evt) {
      evt.preventDefault()
      this.createHost()
    },
    async createHost () {
      if (!this.validateCreateForm()) return
      this.creating = true
      try {
        const payload = {
          ...this.createForm,
          mac_address: this.createForm.mac_address.toUpperCase()
        }
        for (const field of ['serial_no', 'remark']) {
          if (typeof payload[field] === 'string' && !payload[field].trim()) {
            delete payload[field]
          }
        }
        await createHost(payload)
        this.$uiToast.success(this.$t('hosts.toast.create_success'))
        this.showCreateDialog = false
        this.query.page = 1
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hosts.toast.create_failed'))
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
        uuid: row.uuid || row.device_id || row.mac_address,
        target_company_id: ''
      }
      this.shipDialogVisible = true
    },

    resetShipForm () {
      this.shipForm = {
        uuid: '',
        target_company_id: ''
      }
      this.shipErrors = {}
    },
    validateShipForm () {
      const errors = {}
      if (!this.shipForm.target_company_id) {
        errors.target_company_id = this.$t('hosts.validation.target_company_required')
      }
      this.shipErrors = errors
      return Object.keys(errors).length === 0
    },
    handleShipModalOk (evt) {
      evt.preventDefault()
      this.confirmShip()
    },
    async confirmShip () {
      if (!this.validateShipForm()) return
      this.shipping = true
      try {
        await shipHost(this.shipForm.uuid, {
          target_company_id: this.shipForm.target_company_id
        })
        this.$uiToast.success(this.$t('hosts.toast.ship_success'))
        this.shipDialogVisible = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hosts.toast.ship_failed'))
      } finally {
        this.shipping = false
      }
    },

    async viewLogs (row) {
      this.logLoading = true
      this.currentLogData = null
      this.logDialogVisible = true
      try {
        const detail = await fetchHostDetail(row.uuid)
        this.currentLogData = detail.change_log || { changes: [], current: { is_active: detail.is_active } }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hosts.toast.list_load_failed'))
      } finally {
        this.logLoading = false
      }
    },

    // 关闭日志对话框
    handleLogClose () {
      // 可以在这里添加关闭后的清理逻辑
    },

    // ========== WebSocket 相关方法 ==========
    connectWebSocket () {
      // 如果 WebSocket 已连接，跳过
      if (wsManager.isConnected()) {
        return
      }

      wsManager.connectBatch([], {
        statusUpdate: (data) => {
          this.handleStatusUpdate(data)
        },
        connected: () => {
          this.wsConnected = true
        },
        error: (error) => {
          console.error('[Hosts] WebSocket 错误:', error)
        },
        close: () => {
          this.wsConnected = false
        }
      })
    },

    disconnectWebSocket () {
      wsManager.disconnect()
      this.wsConnected = false
    },

    handleStatusUpdate (data) {
      // host_uuid 是后端 payload 字段名，不改 camelCase
      // eslint-disable-next-line camelcase
      const { host_uuid, data: statusData } = data

      // 查找表格中对应的主机并更新状态
      // eslint-disable-next-line camelcase
      const hostIndex = this.tableData.findIndex(host => host.uuid === host_uuid)
      if (hostIndex !== -1) {
        // 更新在线状态
        if (statusData.is_online !== undefined) {
          this.$set(this.tableData[hostIndex], 'status', statusData.is_online ? 'online' : 'offline')
        }

        // 更新最后在线时间
        if (statusData.last_seen) {
          this.$set(this.tableData[hostIndex], 'last_seen', statusData.last_seen)
        }

        if (statusData.topology_pending !== undefined) {
          this.$set(this.tableData[hostIndex], 'topology_pending', statusData.topology_pending)
        }

        if (statusData.enrollment_state) {
          this.$set(this.tableData[hostIndex], 'enrollment_state', statusData.enrollment_state)
        }
      }
    },

    // 在数据获取后订阅主机
    subscribeHosts () {
      if (!this.tableData || this.tableData.length === 0) return

      const hostUuids = this.tableData
        .filter(host => host.uuid)
        .map(host => host.uuid)

      if (hostUuids.length > 0 && wsManager.isConnected()) {
        wsManager.updateSubscriptions(hostUuids)
      }
    }
  }
}
</script>
<style lang="scss" scoped src="@/assets/styles/pages/hosts.scss"></style>
