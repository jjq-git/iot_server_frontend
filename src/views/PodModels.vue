<template>
  <div class="pod-models">
    <pod-model-list-section
      :query="query"
      :company-options="companyFilterOptions"
      :active-options="activeOptions"
      :create-allowed="canCreate()"
      :delete-allowed="canDeleteModel"
      :items="tableData"
      :fields="visibleTableFields"
      :columns="modelColumns"
      :loading="loading"
      :load-error="loadError"
      :total="total"
      :image-errors="tableImageErrors"
      :image-urls="tableImageUrls"
      :normalize-image-url="normalizeImageUrl"
      @search="handleSearch"
      @query-change="query = $event"
      @create="showCreateDialog = true"
      @retry="fetchData"
      @columns-change="handleModelColumnsUpdate"
      @view="viewDetail"
      @logs="viewLogs"
      @devices="openDeviceDialog"
      @attributes="openAttrDialog"
      @delete="confirmDeleteModel"
      @image-preview-show="showImagePreview"
      @image-preview-hide="hideImagePreview"
      @image-error="handleTableImageError"
      @page-change="handlePageChange"
      @page-size-change="handleSizeChange"
    />

    <base-modal
      v-model="showCreateDialog"
      :title="$t(isEdit ? 'pod_models.create_dialog.title_edit' : 'pod_models.create_dialog.title_create')"
      size="lg"
      :ok-title="$t('common.save_confirm')"
      :cancel-title="$t('common.cancel')"
      :busy="saving"
      :ok-disabled="saving"
      @hidden="resetForm"
      @ok="handleSaveModelModalOk"
      modal-class="model-el dialog-with-header-bg pod-model-form-dialog" :centered="false" :scrollable="false"
    >
      <b-row v-if="!isEdit">
        <b-col cols="12" md="6">
          <base-form-group :label="$t('pod_models.create_dialog.code_label')" required :state="modelFieldState('code')" :invalid-feedback="modelErrors.code">
            <base-input v-model="form.code" :placeholder="$t('pod_models.create_dialog.code_placeholder')" :state="modelFieldState('code')" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('pod_models.create_dialog.name_label')" required :state="modelFieldState('name')" :invalid-feedback="modelErrors.name">
            <base-input v-model="form.name" :placeholder="$t('pod_models.create_dialog.name_placeholder')" :state="modelFieldState('name')" />
          </base-form-group>
        </b-col>
      </b-row>
      <base-form-group v-if="!isEdit" :label="$t('pod_models.create_dialog.company_label')" required :state="modelFieldState('company_id')" :invalid-feedback="modelErrors.company_id">
        <base-select v-model="form.company_id" :options="companyCreateOptions" :state="modelFieldState('company_id')" />
      </base-form-group>
      <b-row v-if="!isEdit">
        <b-col cols="12" md="8">
          <base-form-group :label="$t('pod_models.create_dialog.avatar_label')">
            <div class="avatar-field">
              <button
                type="button"
                class="avatar-uploader"
                :aria-label="$t('pod_models.create_dialog.avatar_label')"
                @click="triggerAvatarSelect"
              >
                <img v-if="form.avatar" :src="avatarDisplayUrl" class="avatar-preview" loading="lazy" />
                <app-icon name="plus" v-show="!form.avatar" class="avatar-uploader-icon" />
              </button>
              <input
                ref="avatarInput"
                :key="avatarUploadKey"
                class="d-none"
                type="file"
                accept="image/*"
                @change="handleAvatarFileSelect"
              >
              <div class="avatar-tip">
                <app-icon name="info-circle" class="mr-1" />{{ $t('pod_models.create_dialog.avatar_tip') }}
              </div>
            </div>
          </base-form-group>
        </b-col>
      </b-row>
      <base-form-group v-if="!isEdit" :label="$t('pod_models.create_dialog.description_label')">
        <base-textarea v-model="form.description" :rows="3" :placeholder="$t('pod_models.create_dialog.description_placeholder')" />
      </base-form-group>
    </base-modal>

    <!-- 型号详情对话�?-->
    <base-modal
      id="pod-models-detail-modal"
      :title="$t('pod_models.detail_dialog.title')"
      v-model="showDetailDialog"
      size="lg"
      hide-footer
      modal-class="pod-model-detail model-el dialog-with-header-bg"
    >
      <div v-if="currentModel" class="model-detail-grid">
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.code_label') }}</div>
          <div class="model-detail-value">
          <div class="detail-edit-cell" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => editDetailField('code') }">
            <span v-if="editingField !== 'code'">{{ currentModel.code }}</span>
            <base-input
              v-if="editingField === 'code'"
              ref="editCodeInput"
              v-model="editDetailForm.code"
              @click.stop
              @blur="saveDetailField"
              @keyup.enter="saveDetailField"
            />
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.name_label') }}</div>
          <div class="model-detail-value">
          <div class="detail-edit-cell" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => editDetailField('name') }">
            <span v-if="editingField !== 'name'">{{ currentModel.name }}</span>
            <base-input
              v-if="editingField === 'name'"
              ref="editNameInput"
              v-model="editDetailForm.name"
              @click.stop
              @blur="saveDetailField"
              @keyup.enter="saveDetailField"
            />
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.company_label') }}</div>
          <div class="model-detail-value">
          <div class="detail-edit-cell" v-editable-trigger="{ label: $t('common.edit'), disabled: !canTransferCompany(), activate: () => editDetailField('company_id') }">
            <span v-if="editingField !== 'company_id'">{{ currentModel.company_name }}</span>
            <base-select
              v-if="editingField === 'company_id'"
              ref="editCompanySelect"
              v-model="editDetailForm.company_id"
              :options="companyEditOptions"
              @click.stop
              @input="saveDetailField"
            />
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.image_label') }}</div>
          <div class="model-detail-value">
            <button
              type="button"
              class="avatar-edit-button"
              :disabled="!canEdit()"
              :aria-label="$t('pod_models.detail_dialog.click_upload')"
              @click="uploadAvatar"
            >
              <img
                v-if="currentModel.avatar"
                :src="currentModelAvatarUrl"
                class="detail-avatar-image"
                @mouseenter="showImagePreview($event,currentModelAvatarUrl)"
                @mouseleave="hideImagePreview"
              />
              <span v-else class="avatar-upload-placeholder">
                <app-icon name="plus" />
                <span>{{ $t('pod_models.detail_dialog.click_upload') }}</span>
              </span>
            </button>
          </div>
        </div>
        <div class="model-detail-item model-detail-item--full">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.description_label') }}</div>
          <div class="model-detail-value">
          <div class="detail-edit-cell" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => editDetailField('description') }">
            <span v-if="editingField !== 'description'">{{ getOrDefault(currentModel.description, '-') }}</span>
            <base-textarea
              v-if="editingField === 'description'"
              ref="editDescriptionInput"
              v-model="editDetailForm.description"
              :rows="2"
              @click.stop
              @blur="saveDetailField"
            />
          </div>
          </div>
        </div>
        <div class="model-detail-item model-detail-item--full">
          <div class="model-detail-label">{{ $t('pod_models.detail_dialog.is_active_label') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'is_active'" class="detail-edit-cell">
            <base-select v-model="editDetailForm.is_active" :options="detailActiveOptions" @input="saveDetailField()" />
          </div>
          <div v-else class="value-wrapper-hn editable-hn detail-edit-cell" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEdit(), activate: () => editDetailField('is_active') }">
            <base-badge :variant="editDetailForm.is_active ? 'success' : 'secondary'">
              {{ $t(editDetailForm.is_active ? 'common.active' : 'common.inactive') }}
            </base-badge>
          </div>
          </div>
        </div>
      </div>

    </base-modal>

    <!-- 属性管理对话框 -->
    <base-modal
      id="pod-models-attr-modal"
      :title="$t('pod_models.attr_dialog.title') + ' - ' + (currentAttrModel ? currentAttrModel.name : '')"
      v-model="showAttrDialog"
      size="xl"
      hide-footer
      modal-class="model-el dialog-with-header-bg pod-models-table-dialog"
      @hidden="resetAttrForm"
    >
      <div class="attr-dialog-header">
        <base-button v-if="canAddDevice()" @click="openAddAttrDialog">
          <app-icon name="plus" class="mr-1" />
          {{ $t('pod_models.attr_dialog.create') }}
        </base-button>
      </div>

      <!-- 属性列�?-->
      <base-table :items="currentAttrList" :fields="attrManageFields" bordered>
        <template #cell(category)="data">
          <base-badge :variant="getCategoryTag(data.item.category)">
            {{ getCategoryLabel(data.item.category) }}
          </base-badge>
        </template>
        <template #cell(attr_value)="data">
          <span v-if="isObject(data.item.attr_value)">
            {{ data.item.attr_value.value }}
            <span v-if="data.item.attr_value.unit" class="text-muted">{{ data.item.attr_value.unit }}</span>
          </span>
          <span v-else>{{ data.item.attr_value }}</span>
        </template>
        <template #cell(description)="data">
          <span v-if="data.item.attr_value && data.item.attr_value.description" class="text-muted">
            {{ data.item.attr_value.description }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button v-if="canAddDevice()" @click="openEditAttrDialog(data.item)" :title="$t('pod_models.icons.edit')"> <app-icon name="pencil"  /> <span>{{ $t('pod_models.icons.edit') }}</span> </base-action-button>
            <base-action-button v-if="canDeleteDeviceConfig()" class="text-danger" @click="deleteAttribute(data.item)" :title="$t('pod_models.icons.delete')"> <app-icon name="trash"  /> <span>{{ $t('pod_models.icons.delete') }}</span> </base-action-button>
          </div>
        </template>
      </base-table>
    </base-modal>

    <!-- 新增/编辑属性对话框 -->
    <base-modal
      id="pod-models-attr-form-modal"
      :title="$t(isEditAttr ? 'pod_models.attr_form.title_edit' : 'pod_models.attr_form.title_create')"
      v-model="showAttrFormDialog"
      size="lg"
      :ok-title="$t('common.save_confirm')"
      :cancel-title="$t('common.cancel')"
      :busy="savingAttr"
      :ok-disabled="savingAttr"
      modal-class="dialog-with-header-bg"
      @hidden="resetAttrForm"
      @ok="handleSaveAttrModalOk"
    >
      <b-form>
        <b-row>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.category_label')" required :state="attrFieldState('category')" :invalid-feedback="attrErrors.category">
              <base-select v-model="attrForm.category" :options="attrCategoryOptions" :state="attrFieldState('category')" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.attr_code_label')" required :state="attrFieldState('attr_code')" :invalid-feedback="attrErrors.attr_code">
              <base-input v-model="attrForm.attr_code" :placeholder="$t('pod_models.attr_form.attr_code_placeholder')" :state="attrFieldState('attr_code')" />
            </base-form-group>
          </b-col>
        </b-row>

        <base-form-group :label="$t('pod_models.attr_form.value_type_label')" required :state="attrFieldState('value_type')" :invalid-feedback="attrErrors.value_type">
          <base-select v-model="attrForm.value_type" :options="attrValueTypeOptions" :state="attrFieldState('value_type')" @input="onValueTypeChange" />
        </base-form-group>

        <!-- 数值型属性值输�?-->
        <b-row v-if="attrForm.value_type === 'number'">
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.number_label')" required :state="attrFieldState('attr_value.value')" :invalid-feedback="attrErrors['attr_value.value']">
              <base-input v-model.number="attrForm.attr_value.value" type="number" step="0.01" :state="attrFieldState('attr_value.value')" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.unit_label')">
              <base-input v-model="attrForm.attr_value.unit" :placeholder="$t('pod_models.attr_form.unit_placeholder')" />
            </base-form-group>
          </b-col>
        </b-row>
        <b-row v-if="attrForm.value_type === 'number'">
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.min_label')">
              <base-input v-model.number="attrForm.attr_value.min" type="number" step="0.01" />
            </base-form-group>
          </b-col>
          <b-col cols="12" md="6">
            <base-form-group :label="$t('pod_models.attr_form.max_label')">
              <base-input v-model.number="attrForm.attr_value.max" type="number" step="0.01" />
            </base-form-group>
          </b-col>
        </b-row>

        <!-- 字符串型属性值输�?-->
        <base-form-group v-if="attrForm.value_type === 'string'" :label="$t('pod_models.attr_form.string_label')" required :state="attrFieldState('attr_value.value')" :invalid-feedback="attrErrors['attr_value.value']">
          <base-input v-model="attrForm.attr_value.value" :placeholder="$t('pod_models.attr_form.string_placeholder')" :state="attrFieldState('attr_value.value')" />
        </base-form-group>

        <!-- 布尔型属性值输�?-->
        <base-form-group v-if="attrForm.value_type === 'boolean'" :label="$t('pod_models.attr_form.boolean_label')">
          <base-switch v-model="attrForm.attr_value.value">
            {{ $t(attrForm.attr_value.value ? 'common.yes' : 'common.no') }}
          </base-switch>
        </base-form-group>

        <base-form-group :label="$t('pod_models.attr_form.description_label')">
          <base-textarea
            v-model="attrForm.attr_value.description"
            :rows="3"
            :placeholder="$t('pod_models.attr_form.description_placeholder')"
          />
        </base-form-group>
      </b-form>
    </base-modal>

    <!-- 设备配置对话�?-->
    <base-modal
      id="pod-models-device-modal"
      :title="$t('pod_models.device_dialog.title') + ' - ' + (currentModel ? currentModel.name : '')"
      v-model="showDeviceDialog"
      size="xl"
      hide-footer
      modal-class="dialog-with-header-bg model-ele pod-models-table-dialog"
    >
      <div class="device-dialog-header">
        <div class="device-hint">
          <base-alert variant="info">
            <ul>
              <li>{{ $t('pod_models.device_dialog.device_hint_host') }} <strong>{{ $t('pod_models.device_dialog.one') }}</strong></li>
              <li>{{ $t('pod_models.device_dialog.device_hint_node') }} <strong>{{ $t('pod_models.device_dialog.many') }}</strong></li>
              <li>{{ $t('pod_models.device_dialog.device_hint_quantity') }}</li>
            </ul>
          </base-alert>
        </div>
      </div>

      <base-table :items="deviceList" :fields="deviceTableFields" bordered>
        <template #cell(is_host)="data">
          <base-badge :variant="data.item.is_host ? 'primary' : 'secondary'">
            {{ $t(data.item.is_host ? 'pod_models.device_type.host' : 'pod_models.device_type.node') }}
          </base-badge>
        </template>
        <template #cell(is_required)="data">
          <span class="device-required-status">
            <template v-if="data.item.is_required">
              <app-icon name="status-active" class="text-success" aria-hidden="true" />
              <span class="sr-only">{{ $t('common.yes') }}</span>
            </template>
            <span v-else class="text-muted">{{ $t('common.no') }}</span>
          </span>
        </template>
      </base-table>

      <h5 class="mt-4">{{ $t('device_enrollment.slots.title') }}</h5>
      <base-alert variant="info">{{ $t('device_enrollment.slots.help') }}</base-alert>
      <base-table :items="deviceSlots" :fields="slotTableFields" :empty-text="$t('device_enrollment.slots.empty')" show-empty bordered>
        <template #cell(required)="data">
          <base-badge :variant="data.item.required ? 'success' : 'secondary'">{{ $t(data.item.required ? 'common.yes' : 'common.no') }}</base-badge>
        </template>
      </base-table>

      <div class="d-flex justify-content-end mt-3">
        <base-button variant="outline-secondary" @click="showDeviceDialog = false">{{ $t('common.close') }}</base-button>
      </div>
    </base-modal>

    <!-- 图片悬浮预览 -->
    <div v-show="previewImageVisible" class="image-preview-overlay" :style="{ top: previewPosition.top + 'px', left: previewPosition.left + 'px' }">
      <img :src="previewImageUrl" :alt="$t('pod_models.image_preview_alt')" loading="lazy" />
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
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import PodModelListSection from '@/components/pod-model/PodModelListSection.vue'
import podModelListWorkspace from '@/mixins/podModelListWorkspace'
import rolePermission from '@/mixins/rolePermission'
import unsavedGuard from '@/mixins/unsavedGuard'
import localizedColumns from '@/mixins/localizedColumns'
import { canWriteRow, getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import { loadRuntimeConfig } from '@/api/http'
import { uploadImage } from '@/api/files'
import { normalizeImageUrl, fetchAuthenticatedImage } from '@/utils/imageUrlHelper'
import { fetchHnModelSlots } from '@/api/hnModels'
import {
  fetchPodModelDetail,
  createPodModel,
  updatePodModel,
  deletePodModel
} from '@/api/podModels'

const CATEGORY_TAGS = {
  dimension: 'primary',
  capacity: 'success',
  appearance: 'warning'
}

export default {
  name: 'PodModels',
  permissionCapabilities: {
    create: PERMISSION.POD_RECEIVE,
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    BaseAlert,
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseTextarea,
    ChangeLogDialog,
    PodModelListSection
  },
  mixins: [rolePermission, unsavedGuard, localizedColumns, podModelListWorkspace],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { modelColumns: 'buildModelColumns' },
  data () {
    return {
      saving: false,
      savingAttr: false,
      isEdit: false,
      isEditAttr: false,
      formDirtyFlag: false,
      showCreateDialog: false,
      showDetailDialog: false,
      showAttrDialog: false,
      showAttrFormDialog: false,
      showDeviceDialog: false,
      editingField: '',
      editDetailForm: {
        code: '',
        name: '',
        company_id: '',
        description: '',
        avatar: ''
      },
      activeLoading: {},
      currentModel: null,
      currentAttrModel: null,
      currentAttrList: [],
      currentAttrPayload: {},
      editingAttrIndex: null,
      deviceList: [],
      deviceSlots: [],
      modelColumns: [],
      form: {
        code: '',
        name: '',
        company_id: '',
        avatar: '',
        description: ''
      },
      attrForm: {
        category: '',
        attr_code: '',
        value_type: 'number',
        attr_value: {
          value: null,
          unit: '',
          min: null,
          max: null,
          description: ''
        }
      },
      uploadHeaders: {},
      avatarUploadKey: 0,
      avatarDisplayUrl: '',
      currentModelAvatarUrl: '',
      previewImageVisible: false,
      previewImageUrl: '',
      previewPosition: { top: 0, left: 0 },
      modelErrors: {},
      attrErrors: {},
      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null
    }
  },
  created () {
    this.modelColumns = this.buildModelColumns()
    this.initializePage()
  },
  watch: {
    'form.avatar': {
      immediate: true,
      handler: async function (newVal) {
        if (!newVal) {
          this.avatarDisplayUrl = ''
          return
        }
        this.avatarDisplayUrl = await this.fetchAuthenticatedImage(newVal)
      }
    },
    'currentModel.avatar': {
      immediate: true,
      handler: async function (newVal) {
        if (!newVal) {
          this.currentModelAvatarUrl = ''
          return
        }
        this.currentModelAvatarUrl = await this.fetchAuthenticatedImage(this.normalizeImageUrl(newVal))
      }
    },
    // 表单内容变化时标�?dirty（unsavedGuard mixin 用）
    form: {
      deep: true,
      handler () {
        if (this.showCreateDialog) {
          this.formDirtyFlag = true
        }
      }
    },
    showCreateDialog (val) {
      if (!val) {
        this.formDirtyFlag = false
      } else {
        this.$nextTick(() => { this.formDirtyFlag = false })
      }
    }
  },
  computed: {
    companyFilterOptions () {
      return [
        { value: '', text: this.$t('pod_models.company.select_filter') },
        ...this.companyOptions.map(company => ({
          value: company.id,
          text: company.company_name
        }))
      ]
    },
    companyCreateOptions () {
      return [
        { value: '', text: this.$t('pod_models.company.select_create') },
        ...this.companyOptions.map(company => ({
          value: company.id,
          text: company.company_name
        }))
      ]
    },
    companyEditOptions () {
      return this.companyOptions.map(company => ({
        value: company.id,
        text: company.company_name
      }))
    },
    detailActiveOptions () {
      return [
        { value: true, text: this.$t('common.active') },
        { value: false, text: this.$t('common.inactive') }
      ]
    },
    attrCategoryOptions () {
      return [
        { value: '', text: this.$t('pod_models.attr_form.category_placeholder') },
        { value: 'dimension', text: this.$t('pod_models.category.dimension_select') },
        { value: 'capacity', text: this.$t('pod_models.category.capacity_select') },
        { value: 'appearance', text: this.$t('pod_models.category.appearance_select') }
      ]
    },
    attrValueTypeOptions () {
      return [
        { value: 'number', text: this.$t('pod_models.value_type.number') },
        { value: 'string', text: this.$t('pod_models.value_type.string') },
        { value: 'boolean', text: this.$t('pod_models.value_type.boolean') }
      ]
    },
    activeOptions () {
      return [
        { value: '', text: this.$t('pod_models.active.all') },
        { value: true, text: this.$t('pod_models.active.yes') },
        { value: false, text: this.$t('pod_models.active.no') }
      ]
    },
    visibleTableFields () {
      const fieldConfig = {
        avatar: { key: 'avatar', label: this.$t('pod_models.table.image'), thStyle: { minWidth: '80px' }, class: 'text-center', thClass: 'text-center' },
        code: { key: 'code', label: this.$t('pod_models.table.code'), thStyle: { minWidth: '140px' } },
        name: { key: 'name', label: this.$t('pod_models.table.name'), thStyle: { minWidth: '140px' } },
        company_name: { key: 'company_name', label: this.$t('pod_models.table.company_name'), thStyle: { minWidth: '140px' } },
        description: { key: 'description', label: this.$t('pod_models.table.description'), thStyle: { minWidth: '180px' } },
        attributes: { key: 'attributes', label: this.$t('pod_models.table.attributes'), class: 'text-center', thClass: 'text-center', thStyle: { minWidth: '100px' } },
        is_active: { key: 'is_active', label: this.$t('pod_models.table.is_active'), thStyle: { minWidth: '100px' } }
      }

      const visibleFields = this.modelColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    },
    deviceTableFields () {
      return [
        { key: 'model_code', label: this.$t('pod_models.device_dialog.table_code'), thStyle: { width: '22%' } },
        { key: 'model_name', label: this.$t('pod_models.device_dialog.table_name') },
        { key: 'is_host', label: this.$t('pod_models.device_dialog.table_type'), thStyle: { width: '90px' } },
        { key: 'quantity', label: this.$t('pod_models.device_dialog.table_quantity'), thStyle: { width: '70px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'is_required', label: this.$t('pod_models.device_dialog.table_required'), thStyle: { width: '96px' }, class: 'device-required-cell', thClass: 'device-required-cell' }
      ]
    },
    slotTableFields () {
      return [
        { key: 'slot_code', label: this.$t('device_enrollment.slots.code') },
        { key: 'node_model_id', label: this.$t('device_enrollment.slots.node_model') },
        { key: 'expected_route_device_id', label: this.$t('device_enrollment.slots.expected_can_id') },
        { key: 'required', label: this.$t('device_enrollment.slots.required') },
        { key: 'display_order', label: this.$t('device_enrollment.slots.display_order') }
      ]
    },
    attrManageFields () {
      return [
        { key: 'category', label: this.$t('pod_models.attr_dialog.table_category'), thStyle: { width: '110px' } },
        { key: 'attr_code', label: this.$t('pod_models.attr_dialog.table_attr_code'), thStyle: { width: '18%' } },
        { key: 'attr_value', label: this.$t('pod_models.attr_dialog.table_attr_value'), thStyle: { width: '30%' } },
        { key: 'description', label: this.$t('pod_models.attr_dialog.table_description') },
        { key: 'actions', label: this.$t('pod_models.attr_dialog.table_actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  methods: {
    canDeleteModel (row) {
      const user = getCurrentUser()
      return Boolean(hasPermission(PERMISSION.USER_MANAGE, user) && canWriteRow(row, 'podModel', user))
    },
    async confirmDeleteModel (row) {
      const confirmed = await this.$uiConfirm(`${this.$t('common.delete')}: ${row.name || row.code}`, {
        title: this.$t('common.confirm_delete'),
        okVariant: 'danger',
        okTitle: this.$t('common.delete'),
        cancelTitle: this.$t('common.cancel')
      })
      if (!confirmed) return
      try {
        await deletePodModel(row.uuid)
        this.$uiToast.success(this.$t('common.delete_success'))
        await this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.delete_failed'))
      }
    },
    buildModelColumns () {
      return [
        { prop: 'code', label: this.$t('pod_models.table.code'), visible: true },
        { prop: 'name', label: this.$t('pod_models.table.name'), visible: true },
        { prop: 'avatar', label: this.$t('pod_models.table.image'), visible: true, thStyle: { minWidth: '100px' }, class: 'text-center', thClass: 'text-center' },
        { prop: 'company_name', label: this.$t('pod_models.table.company_name'), visible: true },
        { prop: 'description', label: this.$t('pod_models.table.description'), visible: false },
        { prop: 'attributes', label: this.$t('pod_models.table.attributes'), visible: true },
        { prop: 'is_active', label: this.$t('pod_models.table.is_active'), visible: true }
      ]
    },
    // unsavedGuard mixin 接入：仅在主编辑表单弹窗 + 表单脏时拦截
    isFormDirty () {
      return this.showCreateDialog && this.formDirtyFlag === true
    },
    canAddDevice () {
      const user = getCurrentUser()
      if (!user) return false

      return hasPermission(PERMISSION.POD_RECEIVE, user)
    },
    canDeleteDeviceConfig () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.USER_MANAGE, user)
    },
    canTransferCompany () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.PLATFORM_MODEL_MANAGE, user)
    },

    async initializePage () {
      await loadRuntimeConfig()
      this.fetchData()
      this.loadOptions()
    },
    // 标准化图�?URL - 使用全局工具函数
    normalizeImageUrl (url) {
      return normalizeImageUrl(url)
    },
    // 获取带认证信息的图片 - 使用全局工具函数
    async fetchAuthenticatedImage (url) {
      return fetchAuthenticatedImage(url)
    },
    handleModelColumnsUpdate (columns) {
      this.modelColumns = columns
    },
    getOrDefault (value, defaultValue) {
      return value !== undefined && value !== null ? value : defaultValue
    },
    isObject (value) {
      return typeof value === 'object' && value !== null
    },
    getCategoryLabel (category) {
      const keys = ['dimension', 'capacity', 'appearance']
      return keys.includes(category) ? this.$t(`pod_models.category.${category}`) : category
    },
    getCategoryTag (category) {
      return CATEGORY_TAGS[category] || 'info'
    },
    showImagePreview (event, url) {
      const rect = event.target.getBoundingClientRect()
      this.previewImageUrl = url
      this.previewPosition = {
        top: rect.top + window.scrollY,
        left: rect.right + window.scrollX + 10
      }
      this.previewImageVisible = true
    },
    handleTableImageError (id) {
      this.$set(this.tableImageErrors, id, true)
      this.hideImagePreview()
    },
    hideImagePreview () {
      this.previewImageVisible = false
    },
    async viewDetail (row) {
      try {
        const detail = await fetchPodModelDetail(row.uuid)
        this.currentModel = detail
        this.editDetailForm = {
          code: detail.code,
          name: detail.name,
          is_active: detail.is_active,
          company_id: detail.company_id,
          description: detail.description || '',
          avatar: detail.avatar || ''
        }
        this.showDetailDialog = true
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.load_detail_failed'))
      }
    },
    async viewLogs (row) {
      this.logLoading = true
      this.currentLogData = null
      this.logDialogVisible = true
      try {
        const detail = await fetchPodModelDetail(row.uuid)
        this.currentLogData = detail.change_log || { changes: [], current: { is_active: detail.is_active } }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.load_detail_failed'))
      } finally {
        this.logLoading = false
      }
    },
    handleLogClose () {
      // 可以在这里添加关闭后的清理逻辑
    },
    editDetailField (field) {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      this.editingField = field
      if (field === 'code') {
        this.editDetailForm.code = this.currentModel.code
        this.$nextTick(() => {
          if (this.$refs.editCodeInput) {
            this.$refs.editCodeInput.focus()
          }
        })
      } else if (field === 'name') {
        this.editDetailForm.name = this.currentModel.name
        this.$nextTick(() => {
          if (this.$refs.editNameInput) {
            this.$refs.editNameInput.focus()
          }
        })
      } else if (field === 'company_id') {
        this.editDetailForm.company_id = this.currentModel.company_id
        this.$nextTick(() => {
          if (this.$refs.editCompanySelect) {
            this.$refs.editCompanySelect.focus()
          }
        })
      } else if (field === 'description') {
        this.editDetailForm.description = this.currentModel.description || ''
        this.$nextTick(() => {
          if (this.$refs.editDescriptionInput) {
            this.$refs.editDescriptionInput.focus()
          }
        })
      }
    },
    async saveDetailField () {
      if (!this.editingField) return
      const field = this.editingField
      const value = this.editDetailForm[field]
      let saved = false
      try {
        const updateData = {}
        if (field === 'company_id') {
          updateData.company_id = Number(value)
        } else {
          updateData[field] = value
        }
        await updatePodModel(this.currentModel.uuid, updateData)
        if (field === 'company_id') {
          const company = this.companyOptions.find(c => c.id === value)
          this.currentModel.company_id = value
          this.currentModel.company_name = company ? company.company_name : ''
        } else {
          this.currentModel[field] = value
        }
        this.fetchData()
        this.$uiToast.success(this.$t('common.update_success'))
        saved = true
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.update_failed'))
      } finally {
        if (saved) this.editingField = ''
      }
    },
    async uploadAvatar () {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
          this.$uiToast.warning(this.$t('pod_models.toast.size_too_big'))
          return
        }
        const formData = new FormData()
        formData.append('file', file)
        try {
          // axios 响应拦截器已 return response.data，此处直接拿到上传响�?
          const result = await uploadImage(formData)
          const imageUrl = result.url || result.data?.url
          await updatePodModel(this.currentModel.uuid, { avatar: imageUrl })
          this.currentModel.avatar = imageUrl
          this.currentModelAvatarUrl = await this.fetchAuthenticatedImage(this.normalizeImageUrl(imageUrl))
          this.editDetailForm.avatar = imageUrl
          this.$uiToast.success(this.$t('pod_models.toast.image_upload_success'))
        } catch (error) {
          this.$uiToast.error(this.$t('pod_models.toast.image_upload_failed_msg') + (this.$getErrorMessage(error) || ''))
        }
      }
      input.click()
    },
    async editModel (row) {
      this.isEdit = true
      this.currentModel = row
      try {
        const res = await fetchPodModelDetail(row.uuid)
        const detail = res
        this.form = {
          code: detail.code,
          name: detail.name,
          company_id: detail.company_id,
          avatar: this.normalizeImageUrl(detail.avatar),
          description: detail.description || ''
        }
        this.showCreateDialog = true
      } catch (error) {
        this.$uiToast.error(this.$t('pod_models.toast.load_failed') + (this.$getErrorMessage(error) || ''))
      }
    },
    resetForm () {
      this.isEdit = false
      this.form = {
        code: '',
        name: '',
        company_id: '',
        avatar: '',
        description: ''
      }
      this.avatarUploadKey += 1
      this.modelErrors = {}
    },
    modelFieldState (field) {
      if (!(field in this.modelErrors)) {
        return null
      }
      return !this.modelErrors[field]
    },
    validateModelForm () {
      const errors = {}
      if (!this.isEdit) {
        if (!this.form.code) {
          errors.code = this.$t('pod_models.validation.code_required')
        }
        if (!this.form.name) {
          errors.name = this.$t('pod_models.validation.name_required')
        }
        if (!this.form.company_id) {
          errors.company_id = this.$t('pod_models.validation.company_required')
        }
      }
      this.modelErrors = errors
      return Object.keys(errors).length === 0
    },
    handleSaveModelModalOk (event) {
      event.preventDefault()
      this.saveModel()
    },
    async saveModel () {
      if (!this.validateModelForm()) {
        return
      }
      this.saving = true
      try {
        const formData = {
          code: this.form.code,
          name: this.form.name,
          company_id: Number(this.form.company_id),
          avatar: this.form.avatar,
          description: this.form.description
        }
        if (this.isEdit) {
          await updatePodModel(this.currentModel.uuid, formData)
          this.$uiToast.success(this.$t('pod_models.toast.model_update_success'))
        } else {
          await createPodModel(formData)
          this.$uiToast.success(this.$t('pod_models.toast.model_create_success'))
        }
        this.formDirtyFlag = false
        this.showCreateDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.isEdit ? this.$t('pod_models.toast.model_update_failed') + (this.$getErrorMessage(error) || '') : this.$t('pod_models.toast.model_create_failed') + (this.$getErrorMessage(error) || ''))
      } finally {
        this.saving = false
      }
    },
    async toggleActiveStatus (row) {
      if (!this.canEdit()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      const newStatus = row.is_active
      this.$set(this.activeLoading, row.id, true)
      try {
        await updatePodModel(row.uuid, { is_active: newStatus })
        row.is_active = newStatus
        this.$uiToast.success(this.$t('pod_models.toast.active_toggled', { status: this.$t(newStatus ? 'common.active' : 'common.inactive') }))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.toggle_failed'))
        row.is_active = !newStatus
      } finally {
        this.$set(this.activeLoading, row.id, false)
      }
    },
    async openAttrDialog (row) {
      this.currentAttrModel = row
      this.currentAttrList = []
      this.currentAttrPayload = {}
      this.showAttrDialog = true
      try {
        const detail = await fetchPodModelDetail(row.uuid)
        this.currentAttrModel = { ...row, ...detail }
        this.loadModelAttributes(detail)
      } catch (error) {
        this.$uiToast.error(this.$t('pod_models.toast.load_attr_failed') + (this.$getErrorMessage(error) || ''))
      }
    },
    loadModelAttributes (detail) {
      const attr = detail?.attr && typeof detail.attr === 'object' && !Array.isArray(detail.attr)
        ? JSON.parse(JSON.stringify(detail.attr))
        : {}
      this.currentAttrPayload = attr
      const storedAttributes = Array.isArray(attr.legacy_attrs)
        ? attr.legacy_attrs
        : (Array.isArray(detail?.attributes) ? detail.attributes : [])
      this.currentAttrList = storedAttributes
        .filter(item => item && typeof item === 'object' && item.attr_code)
        .map((item, index) => ({
          _index: index,
          _source: JSON.parse(JSON.stringify(item)),
          category: item.category || 'general',
          attr_code: item.attr_code,
          attr_value: Object.prototype.hasOwnProperty.call(item, 'value') ? item.value : item.attr_value
        }))
    },
    async persistModelAttributes (rows) {
      const legacyAttrs = rows.map(row => ({
        ...(row._source || {}),
        category: row.category,
        attr_code: row.attr_code,
        value: row.attr_value
      }))
      const attr = {
        ...this.currentAttrPayload,
        legacy_attrs: legacyAttrs
      }
      const detail = await updatePodModel(this.currentAttrModel.uuid, { attr })
      this.currentAttrModel = { ...this.currentAttrModel, ...detail }
      this.loadModelAttributes(detail)
    },
    openAddAttrDialog () {
      this.isEditAttr = false
      this.editingAttrIndex = null
      this.resetAttrForm()
      this.showAttrFormDialog = true
    },
    openEditAttrDialog (row) {
      this.isEditAttr = true
      this.editingAttrIndex = row._index
      let valueType = 'string'
      if (typeof row.attr_value === 'boolean') {
        valueType = 'boolean'
      } else if (typeof row.attr_value === 'object' && row.attr_value !== null) {
        if (typeof row.attr_value.value === 'number') {
          valueType = 'number'
        } else if (typeof row.attr_value.value === 'boolean') {
          valueType = 'boolean'
        } else {
          valueType = 'string'
        }
      }
      this.attrForm = {
        category: row.category,
        attr_code: row.attr_code,
        value_type: valueType,
        attr_value: {
          value: typeof row.attr_value === 'object' && row.attr_value !== null
            ? row.attr_value.value
            : row.attr_value,
          unit: row.attr_value?.unit || '',
          min: row.attr_value?.min || null,
          max: row.attr_value?.max || null,
          description: row.attr_value?.description || ''
        }
      }
      this.showAttrFormDialog = true
      this.attrErrors = {}
    },
    resetAttrForm () {
      this.attrForm = {
        category: '',
        attr_code: '',
        value_type: 'number',
        attr_value: {
          value: null,
          unit: '',
          min: null,
          max: null,
          description: ''
        }
      }
      this.attrErrors = {}
    },
    attrFieldState (field) {
      if (!(field in this.attrErrors)) {
        return null
      }
      return !this.attrErrors[field]
    },
    validateAttrForm () {
      const errors = {}
      if (!this.attrForm.category) {
        errors.category = this.$t('pod_models.validation.category_required')
      }
      if (!this.attrForm.attr_code || !String(this.attrForm.attr_code).trim()) {
        errors.attr_code = this.$t('pod_models.validation.attr_code_required')
      }
      if (!this.attrForm.value_type) {
        errors.value_type = this.$t('pod_models.validation.value_type_required')
      }
      if ((this.attrForm.value_type === 'number' || this.attrForm.value_type === 'string') && (this.attrForm.attr_value.value === null || this.attrForm.attr_value.value === undefined || this.attrForm.attr_value.value === '')) {
        errors['attr_value.value'] = this.$t('pod_models.validation.attr_value_required')
      }
      this.attrErrors = errors
      return Object.keys(errors).length === 0
    },
    handleSaveAttrModalOk (event) {
      event.preventDefault()
      this.saveAttribute()
    },

    async saveAttribute () {
      if (!this.validateAttrForm()) return

      this.savingAttr = true
      try {
        const nextAttribute = {
          category: this.attrForm.category,
          attr_code: String(this.attrForm.attr_code).trim(),
          attr_value: this.attrForm.attr_value
        }
        const nextRows = this.currentAttrList.map(row => ({ ...row }))

        if (this.isEditAttr) {
          const existing = nextRows[this.editingAttrIndex]
          nextRows.splice(this.editingAttrIndex, 1, { ...existing, ...nextAttribute })
          await this.persistModelAttributes(nextRows)
          this.$uiToast.success(this.$t('pod_models.toast.attr_update_success'))
        } else {
          nextRows.push(nextAttribute)
          await this.persistModelAttributes(nextRows)
          this.$uiToast.success(this.$t('pod_models.toast.attr_create_success'))
        }

        this.showAttrFormDialog = false
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.save_attr_failed'))
      } finally {
        this.savingAttr = false
      }
    },

    async deleteAttribute (row) {
      try {
        const confirmed = await this.$uiConfirm(this.$t('pod_models.confirm.delete_attr_message', { code: row.attr_code }), {
          title: this.$t('pod_models.confirm.delete_attr_title'),
          okTitle: this.$t('common.confirm_delete'),
          cancelTitle: this.$t('common.cancel'),
          okVariant: 'danger'
        })
        if (!confirmed) return

        await this.persistModelAttributes(this.currentAttrList.filter(item => item._index !== row._index))
        this.$uiToast.success(this.$t('pod_models.toast.attr_delete_success'))
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.delete_attr_failed'))
      }
    },

    onValueTypeChange () {
      this.attrForm.attr_value = {
        value: null,
        unit: '',
        min: null,
        max: null,
        description: ''
      }
    },
    triggerAvatarSelect () {
      if (this.$refs.avatarInput) {
        this.$refs.avatarInput.click()
      }
    },
    async handleAvatarFileSelect (event) {
      const file = event?.target?.files?.[0]
      if (!file) return
      if (!this.beforeAvatarUpload(file)) {
        event.target.value = ''
        return
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        // 走统一 axios 实例：自动带 Authorization�?01 触发统一登录跳转
        const result = await uploadImage(formData)
        this.handleAvatarSuccess(result, file)
      } catch (error) {
        this.handleAvatarError(error)
      } finally {
        event.target.value = ''
      }
    },
    handleAvatarSuccess (res, file) {
      const imageUrl = res.url || res.data?.url || res.file_url || res.path
      if (imageUrl) {
        const normalizedUrl = this.normalizeImageUrl(imageUrl)
        this.$set(this.form, 'avatar', normalizedUrl)
        this.avatarUploadKey += 1
        this.$uiToast.success(this.$t('pod_models.toast.image_upload_success'))
      } else {
        this.$uiToast.warning(this.$t('pod_models.toast.image_upload_no_url'))
      }
    },
    handleAvatarError () {
      this.$uiToast.error(this.$t('pod_models.toast.image_upload_failed'))
    },
    beforeAvatarUpload (file) {
      const isImage = file.type.startsWith('image/')
      const isLt5M = file.size / 1024 / 1024 < 5
      if (!isImage) {
        this.$uiToast.error(this.$t('pod_models.toast.must_be_image'))
      }
      if (!isLt5M) {
        this.$uiToast.error(this.$t('pod_models.toast.size_limit'))
      }
      return isImage && isLt5M
    },

    // ========== 设备配置相关方法 ==========
    async openDeviceDialog (row) {
      this.currentModel = row
      this.deviceList = []
      this.deviceSlots = []
      this.showDeviceDialog = true
      try {
        const detail = await fetchPodModelDetail(row.uuid)
        this.currentModel = { ...row, ...detail }
        this.deviceList = detail.devices || []
        if (detail.host_model_id) {
          this.deviceSlots = await fetchHnModelSlots(detail.host_model_id)
        }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('pod_models.toast.load_device_failed'))
      }
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/pod-models.scss"></style>
