<template>
  <div class="firmware-manager">
    <list-page-card :total-rows="total" :page="page" :per-page="pageSize">
      <template #filters>
        <b-form @submit.stop.prevent="loadFirmwares">
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              v-model="filterTarget"
              :options="modelOptions"
              class="filter-control"
              @change="applyFilters"
            />
            <div class="filter-actions">
              <base-button variant="outline-secondary" @click="loadFirmwares">
                <app-icon name="arrow-clockwise"  /> {{ $t('firmware_manager.filter.refresh') }}
              </base-button>
              <base-button v-if="canManageFirmware" variant="primary" @click="showUploadModal = true">
                <app-icon name="upload"  /> {{ $t('firmware_manager.header.upload') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table
        :items="firmwares"
        :fields="firmwareFields"
        :loading="loading"
        :load-error="loadError"
        small
        :empty-text="$t('firmware_manager.table.empty')"
        show-empty
        @retry="loadFirmwares"
      >
        <template #table-busy>
          <div class="text-center my-3">
            <b-spinner small /> {{ $t('firmware_manager.table.loading') }}
          </div>
        </template>
        <template #cell(model_code)="row">
          <base-badge variant="info">{{ row.item.model_code || '-' }}</base-badge>
        </template>
        <template #cell(file_size)="row">
          <span class="firmware-table__nowrap">{{ formatBytes(row.item.file_size) }}</span>
        </template>
        <template #cell(file_name)="row">
          <span class="firmware-table__filename" :title="row.item.file_name || ''">
            {{ row.item.file_name || '-' }}
          </span>
        </template>
        <template #cell(checksum)="row">
          <code class="firmware-table__checksum" :title="firmwareChecksum(row.item)">
            {{ formatChecksum(row.item) }}
          </code>
        </template>
        <template #cell(hn_model_id)="row">
          {{ modelVersionLabel(row.item.hn_model_id) }}
        </template>
        <template #cell(created_at)="row">
          <small class="firmware-table__nowrap">{{ formatTime(row.item.created_at) }}</small>
        </template>
        <template #cell(actions)="row">
          <div class="action-cell action-cell--nowrap">
            <base-action-button
              v-if="canManageFirmware"
              :title="$t('common.edit')"
              @click="openEdit(row.item)"
            >
              <app-icon name="pencil" />
              <span>{{ $t('common.edit') }}</span>
            </base-action-button>
            <base-action-button
              :title="$t('firmware_manager.table.download')"
              @click="onDownload(row.item)"
            >
              <app-icon name="download"  />
              <span>{{ $t('firmware_manager.table.download') }}</span>
            </base-action-button>
            <base-action-button
              v-if="canManageFirmware"
              class="text-danger"
              :title="$t('firmware_manager.table.delete')"
              :loading="deletingUuid === row.item.uuid"
              :disabled="Boolean(deletingUuid)"
              @click="onDelete(row.item)"
            >
              <app-icon name="trash"  />
              <span>{{ $t('firmware_manager.table.delete') }}</span>
            </base-action-button>
          </div>
        </template>
      </base-table>

      <template #footer>
        <base-pagination
          v-if="total > 0"
          v-model="page"
          :total-rows="total"
          :per-page="pageSize"
          :show-per-page="true"
          @input="handlePageChange"
          @update:perPage="handlePageSizeChange"
        />
      </template>
    </list-page-card>

    <!-- 上传 Modal -->
    <base-modal
      v-model="showUploadModal"
      :title="$t('firmware_manager.upload.title')"
      :ok-disabled="!uploadReady || uploading"
      :ok-title="uploading ? $t('firmware_manager.upload.uploading') : $t('firmware_manager.upload.ok')"
      :cancel-title="$t('firmware_manager.upload.cancel')"
      no-close-on-backdrop
      @ok.prevent="onUpload" :centered="false" :scrollable="false"
    >
      <base-form-group required :label="$t('firmware_manager.upload.hardware_line')">
        <base-select v-model="uploadForm.hardware_line_id" :options="uploadModelOptions" required @change="syncSelectedHardwareLine" />
      </base-form-group>
      <base-form-group required :label="$t('firmware_manager.upload.version')">
        <base-input v-model.trim="uploadForm.version" :placeholder="$t('firmware_manager.upload.version_placeholder')" required :clearable="false" />
      </base-form-group>
      <base-form-group required :label="$t('firmware_manager.upload.od_version')">
        <base-input v-model.trim="uploadForm.od_ver" :placeholder="$t('firmware_manager.upload.od_version_placeholder')" required :clearable="false" />
        <small class="text-muted">{{ $t('firmware_manager.upload.od_policy_hint') }}</small>
      </base-form-group>
      <base-form-group :label="$t('firmware_manager.upload.od_import')">
        <b-form-file
          v-model="uploadForm.od_import_file"
          accept=".json,application/json"
          :placeholder="$t('firmware_manager.upload.od_import_placeholder')"
          :drop-placeholder="$t('firmware_manager.upload.drop_placeholder')"
        />
        <small v-if="odImportRequired" class="text-warning">{{ $t('firmware_manager.upload.od_import_required') }}</small>
      </base-form-group>
      <base-form-group :label="$t('firmware_manager.upload.remark')">
        <base-textarea v-model="uploadForm.note" :rows="2" />
      </base-form-group>
      <p class="small text-muted mb-2">{{ $t('firmware_manager.upload.ota_metadata_hint') }}</p>
      <base-form-group :label="$t('firmware_manager.upload.project_name')">
        <base-input v-model.trim="uploadForm.project_name" placeholder="wf2p_00d1_firmware" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('firmware_manager.upload.partition_table_sha256')">
        <base-input v-model.trim="uploadForm.partition_table_sha256" :placeholder="$t('firmware_manager.upload.sha256_placeholder')" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('firmware_manager.upload.config_manifest_sha256')">
        <base-input v-model.trim="uploadForm.config_manifest_sha256" :placeholder="$t('firmware_manager.upload.sha256_placeholder')" :clearable="false" />
      </base-form-group>
      <base-form-group :label="$t('firmware_manager.upload.final_signed_sha256')">
        <base-input v-model.trim="uploadForm.signed_image_sha256" :placeholder="$t('firmware_manager.upload.sha256_placeholder')" :clearable="false" />
      </base-form-group>
      <b-form-checkbox v-model="uploadForm.ota_release_approved" class="mb-3">
        {{ $t('firmware_manager.upload.ota_approval') }}
      </b-form-checkbox>
      <small v-if="uploadForm.ota_release_approved && !otaMetadataComplete" class="d-block text-warning mb-3">
        {{ $t('firmware_manager.upload.ota_approval_hint') }}
      </small>
      <base-form-group required :label="$t('firmware_manager.upload.file')">
        <b-form-file
          v-model="uploadForm.file"
          accept=".bin"
          :placeholder="$t('firmware_manager.upload.file_placeholder')"
          :drop-placeholder="$t('firmware_manager.upload.drop_placeholder')"
        />
      </base-form-group>
      <b-progress
        v-if="uploading"
        :value="uploadProgress"
        :max="100"
        show-progress
        animated
        class="mt-2"
      />
    </base-modal>

    <base-modal
      v-model="showEditModal"
      :title="`${$t('common.edit')} ${$t('firmware_manager.table.version')}`"
      :busy="savingEdit"
      :ok-disabled="savingEdit"
      @ok.prevent="saveEdit"
      @hidden="resetEdit"
    >
      <div v-if="editingFirmware" class="mb-3">
        <strong>{{ editingFirmware.model_code }} · {{ editingFirmware.version }}</strong>
        <div class="text-muted">{{ editingFirmware.file_name || '-' }}</div>
      </div>
      <base-form-group :label="$t('firmware_manager.upload.remark')">
        <base-textarea v-model="editForm.notes" :rows="3" />
      </base-form-group>
    </base-modal>
  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import { fetchFirmware, fetchFirmwares, uploadFirmware, updateFirmware, deleteFirmware, downloadFirmware } from '@/api/firmwares'
import { fetchHnModels, fetchHnModelHardwareLines } from '@/api/hnModels'
import { formatDate } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'FirmwareManager',
  components: {
    BaseFormGroup,
    BaseTextarea,
    ListPageCard
  },
  data () {
    return {
      firmwares: [],
      models: [],
      hardwareLines: [],
      loading: false,
      loadError: '',
      uploading: false,
      deletingUuid: '',
      uploadProgress: 0,
      filterTarget: '',
      page: 1,
      pageSize: 50,
      total: 0,
      showUploadModal: false,
      showEditModal: false,
      savingEdit: false,
      editingFirmware: null,
      editForm: {
        notes: ''
      },
      uploadForm: {
        hardware_line_id: null,
        model_code: '',
        version: '',
        od_ver: '',
        od_import_file: null,
        note: '',
        project_name: '',
        partition_table_sha256: '',
        config_manifest_sha256: '',
        signed_image_sha256: '',
        ota_release_approved: false,
        file: null
      }
    }
  },
  computed: {
    canManageFirmware () {
      return hasPermission(PERMISSION.FIRMWARE_MANAGE, getCurrentUser())
    },
    selectedHardwareLine () {
      return this.hardwareLines.find(line => Number(line.id) === Number(this.uploadForm.hardware_line_id)) || null
    },
    selectedSourceModel () {
      if (!this.selectedHardwareLine) return null
      const candidates = this.models.filter(model =>
        model.model_code === this.selectedHardwareLine.model_code &&
        model.hw_version === this.selectedHardwareLine.hw_version
      )
      return candidates.find(model => model.od_ver === this.uploadForm.od_ver.trim()) || candidates[0] || null
    },
    odImportRequired () {
      if (!this.selectedHardwareLine || !this.uploadForm.od_ver.trim()) return false
      return !this.models.some(model =>
        model.model_code === this.selectedHardwareLine.model_code &&
        model.hw_version === this.selectedHardwareLine.hw_version &&
        model.od_ver === this.uploadForm.od_ver.trim()
      )
    },
    uploadReady () {
      return Boolean(
        this.uploadForm.file &&
        this.selectedHardwareLine &&
        this.uploadForm.version.trim() &&
        this.uploadForm.od_ver.trim() &&
        this.uploadForm.od_ver.trim() !== 'legacy-unknown' &&
        (!this.odImportRequired || this.uploadForm.od_import_file) &&
        this.otaMetadataValid
      )
    },
    otaMetadataComplete () {
      return Boolean(
        this.uploadForm.project_name.trim() &&
        this.uploadForm.partition_table_sha256.trim() &&
        this.uploadForm.config_manifest_sha256.trim() &&
        this.uploadForm.signed_image_sha256.trim()
      )
    },
    otaMetadataValid () {
      const sha256 = /^[0-9a-fA-F]{64}$/
      const hashes = [
        this.uploadForm.partition_table_sha256,
        this.uploadForm.config_manifest_sha256,
        this.uploadForm.signed_image_sha256
      ]
      const hashesValid = hashes.every(value => !value.trim() || sha256.test(value.trim()))
      return hashesValid && (!this.uploadForm.ota_release_approved || this.otaMetadataComplete)
    },
    firmwareFields () {
      return [
        { key: 'model_code', label: this.$t('hn_models.column.model_code') },
        { key: 'version', label: this.$t('firmware_manager.table.version') },
        { key: 'hn_model_id', label: this.$t('firmware_manager.upload.hardware_line') },
        { key: 'file_name', label: this.$t('firmware_manager.table.name') },
        { key: 'file_size', label: this.$t('firmware_manager.table.size') },
        { key: 'checksum', label: this.$t('firmware_manager.table.sha256') },
        { key: 'created_at', label: this.$t('firmware_manager.table.created_at') },
        { key: 'actions', label: this.$t('firmware_manager.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    modelOptions () {
      const seen = new Set()
      return [
        { value: '', text: this.$t('common.all') },
        ...this.hardwareLines.filter(line => {
          if (seen.has(line.model_code)) return false
          seen.add(line.model_code)
          return true
        }).map(line => ({ value: line.model_code, text: `${line.model_name || line.model_code} (${line.model_code})` }))
      ]
    },
    uploadModelOptions () {
      return [
        { value: null, text: this.$t('firmware_manager.upload.hardware_line_placeholder'), disabled: true },
        ...this.hardwareLines.map(line => ({
          value: line.id,
          text: this.hardwareLineLabel(line)
        }))
      ]
    }
  },
  async mounted () {
    await Promise.all([this.loadFirmwares(), this.loadReferenceData()])
    await this.applyRouteIntent()
  },
  methods: {
    async loadReferenceData () {
      try {
        const [modelData, hardwareData] = await Promise.all([
          fetchHnModels({ page: 1, page_size: 200, status: 'active' }),
          fetchHnModelHardwareLines({ page: 1, page_size: 200, status: 'active' })
        ])
        this.models = (modelData && (modelData.items || modelData.data)) || modelData || []
        this.hardwareLines = (hardwareData && (hardwareData.items || hardwareData.data)) || hardwareData || []
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('firmware_manager.toast.load_failed'), { variant: 'danger', title: this.$t('firmware_manager.toast.title_error') })
      }
    },
    async loadFirmwares () {
      this.loading = true
      this.loadError = ''
      try {
        const params = { page: this.page, page_size: this.pageSize }
        if (this.filterTarget) params.model_code = this.filterTarget
        const data = await fetchFirmwares(params)
        this.firmwares = (data && (data.items || data.firmwares || data.data)) || data || []
        this.total = Number(data?.total ?? this.firmwares.length)
      } catch (err) {
        this.firmwares = []
        this.total = 0
        this.loadError = this.$getErrorMessage(err) || this.$t('firmware_manager.toast.load_failed')
        this.$uiToast.toast(this.loadError, { variant: 'danger', title: this.$t('firmware_manager.toast.title_error') })
      } finally {
        this.loading = false
      }
    },
    syncSelectedHardwareLine () {
      if (!this.selectedHardwareLine) return
      this.uploadForm.model_code = this.selectedHardwareLine.model_code
      const source = this.selectedSourceModel
      if (!this.uploadForm.od_ver && source?.od_ver !== 'legacy-unknown') this.uploadForm.od_ver = source?.od_ver || ''
    },
    applyFilters () {
      this.page = 1
      this.loadFirmwares()
    },
    handlePageChange (page) {
      this.page = page
      this.loadFirmwares()
    },
    handlePageSizeChange (pageSize) {
      this.pageSize = pageSize
      this.page = 1
      this.loadFirmwares()
    },
    async applyRouteIntent () {
      if (!this.canManageFirmware) return
      const query = this.$route.query || {}
      if (query.edit) {
        let firmware = this.firmwares.find(item => item.uuid === query.edit)
        if (!firmware) {
          try {
            firmware = await fetchFirmware(query.edit)
          } catch (error) {
            this.$uiToast.error(this.$getErrorMessage(error) || this.$t('firmware_manager.toast.load_failed'))
            return
          }
        }
        if (firmware) this.openEdit(firmware)
        return
      }
      if (query.upload !== '1') return
      const hardware = this.hardwareLines.find(item => String(item.id) === String(query.hardware_id || ''))
      if (!hardware) return
      this.uploadForm.hardware_line_id = hardware.id
      this.uploadForm.od_ver = typeof query.od_ver === 'string' ? query.od_ver : ''
      this.syncSelectedHardwareLine()
      if (query.new_od === '1') this.uploadForm.od_ver = ''
      this.showUploadModal = true
    },
    async onUpload () {
      if (!this.uploadReady) {
        this.$uiToast.toast(this.$t('firmware_manager.toast.select_file'), { variant: 'warning', title: this.$t('firmware_manager.toast.title_warning') })
        return
      }
      let odImportJson = ''
      if (this.uploadForm.od_import_file) {
        try {
          odImportJson = await this.uploadForm.od_import_file.text()
          JSON.parse(odImportJson)
        } catch (error) {
          this.$uiToast.toast(this.$t('firmware_manager.upload.od_import_invalid'), { variant: 'warning', title: this.$t('firmware_manager.toast.title_warning') })
          return
        }
      }
      const fd = new FormData()
      fd.append('file', this.uploadForm.file)
      fd.append('model_code', this.uploadForm.model_code)
      fd.append('version', this.uploadForm.version)
      fd.append('od_ver', this.uploadForm.od_ver)
      if (this.selectedSourceModel) fd.append('hn_model_id', String(this.selectedSourceModel.id))
      fd.append('part_number', this.selectedHardwareLine.part_number || '')
      fd.append('model_type', this.selectedHardwareLine.model_type)
      fd.append('product_code', this.selectedHardwareLine.product_code || '')
      fd.append('vendor_id', this.selectedHardwareLine.vendor_id || '')
      fd.append('hw_version', this.selectedHardwareLine.hw_version)
      fd.append('model_name', this.selectedHardwareLine.model_name || this.selectedHardwareLine.model_code)
      if (this.selectedHardwareLine.company_id) fd.append('manufacturer_id', String(this.selectedHardwareLine.company_id))
      if (odImportJson) fd.append('od_import_json', odImportJson)
      if (this.uploadForm.note) fd.append('release_notes', this.uploadForm.note)
      if (this.uploadForm.project_name) fd.append('project_name', this.uploadForm.project_name)
      if (this.uploadForm.partition_table_sha256) fd.append('partition_table_sha256', this.uploadForm.partition_table_sha256)
      if (this.uploadForm.config_manifest_sha256) fd.append('config_manifest_sha256', this.uploadForm.config_manifest_sha256)
      if (this.uploadForm.signed_image_sha256) fd.append('signed_image_sha256', this.uploadForm.signed_image_sha256)
      if (this.uploadForm.ota_release_approved) fd.append('ota_release_approved', 'true')

      this.uploading = true
      this.uploadProgress = 0
      try {
        await uploadFirmware(fd, evt => {
          if (evt.total) {
            this.uploadProgress = Math.round((evt.loaded * 100) / evt.total)
          }
        })
        this.$uiToast.toast(this.$t('firmware_manager.toast.upload_success'), { variant: 'success', title: this.$t('firmware_manager.toast.title_success') })
        this.showUploadModal = false
        this.uploadForm = {
          hardware_line_id: null,
          model_code: '',
          version: '',
          od_ver: '',
          od_import_file: null,
          note: '',
          project_name: '',
          partition_table_sha256: '',
          config_manifest_sha256: '',
          signed_image_sha256: '',
          ota_release_approved: false,
          file: null
        }
        await this.loadFirmwares()
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('firmware_manager.toast.upload_failed'), { variant: 'danger', title: this.$t('firmware_manager.toast.title_error') })
      } finally {
        this.uploading = false
        this.uploadProgress = 0
      }
    },
    openEdit (firmware) {
      this.editingFirmware = firmware
      this.editForm = {
        notes: firmware.notes || firmware.release_notes || ''
      }
      this.showEditModal = true
    },
    resetEdit () {
      this.editingFirmware = null
      this.editForm = { notes: '' }
    },
    async saveEdit () {
      if (!this.editingFirmware || this.savingEdit) return
      this.savingEdit = true
      try {
        await updateFirmware(this.editingFirmware.uuid, {
          notes: this.editForm.notes || null
        })
        this.$uiToast.success(this.$t('common.operation_success'))
        this.showEditModal = false
        this.page = 1
        await this.loadFirmwares()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.operation_failed'))
      } finally {
        this.savingEdit = false
      }
    },
    async onDelete (fw) {
      if (this.deletingUuid) return
      const confirmed = await this.$uiConfirm(
        this.$t('firmware_manager.toast.delete_confirm', { name: fw.file_name || fw.model_code }),
        {
          title: this.$t('common.confirm'),
          okTitle: this.$t('common.confirm_delete'),
          cancelTitle: this.$t('common.cancel'),
          okVariant: 'danger'
        }
      )
      if (!confirmed) return
      this.deletingUuid = fw.uuid
      try {
        await deleteFirmware(fw.uuid)
        this.$uiToast.toast(this.$t('firmware_manager.toast.delete_success'), { variant: 'success', title: this.$t('firmware_manager.toast.title_success') })
        await this.loadFirmwares()
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('firmware_manager.toast.delete_failed'), { variant: 'danger', title: this.$t('firmware_manager.toast.title_error') })
      } finally {
        this.deletingUuid = ''
      }
    },
    async onDownload (fw) {
      try {
        const blob = await downloadFirmware(fw.uuid)
        const url = window.URL.createObjectURL(new Blob([blob]))
        const link = document.createElement('a')
        link.href = url
        link.download = fw.file_name || `${fw.model_code}_${fw.version}.bin`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      } catch (err) {
        this.$uiToast.toast(this.$getErrorMessage(err) || this.$t('firmware_manager.toast.download_failed'), { variant: 'danger', title: this.$t('firmware_manager.toast.title_error') })
      }
    },
    formatBytes (n) {
      if (!n && n !== 0) return '-'
      if (n < 1024) return n + ' B'
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
      return (n / 1024 / 1024).toFixed(2) + ' MB'
    },
    formatChecksum (fw) {
      const checksum = this.firmwareChecksum(fw)
      return checksum ? checksum.slice(0, 12) + '...' : '-'
    },
    firmwareChecksum (fw) {
      return fw?.extra?.checksum || ''
    },
    modelVersionLabel (modelId) {
      const model = this.models.find(item => Number(item.id) === Number(modelId))
      if (!model) return modelId || '-'
      return `${model.model_code} · HW ${model.hw_version || '-'} · OD ${model.od_ver || '-'} · SW ${model.sw_ver || '-'}`
    },
    hardwareLineLabel (line) {
      return `${line.model_code} · HW ${line.hw_version || '-'}`
    },
    formatTime (t) {
      return formatDate(t)
    }
  }
}
</script>

<style lang="scss" scoped src="@/assets/styles/pages/firmware-manager.scss"></style>
