<template>
  <div class="locations">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="locations__filters" @submit.prevent>
          <base-form-group class="locations__filter-field" :label="$t('locations.filter.province_label')" label-for="location-filter-province">
            <base-select
              id="location-filter-province"
              class="locations__filter-control"
              v-model="query.province"
              :options="searchProvinceOptions"
              :placeholder="$t('locations.filter.province_placeholder')"
              clearable
              @change="onSearchProvinceChange"
            />
          </base-form-group>
          <base-form-group class="locations__filter-field" :label="$t('locations.filter.city_label')" label-for="location-filter-city">
            <base-select
              id="location-filter-city"
              class="locations__filter-control"
              v-model="query.city"
              :options="searchCityOptions"
              :placeholder="$t('locations.filter.city_placeholder')"
              :disabled="!query.province"
              clearable
            />
          </base-form-group>
          <base-form-group class="locations__filter-field" :label="$t('locations.filter.gps_label')" label-for="location-filter-gps">
            <base-select id="location-filter-gps" v-model="query.has_gps" class="locations__filter-control" :options="gpsFilterOptions" :placeholder="$t('locations.filter.gps_status_placeholder')" clearable />
          </base-form-group>
          <base-form-group class="locations__filter-field" :label="$t('locations.filter.active_label')" label-for="location-filter-active">
            <base-select id="location-filter-active" v-model="query.is_active" class="locations__filter-control" :options="activeFilterOptions" :placeholder="$t('locations.filter.active_all')" clearable />
          </base-form-group>
          <div class="filter-actions locations__filter-actions">
            <base-button class="locations__filter-action" variant="primary" @click="handleSearch">
              <app-icon name="search"></app-icon> {{ $t('common.search') }}
            </base-button>
            <base-button class="locations__filter-action" variant="outline-secondary" @click="resetFilters">
              <app-icon name="arrow-counterclockwise"></app-icon> {{ $t('common.reset') }}
            </base-button>
            <base-button v-if="canCreate()" class="locations__filter-action" variant="primary" @click="showCreateDialog = true">
              <app-icon name="plus"></app-icon> {{ $t('locations.actions.create') }}
            </base-button>
          </div>
        </b-form>
      </template>

      <base-table :items="tableData" :fields="visibleTableFields" :loading="loading" :load-error="loadError" bordered @retry="fetchData">
        <template #cell(full_address)="data">
          {{ getFullAddress(data.item) }}
        </template>
        <template #cell(country_code)="data">
          {{ formatCountry(data.item) }}
        </template>
        <template #cell(gps_coordinates)="data">
          <span v-if="data.item.gps && data.item.gps.lat != null && data.item.gps.lng != null">
            {{ Number(data.item.gps.lat).toFixed(6) }}, {{ Number(data.item.gps.lng).toFixed(6) }}
          </span>
          <span v-else>-</span>
        </template>
        <template #cell(pod_count)="data">
          <base-badge :variant="data.item.pod_count > 0 ? 'success' : 'secondary'">
            {{ data.item.pod_count || 0 }}
          </base-badge>
        </template>
        <template #cell(created_at)="data">
          {{ formatDateTime(data.item.created_at) }}
        </template>
        <template #cell(is_active)="data">
          <b-form-checkbox
            v-model="data.item.is_active"
            switch
            :aria-label="`${$t('locations.table.is_active')}: ${data.item.location_name}`"
            :disabled="!canEdit() || !!activeLoading[data.item.id]"
            @change="toggleActiveStatus(data.item)"
          />
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility
              :columns="locationColumns"
              :table-key="'locations-table'"
              @update:columns="handleLocationColumnsUpdate"
            />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button @click="viewDetail(data.item)" :title="$t('locations.icons.details')"> <app-icon name="eye"  /> <span>{{ $t('locations.icons.details') }}</span> </base-action-button>
          <base-action-button v-if="canEdit()" @click="editLocation(data.item)" :title="$t('common.edit')"> <app-icon name="pencil"  /> <span>{{ $t('common.edit') }}</span> </base-action-button>
          <b-dropdown v-if="canDeleteLocation()" right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.location_name].filter(Boolean).join(' ') }">
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button class="text-danger" @click="deleteLocation(data.item)"><app-icon name="trash" aria-hidden="true" /> {{ $t('common.delete') }}</b-dropdown-item-button>
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

    <!-- 新增地址对话框 -->
    <base-modal
      v-model="showCreateDialog"
      :title="$t('locations.create_dialog.title')"
      size="lg"
      header-bg-variant="primary"
      header-text-variant="white"
      :centered="false"
      :scrollable="false"
      @hidden="resetCreateForm"
    >
      <b-form ref="createFormRef" @submit.prevent>
        <base-form-group
          :label="$t('locations.form.location_name_label')"
          label-for="createForm-location_name"
          required
          :state="createErrors.location_name ? false : null"
          :invalid-feedback="createErrors.location_name"
        >
          <base-input
            id="createForm-location_name"
            v-model="createForm.location_name"
            :placeholder="$t('locations.form.location_name_placeholder')"
            :state="createErrors.location_name ? false : null"
            :clearable="false"
            @input="clearFieldError('createErrors', 'location_name')"
          />
        </base-form-group>

        <b-row>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.country_label')">
              <base-input
                :value="formatCountry(createForm)"
                disabled
                :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.province_label')">
              <base-select
                v-model="createForm.province"
                :options="regionOptions.provinces"
                :placeholder="$t('locations.form.province_placeholder')"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.city_label')">
              <base-select
                v-model="createForm.city"
                :options="regionOptions.cities"
                :placeholder="$t('locations.form.city_placeholder')"
                :disabled="!createForm.province"
              />
            </base-form-group>
          </b-col>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.district_label')">
              <base-select
                v-model="createForm.district"
                :options="regionOptions.districts"
                :placeholder="$t('locations.form.district_placeholder')"
                :disabled="!createForm.city"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.street_label')">
              <base-input
                v-model="createForm.street"
                :placeholder="$t('locations.form.street_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.building_label')">
              <base-input
                v-model="createForm.building"
                :placeholder="$t('locations.form.building_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.lat_label')">
              <base-input
                v-model="createForm.gps_lat"
                :placeholder="$t('locations.form.lat_placeholder')"
                type="number"
                step="0.000001" :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.lng_label')">
              <base-input
                v-model="createForm.gps_lng"
                :placeholder="$t('locations.form.lng_placeholder')"
                type="number"
                step="0.000001" :clearable="false"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <base-form-group :label="$t('locations.form.timezone_label')">
          <base-input
            v-model="createForm.timezone"
            :placeholder="$t('locations.form.timezone_placeholder')"
            :clearable="false"
          />
        </base-form-group>

        <base-form-group :label="$t('locations.form.remark_label')">
          <b-form-textarea
            v-model="createForm.remark"
            :rows="3"
            :placeholder="$t('locations.form.remark_placeholder')"
          />
        </base-form-group>
      </b-form>

      <template #modal-footer>
        <base-button variant="secondary" :disabled="creating" @click="resetCreateForm">
          <app-icon name="x-circle"></app-icon> {{ $t('common.cancel') }}
        </base-button>
        <base-button variant="primary" :loading="creating" :disabled="creating" @click="createLocation">
          <app-icon name="check"></app-icon> {{ $t('common.create_confirm') }}
        </base-button>
      </template>
    </base-modal>

    <!-- 编辑地址对话框 -->
    <base-modal
      v-model="showEditDialog"
      :title="$t('locations.edit_dialog.title')"
      size="lg"
      header-bg-variant="primary"
      header-text-variant="white"
      :centered="false"
      :scrollable="false"
      @hidden="resetEditForm"
    >
      <b-form ref="editFormRef" @submit.prevent>
        <base-form-group
          :label="$t('locations.form.location_name_label')"
          label-for="editForm-location_name"
          required
          :state="editErrors.location_name ? false : null"
          :invalid-feedback="editErrors.location_name"
        >
          <base-input
            id="editForm-location_name"
            v-model="editForm.location_name"
            :placeholder="$t('locations.form.location_name_placeholder')"
            :state="editErrors.location_name ? false : null"
            :clearable="false"
            @input="clearFieldError('editErrors', 'location_name')"
          />
        </base-form-group>

        <div class="modal-section-title">{{ $t('locations.form.detail_address') }}</div>

        <b-row>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.country_label')">
              <base-input
                :value="formatCountry(currentEditLocation || editForm)"
                disabled
                :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.province_label')">
              <base-select
                v-model="editForm.province"
                :options="regionOptions.provinces"
                :placeholder="$t('locations.form.province_placeholder')"
              />
            </base-form-group>
          </b-col>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.city_label')">
              <base-select
                v-model="editForm.city"
                :options="regionOptions.cities"
                :placeholder="$t('locations.form.city_placeholder')"
                :disabled="!editForm.province"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <b-row>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.district_label')">
              <base-select
                v-model="editForm.district"
                :options="regionOptions.districts"
                :placeholder="$t('locations.form.district_placeholder')"
                :disabled="!editForm.city"
              />
            </base-form-group>
          </b-col>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.street_label')">
              <base-input
                v-model="editForm.street"
                :placeholder="$t('locations.form.street_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="4">
            <base-form-group :label="$t('locations.form.building_label')">
              <base-input
                v-model="editForm.building"
                :placeholder="$t('locations.form.building_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <div class="modal-section-title">{{ $t('locations.form.gps_optional') }}</div>

        <b-row>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.lat_label')">
              <base-input
                v-model="editForm.gps_lat"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                :placeholder="$t('locations.form.lat_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
          <b-col cols="6">
            <base-form-group :label="$t('locations.form.lng_label')">
              <base-input
                v-model="editForm.gps_lng"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                :placeholder="$t('locations.form.lng_placeholder')" :clearable="false"
              />
            </base-form-group>
          </b-col>
        </b-row>

        <base-form-group :label="$t('locations.form.timezone_label')">
          <base-input
            v-model="editForm.timezone"
            :placeholder="$t('locations.form.timezone_placeholder')"
            :clearable="false"
          />
        </base-form-group>

        <base-form-group :label="$t('locations.form.remark_label')">
          <b-form-textarea
            v-model="editForm.remark"
            :rows="3"
            :placeholder="$t('locations.form.remark_placeholder')"
          />
        </base-form-group>
      </b-form>

      <template #modal-footer>
        <base-button variant="secondary" :disabled="editing" @click="resetEditForm">
          <app-icon name="x-circle"></app-icon> {{ $t('common.cancel') }}
        </base-button>
        <base-button variant="primary" :loading="editing" :disabled="editing" @click="updateLocation">
          <app-icon name="check"></app-icon> {{ $t('common.save_modify') }}
        </base-button>
      </template>
    </base-modal>
  </div>
</template>

<script>
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import BaseTable from '@/components/base/BaseTable.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import rolePermission from '@/mixins/rolePermission'
import localizedColumns from '@/mixins/localizedColumns'
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '@/api'
import { fetchProvinces, fetchCities, fetchDistricts } from '@/api/districts'
import { formatDate } from '@/utils/format'
import { hasPermission, PERMISSION } from '@/utils/permission'
import { applyDistrictBaseline, buildLocationRegionPayload, districtToOption } from '@/utils/location-region.mjs'

// 写入 URL 时持久化的 query 字段清单（与 DEFAULT_QUERY 对齐）
const QUERY_FIELDS = ['page', 'page_size', 'keyword', 'province', 'city', 'has_gps', 'is_active']

// 国家提交 ISO 3166-1 alpha-2 代码(后端 locations.country_code，与 companies/hosts 一致)，
// 显示名由前端按代码走 i18n。**不要把 i18n 文案当成提交值**——那会让同一个国家
// 按建档时的界面语言写入不同字符串，并被后端拼进 full_address。
const COUNTRY_CN_CODE = 'CN'

const DEFAULT_QUERY = {
  page: 1,
  page_size: 10,
  keyword: '',
  province: '',
  city: '',
  has_gps: '',
  is_active: ''
}

export default {
  name: 'LocationList',
  permissionCapabilities: {
    create: PERMISSION.POD_RECEIVE,
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    ColumnVisibility,
    BaseTable,
    ListPageCard
  },
  mixins: [rolePermission, localizedColumns],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { locationColumns: 'buildLocationColumns' },
  data () {
    return {
      loading: false,
      loadError: '',
      creating: false,
      editing: false,
      total: 0,
      tableData: [],
      activeLoading: {},
      query: {
        ...DEFAULT_QUERY
      },
      locationColumns: [],
      showCreateDialog: false,
      showEditDialog: false,
      currentEditLocation: null,
      syncingRegion: false,
      // 地区选项数据
      regionOptions: {
        provinces: [],
        cities: [],
        districts: []
      },
      createForm: {
        location_name: '',
        country_code: '',
        province: '',
        city: '',
        district: '',
        street: '',
        building: '',
        gps_lat: null,
        gps_lng: null,
        timezone: '',
        remark: ''
      },
      createErrors: {},
      editForm: {
        location_name: '',
        country_code: '',
        province: '',
        city: '',
        district: '',
        street: '',
        building: '',
        gps_lat: null,
        gps_lng: null,
        timezone: '',
        remark: ''
      },
      editErrors: {},
      // 搜索用省份选项
      searchProvinceOptions: [],
      // 搜索用城市选项
      searchCityOptions: []
    }
  },
  computed: {
    visibleTableFields () {
      const fieldConfig = {
        location_name: { key: 'location_name', label: this.$t('locations.table.location_name') },
        full_address: { key: 'full_address', label: this.$t('locations.table.full_address'), thStyle: { minWidth: '200px' } },
        country: { key: 'country_code', label: this.$t('locations.table.country') },
        province: { key: 'province_name', label: this.$t('locations.table.province') },
        city: { key: 'city_name', label: this.$t('locations.table.city') },
        district: { key: 'district_name', label: this.$t('locations.table.district') },
        gps_coordinates: { key: 'gps_coordinates', label: this.$t('locations.table.gps_coordinates'), thStyle: { minWidth: '180px' } },
        pod_count: { key: 'pod_count', label: this.$t('locations.table.pod_count'), class: 'text-center', thClass: 'text-center', thStyle: { width: '100px' } },
        created_at: { key: 'created_at', label: this.$t('locations.table.created_at'), thStyle: { width: '160px' } },
        is_active: { key: 'is_active', label: this.$t('locations.table.is_active'), class: 'text-center', thClass: 'text-center', thStyle: { width: '90px' } }
      }

      const visibleFields = this.locationColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    },
    gpsFilterOptions () {
      return [
        { value: '', text: this.$t('locations.filter.gps_all') },
        { value: 'true', text: this.$t('locations.filter.gps_yes') },
        { value: 'false', text: this.$t('locations.filter.gps_no') }
      ]
    },
    activeFilterOptions () {
      return [
        { value: '', text: this.$t('locations.filter.active_all') },
        { value: true, text: this.$t('locations.filter.active_yes') },
        { value: false, text: this.$t('locations.filter.active_no') }
      ]
    }
  },
  created () {
    this.locationColumns = this.buildLocationColumns()
    this.createForm.country_code = COUNTRY_CN_CODE
    // 进入页面：先把 URL query 写回 this.query.*，再发起请求，避免刷新丢状态
    this._restoreQueryFromUrl()
    this.fetchData()
    this.loadProvinces()
    this.loadSearchProvinces()
  },
  watch: {
    // 监听创建表单的省份变化
    'createForm.province': {
      handler (newVal) {
        this.onProvinceChange(newVal, 'create')
      }
    },
    // 监听创建表单的城市变化
    'createForm.city': {
      handler (newVal) {
        this.onCityChange(newVal, 'create')
      }
    },
    'createForm.district': {
      handler () {
        this.applyMostSpecificDistrictBaseline('create')
      }
    },
    // 监听编辑表单的省份变化
    'editForm.province': {
      handler (newVal) {
        this.onProvinceChange(newVal, 'edit')
      }
    },
    // 监听编辑表单的城市变化
    'editForm.city': {
      handler (newVal) {
        this.onCityChange(newVal, 'edit')
      }
    },
    'editForm.district': {
      handler () {
        this.applyMostSpecificDistrictBaseline('edit')
      }
    },
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
    districtOption (item) {
      return districtToOption(item)
    },
    applyMostSpecificDistrictBaseline (formType) {
      if (this.syncingRegion) return
      const form = formType === 'create' ? this.createForm : this.editForm
      applyDistrictBaseline(form, this.regionOptions)
    },
    /** 提交前清掉空的 country_code，避免把未回填 ISO-2 的老数据覆盖成空值 */
    buildLocationPayload (form) {
      return buildLocationRegionPayload(form, this.regionOptions)
    },
    /** 国家显示：按 ISO-2 走 i18n，未回填的老数据回退到后端的显示名 */
    formatCountry (item) {
      if (item.country_code === COUNTRY_CN_CODE) return this.$t('locations.country_china')
      return item.country_name || item.country || '-'
    },
    buildLocationColumns () {
      return [
        { prop: 'location_name', label: this.$t('locations.table.location_name'), visible: true },
        { prop: 'full_address', label: this.$t('locations.table.full_address'), visible: true },
        { prop: 'country', label: this.$t('locations.table.country'), visible: false },
        { prop: 'province', label: this.$t('locations.table.province'), visible: true },
        { prop: 'city', label: this.$t('locations.table.city'), visible: true },
        { prop: 'district', label: this.$t('locations.table.district'), visible: false },
        { prop: 'gps_coordinates', label: this.$t('locations.table.gps_coordinates'), visible: true },
        { prop: 'pod_count', label: this.$t('locations.table.pod_count'), visible: true },
        { prop: 'created_at', label: this.$t('locations.table.created_at'), visible: false },
        { prop: 'is_active', label: this.$t('locations.table.is_active'), visible: true }
      ]
    },
    // 加载搜索用省份列表
    async loadSearchProvinces () {
      try {
        const res = await fetchProvinces()

        const provinces = res?.items || res?.list || res || []

        this.searchProvinceOptions = [
          { value: '', text: this.$t('locations.filter.province_placeholder') },
          ...provinces.map(p => ({ value: p.code, text: p.name }))
        ]
        this.searchCityOptions = [
          { value: '', text: this.$t('locations.filter.city_placeholder') }
        ]
      } catch (error) {
        this.searchProvinceOptions = []
        this.$uiToast.error(this.$t('locations.toast.load_provinces_failed') +
          (this.$getErrorMessage(error) || this.$t('locations.toast.retry_later')))
      }
    },

    // 搜索省份变化处理
    async onSearchProvinceChange (provinceCode) {
      this.query.city = ''
      if (!provinceCode) {
        this.searchCityOptions = [{ value: '', text: this.$t('locations.filter.city_placeholder') }]
        return
      }

      try {
        const res = await fetchCities(provinceCode)
        const cities = res?.items || res?.list || res || []
        this.searchCityOptions = [
          { value: '', text: this.$t('locations.filter.city_placeholder') },
          ...cities.map(c => ({ value: c.code, text: c.name }))
        ]
      } catch (error) {
        this.searchCityOptions = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.retry_later'))
      }
    },

    // 加载省份列表
    async loadProvinces () {
      try {
        const res = await fetchProvinces()

        // http 拦截器已经返回了 response.data，所以直接访问 items
        let provinces = []
        if (res?.items) {
          provinces = res.items
        } else if (res?.list) {
          provinces = res.list
        } else if (Array.isArray(res)) {
          provinces = res
        }

        this.regionOptions.provinces = [
          { value: '', text: this.$t('locations.form.province_placeholder') },
          ...provinces.map(this.districtOption)
        ]
      } catch (error) {
        this.$uiToast.error(this.$t('locations.toast.load_provinces_failed') + (this.$getErrorMessage(error) || this.$t('locations.toast.retry_later')))
      }
    },

    // 省份变化处理
    async onProvinceChange (provinceCode, formType) {
      if (this.syncingRegion) return
      if (!provinceCode) {
        if (formType === 'create') {
          this.regionOptions.cities = []
          this.createForm.city = ''
          this.createForm.district = ''
          this.regionOptions.districts = []
        } else {
          this.regionOptions.cities = []
          this.editForm.city = ''
          this.editForm.district = ''
          this.regionOptions.districts = []
        }
        this.applyMostSpecificDistrictBaseline(formType)
        return
      }

      try {
        const res = await fetchCities(provinceCode)
        const cities = res?.items || res?.list || res || []
        const citiesOptions = [
          { value: '', text: this.$t('locations.form.city_placeholder') },
          ...cities.map(this.districtOption)
        ]

        if (formType === 'create') {
          this.regionOptions.cities = citiesOptions
          this.createForm.city = ''
          this.createForm.district = ''
          this.regionOptions.districts = []
        } else {
          this.regionOptions.cities = citiesOptions
          this.editForm.city = ''
          this.editForm.district = ''
          this.regionOptions.districts = []
        }
        this.applyMostSpecificDistrictBaseline(formType)
      } catch (error) {
        this.regionOptions.cities = []
        this.regionOptions.districts = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.retry_later'))
      }
    },

    // 城市变化处理
    async onCityChange (cityCode, formType) {
      if (this.syncingRegion) return
      if (!cityCode) {
        if (formType === 'create') {
          this.regionOptions.districts = []
          this.createForm.district = ''
        } else {
          this.regionOptions.districts = []
          this.editForm.district = ''
        }
        this.applyMostSpecificDistrictBaseline(formType)
        return
      }

      try {
        const res = await fetchDistricts(cityCode)
        const districts = res?.items || res?.list || res || []
        const districtsOptions = [
          { value: '', text: this.$t('locations.form.district_placeholder') },
          ...districts.map(this.districtOption)
        ]

        if (formType === 'create') {
          this.regionOptions.districts = districtsOptions
          this.createForm.district = ''
        } else {
          this.regionOptions.districts = districtsOptions
          this.editForm.district = ''
        }
        this.applyMostSpecificDistrictBaseline(formType)
      } catch (error) {
        this.regionOptions.districts = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.retry_later'))
      }
    },

    // 初始化地区选项（用于编辑时）
    async initRegionOptions (provinceCode, cityCode) {
      if (!provinceCode) {
        return
      }

      // 加载城市
      try {
        const citiesRes = await fetchCities(provinceCode)
        const cities = citiesRes?.items || citiesRes?.list || citiesRes || []
        this.regionOptions.cities = [
          { value: '', text: this.$t('locations.form.city_placeholder') },
          ...cities.map(this.districtOption)
        ]

        // 加载区县
        if (cityCode) {
          const districtsRes = await fetchDistricts(cityCode)
          const districts = districtsRes?.items || districtsRes?.list || districtsRes || []
          this.regionOptions.districts = [
            { value: '', text: this.$t('locations.form.district_placeholder') },
            ...districts.map(this.districtOption)
          ]
        }
      } catch (error) {
        this.regionOptions.cities = []
        this.regionOptions.districts = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.retry_later'))
      }
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
        } else if (field === 'is_active') {
          // is_active 默认 ''，select 选项是 boolean，URL 上还原为 boolean
          if (v === 'true') this.query[field] = true
          else if (v === 'false') this.query[field] = false
          else this.query[field] = ''
        } else {
          // has_gps 在模板里 select 选项 value 就是 'true'/'false' 字符串，按字符串保留
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
    async fetchData (opts = {}) {
      // 拉数据前同步 URL（路由触发的 fetch 跳过避免循环）
      if (!opts.skipUrlSync) {
        this._syncQueryToUrl()
      }
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }
        if (this.query.keyword) {
          params.keyword = this.query.keyword
        }
        if (this.query.province) {
          params.province = this.query.province
        }
        if (this.query.city) {
          params.city = this.query.city
        }
        if (this.query.has_gps !== '') {
          params.has_gps = this.query.has_gps === 'true'
        }
        if (this.query.is_active !== '') {
          params.is_active = this.query.is_active
        }

        const res = await fetchLocations(params)
        const list = res?.data?.list || res?.items || []

        // 为每条记录加载省市区中文名称
        this.tableData = await this.loadRegionNamesForList(list)
        this.total = res?.data?.total ?? res?.total ?? 0
      } catch (error) {
        const msg = this.$getErrorMessage(error) || this.$t('locations.toast.retry_later')
        this.loadError = msg
        this.$uiToast.error(this.$t('locations.toast.load_failed') + (this.$getErrorMessage(error) || this.$t('locations.toast.retry_later')))
      } finally {
        this.loading = false
      }
    },

    // 为列表数据加载省市区中文名称
    async loadRegionNamesForList (list) {
      if (!list || list.length === 0) return []

      try {
        // 一次性加载所有省份
        const provincesRes = await fetchProvinces()
        const provinces = provincesRes?.items || provincesRes?.list || provincesRes || []
        const provinceMap = new Map(provinces.map(p => [p.code, p.name]))

        // 收集所有唯一的省份代码，用于加载城市
        const uniqueProvinceCodes = [...new Set(
          list.map(item => item.province_code || item.province).filter(Boolean)
        )]

        // 加载所有城市
        const cityMap = new Map()
        for (const provinceCode of uniqueProvinceCodes) {
          try {
            const citiesRes = await fetchCities(provinceCode)
            const cities = citiesRes?.items || citiesRes?.list || citiesRes || []
            cities.forEach(c => cityMap.set(c.code, c.name))
          } catch (error) {

          }
        }

        // 收集所有唯一的城市代码，用于加载区县
        const uniqueCityCodes = [...new Set(
          list.map(item => item.city_code || item.city).filter(Boolean)
        )]

        // 加载所有区县
        const districtMap = new Map()
        for (const cityCode of uniqueCityCodes) {
          try {
            const districtsRes = await fetchDistricts(cityCode)
            const districts = districtsRes?.items || districtsRes?.list || districtsRes || []
            districts.forEach(d => districtMap.set(d.code, d.name))
          } catch (error) {

          }
        }

        // 为每条记录添加中文名称
        return list.map(item => {
          const provinceCode = item.province_code || item.province
          const cityCode = item.city_code || item.city
          const districtCode = item.district_code || item.district

          return {
            ...item,
            province_name: provinceMap.get(provinceCode) || item.province,
            city_name: cityMap.get(cityCode) || item.city,
            district_name: districtMap.get(districtCode) || item.district
          }
        })
      } catch (error) {
        return list
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

    handleLocationColumnsUpdate (updatedColumns) {
      this.locationColumns = updatedColumns
    },

    getFullAddress (location) {
      const regionName = (name, fallback) => name || (/^\d+$/.test(String(fallback || '')) ? '' : fallback)
      const parts = [
        this.formatCountry(location),
        regionName(location.province_name, location.province),
        regionName(location.city_name, location.city),
        regionName(location.district_name, location.district)
      ].filter((part, index, values) => part && part !== '-' && (index === 0 || part !== values[index - 1]))
      if (location.street) parts.push(location.street)
      if (location.building) parts.push(location.building)
      return parts.join('')
    },

    formatDateTime (value) {
      return formatDate(value)
    },

    viewDetail (row) {
      this.$router.push(`/locations/${encodeURIComponent(row.uuid)}`)
    },

    canDeleteLocation () {
      return hasPermission(PERMISSION.USER_MANAGE, this.permissionUser)
    },

    editLocation (row) {
      this.syncingRegion = true
      this.editErrors = {}
      this.currentEditLocation = row
      this.editForm = {
        location_name: row.location_name,
        // 只认后端回填过的 ISO-2；未回填的老数据留空，避免把未知国家改写成中国
        country_code: row.country_code || '',
        province: row.province_code || row.province,
        city: row.city_code || row.city,
        district: row.district_code || row.district,
        street: row.street,
        building: row.building,
        gps_lat: row.gps?.lat ?? row.gps_lat ?? null,
        gps_lng: row.gps?.lng ?? row.gps_lng ?? null,
        timezone: row.timezone || '',
        remark: row.remark
      }
      // 初始化地区选项
      this.initRegionOptions(this.editForm.province, this.editForm.city).finally(() => {
        this.syncingRegion = false
      })
      this.showEditDialog = true
    },

    async deleteLocation (row) {
      try {
        const confirmed = await this.$uiConfirm(this.$t('locations.confirm.delete_message', { name: row.location_name }), {
          title: this.$t('locations.confirm.delete_title'),
          okTitle: this.$t('common.confirm_delete'),
          cancelTitle: this.$t('common.cancel'),
          okVariant: 'danger'
        })
        if (!confirmed) return

        await deleteLocation(row.uuid)
        this.$uiToast.success(this.$t('locations.toast.delete_success'))
        this.fetchData()
      } catch (error) {
        const message = this.$getErrorMessage(error) || this.$t('locations.toast.retry_later')
        this.$uiToast.error(this.$t('common.delete_failed_retry') + message)
      }
    },

    resetCreateForm () {
      this.syncingRegion = true
      this.createForm = {
        location_name: '',
        country_code: COUNTRY_CN_CODE,
        province: '',
        city: '',
        district: '',
        street: '',
        building: '',
        gps_lat: null,
        gps_lng: null,
        timezone: '',
        remark: ''
      }
      this.regionOptions.cities = []
      this.regionOptions.districts = []
      this.createErrors = {}
      this.showCreateDialog = false
      this.$nextTick(() => { this.syncingRegion = false })
    },

    resetEditForm () {
      this.syncingRegion = true
      this.editForm = {
        location_name: '',
        country_code: '',
        province: '',
        city: '',
        district: '',
        street: '',
        building: '',
        gps_lat: null,
        gps_lng: null,
        timezone: '',
        remark: ''
      }
      this.regionOptions.cities = []
      this.regionOptions.districts = []
      this.currentEditLocation = null
      this.editErrors = {}
      this.showEditDialog = false
      this.$nextTick(() => { this.syncingRegion = false })
    },

    clearFieldError (errorsKey, field) {
      if (this[errorsKey][field]) this.$delete(this[errorsKey], field)
    },

    focusField (id) {
      this.$nextTick(() => {
        const field = document.getElementById(id)
        if (field) field.focus()
      })
    },

    async createLocation () {
      if (this.creating) return
      if (!this.createForm.location_name.trim()) {
        this.createErrors = { location_name: this.$t('locations.validation.name_required') }
        this.focusField('createForm-location_name')
        return
      }

      this.creating = true
      try {
        await createLocation(this.buildLocationPayload(this.createForm))

        this.$uiToast.success(this.$t('locations.toast.create_success'))
        this.showCreateDialog = false
        this.query.page = 1
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.create_failed'))
      } finally {
        this.creating = false
      }
    },

    async updateLocation () {
      if (this.editing) return
      if (!this.editForm.location_name.trim()) {
        this.editErrors = { location_name: this.$t('locations.validation.name_required') }
        this.focusField('editForm-location_name')
        return
      }

      this.editing = true
      try {
        await updateLocation(this.currentEditLocation.uuid, this.buildLocationPayload(this.editForm))

        this.$uiToast.success(this.$t('locations.toast.update_success'))
        this.showEditDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.update_failed'))
      } finally {
        this.editing = false
      }
    },

    async toggleActiveStatus (row) {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('locations.toast.no_permission'))
        return
      }

      const newStatus = row.is_active

      // 设置加载状态
      this.$set(this.activeLoading, row.id, true)

      try {
        // 调用 API 更新地址激活状态
        await updateLocation(row.uuid, { is_active: newStatus })

        // 更新本地数据
        row.is_active = newStatus

        this.$uiToast.success(this.$t('locations.toast.active_toggled', { status: this.$t(newStatus ? 'common.active' : 'common.inactive') }))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('locations.toast.toggle_failed'))

        // 恢复原始状态
        row.is_active = !newStatus
      } finally {
        // 清除加载状态
        this.$set(this.activeLoading, row.id, false)
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/locations.scss"></style>
