<template>
  <div class="location-detail">
    <div v-if="loading && !detail.location_name" class="text-center py-4 text-muted">
      <app-icon name="arrow-clockwise" animation="spin" class="mr-1" />
      {{ $t('location_detail.loading') }}
    </div>

    <template v-else>
      <b-row>
        <!-- 左侧：基础信息 -->
        <b-col cols="12" md="6" class="mb-3">
          <base-card :header="$t('location_detail.card.basic_info')" class="location-detail__card w-100">
            <div class="detail-list">
              <div class="detail-item detail-item--wide">
                <div class="detail-label">{{ $t('location_detail.field.location_name') }}</div>
                <div class="detail-value location-name">{{ detail.location_name || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.full_address') }}</div>
                <div class="detail-value">{{ getFullAddress(detail) }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.country') }}</div>
                <div class="detail-value">{{ formatCountry(detail) }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.province') }}</div>
                <div class="detail-value">{{ detail.province_name || detail.province || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.city') }}</div>
                <div class="detail-value">{{ detail.city_name || detail.city || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.district') }}</div>
                <div class="detail-value">{{ detail.district_name || detail.district || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.street') }}</div>
                <div class="detail-value">{{ detail.street || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.building') }}</div>
                <div class="detail-value">{{ detail.building || '-' }}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">{{ $t('location_detail.field.created_at') }}</div>
                <div class="detail-value">{{ formatDateTime(detail.created_at) }}</div>
              </div>
            </div>
          </base-card>
        </b-col>

        <!-- 右侧：坐标与关联数据 -->
        <b-col cols="12" md="6" class="mb-3">
          <base-card :header="$t('location_detail.card.coordinates_relations')" class="location-detail__card w-100">

            <!-- GPS 坐标 -->
            <div class="gps-coordinates">
              <div class="section-title">{{ $t('location_detail.gps.title') }}</div>
              <div v-if="detail.gps && detail.gps.lat != null && detail.gps.lng != null" class="gps-info">
                <div>
                  <strong>{{ $t('location_detail.field.lat_label') }}</strong>{{ detail.gps.lat.toFixed(6) }}
                </div>
                <div>
                  <strong>{{ $t('location_detail.field.lng_label') }}</strong>{{ detail.gps.lng.toFixed(6) }}
                </div>
                <div class="gps-action">
                  <base-button variant="link" class="p-0" @click="showInMap">{{ $t('location_detail.gps.view_in_map') }}</base-button>
                </div>
              </div>
              <div v-else class="no-gps">
                <base-badge variant="info">{{ $t('location_detail.gps.not_set') }}</base-badge>
              </div>
              <div class="mt-2">
                <strong>{{ $t('location_detail.field.timezone') }}</strong>{{ detail.timezone || '-' }}
              </div>
            </div>

            <!-- 静音仓统计 -->
            <div class="pods-stats">
              <div class="section-title">{{ $t('location_detail.pods.title') }}</div>
              <div v-if="detail.pods && detail.pods.length > 0" class="pods-info">
                <div><strong>{{ $t('location_detail.pods.count_label') }}</strong>{{ detail.pods.length }} {{ $t('location_detail.pods.count_unit') }}</div>
                <div class="pods-list">
                  <div v-for="pod in detail.pods.slice(0, 3)" :key="pod.uuid" class="pod-item">
                    <span>{{ pod.pod_model || pod.uuid }}</span>
                    <base-button variant="link" class="p-0" @click="viewPod(pod)">{{ $t('location_detail.pods.view') }}</base-button>
                  </div>
                  <div v-if="detail.pods.length > 3" class="pod-more">
                    {{ $t('location_detail.pods.more', { count: detail.pods.length - 3 }) }}
                  </div>
                </div>
              </div>
              <div v-else class="no-pods">
                <base-badge variant="info">{{ $t('location_detail.pods.none') }}</base-badge>
              </div>
            </div>
          </base-card>
        </b-col>
      </b-row>

      <!-- 备注 -->
      <base-card :header="$t('location_detail.card.remark')" class="location-detail__card remark-card" v-if="detail.remark">
        <div class="remark-content">{{ detail.remark }}</div>
      </base-card>

      <!-- 编辑位置对话框 -->
      <base-modal
        id="location-detail-edit-modal"
        :title="$t('location_detail.edit.title')"
        v-model="editDialogVisible"
        size="xl"
        @hidden="resetEditForm"
        :ok-disabled="saving"
        :busy="saving"
        :ok-title="$t('location_detail.edit.ok_title')"
        :cancel-title="$t('location_detail.edit.cancel_title')"
        @ok="handleSaveEditOk"
        class="dialog-with-header-bg"
      >
        <b-form>
          <b-row>
            <b-col cols="12">
              <base-form-group label-for="location-edit-name" required :label="$t('location_detail.edit.location_name_label')" :state="editFieldState('location_name')" :invalid-feedback="editErrors.location_name">
                <base-input id="location-edit-name" v-model="editForm.location_name" :placeholder="$t('location_detail.edit.location_name_placeholder')" :state="editFieldState('location_name')" />
              </base-form-group>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-country" :label="$t('location_detail.edit.country_label')">
                <base-input id="location-edit-country" :value="formatCountry(detail)" disabled :clearable="false" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-province" :label="$t('location_detail.edit.province_label')">
                <base-select id="location-edit-province" v-model="editForm.province" :placeholder="$t('location_detail.edit.province_placeholder')" :options="provinceSelectOptions" />
              </base-form-group>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-city" :label="$t('location_detail.edit.city_label')">
                <base-select id="location-edit-city" v-model="editForm.city" :placeholder="$t('location_detail.edit.city_placeholder')" :options="citySelectOptions" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-district" :label="$t('location_detail.edit.district_label')">
                <base-select id="location-edit-district" v-model="editForm.district" :placeholder="$t('location_detail.edit.district_placeholder')" :options="districtSelectOptions" />
              </base-form-group>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-street" :label="$t('location_detail.edit.street_label')">
                <base-input id="location-edit-street" v-model="editForm.street" :placeholder="$t('location_detail.edit.street_placeholder')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-building" :label="$t('location_detail.edit.building_label')">
                <base-input id="location-edit-building" v-model="editForm.building" :placeholder="$t('location_detail.edit.building_placeholder')" />
              </base-form-group>
            </b-col>
          </b-row>

          <b-row>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-lat" :label="$t('location_detail.edit.lat_label')">
                <base-input id="location-edit-lat" v-model="editForm.gps_lat" :placeholder="$t('location_detail.edit.lat_placeholder')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group label-for="location-edit-lng" :label="$t('location_detail.edit.lng_label')">
                <base-input id="location-edit-lng" v-model="editForm.gps_lng" :placeholder="$t('location_detail.edit.lng_placeholder')" />
              </base-form-group>
            </b-col>
          </b-row>

          <base-form-group label-for="location-edit-timezone" :label="$t('location_detail.edit.timezone_label')">
            <base-input id="location-edit-timezone" v-model="editForm.timezone" :placeholder="$t('location_detail.edit.timezone_placeholder')" />
          </base-form-group>

          <base-form-group label-for="location-edit-remark" :label="$t('location_detail.edit.remark_label')">
            <base-textarea
              id="location-edit-remark"
              v-model="editForm.remark"
              :rows="3"
              :placeholder="$t('location_detail.edit.remark_placeholder')"
            />
          </base-form-group>
        </b-form>
      </base-modal>
    </template>
  </div>
</template>

<script>
import { fetchLocationDetail, updateLocation } from '@/api/locations'
import { fetchProvinces, fetchCities, fetchDistricts } from '@/api/districts'
import { formatDate } from '@/utils/format'
import { applyDistrictBaseline, buildLocationRegionPayload, districtToOption } from '@/utils/location-region.mjs'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import unsavedGuard from '@/mixins/unsavedGuard'

// 与 Locations.vue 一致：国家提交 ISO 3166-1 alpha-2 代码(后端 locations.country_code)，
// 显示名按代码走 i18n，绝不把 i18n 文案当提交值
const COUNTRY_CN_CODE = 'CN'

export default {
  name: 'LocationDetail',
  components: {
    BaseCard,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseTextarea
  },
  mixins: [unsavedGuard],
  data () {
    return {
      loading: false,
      detail: {},
      editDialogVisible: false,
      saving: false,
      formDirtyFlag: false,
      syncingRegion: false,
      // 地区选项数据
      regionOptions: {
        provinces: [],
        cities: [],
        districts: []
      },
      // 省市区名称映射
      regionNames: {
        province: '',
        city: '',
        district: ''
      },
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
      editErrors: {}
    }
  },
  computed: {
    provinceSelectOptions () {
      return this.regionOptions.provinces.map(item => ({ value: item.value, text: item.label }))
    },
    citySelectOptions () {
      return this.regionOptions.cities.map(item => ({ value: item.value, text: item.label }))
    },
    districtSelectOptions () {
      return this.regionOptions.districts.map(item => ({ value: item.value, text: item.label }))
    }
  },
  watch: {
    '$route.params.locationId': {
      immediate: true,
      handler () {
        this.fetchDetail()
      }
    },
    // 监听编辑表单的省份变化
    'editForm.province': {
      handler (newVal) {
        this.onProvinceChange(newVal)
      }
    },
    // 监听编辑表单的城市变化
    'editForm.city': {
      handler (newVal) {
        this.onCityChange(newVal)
      }
    },
    'editForm.district': {
      handler () {
        this.applyMostSpecificDistrictBaseline()
      }
    },
    // 编辑弹窗打开后表单内容变化即视为脏数据
    editForm: {
      deep: true,
      handler () {
        if (this.editDialogVisible) {
          this.formDirtyFlag = true
        }
      }
    }
  },
  methods: {
    districtOption (item) {
      return districtToOption(item, 'label')
    },
    applyMostSpecificDistrictBaseline () {
      if (this.syncingRegion) return
      applyDistrictBaseline(this.editForm, this.regionOptions)
    },
    buildLocationPayload () {
      return buildLocationRegionPayload(this.editForm, this.regionOptions, 'label')
    },
    /** 国家显示：按 ISO-2 走 i18n，未回填的老数据回退到后端的显示名 */
    formatCountry (item) {
      if (!item) return '-'
      if (item.country_code === COUNTRY_CN_CODE) return this.$t('locations.country_china')
      return item.country_name || item.country || '-'
    },
    // unsavedGuard mixin 接入：编辑弹窗有未保存修改时拦截路由切换/页面关闭
    isFormDirty () {
      return this.editDialogVisible && this.formDirtyFlag === true
    },
    // 省份变化处理
    async onProvinceChange (province) {
      if (this.syncingRegion) return

      this.editForm.city = ''
      this.editForm.district = ''
      this.regionOptions.districts = []
      if (!province) {
        this.regionOptions.cities = []
        this.applyMostSpecificDistrictBaseline()
        return
      }

      try {
        const citiesRes = await fetchCities(province)
        const cities = citiesRes?.items || citiesRes?.list || citiesRes || []
        this.regionOptions.cities = cities.map(this.districtOption)
        this.applyMostSpecificDistrictBaseline()
      } catch (error) {
        this.regionOptions.cities = []
      }
    },

    // 城市变化处理
    async onCityChange (city) {
      if (this.syncingRegion) return

      this.editForm.district = ''
      if (!city) {
        this.regionOptions.districts = []
        this.applyMostSpecificDistrictBaseline()
        return
      }

      try {
        const districtsRes = await fetchDistricts(city)
        const districts = districtsRes?.items || districtsRes?.list || districtsRes || []
        this.regionOptions.districts = districts.map(this.districtOption)
        this.applyMostSpecificDistrictBaseline()
      } catch (error) {
        this.regionOptions.districts = []
      }
    },

    // 初始化地区选项（用于编辑时）
    async initRegionOptions (provinceCode, cityCode) {
      if (!provinceCode) {
        return
      }

      try {
        // 加载省份列表
        const provincesRes = await fetchProvinces()
        const provinces = provincesRes?.items || provincesRes?.list || provincesRes || []
        this.regionOptions.provinces = provinces.map(this.districtOption)

        // 加载城市列表
        const citiesRes = await fetchCities(provinceCode)
        const cities = citiesRes?.items || citiesRes?.list || citiesRes || []
        this.regionOptions.cities = cities.map(this.districtOption)

        // 加载区县列表
        if (cityCode) {
          const districtsRes = await fetchDistricts(cityCode)
          const districts = districtsRes?.items || districtsRes?.list || districtsRes || []
          this.regionOptions.districts = districts.map(this.districtOption)
        }
      } catch (error) {
        this.regionOptions.provinces = []
        this.regionOptions.cities = []
        this.regionOptions.districts = []
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('location_detail.toast.retry_later'))
      }
    },

    async fetchDetail () {
      const locationId = this.$route.params.locationId
      if (!locationId) return

      this.loading = true
      try {
        const res = await fetchLocationDetail(locationId)
        const data = res.data || res

        // 获取省市区代码
        const provinceCode = data.province_code || data.province
        const cityCode = data.city_code || data.city
        const districtCode = data.district_code || data.district

        // 加载省市区名称
        await this.loadRegionNames(provinceCode, cityCode, districtCode)

        // 将名称映射到 detail 对象
        this.detail = {
          ...data,
          province_name: this.regionNames.province,
          city_name: this.regionNames.city,
          district_name: this.regionNames.district
        }

        // 初始化地区选项
        await this.initRegionOptions(provinceCode, cityCode)
      } catch (error) {
        this.$uiToast.error(this.$t('location_detail.toast.load_failed_prefix') + (this.$getErrorMessage(error) || this.$t('location_detail.toast.retry_later')))
        this.$router.push('/locations')
      } finally {
        this.loading = false
      }
    },

    // 加载省市区名称
    async loadRegionNames (provinceCode, cityCode, districtCode) {
      try {
        // 加载省份名称
        if (provinceCode) {
          const provincesRes = await fetchProvinces()
          const provinces = provincesRes?.items || provincesRes?.list || provincesRes || []
          const province = provinces.find(p => p.code === provinceCode)
          if (province) {
            this.regionNames.province = province.name
          }
        }

        // 加载城市名称
        if (provinceCode && cityCode) {
          const citiesRes = await fetchCities(provinceCode)
          const cities = citiesRes?.items || citiesRes?.list || citiesRes || []
          const city = cities.find(c => c.code === cityCode)
          if (city) {
            this.regionNames.city = city.name
          }
        }

        // 加载区县名称
        if (cityCode && districtCode) {
          const districtsRes = await fetchDistricts(cityCode)
          const districts = districtsRes?.items || districtsRes?.list || districtsRes || []
          const district = districts.find(d => d.code === districtCode)
          if (district) {
            this.regionNames.district = district.name
          }
        }
      } catch (error) {
        this.$uiToast.warning(this.$getErrorMessage(error) || this.$t('location_detail.toast.retry_later'))
      }
    },

    getFullAddress (location) {
      if (!location) return ''
      const regionName = (name, fallback) => name || (/^\d+$/.test(String(fallback || '')) ? '' : fallback)
      // 地址里要拼显示名，不能拼 country_code（否则出现 "CN上海市…"）
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

    goBack () {
      this.$router.push('/locations')
    },

    editLocation () {
      // 填充编辑表单数据（使用代码）
      this.syncingRegion = true
      this.editForm = {
        location_name: this.detail.location_name,
        // 只认后端回填过的 ISO-2；未回填的老数据留空，避免把未知国家改写成中国
        country_code: this.detail.country_code || '',
        province: this.detail.province_code || this.detail.province,
        city: this.detail.city_code || this.detail.city,
        district: this.detail.district_code || this.detail.district,
        street: this.detail.street,
        building: this.detail.building,
        gps_lat: this.detail.gps?.lat ?? this.detail.gps_lat ?? null,
        gps_lng: this.detail.gps?.lng ?? this.detail.gps_lng ?? null,
        timezone: this.detail.timezone || '',
        remark: this.detail.remark
      }
      // 初始化地区选项
      this.initRegionOptions(this.editForm.province, this.editForm.city).finally(() => {
        this.syncingRegion = false
      })
      this.editErrors = {}
      this.editDialogVisible = true
      // 弹窗打开后等表单初始化完再清 dirty
      this.$nextTick(() => { this.formDirtyFlag = false })
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
      this.editErrors = {}
      this.$nextTick(() => { this.syncingRegion = false })
    },

    handleSaveEditOk (event) {
      event.preventDefault()
      this.saveEdit()
    },
    editFieldState (field) {
      if (!(field in this.editErrors)) {
        return null
      }
      return !this.editErrors[field]
    },
    validateEditForm () {
      const errors = {}
      if (!this.editForm.location_name || !this.editForm.location_name.trim()) {
        errors.location_name = this.$t('location_detail.validate.location_name_required')
      }
      this.editErrors = errors
      return Object.keys(errors).length === 0
    },

    async saveEdit () {
      if (!this.validateEditForm()) {
        return
      }

      this.saving = true
      try {
        await updateLocation(this.detail.uuid, this.buildLocationPayload())

        this.$uiToast.success(this.$t('location_detail.toast.update_success'))
        // 保存成功后重置 dirty，避免关闭弹窗时被误拦截
        this.formDirtyFlag = false
        this.editDialogVisible = false
        // 重新加载详情
        this.fetchDetail()
      } catch (error) {
        this.$uiToast.error(this.$t('location_detail.toast.update_failed_prefix') + (this.$getErrorMessage(error) || this.$t('location_detail.toast.retry_later')))
      } finally {
        this.saving = false
      }
    },

    viewPod (pod) {
      this.$router.push(`/pods/${encodeURIComponent(pod.uuid)}`)
    },

    showInMap () {
      if (this.detail.gps?.lat != null && this.detail.gps?.lng != null) {
        // 模拟打开地图（实际项目中可集成百度地图、高德地图等）
        const url = `https://www.openstreetmap.org/?mlat=${this.detail.gps.lat}&mlon=${this.detail.gps.lng}&zoom=15`
        const mapWindow = window.open(url, '_blank', 'noopener,noreferrer')
        if (!mapWindow) {
          this.$uiToast.warning(this.$t('location_detail.toast.retry_later'))
        }
      } else {
        this.$uiToast.warning(this.$t('location_detail.toast.no_gps'))
      }
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/location-detail.scss"></style>
