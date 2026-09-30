<template>
    <!-- 单元管理：列�?+ 状态查�?-->
  <div class="pods">
    <manual-device-entry-notice />
    <base-alert v-if="incomingTransfers.length" variant="info" class="mb-3">
      <strong>{{ $t('pods.transfers.incoming_title') }}</strong>
      <div v-for="transfer in incomingTransfers" :key="transfer.uuid" class="d-flex align-items-center justify-content-between mt-2">
        <span>{{ $t('pods.transfers.incoming_message', { pod: transfer.pod_name || transfer.pod_uuid, company: transfer.from_company_name || transfer.from_company_id }) }}</span>
        <span>
          <base-button size="sm" class="mr-2" @click="handleIncomingTransfer(transfer, 'receive')">{{ $t('pods.transfers.receive') }}</base-button>
          <base-button size="sm" variant="outline-danger" @click="handleIncomingTransfer(transfer, 'reject')">{{ $t('pods.transfers.reject') }}</base-button>
        </span>
      </div>
    </base-alert>
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="pods__filters" @submit.prevent="handleSearch">
        <div class="filter-row">
          <div class="filter-left">
            <base-input
              v-model.trim="query.search"
              class="filter-control"
              :placeholder="$t('pods.filters.search_placeholder')"
              :aria-label="$t('pods.filters.search_placeholder')"
              @input="onSearchInput"
              @keyup.enter="handleSearch"
            />
            <base-select
              v-model="query.is_online"
              class="filter-control"
              :options="onlineOptions"
              :aria-label="onlineOptions[0].text"
              @input="handleSearch"
            />
            <base-select
              v-model="query.is_active"
              class="filter-control"
              :options="activeOptions"
              :aria-label="activeOptions[0].text"
              @input="handleSearch"
            />
            <div class="filter-actions">
              <base-button v-if="canCreate()" @click="showCreateDialog = true">
                <app-icon name="plus" />
                {{ $t('pods.actions.create') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <!-- 单元列表 -->
      <base-table
        :items="tableData"
        :fields="visibleTableFields"
        :loading="loading"
        :load-error="loadError"
        bordered
        @retry="fetchData"
      >
        <template #head(show_details)>
          <span class="table-disclosure-heading" :title="$t('common.expand')">
            <app-icon name="chevron-right" aria-hidden="true" />
            <span class="sr-only">{{ $t('common.expand') }}</span>
          </span>
        </template>
        <template #cell(show_details)="row">
          <base-action-button v-if="row.item.is_active" :title="$t(row.detailsShowing ? 'common.collapse' : 'common.expand')" @click="togglePodDetails(row)">
            <app-icon :name="row.detailsShowing ? 'chevron-down' : 'chevron-right'" />
          </base-action-button>
          <span v-else class="action-icon action-icon--disabled" :title="$t('common.inactive')"><app-icon name="slash-circle"  /></span>
        </template>
        <template #row-details="row">
          <div class="pod-expand-content">
            <pod-control-panel
              :pod-uuid="row.item.uuid"
              :online="row.item.is_online"
              :last-seen="row.item.last_seen"
            />
          </div>
        </template>
        <template #cell(serial_number)="data">
          {{ data.item.serial_number || '-' }}
        </template>
        <template #cell(serial_no)="data">
          {{ data.item.serial_no || $t('pods.table.serial_no_missing') }}
        </template>
        <template #cell(manufacturer_name)="data">
          {{ data.item.manufacturer_name || '-' }}
        </template>
        <template #cell(country)="data">
          {{ formatCountry(data.item.location) }}
        </template>
        <template #cell(province)="data">
          {{ data.item.location && data.item.location.province_name ? data.item.location.province_name : '-' }}
        </template>
        <template #cell(city)="data">
          {{ data.item.location && data.item.location.city_name ? data.item.location.city_name : '-' }}
        </template>
        <template #cell(district)="data">
          {{ data.item.location && data.item.location.district_name ? data.item.location.district_name : '-' }}
        </template>
        <template #cell(building)="data">
          {{ data.item.location && data.item.location.building ? data.item.location.building : '-' }}
        </template>
        <template #cell(is_online)="data">
          <span class="status-dot" :class="{ 'status-dot--on': data.item.is_online }">
            {{ data.item.is_online ? $t('pods.online_options.online') : $t('pods.online_options.offline') }}
          </span>
        </template>
        <template #cell(last_seen)="data">
          {{ formatDateTime(data.item.last_seen) }}
        </template>
        <template #cell(is_active)="data">
          <span class="status-dot" :class="{ 'status-dot--on': data.item.is_active }">
            {{ data.item.is_active ? $t('pods.active_status.active') : $t('pods.active_status.inactive') }}
          </span>
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility
              :columns="podColumns"
              :table-key="'pods-table'"
              @update:columns="handlePodColumnsUpdate"
            />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button @click="viewDetail(data.item)" :title="$t('pods.actions.view_detail')"> <app-icon name="eye"  /> <span>{{ $t('pods.actions.view_detail') }}</span> </base-action-button>
          <base-action-button @click="viewLogs(data.item)" :title="$t('pods.actions.view_logs')"> <app-icon name="journal-text"  /> <span>{{ $t('pods.actions.view_logs') }}</span> </base-action-button>
          <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.name || data.item.uuid].filter(Boolean).join(' ') }">
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button v-if="data.item.is_active && canAssignPod()" @click="showAssignDialog(data.item)"><app-icon name="diagram-3" aria-hidden="true" /> {{ $t('pods.transfers.initiate') }}</b-dropdown-item-button>
            <b-dropdown-item-button v-if="data.item.is_active" @click="openNodeBinding(data.item)"><app-icon name="share" aria-hidden="true" /> {{ $t('pods.actions.manage_node') }}</b-dropdown-item-button>
            <b-dropdown-item-button v-if="canRetirePod(data.item)" class="text-danger" @click="confirmRetirePod(data.item)"><app-icon name="archive" aria-hidden="true" /> {{ $t('common.retire') }}</b-dropdown-item-button>
            <b-dropdown-item-button v-if="canRestorePod(data.item)" @click="confirmRestorePod(data.item)"><app-icon name="arrow-counterclockwise" aria-hidden="true" /> {{ $t('common.restore') }}</b-dropdown-item-button>
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

    <!-- 创建单元对话�?-->
    <!-- header-bg-variant="primary"
    header-text-variant="white" -->
    <base-modal
      v-model="showCreateDialog"
      :title="$t('pods.create_dialog.title')"
      size="lg"
      :ok-title="$t('pods.create_dialog.ok_title')"
      :cancel-title="$t('pods.create_dialog.cancel_title')"
      :busy="creating"
      :ok-disabled="creating || deviceValidationLoading || (deviceValidation && !deviceValidation.is_valid)"
      @hidden="handleCreateDialogHidden"
      @ok="handleCreateModalOk"
      modal-class="model-el dialog-with-header-bg" :centered="false" :scrollable="false"
    >
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="pods-create-host" required :label="$t('pods.create_dialog.host_label')" :state="createFieldState('host_id')" :invalid-feedback="createErrors.host_id">
            <base-select
              id="pods-create-host"
              v-model="form.host_id"
              :options="hostSelectOptions"
              :state="createFieldState('host_id')"
            />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="pods-create-model" required :label="$t('pods.create_dialog.model_label')" :state="createFieldState('model_id')" :invalid-feedback="createErrors.model_id">
            <base-select
              id="pods-create-model"
              v-model="form.model_id"
              :options="modelSelectOptions"
              :state="createFieldState('model_id')"
            />
          </base-form-group>
        </b-col>
      </b-row>
      <b-row>
        <b-col cols="12" md="6">
          <base-form-group label-for="pods-create-company" required :label="$t('pods.create_dialog.company_label')" :state="createFieldState('company_id')" :invalid-feedback="createErrors.company_id">
            <base-select
              id="pods-create-company"
              v-model="form.company_id"
              :options="companySelectOptions"
              :state="createFieldState('company_id')"
            />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group label-for="pods-create-serial" :label="$t('pods.create_dialog.serial_no_label')" :description="$t('pods.create_dialog.serial_no_hint')">
            <base-input id="pods-create-serial" v-model.trim="form.serial_no" :placeholder="$t('pods.create_dialog.serial_no_placeholder')" />
          </base-form-group>
        </b-col>
      </b-row>
      <base-alert
        v-if="form.host_id && form.model_id"
        :variant="deviceValidationVariant"
        :dismissible="false"
        class="mb-3"
      >
        <div v-if="deviceValidationLoading">
          <b-spinner small class="mr-2" />{{ $t('pods.create_dialog.device_check_loading') }}
        </div>
        <div v-else-if="deviceValidationError">
          {{ $t('pods.create_dialog.device_check_unavailable') }}
        </div>
        <div v-else-if="deviceValidation">
          <strong>{{ $t(deviceValidation.is_valid ? 'pods.create_dialog.device_check_passed' : 'pods.create_dialog.device_check_failed') }}</strong>
          <ul class="mb-2 mt-2 pl-3">
            <li v-for="item in deviceValidation.validation_items" :key="`${item.model_code}-${item.is_host}`">
              {{ $t('pods.create_dialog.device_count', { code: item.model_code, actual: item.actual_quantity, required: item.required_quantity }) }}
            </li>
          </ul>
          <base-button
            v-if="!deviceValidation.is_valid && hasNodeShortage && canManageBindings"
            size="sm"
            variant="outline-primary"
            @click="openCreateNodeBinding"
          >
            <app-icon name="link-45deg" class="mr-1" />{{ $t('pods.create_dialog.configure_nodes') }}
          </base-button>
          <div v-else-if="!deviceValidation.is_valid && hasNodeShortage" class="mt-2">
            {{ $t('pods.create_dialog.binding_permission_tip') }}
          </div>
        </div>
      </base-alert>
      <base-form-group label-for="pods-create-remark" :label="$t('pods.create_dialog.remark_label')">
        <base-textarea
          id="pods-create-remark"
          v-model="form.remark"
          :rows="3"
          :placeholder="$t('pods.create_dialog.remark_placeholder')"
        />
      </base-form-group>
    </base-modal>

    <!-- 分配单元给下一级公司对话框 -->
    <base-modal
      id="pods-assign-modal"
      :title="$t('pods.transfers.title')"
      v-model="showAssignDialogVisible"
      size="lg"
      hide-footer
      modal-class="dialog-with-header-bg"
      @hidden="resetAssignForm"
    >
      <base-alert variant="info" class="pods__assign-alert mb-3">
        <strong>{{ $t('pods.transfers.notice_title') }}</strong>
        <ul class="assign-alert-list">
          <li>{{ $t('pods.transfers.notice_item_1') }}</li>
          <li>{{ $t('pods.transfers.notice_item_2') }}</li>
          <li>{{ $t('pods.transfers.notice_item_3') }}</li>
        </ul>
      </base-alert>

      <b-form>
        <base-form-group :label="$t('pods.assign_dialog.pod_info_label')">
          <div class="pod-create-summary">
            <div class="ui-mb-2">
              <strong>{{ $t('pods.assign_dialog.serial_no_label') }}</strong>{{ currentAssignPod ? (currentAssignPod.serial_no || '-') : '-' }}
            </div>
            <div class="ui-mb-2">
              <strong>{{ $t('pods.assign_dialog.model_label') }}</strong>{{ currentAssignPod ? currentAssignPod.model_name : '-' }}
            </div>
            <div>
              <strong>{{ $t('pods.assign_dialog.current_company_label') }}</strong>{{ currentAssignPod ? currentAssignPod.company_name : '-' }}
            </div>
          </div>
        </base-form-group>
        <b-row>
          <b-col cols="12" md="6">
        <base-form-group
          required
          :label="$t('pods.assign_dialog.company_role_label')"
          :state="assignFieldState('company_role')"
          :invalid-feedback="assignErrors.company_role"
        >
          <base-select v-model="assignForm.company_role" :options="assignCompanyRoleOptions" :state="assignFieldState('company_role')" />
        </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
        <base-form-group
          required
          :label="$t('pods.assign_dialog.target_company_label')"
          :state="assignFieldState('target_company_id')"
          :invalid-feedback="assignErrors.target_company_id"
        >
          <base-select v-model="assignForm.target_company_id" :options="childCompanySelectOptions" :state="assignFieldState('target_company_id')" />
        </base-form-group>
          </b-col>
        </b-row>

      </b-form>

      <base-form-group :label="$t('pods.transfers.reason_label')">
        <base-textarea v-model.trim="assignForm.remark" :rows="2" :placeholder="$t('pods.transfers.reason_placeholder')" />
      </base-form-group>

      <div class="d-flex justify-content-end mt-3">
        <base-button variant="outline-secondary" class="mr-2" @click="showAssignDialogVisible = false"><app-icon name="x" class="mr-1" />{{ $t('pods.actions.cancel') }}</base-button>
        <base-button :disabled="assigning" @click="confirmAssign">
          <app-icon name="check" class="mr-1" />
          {{ assigning ? $t('pods.actions.submitting') : $t('pods.transfers.confirm_initiate') }}
        </base-button>
      </div>
    </base-modal>

    <!-- 变更日志对话�?-->
    <ChangeLogDialog
      :visible.sync="logDialogVisible"
      :loading="logLoading"
      :change-log="currentLogData"
      @close="handleLogClose"
    />

    <!-- 单元节点绑定对话�?-->
    <base-modal
      id="pods-node-binding-modal"
      :title="$t('pods.node_binding_dialog.title')"
      v-model="nodeBindingDialogVisible"
      size="xl"
      hide-footer
      modal-class="dialog-with-header-bg model-el"
      @hidden="handleNodeBindingClose"
    >
      <HostNodeBinding v-if="selectedPodUuid" :host-id="selectedPodUuid" @success="handleNodeBindingSuccess" />
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import ManualDeviceEntryNotice from '@/components/ManualDeviceEntryNotice.vue'
import PodControlPanel from '@/components/PodControlPanel.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import HostNodeBinding from './HostNodeBinding.vue'
import rolePermission from '@/mixins/rolePermission'
import localizedColumns from '@/mixins/localizedColumns'
import BaseModal from '@/components/base/BaseModal.vue'
import { canWriteRow, getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { fetchPods, fetchPodDetail, createPod, validatePodDevicesPreview, fetchPodModelOptions, fetchCompanies, fetchHosts, createPodTransfer, fetchIncomingPodTransfers, receivePodTransfer, rejectPodTransfer, retirePod, restorePod } from '@/api/pods'
import { debounce } from '@/utils/debounce'
import { formatDate } from '@/utils/format'

// URL query 持久化字段（�?query 对象同名）。默认值不�?URL�?
const URL_QUERY_FIELDS = ['page', 'page_size', 'search', 'is_online', 'is_active']
const URL_QUERY_DEFAULTS = { page: 1, page_size: 10, search: '', is_online: '', is_active: '' }

export default {
  name: 'Pods',
  permissionCapabilities: {
    create: PERMISSION.POD_RECEIVE,
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    BaseAlert,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BasePagination,
    BaseSelect,
    BaseTable,
    BaseTextarea,
    ColumnVisibility,
    ChangeLogDialog,
    ManualDeviceEntryNotice,
    PodControlPanel,
    HostNodeBinding,
    ListPageCard,
    BaseModal
  },
  mixins: [rolePermission, localizedColumns],
  localizedColumns: { podColumns: 'buildPodColumns' },
  data () {
    return {
      loading: false,
      loadError: '',
      creating: false,
      deviceValidationLoading: false,
      deviceValidation: null,
      deviceValidationError: '',
      deviceValidationRequestId: 0,
      pendingBindingHostId: null,
      resumeCreateAfterBinding: false,
      assigning: false,
      showCreateDialog: false,
      showAssignDialogVisible: false,
      total: 0,
      tableData: [],
      incomingTransfers: [],
      modelOptions: [],
      hostOptions: [],
      companyOptions: [],
      childCompanyOptions: [],
      currentAssignPod: null,
      podColumns: [
        { prop: 'serial_number', label: '', visible: true },
        { prop: 'serial_no', label: '', visible: true },
        { prop: 'model_name', label: '', visible: true },
        { prop: 'manufacturer_name', label: '', visible: true },
        { prop: 'company_name', label: '', visible: true },
        { prop: 'country', label: '', visible: false },
        { prop: 'province', label: '', visible: false },
        { prop: 'city', label: '', visible: false },
        { prop: 'district', label: '', visible: false },
        { prop: 'building', label: '', visible: false },
        { prop: 'is_online', label: '', visible: true },
        { prop: 'last_seen', label: '', visible: false },
        { prop: 'is_active', label: '', visible: true }
      ],
      query: {
        page: 1,
        page_size: 10,
        search: '',
        is_online: '',
        is_active: ''
      },
      form: {
        pod_name: '',
        serial_no: '',
        host_id: '',
        model_id: '',
        company_id: '',
        remark: ''
      },
      createErrors: {},
      assignForm: {
        company_role: '',
        target_company_id: '',
        remark: ''
      },
      assignErrors: {},
      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null,
      // 节点绑定相关
      nodeBindingDialogVisible: false,
      selectedPodUuid: null
    }
  },
  computed: {
    onlineOptions () {
      return [
        { value: '', text: this.$t('pods.online_options.all') },
        { value: true, text: this.$t('pods.online_options.online') },
        { value: false, text: this.$t('pods.online_options.offline') }
      ]
    },
    activeOptions () {
      return [
        { value: '', text: this.$t('pods.active_options.all') },
        { value: true, text: this.$t('pods.active_options.active') },
        { value: false, text: this.$t('pods.active_options.inactive') }
      ]
    },
    canManageBindings () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.POD_MAINTAIN, user)
    },
    hasNodeShortage () {
      return Boolean(this.deviceValidation?.validation_items?.some(item => (
        !item.is_host && item.actual_quantity < item.required_quantity
      )))
    },
    deviceValidationVariant () {
      if (this.deviceValidationLoading) return 'info'
      if (this.deviceValidationError) return 'warning'
      return this.deviceValidation?.is_valid ? 'success' : 'danger'
    },
    hostSelectOptions () {
      return [
        { value: '', text: this.$t('pods.create_dialog.host_placeholder') },
        ...this.hostOptions.map(host => ({
          value: host.uuid,
          text: `${host.serial_no} (${host.mac_address})`
        }))
      ]
    },
    modelSelectOptions () {
      return [
        { value: '', text: this.$t('pods.create_dialog.model_placeholder') },
        ...this.modelOptions.map(model => ({
          value: model.uuid,
          text: model.name
        }))
      ]
    },
    companySelectOptions () {
      return [
        { value: '', text: this.$t('pods.create_dialog.company_placeholder') },
        ...this.companyOptions.map(company => ({
          value: company.id,
          text: company.company_name
        }))
      ]
    },
    assignCompanyRoleOptions () {
      const options = [
        { value: '', text: this.$t('pods.assign_dialog.company_role_placeholder') },
        { value: 'brand', text: this.$t('pods.company_role_options.brand') },
        { value: 'distributor', text: this.$t('pods.company_role_options.distributor') },
        { value: 'agent', text: this.$t('pods.company_role_options.agent') },
        { value: 'enduser', text: this.$t('pods.company_role_options.enduser') }
      ]
      if (!this.childCompanyOptions.length) return options.slice(0, 1)
      const roleFlags = {
        brand: 'is_brand',
        distributor: 'is_channel_partner',
        agent: 'is_channel_partner',
        enduser: 'is_enduser'
      }
      return options.filter(option => !option.value || this.childCompanyOptions.some(company => company[roleFlags[option.value]]))
    },
    childCompanySelectOptions () {
      const roleFlags = {
        brand: 'is_brand',
        distributor: 'is_channel_partner',
        agent: 'is_channel_partner',
        enduser: 'is_enduser'
      }
      const flag = roleFlags[this.assignForm.company_role]
      const companies = flag ? this.childCompanyOptions.filter(company => company[flag]) : []
      return [
        { value: '', text: this.$t('pods.assign_dialog.target_company_placeholder') },
        ...companies.map(company => ({
          value: company.id,
          text: company.company_name
        }))
      ]
    },
    visibleTableFields () {
      // 列宽策略：短/定长列给固定 width；文本列（型号/制造商/公司/楼栋）给
      // width:auto + minWidth，让它们平摊剩余空间，消除右侧大留白（重心偏左）。
      const flexCol = (minW) => ({ width: 'auto', minWidth: minW })
      const fieldConfig = {
        serial_number: { key: 'serial_number', label: this.$t('pods.table.serial_number'), thStyle: flexCol('180px') },
        serial_no: { key: 'serial_no', label: this.$t('pods.table.serial_no'), class: 'pods__serial-cell', thStyle: { minWidth: '160px', width: '180px' } },
        model_name: { key: 'model_name', label: this.$t('pods.table.model_name'), thStyle: flexCol('140px') },
        manufacturer_name: { key: 'manufacturer_name', label: this.$t('pods.table.manufacturer_name'), thStyle: flexCol('160px') },
        company_name: { key: 'company_name', label: this.$t('pods.table.company_name'), thStyle: flexCol('160px') },
        country: { key: 'country', label: this.$t('pods.table.country'), class: 'text-center', thClass: 'text-center', thStyle: { width: '100px' } },
        province: { key: 'province', label: this.$t('pods.table.province'), class: 'text-center', thClass: 'text-center', thStyle: { width: '120px' } },
        city: { key: 'city', label: this.$t('pods.table.city'), class: 'text-center', thClass: 'text-center', thStyle: { width: '120px' } },
        district: { key: 'district', label: this.$t('pods.table.district'), class: 'text-center', thClass: 'text-center', thStyle: { width: '120px' } },
        building: { key: 'building', label: this.$t('pods.table.building'), thStyle: flexCol('160px') },
        is_online: { key: 'is_online', label: this.$t('pods.table.is_online'), class: 'text-center', thClass: 'text-center', thStyle: { width: '110px' } },
        last_seen: { key: 'last_seen', label: this.$t('pods.table.last_seen'), thStyle: { width: '160px' } },
        is_active: { key: 'is_active', label: this.$t('pods.table.is_active'), class: 'text-center', thClass: 'text-center', thStyle: { width: '110px' } }
      }

      const visibleFields = this.podColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      const fields = [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
      if (this.canExpandControlPanel()) {
        fields.unshift({ key: 'show_details', label: this.$t('common.expand'), thStyle: { width: '52px' }, class: 'text-center', thClass: 'text-center' })
      }
      return fields
    }
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
    },
    'assignForm.company_role' () {
      this.assignForm.target_company_id = ''
      this.$delete(this.assignErrors, 'target_company_id')
    },
    'form.host_id' () {
      this.validateSelectedDevices()
    },
    'form.model_id' () {
      this.validateSelectedDevices()
    }
  },
  created () {
    this.podColumns = this.buildPodColumns()
    this._restoreFromUrl()
    // 3 个异步请求互不依赖，并发执行；各自内部已�?try/catch，Promise.all 不会因单个失败中断其�?
    Promise.all([
      this.fetchData(),
      this.fetchIncomingTransfers(),
      this.loadOptions()
    ])
  },
  methods: {
    canRetirePod (row) {
      const user = getCurrentUser()
      return Boolean(row?.is_active === true && hasPermission(PERMISSION.POD_MAINTAIN, user) && canWriteRow(row, 'pod', user))
    },
    canRestorePod (row) {
      const user = getCurrentUser()
      return Boolean(row?.is_active === false && hasPermission(PERMISSION.POD_MAINTAIN, user) && canWriteRow(row, 'pod', user))
    },
    async confirmRetirePod (row) {
      const confirmed = await this.$uiConfirm(`${this.$t('common.retire')}: ${row.serial_number || row.uuid}`, {
        title: this.$t('common.confirm'),
        okVariant: 'danger',
        okTitle: this.$t('common.confirm'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await retirePod(row.uuid)
        this.$uiToast.success(this.$t('common.operation_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    async confirmRestorePod (row) {
      const confirmed = await this.$uiConfirm(`${this.$t('common.restore')}: ${row.serial_number || row.uuid}`, {
        title: this.$t('common.confirm'),
        okTitle: this.$t('common.restore'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await restorePod(row.uuid)
        this.$uiToast.success(this.$t('common.operation_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    /** 国家显示：按 ISO-2 走 i18n，未回填代码的老数据回退到后端显示名 */
    formatCountry (location) {
      if (!location) return '-'
      if (location.country_code === 'CN') return this.$t('pods.assign_dialog.country_china')
      return location.country_name || location.country || '-'
    },
    buildPodColumns () {
      return [
        { prop: 'serial_number', label: this.$t('pods.table.serial_number'), visible: true },
        { prop: 'serial_no', label: this.$t('pods.table.serial_no'), visible: true },
        { prop: 'model_name', label: this.$t('pods.table.model_name'), visible: true },
        { prop: 'manufacturer_name', label: this.$t('pods.table.manufacturer_name'), visible: true },
        { prop: 'company_name', label: this.$t('pods.table.company_name'), visible: true },
        { prop: 'country', label: this.$t('pods.table.country'), visible: false },
        { prop: 'province', label: this.$t('pods.table.province'), visible: false },
        { prop: 'city', label: this.$t('pods.table.city'), visible: false },
        { prop: 'district', label: this.$t('pods.table.district'), visible: false },
        { prop: 'building', label: this.$t('pods.table.building'), visible: false },
        { prop: 'is_online', label: this.$t('pods.table.is_online'), visible: true },
        // status 列从未有 fieldConfig/cell 实现,列开关是死开关,先移除;待后端 status_text 本地化后再实现
        { prop: 'last_seen', label: this.$t('pods.table.last_seen'), visible: false },
        { prop: 'is_active', label: this.$t('pods.table.is_active'), visible: true }
      ]
    },
    // 所有可读角色都能查看状态；控制组件会按角色禁用写操作。
    canExpandControlPanel () {
      return Boolean(getCurrentUser())
    },
    togglePodDetails (row) {
      this.tableData.forEach(item => {
        if (item.uuid !== row.item.uuid && item._showDetails) {
          this.$set(item, '_showDetails', false)
        }
      })
      row.toggleDetails()
    },

    canAssignPod () {
      const user = getCurrentUser()
      if (!user) return false

      return hasPermission(PERMISSION.POD_TRANSFER, user)
    },

    async fetchData () {
      this._syncToUrl()
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const response = await fetchPods({
          page: this.query.page,
          page_size: this.query.page_size,
          search: this.query.search,
          is_online: this.query.is_online !== '' ? this.query.is_online : undefined,
          is_active: this.query.is_active !== '' ? this.query.is_active : undefined
        })
        if (reqId !== this._listReqId) return
        this.tableData = response.items || []
        this.total = response.total || 0
      } catch (error) {
        if (reqId !== this._listReqId) return
        const msg = this.$getErrorMessage(error) || this.$t('pods.toast.load_failed')
        this.loadError = msg
        this.$uiToast.error(msg)
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },
    async fetchIncomingTransfers () {
      const user = getCurrentUser()
      if (!user || !hasPermission(PERMISSION.POD_RECEIVE, user)) {
        this.incomingTransfers = []
        return
      }
      try {
        this.incomingTransfers = await fetchIncomingPodTransfers({ status: 'pending' })
      } catch (error) {
        this.incomingTransfers = []
      }
    },
    async handleIncomingTransfer (transfer, action) {
      const confirmed = await this.$uiConfirm(
        this.$t(`pods.transfers.${action}_confirm`, { pod: transfer.pod_name || transfer.pod_uuid }),
        {
          title: this.$t('pods.transfers.incoming_title'),
          okVariant: action === 'reject' ? 'danger' : 'primary',
          okTitle: this.$t(`pods.transfers.${action}`),
          cancelTitle: this.$t('common.cancel')
        }
      )
      if (!confirmed) return
      try {
        const fn = action === 'receive' ? receivePodTransfer : rejectPodTransfer
        await fn(transfer.pod_uuid, transfer.uuid, {})
        this.$uiToast.success(this.$t(`pods.transfers.${action}_success`))
        await Promise.all([this.fetchIncomingTransfers(), this.fetchData()])
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      }
    },
    async loadOptions () {
      try {
        const [modelsResponse, hostsResponse, companiesResponse] = await Promise.all([
          fetchPodModelOptions({ page: 1, page_size: 200 }),
          fetchHosts({ page: 1, page_size: 200 }),
          fetchCompanies({ page: 1, page_size: 200 })
        ])
        this.modelOptions = modelsResponse.items || []
        this.hostOptions = hostsResponse.items || []
        this.companyOptions = companiesResponse.items || []
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pods.toast.load_options_failed'))
      }
    },
    async reloadModelOptions () {
      try {
        const response = await fetchPodModelOptions({
          page: 1,
          page_size: 200
        })
        this.modelOptions = response.items || response.data?.list || response.data || []
      } catch (error) {
        this.modelOptions = []
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
    // �?URL query 恢复筛选条件，进入页面/前进后退时调�?
    _restoreFromUrl () {
      const q = this.$route.query || {}
      const BOOL_FIELDS = ['is_online', 'is_active']
      URL_QUERY_FIELDS.forEach(field => {
        const v = q[field]
        if (v === undefined) return
        const def = URL_QUERY_DEFAULTS[field]
        if (typeof def === 'number') {
          const n = parseInt(v, 10)
          this.query[field] = Number.isNaN(n) ? def : n
        } else if (BOOL_FIELDS.includes(field)) {
          // 布尔筛选：URL 里是 'true'/'false'，回写成 boolean �?select 选项保持一�?
          if (v === 'true') this.query[field] = true
          else if (v === 'false') this.query[field] = false
          else this.query[field] = ''
        } else {
          this.query[field] = v
        }
      })
    },
    // 把当�?query 写回 URL（默认值不写）
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
    handleBusinessTypeChange () {
      this.form.model_id = ''
      this.reloadModelOptions()
    },
    resetFilters () {
      this.query = {
        page: 1,
        page_size: 10,
        search: '',
        is_online: '',
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
    getStatusLabel (status) {
      const map = {
        idle: this.$t('pods.status.idle'),
        in_use: this.$t('pods.status.in_use'),
        maintenance: this.$t('pods.status.maintenance'),
        error: this.$t('pods.status.error')
      }
      return map[status] || status
    },
    getStatusTag (status) {
      const map = {
        idle: 'success',
        in_use: 'primary',
        maintenance: 'warning',
        error: 'danger'
      }
      return map[status] || ''
    },
    formatDateTime (dateString) {
      return formatDate(dateString)
    },
    viewDetail (row) {
      this.$router.push(`/pods/${row.uuid}`)
    },
    async viewLogs (row) {
      this.logLoading = true
      this.currentLogData = null
      this.logDialogVisible = true
      try {
        const detail = await fetchPodDetail(row.uuid)
        row = { ...row, change_log: detail && detail.change_log }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pods.toast.load_failed'))
      } finally {
        this.logLoading = false
      }

      // 直接使用列表中的 change_log 数据
      if (row.change_log) {
        this.currentLogData = row.change_log
      } else {
        // 如果没有 change_log 数据，显示提�?
        this.$uiToast.info(this.$t('pods.toast.no_change_log'))
        this.currentLogData = {
          changes: [],
          current: {
            is_active: row.is_active,
            activated_at: row.activated_at || null,
            deactivated_at: row.deactivated_at || null
          }
        }
      }
    },
    handleLogClose () {
      // 可以在这里添加关闭后的清理逻辑
    },

    // 打开节点绑定对话�?
    openNodeBinding (row) {
      this.resumeCreateAfterBinding = false
      this.selectedPodUuid = row.host_id
      this.nodeBindingDialogVisible = true
    },

    openCreateNodeBinding () {
      if (!this.canManageBindings) return
      const host = this.hostOptions.find(item => item.uuid === this.form.host_id)
      if (!host?.id) return
      this.pendingBindingHostId = host.id
      this.resumeCreateAfterBinding = true
      this.showCreateDialog = false
    },

    handleCreateDialogHidden () {
      if (this.pendingBindingHostId) {
        this.selectedPodUuid = this.pendingBindingHostId
        this.pendingBindingHostId = null
        this.nodeBindingDialogVisible = true
        return
      }
      if (!this.resumeCreateAfterBinding) this.resetForm()
    },

    // 关闭节点绑定对话�?
    handleNodeBindingClose () {
      this.selectedPodUuid = null
      if (this.resumeCreateAfterBinding) {
        this.resumeCreateAfterBinding = false
        this.showCreateDialog = true
        this.$nextTick(() => this.validateSelectedDevices())
      }
    },

    handleNodeBindingSuccess () {
      this.fetchData()
      if (this.resumeCreateAfterBinding) this.validateSelectedDevices()
    },

    handlePodColumnsUpdate (updatedColumns) {
      this.podColumns = updatedColumns
    },
    resetForm () {
      this.form = {
        pod_name: '',
        serial_no: '',
        host_id: '',
        model_id: '',
        company_id: '',
        remark: ''
      }
      this.createErrors = {}
      this.deviceValidation = null
      this.deviceValidationError = ''
      this.deviceValidationLoading = false
      this.deviceValidationRequestId += 1
    },
    async validateSelectedDevices (showError = false) {
      const requestId = ++this.deviceValidationRequestId
      this.deviceValidation = null
      this.deviceValidationError = ''
      if (!this.form.host_id || !this.form.model_id) {
        this.deviceValidationLoading = false
        return false
      }
      const host = this.hostOptions.find(item => item.uuid === this.form.host_id)
      const model = this.modelOptions.find(item => item.uuid === this.form.model_id)
      if (!host?.id || !model?.id) {
        this.deviceValidationLoading = false
        return false
      }
      this.deviceValidationLoading = true
      try {
        const result = await validatePodDevicesPreview({
          host_id: host.id,
          pod_model_id: model.id
        })
        if (requestId !== this.deviceValidationRequestId) return false
        this.deviceValidation = result
        return Boolean(result?.is_valid)
      } catch (error) {
        if (requestId !== this.deviceValidationRequestId) return false
        this.deviceValidationError = this.$getErrorMessage(error) || this.$t('pods.toast.create_failed')
        if (showError) this.$uiToast.error(this.deviceValidationError)
        return false
      } finally {
        if (requestId === this.deviceValidationRequestId) this.deviceValidationLoading = false
      }
    },
    createFieldState (field) {
      if (!(field in this.createErrors)) {
        return null
      }
      return !this.createErrors[field]
    },
    validateCreateForm () {
      const errors = {}
      if (!this.form.host_id) {
        errors.host_id = this.$t('pods.validate.host_required')
      }
      if (!this.form.model_id) {
        errors.model_id = this.$t('pods.validate.model_required')
      }
      if (!this.form.company_id) {
        errors.company_id = this.$t('pods.validate.company_required')
      }
      this.createErrors = errors
      return Object.keys(errors).length === 0
    },
    handleCreateModalOk (event) {
      event.preventDefault()
      this.createPod()
    },
    async createPod () {
      if (!this.validateCreateForm()) {
        return
      }

      if (!(await this.validateSelectedDevices(true))) return

      this.creating = true
      try {
        await createPod({
          pod_name: this.form.pod_name,
          serial_no: this.form.serial_no || null,
          host_id: this.form.host_id,
          model_id: this.form.model_id,
          company_id: this.form.company_id,
          remark: this.form.remark
        })
        this.$uiToast.success(this.$t('pods.toast.create_success'))
        this.showCreateDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pods.toast.create_failed'))
      } finally {
        this.creating = false
      }
    },

    // 分配单元给下一级公�?
    async showAssignDialog (row) {
      this.currentAssignPod = row
      this.assignForm = {
        company_role: '',
        target_company_id: '',
        remark: ''
      }
      this.assignErrors = {}
      this.showAssignDialogVisible = true

      await this.fetchChildCompanies()
    },

    async fetchChildCompanies () {
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200, is_active: true })
        const companies = response.items || response.data || response || []
        this.childCompanyOptions = Array.isArray(companies)
          ? companies.filter(company => company.is_active !== false)
          : []
      } catch (error) {
        this.childCompanyOptions = []
        this.$uiToast.error(
          this.$getErrorMessage(error) || this.$t('pods.toast.load_options_failed')
        )
      }
    },

    resetAssignForm () {
      this.assignForm = {
        company_role: '',
        target_company_id: '',
        remark: ''
      }
      this.assignErrors = {}
      this.currentAssignPod = null
    },
    assignFieldState (field) {
      if (!(field in this.assignErrors)) {
        return null
      }
      return !this.assignErrors[field]
    },
    validateAssignForm () {
      const errors = {}
      if (!this.assignForm.company_role) {
        errors.company_role = this.$t('pods.validate.company_role_required')
      }
      const allowedCompanyIds = this.childCompanySelectOptions
        .filter(option => option.value)
        .map(option => Number(option.value))
      if (
        !this.assignForm.target_company_id ||
        !allowedCompanyIds.includes(Number(this.assignForm.target_company_id))
      ) {
        errors.target_company_id = this.$t('pods.validate.target_company_required')
      }
      this.assignErrors = errors
      return Object.keys(errors).length === 0
    },

    async confirmAssign () {
      if (!this.validateAssignForm()) {
        return
      }
      this.assigning = true
      try {
        const transferData = {
          to_company_id: Number(this.assignForm.target_company_id),
          reason: this.assignForm.remark || null
        }

        await createPodTransfer(this.currentAssignPod.uuid, transferData)

        this.$uiToast.success(this.$t('pods.transfers.initiate_success'))
        this.showAssignDialogVisible = false
        this.fetchData() // 刷新列表
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pods.transfers.initiate_failed'))
      } finally {
        this.assigning = false
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/pods.scss"></style>
