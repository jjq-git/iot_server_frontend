<template>
  <!-- 静音仓详情：基本信息 + 状态 + 控制 -->
  <div :class="['pod-detail', 'detail-page', { 'is-readonly': !canEdit() }]">

    <div v-if="loading && !detail.uuid" class="text-center py-4 text-muted">
      <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
      {{ $t('pod_detail.loading') }}
    </div>

    <template v-else>
      <b-tabs v-model="activeTabIndex" pills card>
        <!-- 基本信息标签页 -->
        <b-tab :title="$t('pod_detail.tabs.info')">
          <div class="card-style-b pod-info-layout">
            <div class="waterfall-container">
              <div class="section-b">
                <div class="section-header-b">
                  <app-icon name="file-earmark-text" class="section-icon" />
                  <span class="section-title-b">{{ $t('pod_detail.card.info') }}</span>
                </div>
                <div class="detail-list">
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pods.table.serial_no') }}</div>
                    <div class="detail-row__content">
                      <div v-if="editingField === 'serial_no'" class="edit-input-wrapper">
                        <base-input v-model.trim="editValue" :placeholder="$t('pods.create_dialog.serial_no_placeholder')" @blur="saveFieldEdit('serial_no')" @keyup.enter="saveFieldEdit('serial_no')" />
                      </div>
                      <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('serial_no', detail.serial_no) }">
                        <span>{{ detail.serial_no || $t('pods.table.serial_no_missing') }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.serial_number') }}</div>
                    <div class="detail-row__content"><span class="value-text">{{ detail.serial_number || '-' }}</span></div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.model_name') }}</div>
                    <div class="detail-row__content"><span class="value-text">{{ detail.model_name || '-' }}</span></div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.company_name') }}</div>
                    <div class="detail-row__content"><span class="value-text">{{ detail.company_name || '-' }}</span></div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.location_name') }}</div>
                    <div class="detail-row__content">
                      <div v-if="editingField === 'location_id'" class="edit-input-wrapper">
                        <base-select v-model="editValue" :options="locationSelectOptions" @input="handleLocationChange" />
                      </div>
                      <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('location_id', currentLocationId) }">
                        <span>{{ detail.location_name || '-' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.spot') }}</div>
                    <div class="detail-row__content">
                      <div v-if="editingField === 'spot'" class="edit-input-wrapper">
                        <base-input v-model="editValue" @blur="saveFieldEdit('spot')" @keyup.enter="saveFieldEdit('spot')" />
                      </div>
                      <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('spot', detail.spot) }">
                        <span>{{ detail.spot || '-' }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="detail-row detail-row--block">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.address_full') }}</div>
                    <div class="detail-row__content">
                      <div class="location-fields">
                      <div class="location-field">
                        <span class="field-label">{{ $t('pod_detail.fields.country') }}</span>
                        <div class="value-wrapper">
                          <span>{{ formatCountry(locationForm) }}</span>
                        </div>
                      </div>
                      <base-alert
                        v-if="regionLoadIssue"
                        variant="warning"
                        :dismissible="false"
                        class="location-region-alert"
                      >
                        <span>{{ $t(regionLoadIssue) }}</span>
                        <base-button size="sm" variant="outline-warning" class="ml-2" @click="retryRegionLoad">
                          {{ $t('common.retry') }}
                        </base-button>
                      </base-alert>
                      <div class="location-field">
                        <span class="field-label">{{ $t('pod_detail.fields.province') }}</span>
                        <div v-if="editingField === 'province'" class="edit-input-wrapper">
                          <base-select v-model="editValue" :options="provinceSelectOptions" @input="handleLocationFieldChange('province')" />
                        </div>
                        <div v-else class="value-wrapper editable" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('province', locationForm.province) }">
                          <span>{{ getProvinceName(locationForm.province) || '-' }}</span>
                        </div>
                      </div>
                      <div class="location-field">
                        <span class="field-label">{{ $t('pod_detail.fields.city') }}</span>
                        <div v-if="editingField === 'city'" class="edit-input-wrapper">
                          <base-select v-model="editValue" :options="citySelectOptions" @input="handleLocationFieldChange('city')" />
                        </div>
                        <div v-else class="value-wrapper editable" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('city', locationForm.city) }">
                          <span>{{ getCityName(locationForm.city) || '-' }}</span>
                        </div>
                      </div>
                      <div class="location-field">
                        <span class="field-label">{{ $t('pod_detail.fields.district') }}</span>
                        <div v-if="editingField === 'district'" class="edit-input-wrapper">
                          <base-select v-model="editValue" :options="districtSelectOptions" @input="handleLocationFieldChange('district')" />
                        </div>
                        <div v-else class="value-wrapper editable" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('district', locationForm.district) }">
                          <span>{{ getDistrictName(locationForm.district) || '-' }}</span>
                        </div>
                      </div>
                      <div class="location-field">
                        <span class="field-label">{{ $t('pod_detail.fields.building') }}</span>
                        <div v-if="editingField === 'building'" class="edit-input-wrapper">
                          <base-input v-model="editValue" @blur="handleLocationFieldChange('building')" @keyup.enter="handleLocationFieldChange('building')" />
                        </div>
                        <div v-else class="value-wrapper editable" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('building', locationForm.building) }">
                          <span>{{ locationForm.building || '-' }}</span>
                        </div>
                      </div>
                      </div>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.created_at') }}</div>
                    <div class="detail-row__content"><span class="value-text">{{ formatDateTime(detail.created_at) }}</span></div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.remark') }}</div>
                    <div class="detail-row__content">
                      <div v-if="editingField === 'remark'" class="edit-input-wrapper">
                        <base-input v-model="editValue" @blur="saveFieldEdit('remark')" @keyup.enter="saveFieldEdit('remark')" />
                      </div>
                      <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('remark', detail.remark) }">
                        <span v-if="detail.remark">{{ detail.remark }}</span>
                        <span v-else>-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="section-b">
                <div class="section-header-b">
                  <app-icon name="graph-up" class="section-icon" />
                  <span class="section-title-b">{{ $t('pod_detail.card.status') }}</span>
                </div>
                <div class="detail-list">
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.online_status') }}</div>
                    <div class="detail-row__content">
                      <base-badge :variant="detail.status.is_online ? 'success' : 'secondary'">
                        {{ detail.status.is_online ? $t('pod_detail.status.online') : $t('pod_detail.status.offline') }}
                      </base-badge>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.is_active') }}</div>
                    <div class="detail-row__content">
                      <div v-if="editingField === 'is_active'" class="edit-input-wrapper">
                        <base-select v-model="editValue" :options="activeStatusOptions" @input="saveFieldEdit('is_active')" />
                      </div>
                      <div v-else class="value-wrapper editable-b" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => startEdit('is_active', detail.is_active) }">
                        <base-badge :variant="statusActiveTagType(detail.is_active)">
                          {{ statusActiveLabel(detail.is_active) }}
                        </base-badge>
                      </div>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.last_seen') }}</div>
                    <div class="detail-row__content"><span class="value-text">{{ formatDateTime(detail.last_seen) }}</span></div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.host_device') }}</div>
                    <div class="detail-row__content">
                      <div v-if="detail.host">
                        <div class="value-text">{{ detail.host.model_code }} ({{ detail.host.mac_address }})</div>
                        <!-- 固件行已移除:pod 详情契约的 host 对象无 firmware_version 字段,恒为空 -->
                        <div v-if="detail.host.model_name" class="sub-text">{{ detail.host.model_name }}</div>
                      </div>
                      <span v-else class="value-text">-</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.bound_nodes') }}</div>
                    <div class="detail-row__content">
                      <div v-if="detail.node_count > 0 || (detail.nodes && detail.nodes.length > 0)">
                        <span>{{ detail.node_count || (detail.nodes ? detail.nodes.length : 0) }}{{ $t('pod_detail.events.node_count_suffix') }}</span>
                        <base-button variant="link" size="sm" class="p-0 ml-2" @click="viewNodes">{{ $t('pod_detail.actions.view_nodes') }}</base-button>
                      </div>
                      <span v-else class="value-text">-</span>
                    </div>
                  </div>
                  <div class="detail-row">
                    <div class="detail-row__label">{{ $t('pod_detail.fields.related_files') }}</div>
                    <div class="detail-row__content">
                      <div v-if="detail.file_count > 0 || (detail.files && detail.files.length > 0)">
                        <span>{{ detail.file_count || (detail.files ? detail.files.length : 0) }}{{ $t('pod_detail.events.file_count_suffix') }}</span>
                        <base-button variant="link" size="sm" class="p-0 ml-2" @click="viewFiles">{{ $t('pod_detail.actions.view_files') }}</base-button>
                      </div>
                      <span v-else class="value-text">-</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </b-tab>

        <!-- 控制面板标签页 -->
        <b-tab v-if="canControl" :title="$t('pod_detail.tabs.control')" :disabled="isRetired" lazy>
          <pod-control-panel
            :pod-uuid="detail.uuid"
            :online="detail.status && detail.status.is_online"
            :last-seen="detail.last_seen"
            :read-only="isRetired"
          />
        </b-tab>

        <!-- 历史记录标签页 -->
        <b-tab :title="$t('pod_detail.tabs.history')" lazy>
          <base-card>
            <template #header>
              <div class="d-flex justify-content-between align-items-center">
                <span>{{ $t('pod_detail.card.history') }}</span>
                <div class="d-flex align-items-center">
                  <!-- 日期筛选已移除:后端 /pods/{uuid}/records 仅支持 page/page_size,日期参数被忽略(实测确认),待后端支持后恢复 -->
                  <base-icon-button :label="$t('pod_detail.actions.export')" @click="exportHistory">
                    <app-icon name="download"  />
                  </base-icon-button>
                </div>
              </div>
            </template>
            <div>
              <div v-if="historyLoading" class="text-center py-3 text-muted">
                <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
                {{ $t('pod_detail.loading_history') }}
              </div>
              <base-table :items="historyData" :fields="historyTableFields" :loading="historyLoading" bordered>
                <template #cell(timestamp)="data">
                  {{ formatDateTime(data.item.timestamp) }}
                </template>
                <template #cell(event_type)="data">
                  <base-badge variant="secondary">{{ data.item.event_type }}</base-badge>
                </template>
              </base-table>
              <div class="history-pager pager-right">
                <base-pagination
                  v-model="historyPage"
                  :total-rows="historyTotal"
                  :per-page.sync="historyPageSize"
                  :show-per-page="true"
                  @input="handleHistoryPageChange"
                />
              </div>
            </div>
          </base-card>
        </b-tab>

        <b-tab :title="$t('pod_history.tab')" lazy>
          <pod-history-panel
            v-if="detail.uuid"
            :pod-uuid="detail.uuid"
            :current-topology-version="detail.current_topology_version"
            :lifecycle-state="detail.lifecycle_state"
            :read-only="isRetired"
            :resource-permissions="detail.resource_permissions || []"
            @changed="fetchDetail"
          />
        </b-tab>
      </b-tabs>

      <!-- 绑定节点弹框 -->
      <base-modal
        id="pod-detail-nodes-modal"
        :title="$t('pod_detail.modal.nodes_title')"
        v-model="nodesDialogVisible"
        size="xl"
        hide-footer
        class="dialog-with-header-bg model-el"
      >
        <base-table :items="nodesList" :fields="nodesTableFields" :loading="nodesLoading" bordered>
          <template #cell(mac_address)="data">
            <code v-if="data.item.mac_address" class="node-mac-address">
              {{ data.item.mac_address }}
            </code>
            <span v-else class="text-muted">—</span>
          </template>
          <template #cell(actions)="data">
            <div class="action-cell action-cell--nowrap">
              <base-action-button
                v-if="data.item.mac_address"
                :title="$t('pod_detail.actions.copy_mac')"
                @click="copyMacAddress(data.item)"
              >
                <app-icon name="files"  />
                <span>{{ $t('pod_detail.actions.copy_mac') }}</span>
              </base-action-button>
            </div>
          </template>
        </base-table>
        <div class="d-flex justify-content-end mt-3">
          <base-button variant="outline-secondary" @click="nodesDialogVisible = false">{{ $t('pod_detail.actions.close') }}</base-button>
        </div>
      </base-modal>

      <!-- 关联文件弹框 -->
      <base-modal
        id="pod-detail-files-modal"
        :title="$t('pod_detail.modal.files_title')"
        v-model="filesDialogVisible"
        size="lg"
        hide-footer
        class="dialog-with-header-bg model-el"
      >
        <base-table :items="filesList" :fields="filesTableFields" :loading="filesLoading" bordered>
          <template #cell(file_type)="data">
            <base-badge :variant="isImage(data.item) ? 'success' : 'secondary'">
              {{ data.item.file_type || 'file' }}
            </base-badge>
          </template>
          <template #cell(size)="data">
            <span>{{ formatFileSize(data.item.size) }}</span>
          </template>
          <template #cell(actions)="data">
            <div class="action-cell action-cell--nowrap">
              <base-action-button
                :title="$t('pod_detail.actions.download')"
                @click="downloadFile(data.item)"
              >
                <app-icon name="download"  />
                <span>{{ $t('pod_detail.actions.download') }}</span>
              </base-action-button>
            </div>
          </template>
        </base-table>
        <div class="d-flex justify-content-end mt-3">
          <base-button variant="outline-secondary" @click="filesDialogVisible = false">{{ $t('pod_detail.actions.close') }}</base-button>
        </div>
      </base-modal>
    </template>
  </div>
</template>

<script>
import { fetchPodControlSchema, fetchPodDetail, fetchPodStatus, fetchPodRecords, sendPodCommand, updatePod } from '@/api/pods'
import { fetchLocations } from '@/api/locations'
import { fetchProvinces, fetchCities, fetchDistricts } from '@/api/districts'
import { podDetailRealtime } from '@realtime-mode-entry'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import PodControlPanel from '@/components/PodControlPanel.vue'
import PodHistoryPanel from '@/components/PodHistoryPanel.vue'
import { copyText } from '@/utils/clipboard'
import { formatDate as formatDateUtil } from '@/utils/format'
import { normalizeImageUrl } from '@/utils/imageUrlHelper'
import { buildControlAddressIndex } from '@/utils/control-state.mjs'
import { formatPodRecordDescription } from '@/utils/pod-records.mjs'
import unsavedGuard from '@/mixins/unsavedGuard'
import { hasPermission, PERMISSION } from '@/utils/permission'

export default {
  name: 'PodDetail',
  permissionCapabilities: {
    edit: PERMISSION.POD_MAINTAIN
  },
  components: {
    BaseAlert,
    BaseButton,
    BaseCard,
    BaseInput,
    BaseModal,
    BasePagination,
    BaseSelect,
    BaseTable,
    PodControlPanel,
    PodHistoryPanel
  },
  mixins: [unsavedGuard],
  data () {
    return {
      loading: false,
      statusLoading: false,
      historyLoading: false,
      nodesLoading: false,
      activeTabIndex: 0,
      detail: {},
      statusMetrics: [],
      historyDateRange: [],
      historyData: [],
      historyTotal: 0,
      historyPage: 1,
      historyPageSize: 10,
      historyLoaded: false,
      historySchemaLoaded: false,
      historyAddressIndex: new Map(),
      // 节点弹框相关
      nodesDialogVisible: false,
      nodesList: [],
      // 文件弹框相关
      filesDialogVisible: false,
      filesList: [],
      filesLoading: false,
      // 编辑相关
      editingField: null,
      editValue: null,
      locationOptions: [],
      // 省市区联动相关
      locationForm: {
        // 存 ISO 3166-1 alpha-2 代码，显示名按代码走 i18n
        country_code: '',
        province: '',
        city: '',
        district: '',
        building: ''
      },
      provinceOptions: [],
      cityOptions: [],
      districtOptions: [],
      regionLoadIssues: {
        province: '',
        city: '',
        district: ''
      },
      savingLocation: false,
      // WebSocket 相关
      wsConnected: false,
      wsMessageLog: [] // WebSocket 消息日志
    }
  },
  created () {
    this.fetchDetail()
    this.fetchStatus()
    this.loadProvinces()
  },
  mounted () {
    // 数据加载成功后连接 WebSocket
    this.$nextTick(() => {
      if (this.detail.uuid) {
        this.connectWebSocket()
      }
    })
  },
  beforeDestroy () {
    // 组件销毁前断开 WebSocket
    this.disconnectWebSocket()
  },
  watch: {
    activeTabIndex (index) {
      if (index === this.historyTabIndex && !this.historyLoaded) this.fetchHistory()
    },
    isRetired (retired) {
      if (retired && this.activeTabIndex === 1) this.activeTabIndex = 0
    }
  },
  computed: {
    canControl () {
      return hasPermission(PERMISSION.POD_CONTROL, this.permissionUser) &&
        (!Array.isArray(this.detail.resource_permissions) || this.detail.resource_permissions.includes(PERMISSION.POD_CONTROL))
    },
    historyTabIndex () {
      return this.canControl ? 2 : 1
    },
    isRetired () {
      return this.detail.lifecycle_state === 'retired' ||
        this.detail.is_active === false ||
        this.detail.is_active === 0 ||
        this.detail.is_active === 'false'
    },
    regionLoadIssue () {
      return this.regionLoadIssues.province ||
        this.regionLoadIssues.city ||
        this.regionLoadIssues.district ||
        ''
    },
    controlCommands () {
      return [
        { key: 'start', label: this.$t('pod_detail.status.active_alt'), type: 'success', icon: 'play' },
        { key: 'pause', label: this.$t('pod_detail.status.pending'), type: 'warning', icon: 'pause' },
        { key: 'stop', label: this.$t('pod_detail.status.stopped'), type: 'danger', icon: 'stop' },
        { key: 'reset', label: this.$t('pod_detail.actions.search'), type: 'info', icon: 'arrow-clockwise' }
      ]
    },
    provinceSelectOptions () {
      return this.provinceOptions.map(item => ({ value: item.code, text: item.name }))
    },
    citySelectOptions () {
      return this.cityOptions.map(item => ({ value: item.code, text: item.name }))
    },
    districtSelectOptions () {
      return this.districtOptions.map(item => ({ value: item.code, text: item.name }))
    },
    locationSelectOptions () {
      return [
        { value: null, text: this.$t('common.none') },
        ...this.locationOptions
          .filter(item => item.is_active !== false)
          .map(item => ({
            value: item.id ?? item.uuid,
            text: item.location_name || item.name || '-'
          }))
      ]
    },
    currentLocationId () {
      return this.detail.location_id ??
        this.detail.location?.id ??
        this.detail.location_uuid ??
        this.detail.location?.uuid ??
        null
    },
    activeStatusOptions () {
      return [
        { value: true, text: this.$t('pod_detail.active_options.true') },
        { value: false, text: this.$t('pod_detail.active_options.false') }
      ]
    },
    historyTableFields () {
      return [
        { key: 'timestamp', label: this.$t('pod_detail.history_table.timestamp'), thStyle: { width: '180px' } },
        { key: 'event_type', label: this.$t('pod_detail.history_table.event_type'), thStyle: { width: '120px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'description', label: this.$t('pod_detail.history_table.description'), thStyle: { minWidth: '300px' } }
      ]
    },
    nodesTableFields () {
      const fields = [
        { key: 'can_node_id', label: this.$t('pod_detail.nodes_table.can_node_id'), thStyle: { width: '120px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'model_code', label: this.$t('pod_detail.nodes_table.model_code'), thStyle: { width: '180px' } },
        { key: 'model_name', label: this.$t('pod_detail.nodes_table.model_name'), thStyle: { minWidth: '150px' } }
      ]
      const hasMacAddress = this.nodesList.some(node => Boolean(node.mac_address))
      if (hasMacAddress) {
        fields.push(
          { key: 'mac_address', label: this.$t('pod_detail.nodes_table.mac_address'), thStyle: { width: '180px' } },
          { key: 'actions', label: this.$t('pod_detail.nodes_table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
        )
      }
      return fields
    },
    filesTableFields () {
      return [
        { key: 'file_name', label: this.$t('pod_detail.files_table.file_name'), thStyle: { minWidth: '200px' } },
        { key: 'file_type', label: this.$t('pod_detail.files_table.file_type'), thStyle: { width: '100px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'size', label: this.$t('pod_detail.files_table.size'), thStyle: { width: '100px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'actions', label: this.$t('pod_detail.files_table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  methods: {
    canEdit () {
      return !this.isRetired &&
        hasPermission(PERMISSION.POD_MAINTAIN, this.permissionUser) &&
        Array.isArray(this.detail.resource_permissions) &&
        this.detail.resource_permissions.includes(PERMISSION.POD_MAINTAIN)
    },
    // unsavedGuard mixin 接入：行内编辑某字段未保存时拦截路由切换/页面关闭
    isFormDirty () {
      return this.editingField !== null
    },
    formatDate (date) {
      if (!date) return ''
      const d = new Date(date)
      if (Number.isNaN(d.getTime())) return ''
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    async fetchDetail () {
      this.loading = true
      try {
        const podId = this.$route.params.podId
        const response = await fetchPodDetail(podId)
        const data = response.data || response

        // 确保 status 字段正确映射
        this.detail = {
          ...data,
          status: data.status || data.current_status || 'idle'
        }

        // 加载位置表单数据
        this.loadLocationForm()

        // 数据加载成功后连接 WebSocket
        if (!this.wsConnected) {
          this.connectWebSocket()
        }
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_detail_failed'))
      } finally {
        this.loading = false
      }
    },
    async fetchStatus () {
      this.statusLoading = true
      try {
        const podId = this.$route.params.podId
        const response = await fetchPodStatus(podId)
        const data = response.data || response

        // Transform API response to statusMetrics array
        this.statusMetrics = [
          {
            key: 'temperature',
            label: this.$t('pod_detail.metric.temperature'),
            value: data.status.temperature !== undefined ? data.status.temperature : '-',
            unit: '°C',
            icon: 'thermometer-half',
            type: 'temp'
          },
          {
            key: 'humidity',
            label: this.$t('pod_detail.metric.humidity'),
            value: data.status.humidity !== undefined ? data.status.humidity : '-',
            unit: '%',
            icon: 'droplet',
            type: 'humidity'
          },
          {
            key: 'noise',
            label: this.$t('pod_detail.metric.noise'),
            value: data.status.noise !== undefined ? data.status.noise : '-',
            unit: 'dB',
            icon: 'soundwave',
            type: 'noise'
          },
          {
            key: 'air_quality',
            label: this.$t('pod_detail.metric.air_quality'),
            value: data.status.air_quality || '-',
            unit: '',
            icon: 'wind',
            type: 'air'
          }
        ]
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_status_failed'))
      } finally {
        this.statusLoading = false
      }
    },
    historyDescriptionLabels () {
      return {
        on: this.$t('pod_detail.labels.on'),
        off: this.$t('pod_detail.labels.off'),
        node: 'NID',
        fields: {
          is_online: this.$t('pod_detail.labels.is_online'),
          light_switch: this.$t('pod_detail.labels.light_switch'),
          light_brightness: this.$t('pod_detail.labels.light_brightness'),
          fan_switch: this.$t('pod_detail.labels.fan_switch'),
          fan_speed: this.$t('pod_detail.labels.fan_speed'),
          temperature: this.$t('pod_detail.labels.temperature'),
          humidity: this.$t('pod_detail.labels.humidity'),
          noise: this.$t('pod_detail.labels.noise'),
          air_quality: this.$t('pod_detail.labels.air_quality')
        }
      }
    },
    formatHistoryDescription (recordData) {
      return formatPodRecordDescription(
        recordData,
        this.historyAddressIndex,
        this.historyDescriptionLabels()
      )
    },
    async ensureHistorySchema (podId) {
      if (this.historySchemaLoaded) return
      try {
        const schema = await fetchPodControlSchema(podId)
        this.historyAddressIndex = buildControlAddressIndex(schema?.modules || [])
      } catch (error) {
        // 历史接口仍可显示 OD 地址；控制模型加载失败不应阻断历史查询。
        this.historyAddressIndex = new Map()
      } finally {
        this.historySchemaLoaded = true
      }
    },
    async fetchHistory () {
      this.historyLoading = true
      try {
        const podId = this.$route.params.podId
        const params = {
          page: this.historyPage,
          page_size: this.historyPageSize
        }

        const [, response] = await Promise.all([
          this.ensureHistorySchema(podId),
          fetchPodRecords(podId, params)
        ])
        const data = response.data || response

        // Handle different response structures and normalize field names
        let rawItems = null
        if (data.records) {
          rawItems = data.records
        } else if (data.items) {
          rawItems = data.items
        } else if (Array.isArray(data)) {
          rawItems = data
        }

        // records 保存 MQTT 状态快照；字段名由控制模型的 NID/IDX/SIDX 地址解析。
        if (rawItems && rawItems.length > 0) {
          this.historyData = rawItems.map(item => ({
            timestamp: item.recorded_at || item.timestamp,
            event_type: item.event_type || this.$t('pod_detail.labels.report'),
            description: this.formatHistoryDescription(item.record_data),
            _raw: item
          }))
        } else {
          this.historyData = []
        }

        // Extract total count from response
        this.historyTotal = data.total || data.count || 0
        this.historyLoaded = true
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_history_failed'))
      } finally {
        this.historyLoading = false
      }
    },
    getStatusLabel (status) {
      if (!status) return this.$t('pod_detail.status.unknown')
      const statusStr = String(status).toLowerCase()
      const map = {
        idle: this.$t('pod_detail.status.idle'),
        in_use: this.$t('pod_detail.status.in_use'),
        'in-use': this.$t('pod_detail.status.in_use'),
        inuse: this.$t('pod_detail.status.in_use'),
        maintenance: this.$t('pod_detail.status.maintenance'),
        error: this.$t('pod_detail.status.error'),
        offline: this.$t('pod_detail.status.offline'),
        online: this.$t('pod_detail.status.online'),
        active: this.$t('pod_detail.status.active_alt'),
        stopped: this.$t('pod_detail.status.stopped'),
        pending: this.$t('pod_detail.status.pending')
      }
      return map[statusStr] || status
    },
    getStatusTag (status) {
      if (!status) return 'info'
      const statusStr = String(status).toLowerCase()
      const map = {
        idle: 'success',
        in_use: 'primary',
        'in-use': 'primary',
        inuse: 'primary',
        maintenance: 'warning',
        error: 'danger',
        offline: 'info',
        online: 'success',
        active: 'success',
        stopped: 'info',
        pending: 'warning'
      }
      return map[statusStr] || 'info'
    },
    formatDateTime (dateString) {
      return formatDateUtil(dateString)
    },
    // 开始编辑
    async startEdit (field, value) {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      this.editingField = field
      this.editValue = value

      if (field === 'location_id' && !this.locationOptions.length) {
        await this.loadLocationOptions()
      }

      // 如果是省份，需要加载省份选项
      if (field === 'province') {
        this.loadProvinces()
      }
      // 如果是城市，需要加载城市选项
      if (field === 'city' && this.locationForm.province) {
        this.loadCities(this.locationForm.province)
      }
      // 如果是区县，需要加载区县选项
      if (field === 'district' && this.locationForm.city) {
        this.loadDistricts(this.locationForm.city)
      }
    },
    // 处理位置字段选择
    handleLocationFieldChange (field) {
      this.$nextTick(() => {
        this.saveLocationField(field)
      })
    },
    // 保存位置字段
    async saveLocationField (field) {
      if (!this.canEdit()) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      try {
        // 更新 locationForm
        this.locationForm[field] = this.editValue

        // 如果是省份，改变时需要加载城市
        if (field === 'province') {
          this.locationForm.city = ''
          this.locationForm.district = ''
          this.cityOptions = []
          this.districtOptions = []
          this.regionLoadIssues.city = ''
          this.regionLoadIssues.district = ''
          if (this.editValue) {
            await this.loadCities(this.editValue)
          }
        }
        // 如果是城市，改变时需要加载区县
        if (field === 'city') {
          this.locationForm.district = ''
          this.districtOptions = []
          this.regionLoadIssues.district = ''
          if (this.editValue) {
            await this.loadDistricts(this.editValue)
          }
        }

        // 构建更新数据
        const updateData = {
          location: { ...this.locationForm }
        }

        await updatePod(this.detail.uuid, updateData)
        // 刷新详情数据
        this.fetchDetail()

        this.$uiToast.success(this.$t('pod_detail.toast.modify_success'))
        this.editingField = null
        this.editValue = null
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.update_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
        // 恢复原值
        this.loadLocationForm()
      }
    },
    /** 国家显示：按 ISO-2 走 i18n，未回填代码的老数据回退到后端显示名 */
    formatCountry (item) {
      if (!item) return '-'
      if (item.country_code === 'CN') return this.$t('pod_detail.default_country')
      return item.country_name || item.country || '-'
    },
    // 获取省份名称
    getProvinceName (code) {
      if (!code || !Array.isArray(this.provinceOptions)) return ''
      const province = this.provinceOptions.find(p => p.code === code)
      return province ? province.name : ''
    },
    // 获取城市名称
    getCityName (code) {
      if (!code || !Array.isArray(this.cityOptions)) return ''
      const city = this.cityOptions.find(c => c.code === code)
      return city ? city.name : ''
    },
    // 获取区县名称
    getDistrictName (code) {
      if (!code || !Array.isArray(this.districtOptions)) return ''
      const district = this.districtOptions.find(d => d.code === code)
      return district ? district.name : ''
    },
    // 取消编辑
    cancelEdit () {
      this.editingField = null
      this.editValue = null
    },
    // 加载位置选项
    async loadLocationOptions () {
      try {
        const res = await fetchLocations({ page: 1, page_size: 100 })
        this.locationOptions = res?.data?.list || res?.data || res?.items || res || []
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_locations_failed'))
      }
    },
    // 获取省份列表
    async loadProvinces () {
      try {
        const res = await fetchProvinces()
        // API 返回 {total, items} 结构
        const data = res?.items || res?.data?.items || res?.data || res || []
        this.provinceOptions = Array.isArray(data) ? data : []
        this.regionLoadIssues.province = this.provinceOptions.length
          ? ''
          : 'pod_detail.region_data.empty'
      } catch (error) {
        this.provinceOptions = []
        this.regionLoadIssues.province = 'pod_detail.region_data.load_failed'
      }
    },
    // 获取城市列表
    async loadCities (provinceCode) {
      try {
        const res = await fetchCities(provinceCode)
        const data = res?.items || res?.data?.items || res?.data || res || []
        this.cityOptions = Array.isArray(data) ? data : []
        this.regionLoadIssues.city = this.cityOptions.length
          ? ''
          : 'pod_detail.region_data.empty'
      } catch (error) {
        this.cityOptions = []
        this.regionLoadIssues.city = 'pod_detail.region_data.load_failed'
      }
    },
    // 获取区县列表
    async loadDistricts (cityCode) {
      try {
        const res = await fetchDistricts(cityCode)
        const data = res?.items || res?.data?.items || res?.data || res || []
        this.districtOptions = Array.isArray(data) ? data : []
        this.regionLoadIssues.district = this.districtOptions.length
          ? ''
          : 'pod_detail.region_data.empty'
      } catch (error) {
        this.districtOptions = []
        this.regionLoadIssues.district = 'pod_detail.region_data.load_failed'
      }
    },
    retryRegionLoad () {
      if (this.regionLoadIssues.province) return this.loadProvinces()
      if (this.regionLoadIssues.city && this.locationForm.province) {
        return this.loadCities(this.locationForm.province)
      }
      if (this.regionLoadIssues.district && this.locationForm.city) {
        return this.loadDistricts(this.locationForm.city)
      }
      return this.loadProvinces()
    },
    // 处理省份选择
    async handleProvinceChange (value) {
      // 省份改变时，重置城市和区县
      this.locationForm.city = ''
      this.locationForm.district = ''
      this.districtOptions = []
      this.regionLoadIssues.city = ''
      this.regionLoadIssues.district = ''
      // 加载城市列表
      if (value) {
        await this.loadCities(value)
      }
    },
    // 处理城市选择
    async handleCityChange (value) {
      // 城市改变时，重置区县
      this.locationForm.district = ''
      this.regionLoadIssues.district = ''
      // 加载区县列表
      if (value) {
        await this.loadDistricts(value)
      }
    },
    // 保存位置信息
    async saveLocation () {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      const { country_code: countryCode, province, city, district, building } = this.locationForm

      if (!province || !city || !district) {
        this.$uiToast.warning(this.$t('pod_detail.toast.save_location_invalid'))
        return
      }

      this.savingLocation = true
      try {
        const updateData = {
          location: {
            country_code: countryCode || null,
            province,
            city,
            district,
            building: building || null
          }
        }

        await updatePod(this.detail.uuid, updateData)
        this.$uiToast.success(this.$t('pod_detail.toast.save_location_success'))

        // 更新本地数据
        this.detail.location = updateData.location
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.save_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
      } finally {
        this.savingLocation = false
      }
    },
    // 加载位置表单数据
    async loadLocationForm () {
      const location = this.detail.location
      if (location) {
        this.locationForm = {
          // 只认后端回填过的 ISO-2，未回填的老数据留空，避免把未知国家改写成中国
          country_code: location.country_code || '',
          province: location.province || '',
          city: location.city || '',
          district: location.district || '',
          building: location.building || ''
        }

        // 加载对应的省市区选项
        if (location.province) {
          // 先加载省份列表（用于显示名称）
          await this.loadProvinces()
          // 然后加载城市列表
          await this.loadCities(location.province)
          // 加载区县列表
          if (location.city) {
            await this.loadDistricts(location.city)
          }
        }
      }
    },
    // 处理位置选择
    handleLocationChange (value) {
      this.$nextTick(() => {
        this.saveFieldEdit('location_id', value)
      })
    },
    // 保存字段编辑
    async saveFieldEdit (field, value) {
      if (!this.canEdit()) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      try {
        const updateData = {}
        if (field === 'location_id') {
          const selectedValue = value !== undefined ? value : this.editValue

          updateData.location_id = selectedValue
          // 查找选中的位置名称
          const selectedLocation = this.locationOptions.find(loc => (loc.id ?? loc.uuid) === selectedValue)

          if (selectedLocation) {
            this.detail.location_name = selectedLocation.location_name
            this.detail.location_id = selectedLocation.id ?? null
            this.detail.location_uuid = selectedLocation.uuid ?? null
          } else if (selectedValue === null || selectedValue === '') {
            this.detail.location_name = ''
            this.detail.location_id = null
            this.detail.location_uuid = null
          }
        } else if (field === 'is_active') {
          const selectedValue = value !== undefined ? value : this.editValue
          updateData.is_active = selectedValue
        } else if (field === 'serial_no') {
          const selectedValue = value !== undefined ? value : this.editValue
          updateData.serial_no = typeof selectedValue === 'string' ? (selectedValue.trim() || null) : null
          this.detail.serial_no = updateData.serial_no
        } else if (field === 'spot') {
          const selectedValue = value !== undefined ? value : this.editValue
          updateData.spot = selectedValue
          this.detail.spot = selectedValue
        } else if (field === 'remark') {
          const selectedValue = value !== undefined ? value : this.editValue
          updateData.remark = selectedValue
          this.detail.remark = selectedValue
        }

        await updatePod(this.detail.uuid, updateData)
        this.$uiToast.success(this.$t('pod_detail.toast.modify_success'))
        this.editingField = null
        this.editValue = null
        // 刷新详情数据
        this.fetchDetail()
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.update_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
        // 恢复原值
        this.fetchDetail()
      }
    },
    // 是否激活标签类型
    statusActiveTagType (value) {
      if (value === true || value === 'true') return 'success'
      return 'info'
    },
    // 是否激活标签文本
    statusActiveLabel (value) {
      if (value === true || value === 'true') return this.$t('pod_detail.status.active')
      return this.$t('pod_detail.status.inactive')
    },

    refreshStatus () {
      this.fetchStatus()
    },
    sendCommand (cmd) {
      const podId = this.$route.params.podId
      if (!podId) {
        this.$uiToast.error(this.$t('pod_detail.toast.no_pod_id'))
        return
      }

      this.$uiConfirm(this.$t('pod_detail.toast.command_confirm_msg', { cmd: cmd.label }), {
        title: this.$t('pod_detail.toast.command_confirm_title'),
        okTitle: this.$t('pod_detail.toast.command_confirm_ok'),
        cancelTitle: this.$t('pod_detail.toast.command_confirm_cancel'),
        okVariant: 'warning'
      }).then(async (confirmed) => {
        if (!confirmed) return
        try {
          await sendPodCommand(podId, { command: cmd.key })
          this.$uiToast.success(this.$t('pod_detail.toast.command_sent', { cmd: cmd.label }))
          // 命令发送后刷新状态
          this.fetchStatus()
        } catch (error) {
          this.$uiToast.error(this.$t('pod_detail.toast.send_command_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
        }
      }).catch(() => {})
    },
    async viewNodes () {
      const podId = this.$route.params.podId
      if (!podId) {
        this.$uiToast.error(this.$t('pod_detail.toast.no_pod_id'))
        return
      }

      this.nodesDialogVisible = true
      this.nodesList = []
      this.nodesLoading = true

      try {
        // 从详情数据中获取节点列表
        const response = await fetchPodDetail(podId)
        const data = response.data || response

        // API 返回的节点数据结构
        this.nodesList = data.nodes || []

        if (this.nodesList.length === 0) {
          this.$uiToast.info(this.$t('pod_detail.toast.no_nodes_bound'))
        }
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_nodes_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
      } finally {
        this.nodesLoading = false
      }
    },
    async copyMacAddress (row) {
      const macAddress = row.mac_address
      if (!macAddress) {
        this.$uiToast.warning(this.$t('pod_detail.toast.no_mac'))
        return
      }

      try {
        await copyText(macAddress)
        this.$uiToast.success(this.$t('pod_detail.toast.mac_copied_prefix') + macAddress)
      } catch (err) {
        this.$uiToast.error(this.$t('pod_detail.toast.mac_copy_failed'))
      }
    },
    async viewFiles () {
      const podId = this.$route.params.podId
      if (!podId) {
        this.$uiToast.error(this.$t('pod_detail.toast.no_pod_id'))
        return
      }

      this.filesDialogVisible = true
      this.filesLoading = true

      try {
        const response = await fetchPodDetail(podId)
        const data = response.data || response

        this.filesList = data.files || data.related_files || []

        if (this.filesList.length === 0) {
          this.$uiToast.info(this.$t('pod_detail.toast.no_files'))
        }
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.load_files_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
      } finally {
        this.filesLoading = false
      }
    },

    // 判断是否为图片
    isImage (file) {
      return file.file_type === 'image' || (file.mime_type && file.mime_type.startsWith('image/'))
    },
    // 获取文件 URL
    getFileUrl (file) {
      return normalizeImageUrl(file?.file_path || file?.storage_path || '')
    },
    // 预览文件
    previewFile (file) {
      const url = this.getFileUrl(file)
      if (!url) {
        this.$uiToast.warning(this.$t('pod_detail.toast.no_file_path'))
        return
      }
      const previewWindow = window.open(url, '_blank', 'noopener,noreferrer')
      if (!previewWindow) {
        this.$uiToast.warning(this.$t('pod_detail.toast.default_retry'))
      }
    },
    // 下载文件
    downloadFile (file) {
      const url = this.getFileUrl(file)
      if (!url) {
        this.$uiToast.warning(this.$t('pod_detail.toast.no_file_path'))
        return
      }
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      this.$uiToast.success(this.$t('pod_detail.toast.download_start') + file.file_name)
    },
    // 复制文件路径
    async copyFilePath (row) {
      const filePath = row.storage_path || row.file_path
      if (!filePath) {
        this.$uiToast.warning(this.$t('pod_detail.toast.no_file_path'))
        return
      }

      try {
        await copyText(filePath)
        this.$uiToast.success(this.$t('pod_detail.toast.filepath_copied'))
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.mac_copy_failed'))
      }
    },
    // 获取文件类型标签
    getFileTypeLabel (fileType) {
      const map = {
        image: this.$t('pod_detail.file_type_label.image'),
        video: this.$t('pod_detail.file_type_label.video'),
        audio: this.$t('pod_detail.file_type_label.audio'),
        document: this.$t('pod_detail.file_type_label.document'),
        archive: this.$t('pod_detail.file_type_label.archive'),
        other: this.$t('pod_detail.file_type_label.other')
      }
      return map[fileType] || fileType || this.$t('pod_detail.file_type_label.other')
    },
    // 获取文件类型标签颜色
    getFileTagType (fileType) {
      const map = {
        image: 'primary',
        video: 'success',
        audio: 'warning',
        document: 'info',
        archive: 'danger'
      }
      return map[fileType] || 'info'
    },
    // 格式化文件大小
    formatFileSize (bytes) {
      if (!bytes || bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i]
    },
    async exportHistory () {
      const podId = this.$route.params.podId
      if (!podId) {
        this.$uiToast.error(this.$t('pod_detail.toast.no_pod_id'))
        return
      }

      this.$uiToast.info(this.$t('pod_detail.toast.exporting'))

      try {
        await this.ensureHistorySchema(podId)
        // 分页拉取全部记录
        const allItems = []
        let page = 1
        const pageSize = 100
        let total = 0

        do {
          const response = await fetchPodRecords(podId, { page, page_size: pageSize })
          const data = response.data || response
          const items = data.items || data.records || (Array.isArray(data) ? data : [])
          total = data.total || 0
          allItems.push(...items)
          page++
        } while (allItems.length < total && page <= 100)

        // 构建 CSV 文件内容（\uFEFF BOM 让 Excel 正确识别 UTF-8 中文）
        const escapeCSV = (val) => {
          if (val == null) return ''
          const str = String(val)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"'
          }
          return str
        }
        const rows = [[this.$t('pod_detail.history_table.timestamp'), this.$t('pod_detail.history_table.event_type'), this.$t('pod_detail.history_table.description')]]
        allItems.forEach(item => {
          const time = item.recorded_at || ''
          const type = item.event_type || this.$t('pod_detail.labels.report')
          rows.push([time, type, this.formatHistoryDescription(item.record_data)])
        })

        const csvContent = '\uFEFF' + rows.map(row => row.map(escapeCSV).join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url

        const serial = this.detail.serial_number || this.detail.uuid || 'pod'
        const fileName = `${serial}${this.$t('pod_detail.toast.history_filename_suffix')}`.replace(/[/\\:*?"<>|]/g, '_')
        link.download = fileName

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        this.$uiToast.success(this.$t('pod_detail.toast.export_count_suffix', { count: allItems.length }))
      } catch (error) {
        this.$uiToast.error(this.$t('pod_detail.toast.export_failed_prefix') + (this.$getErrorMessage(error) || this.$t('pod_detail.toast.default_retry')))
      }
    },
    handleHistoryPageChange (page) {
      this.historyPage = page
      this.fetchHistory()
    },
    goBack () {
      this.$router.push('/pods')
    },
    // ========== WebSocket 相关方法 ==========
    connectWebSocket () {
      // 如果 WebSocket 已连接，跳过
      if (this.wsConnected) {
        return
      }

      const hostUuid = this.detail.host && this.detail.host.uuid
      if (!hostUuid) {
        console.warn('[PodDetail] host uuid empty, skip WebSocket connect')
        return
      }

      this.addWsLog('connecting WebSocket...', 'info')

      podDetailRealtime.connect(hostUuid, {
        connected: (data) => {
          this.wsConnected = true
          this.addWsLog(`connected message: ${JSON.stringify(data)}`, 'success')
        },
        statusUpdate: (data) => {
          this.wsConnected = true
          this.addWsLog(`status update: ${JSON.stringify(data)}`, 'warning')
          this.handleStatusUpdate(data)
        },
        error: (error) => {
          console.error('[PodDetail] WebSocket error:', error)
          this.wsConnected = false
          this.addWsLog(`WebSocket error: ${JSON.stringify(error)}`, 'danger')
        }
      })
    },
    disconnectWebSocket () {
      if (this.wsConnected) {
        podDetailRealtime.disconnect()
        this.wsConnected = false
      }
    },
    handleStatusUpdate (data) {
      if (!data || !data.data) {
        this.addWsLog('empty payload, ignore', 'info')
        return
      }

      const statusData = data.data
      this.addWsLog(`update status - is_online: ${statusData.is_online}, last_seen: ${statusData.last_seen || '-'}`, 'info')

      // 更新 detail 中的状态
      if (statusData.is_online !== undefined) {
        this.detail.status = this.detail.status || {}
        const oldStatus = this.detail.status.is_online
        this.detail.status.is_online = statusData.is_online
        if (oldStatus !== statusData.is_online) {
          const oldLabel = oldStatus ? this.$t('pod_detail.labels.online') : this.$t('pod_detail.labels.offline')
          const newLabel = statusData.is_online ? this.$t('pod_detail.labels.online') : this.$t('pod_detail.labels.offline')
          this.addWsLog(`online status change: ${oldLabel} -> ${newLabel}`, statusData.is_online ? 'success' : 'danger')
          const wsStatus = statusData.is_online ? this.$t('pod_detail.toast.ws_status_online') : this.$t('pod_detail.toast.ws_status_offline')
          this.$uiToast.success(this.$t('pod_detail.toast.ws_status_change_msg', { status: wsStatus }))
        }
      }
      if (statusData.last_seen) {
        this.detail.last_seen = statusData.last_seen
      }
    },
    // 添加 WebSocket 日志
    addWsLog (message, type = 'info') {
      const log = {
        time: formatDateUtil(new Date(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type
      }
      this.wsMessageLog.push(log)
      // 最多保留 100 条
      if (this.wsMessageLog.length > 100) {
        this.wsMessageLog.shift()
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/pod-detail.scss"></style>
