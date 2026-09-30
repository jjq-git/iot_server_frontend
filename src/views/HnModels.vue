<template>
  <div :class="['hn-models', { 'is-readonly': !canEdit() }]">
    <hn-model-list-section
      :query="query"
      :type-options="typeOptions"
      :status-options="statusOptions"
      :allow-create="canCreate()"
      :allow-web-ui="canViewWebUi()"
      :allow-firmware-manage="canManageFirmware()"
      :items="tableData"
      :fields="visibleTableFields"
      :columns="modelColumns"
      :loading="loading"
      :load-error="loadError"
      :total="total"
      :status-variant="statusTagType"
      :status-text="statusLabel"
      :format-date-time="formatDateTime"
      @search="handleSearch"
      @query-change="query = $event"
      @create="openCreateDialog"
      @add-hardware="openAddHardwareDialog"
      @retry="fetchData"
      @columns-change="handleModelColumnsUpdate"
      @view="viewDetail"
      @logs="viewLogs"
      @attributes="openNewAttributeManagement"
      @web-ui="openVersionCatalog"
      @upload-firmware="openFirmwareUpload"
      @edit-firmware="openFirmwareEdit"
      @page-change="handlePageChange"
    />
    <hn-model-version-catalog-modal
      v-model="showVersionCatalog"
      :hardware-line="selectedVersionLine"
      :initial-revision-id="selectedVersionRevisionId"
      :initial-version-uuid="selectedVersionUuid"
      :can-manage="canManageWebUi()"
    />
    <!-- 创建/编辑型号对话框 -->
    <base-modal
      id="hn-models-create-modal"
      v-model="showCreateDialog"
      :title="createDialogTitle"
      size="lg"
      :busy="saving"
      :ok-disabled="saving"
      @hidden="resetForm"
      @ok="handleSaveModelModalOk"
      modal-class="model-el dialog-with-header-bg hn-models-modal" :centered="false" :scrollable="false"
    >
      <template #modal-footer="{ ok, cancel }">
        <base-button variant="outline-secondary" @click="cancel()" :title="$t('common.cancel')">
          <app-icon name="x" class="mr-1" />
          {{ $t('common.cancel') }}
        </base-button>
        <base-button variant="primary" @click="ok()" :disabled="saving" :title="$t('common.save')">
          <app-icon name="check" class="mr-1" />
          {{ $t(saving ? 'hn_models.create_dialog.saving' : 'common.save') }}
        </base-button>
      </template>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('hn_models.form.model_code')" required :state="modelFieldState('model_code')" :invalid-feedback="modelErrors.model_code">
            <base-input v-model="form.model_code" placeholder="P-XXXX / N-XXXX" :state="modelFieldState('model_code')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('hn_models.form.part_number')" required :state="modelFieldState('part_number')" :invalid-feedback="modelErrors.part_number">
            <base-input v-model="form.part_number" :placeholder="form.is_host === false ? 'WF2D-XXXX' : 'WF2P-XXXX'" :state="modelFieldState('part_number')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('hn_models.form.model_name')" required :state="modelFieldState('model_name')" :invalid-feedback="modelErrors.model_name">
            <base-input v-model="form.model_name" :placeholder="$t('hn_models.form.model_name_placeholder')" :state="modelFieldState('model_name')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('factory_registry.manufacturer')" required :state="modelFieldState('company_id')" :invalid-feedback="modelErrors.company_id">
            <base-select v-model="form.company_id" :options="manufacturerOptions" :state="modelFieldState('company_id')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
      </b-row>

      <base-form-group :label="$t('hn_models.form.type')" required :state="modelFieldState('is_host')" :invalid-feedback="modelErrors.is_host">
        <base-select v-model="form.is_host" :options="modelTypeOptions" :state="modelFieldState('is_host')" :disabled="addingHardwareLine" />
      </base-form-group>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.vendor_id')" required :state="modelFieldState('vendor_id')" :invalid-feedback="modelErrors.vendor_id">
            <base-input v-model.trim="form.vendor_id" placeholder="0x00000000" :state="modelFieldState('vendor_id')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.product_code')" required :state="modelFieldState('product_code')" :invalid-feedback="modelErrors.product_code">
            <base-input v-model.trim="form.product_code" placeholder="0x00000000" :state="modelFieldState('product_code')" :disabled="addingHardwareLine" />
          </base-form-group>
        </b-col>
      </b-row>

      <b-row>
        <b-col cols="12" md="6">
          <base-form-group :label="$t('device_enrollment.hw_version')" required :state="modelFieldState('hw_version')" :invalid-feedback="modelErrors.hw_version">
            <base-input v-model.trim="form.hw_version" :state="modelFieldState('hw_version')" />
          </base-form-group>
        </b-col>
      </b-row>

      <base-form-group :label="$t('hn_models.form.desc')">
        <base-textarea
          v-model="form.desc"
          :rows="3"
          :placeholder="$t('hn_models.form.desc_placeholder')"
          :disabled="addingHardwareLine"
        />
      </base-form-group>

      <base-form-group :label="$t('hn_models.form.url')">
        <base-input v-model="form.url" :placeholder="$t('hn_models.form.url_placeholder')" :disabled="addingHardwareLine" />
      </base-form-group>
    </base-modal>

    <!-- 详情对话框 -->
    <base-modal
      id="hn-models-detail-modal"
      :title="$t('hn_models.detail_dialog.title')"
      v-model="showDetailDialog"
      size="lg"
      hide-footer
      modal-class="model-el dialog-with-header-bg hn-models-modal"
      @hidden="resetDetailEdit"
    >
      <div v-if="selectedModel" class="model-detail-grid">
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.form.model_code') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'model_code'" class="edit-input-wrapper-hn">
            <base-input v-model="editValue" @keyup.enter="saveFieldEdit('model_code')" @blur="saveFieldEdit('model_code')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('model_code') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('model_code'), activate: () => startEdit('model_code', selectedModel.model_code) }">
            <span>{{ selectedModel.model_code }}</span>
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.form.model_name') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'model_name'" class="edit-input-wrapper-hn">
            <base-input v-model="editValue" @keyup.enter="saveFieldEdit('model_name')" @blur="saveFieldEdit('model_name')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('model_name') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('model_name'), activate: () => startEdit('model_name', selectedModel.model_name) }">
            <span>{{ selectedModel.model_name }}</span>
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.form.type') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'is_host'" class="edit-input-wrapper-hn">
            <base-select v-model="editValue" :options="detailTypeOptions" @input="saveFieldEdit('is_host')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('is_host') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('is_host'), activate: () => startEdit('is_host', selectedModel.is_host) }">
            <base-badge :variant="selectedModel.is_host ? 'primary' : 'success'">
              {{ $t(selectedModel.is_host ? 'hn_models.type.host' : 'hn_models.type.node') }}
            </base-badge>
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.form.status') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'status'" class="edit-input-wrapper-hn">
            <base-select v-model="editValue" :options="detailStatusOptions" @input="saveFieldEdit('status')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetailStatus() }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetailStatus(), activate: () => startEdit('status', selectedModel.status) }">
            <base-badge :variant="statusTagType(selectedModel.status)">
              {{ statusLabel(selectedModel.status) }}
            </base-badge>
          </div>
          </div>
        </div>
        <div v-if="selectedModel.is_host && !selectedModel.hn_model_id" class="model-detail-item model-detail-item--full">
          <div class="model-detail-label">{{ $t('hn_models.form.command_capabilities') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'command_capabilities'" class="edit-input-wrapper-hn command-capabilities-editor">
            <b-form-checkbox-group
              v-model="editValue"
              :options="commandCapabilityOptions"
              :disabled="saving"
              stacked
              @input="saveCommandCapabilities"
            />
          </div>
          <div
            v-else
            :class="['value-wrapper-hn', 'command-capabilities-value', { 'editable-hn': canEditDetail('command_capabilities') }]"
            :title="$t('hn_models.form.command_capabilities_help')"
            v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('command_capabilities'), activate: () => startEdit('command_capabilities', selectedModel.command_capabilities || []) }"
          >
            <b-form-checkbox
              v-for="option in commandCapabilityOptions"
              :key="option.value"
              :checked="(selectedModel.command_capabilities || []).includes(option.value)"
              disabled
            >
              {{ option.text }}
            </b-form-checkbox>
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('device_enrollment.vendor_id') }}</div>
          <div class="model-detail-value">
            <div v-if="editingField === 'vendor_id'" class="edit-input-wrapper-hn">
              <base-input v-model="editValue" @keyup.enter="saveFieldEdit('vendor_id')" @blur="saveFieldEdit('vendor_id')" />
            </div>
            <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('vendor_id') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('vendor_id'), activate: () => startEdit('vendor_id', selectedModel.vendor_id) }">
              <span>{{ selectedModel.vendor_id || '-' }}</span>
            </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('device_enrollment.product_code') }}</div>
          <div class="model-detail-value">
            <div v-if="editingField === 'product_code'" class="edit-input-wrapper-hn">
              <base-input v-model="editValue" @keyup.enter="saveFieldEdit('product_code')" @blur="saveFieldEdit('product_code')" />
            </div>
            <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('product_code') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('product_code'), activate: () => startEdit('product_code', selectedModel.product_code) }">
              <span>{{ selectedModel.product_code || '-' }}</span>
            </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('device_enrollment.hw_version') }}</div>
          <div class="model-detail-value">
            <div v-if="editingField === 'hw_version'" class="edit-input-wrapper-hn">
              <base-input v-model="editValue" @keyup.enter="saveFieldEdit('hw_version')" @blur="saveFieldEdit('hw_version')" />
            </div>
            <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('hw_version') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('hw_version'), activate: () => startEdit('hw_version', selectedModel.hw_version) }">
              <span>{{ selectedModel.hw_version || '-' }}</span>
            </div>
          </div>
        </div>
        <div v-if="selectedModel.hn_model_id" class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.version_catalog.version_summary') }}</div>
          <div class="model-detail-value">{{ $t('hn_models.version_catalog.summary', { versions: selectedModel.version_count, revisions: selectedModel.revision_count }) }}</div>
        </div>
        <div v-if="!selectedModel.hn_model_id" class="model-detail-item">
          <div class="model-detail-label">{{ $t('device_enrollment.compatible_hw_versions') }}</div>
          <div class="model-detail-value">
            <div v-if="editingField === 'compatible_hw_versions'" class="edit-input-wrapper-hn">
              <base-input v-model="editValue" @keyup.enter="saveFieldEdit('compatible_hw_versions')" @blur="saveFieldEdit('compatible_hw_versions')" />
            </div>
            <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('compatible_hw_versions') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('compatible_hw_versions'), activate: () => startEdit('compatible_hw_versions', selectedModel.compatible_hw_versions || []) }">
              <span>{{ (selectedModel.compatible_hw_versions || []).join(', ') || '-' }}</span>
            </div>
          </div>
        </div>
        <div v-if="!selectedModel.hn_model_id" class="model-detail-item">
          <div class="model-detail-label">{{ $t('device_enrollment.auto_discovery') }}</div>
          <div class="model-detail-value">
            <div v-if="editingField === 'auto_discovery_enabled'" class="edit-input-wrapper-hn">
              <base-switch v-model="editValue" :disabled="saving" @change="saveFieldEdit('auto_discovery_enabled')">
                {{ $t(editValue ? 'common.enabled' : 'common.disabled') }}
              </base-switch>
            </div>
            <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('auto_discovery_enabled') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('auto_discovery_enabled'), activate: () => startEdit('auto_discovery_enabled', selectedModel.auto_discovery_enabled) }">
              <base-badge :variant="selectedModel.auto_discovery_enabled ? 'success' : 'secondary'">
                {{ $t(selectedModel.auto_discovery_enabled ? 'common.enabled' : 'common.disabled') }}
              </base-badge>
            </div>
          </div>
        </div>
        <div class="model-detail-item model-detail-item--full">
          <div class="model-detail-label">{{ $t('hn_models.form.desc') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'desc'" class="edit-input-wrapper-hn">
            <base-textarea v-model="editValue" :rows="2" @blur="saveFieldEdit('desc')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('desc') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('desc'), activate: () => startEdit('desc', selectedModel.desc) }">
            <span>{{ selectedModel.desc || '-' }}</span>
          </div>
          </div>
        </div>
        <div class="model-detail-item model-detail-item--full">
          <div class="model-detail-label">{{ $t('hn_models.form.url') }}</div>
          <div class="model-detail-value">
          <div v-if="editingField === 'url'" class="edit-input-wrapper-hn">
            <base-input v-model="editValue" @keyup.enter="saveFieldEdit('url')" @blur="saveFieldEdit('url')" />
          </div>
          <div v-else :class="['value-wrapper-hn', { 'editable-hn': canEditDetail('url') }]" v-editable-trigger="{ label: $t('common.edit'), disabled: !canEditDetail('url'), activate: () => startEdit('url', selectedModel.url) }">
            <a v-if="selectedModel.url" :href="selectedModel.url" target="_blank" class="link-text">{{ selectedModel.url }}</a>
            <span v-else>-</span>
          </div>
          </div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.column.created_at') }}</div>
          <div class="model-detail-value">{{ formatDateTime(selectedModel.created_at) }}</div>
        </div>
        <div class="model-detail-item">
          <div class="model-detail-label">{{ $t('hn_models.column.updated_at') }}</div>
          <div class="model-detail-value">{{ formatDateTime(selectedModel.updated_at) }}</div>
        </div>
      </div>
      <div class="detail-dialog-footer mt-3">
        <base-button
          v-if="!selectedModel || !selectedModel.hn_model_id"
          variant="outline-danger"
          :disabled="!canDeleteDetail()"
          :title="$t('hn_models.actions.delete_model')"
          @click="confirmDeleteModel"
        >
          <app-icon name="trash" class="mr-1" />
          {{ $t('hn_models.actions.delete_model') }}
        </base-button>
        <base-button
          variant="outline-secondary"
          :title="$t('common.close')"
          @click="showDetailDialog = false"
        >
          <app-icon name="x" class="mr-1" />
          {{ $t('common.close') }}
        </base-button>
      </div>
    </base-modal>

    <!-- 变更日志对话框 -->
    <ChangeLogDialog
      :visible.sync="logDialogVisible"
      :loading="logLoading"
      :change-log="currentLogData"
    >
    </ChangeLogDialog>

    <!-- 当前生效属性只读对话框 -->
    <base-modal
      id="hn-models-new-attr-modal"
      :title="$t('hn_models.attr_dialog.title')"
      v-model="showNewAttrDialog"
      size="xl"
      hide-footer
      @hidden="handleNewAttrDialogClose"
      modal-class="dialog-with-header-bg attr-dialog-width hn-models-modal"
    >
      <div v-if="selectedModel" class="new-attr-dialog-header">
        <b-row class="model-meta-row align-items-center">
          <b-col cols="12" md="5"><strong>{{ $t('hn_models.label.model_code') }}</strong>{{ selectedModel.model_code || '-' }}</b-col>
          <b-col cols="12" md="5"><strong>{{ $t('hn_models.label.model_name') }}</strong>{{ selectedModel.model_name || '-' }}</b-col>
        </b-row>
      </div>

      <section v-if="attributePublication" class="attribute-publication" :aria-label="$t('hn_models.publication.title')">
        <div class="attribute-publication__heading">
          <app-icon name="box-seam" aria-hidden="true" />
          <strong>{{ $t('hn_models.publication.title') }}</strong>
        </div>
        <dl class="attribute-publication__grid">
          <div>
            <dt>{{ $t('hn_models.publication.source') }}</dt>
            <dd>{{ attributePublication.source || $t('hn_models.publication.configs_package') }}</dd>
          </div>
          <div>
            <dt>{{ $t('hn_models.publication.product_model') }}</dt>
            <dd>{{ attributePublication.productModel || '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('hn_models.publication.config_version') }}</dt>
            <dd>{{ attributePublication.configVersion || '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('hn_models.publication.profile_id') }}</dt>
            <dd>{{ attributePublication.profileId || '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('hn_models.publication.published_at') }}</dt>
            <dd>{{ attributePublication.publishedAt ? formatDateTime(attributePublication.publishedAt) : '-' }}</dd>
          </div>
          <div>
            <dt>{{ $t('hn_models.publication.active') }}</dt>
            <dd>
              <base-badge v-if="attributePublication.active !== null" :variant="attributePublication.active ? 'success' : 'secondary'">
                {{ $t(attributePublication.active ? 'common.enabled' : 'common.disabled') }}
              </base-badge>
              <span v-else>-</span>
            </dd>
          </div>
        </dl>
      </section>

      <div class="new-attr-dialog-content">
        <b-row>
          <!-- 左侧索引树 -->
          <b-col cols="12" md="4" class="attr-index-tree">
            <div class="tree-title-row">
              <h5 class="tree-title">{{ $t('hn_models.index_tree.title') }}</h5>
              <base-badge variant="secondary">{{ $t('hn_models.publication.readonly') }}</base-badge>
            </div>
            <div class="tree-search">
              <base-input
                v-model.trim="indexSearchQuery"
                :placeholder="$t('hn_models.index_tree.search_placeholder')"
                class="tree-search-input"
              />
            </div>
            <div class="tree-container">
              <div v-if="indexListLoading" class="empty-tree">{{ $t('common.loading') }}</div>
              <template v-else>
                <section
                  v-for="group in filteredIndexGroups"
                  :key="group.key"
                  class="index-group"
                >
                  <button
                    type="button"
                    class="index-group__header"
                    :aria-expanded="String(!isIndexGroupCollapsed(group.key))"
                    @click="toggleIndexGroup(group.key)"
                  >
                    <app-icon name="chevron-right"
                      class="index-group__chevron"
                      :rotate="isIndexGroupCollapsed(group.key) ? 0 : 90" />
                    <span class="index-group__name">{{ group.category || group.name }}</span>
                    <base-badge variant="secondary" class="index-group__count">
                      {{ group.items.length }}
                    </base-badge>
                  </button>
                  <div v-show="!isIndexGroupCollapsed(group.key)" class="index-group__items">
                    <button
                      v-for="index in group.items"
                      :key="makeIndexKey(index.co_index, index.co_sub_index, index.attr_code)"
                      type="button"
                      :class="['tree-item', { active: isSelectedIndex(index) }]"
                      @click="selectIndex(index)"
                    >
                      <span class="tree-item-label">{{ index.co_index || index.attr_code }}</span>
                      <span v-if="index.co_sub_index" class="tree-item-sub">{{ index.co_sub_index }}</span>
                      <span v-if="index.attr_name" class="tree-item-name" :title="index.attr_name">{{ index.attr_name }}</span>
                    </button>
                  </div>
                </section>
                <div v-if="filteredIndexGroups.length === 0" class="empty-tree">
                  {{ indexList.length === 0
                    ? $t('hn_models.index_tree.empty_configs')
                    : $t('hn_models.index_tree.no_matches') }}
                </div>
              </template>
            </div>
          </b-col>

          <!-- 右侧只读详情 -->
          <b-col cols="12" md="8" class="attr-edit-form">
            <div class="form-title-wrapper">
              <h5 class="form-title">
                {{ selectedNewAttrKey
                  ? $t('hn_models.edit_form.viewing', { name: newAttrForm.attr_name || newAttrForm.attr_code })
                  : $t('hn_models.edit_form.placeholder_title') }}
              </h5>
            </div>

            <div v-if="selectedNewAttrKey" class="form-container">
              <dl class="attribute-detail-grid">
                <div><dt>{{ $t('hn_models.attr_form.attr_code') }}</dt><dd>{{ displayAttributeValue(newAttrForm.attr_code) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.attr_name') }}</dt><dd>{{ displayAttributeValue(newAttrForm.attr_name) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.co_index') }}</dt><dd>{{ displayAttributeValue(newAttrForm.co_index) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.co_sub_index') }}</dt><dd>{{ displayAttributeValue(newAttrForm.co_sub_index) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.data_type') }}</dt><dd>{{ displayAttributeValue(newAttrForm.data_type) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.access_type') }}</dt><dd>{{ displayAttributeValue(newAttrForm.access_type) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.min_val') }}</dt><dd>{{ displayAttributeValue(newAttrForm.min_val) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.max_val') }}</dt><dd>{{ displayAttributeValue(newAttrForm.max_val) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.default_val') }}</dt><dd>{{ displayAttributeValue(newAttrForm.default_val) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.unit') }}</dt><dd>{{ displayAttributeValue(newAttrForm.unit) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.category') }}</dt><dd>{{ displayAttributeValue(newAttrForm.category) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.group_name') }}</dt><dd>{{ displayAttributeValue(newAttrForm.group_name) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.display_order') }}</dt><dd>{{ displayAttributeValue(newAttrForm.display_order) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.web_control_table') }}</dt><dd>{{ formatBoolean(newAttrForm.web_control_table) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.web_display') }}</dt><dd>{{ formatBoolean(newAttrForm.web_display) }}</dd></div>
                <div><dt>{{ $t('hn_models.attr_form.web_editable') }}</dt><dd>{{ formatBoolean(newAttrForm.web_editable) }}</dd></div>
                <div class="attribute-detail-grid__full"><dt>{{ $t('hn_models.attr_form.description') }}</dt><dd>{{ displayAttributeValue(newAttrForm.description) }}</dd></div>
                <div class="attribute-detail-grid__full"><dt>{{ $t('hn_models.options_editor.title') }}</dt><dd class="attribute-options-value">{{ formatAttributeOptions(newAttrForm.options) }}</dd></div>
              </dl>
            </div>
            <div v-else class="empty-form">
              <p>{{ $t('hn_models.edit_form.placeholder_body') }}</p>
            </div>
          </b-col>
        </b-row>
      </div>
    </base-modal>

  </div>
</template>

<script>
/* eslint-disable vue/multi-word-component-names */
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import HnModelListSection from '@/components/hn-model/HnModelListSection.vue'
import HnModelVersionCatalogModal from '@/components/hn-model/HnModelVersionCatalogModal.vue'
import hnModelListWorkspace from '@/mixins/hnModelListWorkspace'
import unsavedGuard from '@/mixins/unsavedGuard'
import localizedColumns from '@/mixins/localizedColumns'
import { formatDate } from '@/utils/format'
import { buildAttributeGroups } from '@/utils/attribute-groups.mjs'
import { fetchCompanies } from '@/api/companies'
import {
  fetchHnModelDetail,
  fetchHnModelRevisions,
  fetchHnModelVersions,
  createHnModel,
  updateHnModel,
  deleteHnModel,
  fetchModelIndexes
} from '@/api'

const CATALOG_DETAIL_EDITABLE_FIELDS = new Set(['model_name', 'status', 'desc', 'url'])

export default {
  name: 'HnModels',
  permissionCapabilities: {
    create: PERMISSION.POD_RECEIVE,
    edit: PERMISSION.POD_RECEIVE
  },
  components: {
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    BaseSelect,
    BaseTextarea,
    ChangeLogDialog,
    HnModelListSection,
    HnModelVersionCatalogModal
  },
  mixins: [unsavedGuard, localizedColumns, hnModelListWorkspace],
  // 切换语言时重建列定义并保留用户的列显隐设置
  localizedColumns: { modelColumns: 'buildModelColumns' },
  data () {
    return {
      saving: false,
      formDirtyFlag: false,
      showCreateDialog: false,
      addingHardwareLine: false,
      showDetailDialog: false,
      showVersionCatalog: false,
      selectedVersionLine: null,
      selectedVersionRevisionId: null,
      selectedVersionUuid: '',
      selectedModel: null,
      manufacturers: [],
      form: {
        company_id: null,
        model_code: '',
        part_number: '',
        model_name: '',
        is_host: null,
        vendor_id: '',
        product_code: '',
        hw_version: '',
        desc: '',
        url: ''
      },
      // 字段编辑相关
      editingField: null,
      editValue: '',
      modelColumns: this.buildModelColumns(),
      modelErrors: {},
      // 属性管理相关
      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null,
      // 数据类型配置（tip 改用 i18n key，渲染时 $t 解析）
      // 标准 CANOpen 属性列表（按索引排序）
      // 当前生效属性查看
      showNewAttrDialog: false,
      indexList: [],
      indexListLoading: false,
      attributePublication: null,
      selectedNewAttrKey: null,
      indexSearchQuery: '',
      collapsedIndexGroups: {},
      newAttrForm: {
        uuid: null,
        attr_code: '',
        attr_name: '',
        co_index: '',
        co_sub_index: '',
        data_type: '',
        access_type: '',
        min_val: '',
        max_val: '',
        default_val: '',
        unit: '',
        description: '',
        web_control_table: false,
        web_display: true,
        web_editable: false,
        display_order: null,
        category: '',
        group_name: '',
        options: ''
      }
    }
  },
  computed: {
    createDialogTitle () {
      if (this.addingHardwareLine) return `${this.$t('common.add')} ${this.$t('hn_models.version_catalog.hw_version')}`
      return this.$t('hn_models.create_dialog.add_title')
    },
    manufacturerOptions () {
      return [
        { value: null, text: this.$t('device_enrollment.select') },
        ...this.manufacturers.map(item => ({
          value: item.id,
          text: `${item.company_code} · ${item.company_name}`
        }))
      ]
    },
    typeOptions () {
      return [
        { value: null, text: this.$t('hn_models.filter.type_all') },
        { value: true, text: this.$t('hn_models.type.host') },
        { value: false, text: this.$t('hn_models.type.node') }
      ]
    },
    statusOptions () {
      return [
        { value: '', text: this.$t('hn_models.filter.status_all') },
        { value: 'active', text: this.$t('hn_models.status.active') },
        { value: 'frozen', text: this.$t('hn_models.status.frozen') }
      ]
    },
    modelTypeOptions () {
      return [
        { value: null, text: this.$t('hn_models.form.type_placeholder') },
        { value: true, text: this.$t('hn_models.type.host') },
        { value: false, text: this.$t('hn_models.type.node') }
      ]
    },
    modelStatusOptions () {
      return [
        { value: '', text: this.$t('hn_models.form.status_placeholder') },
        { value: 'active', text: this.$t('hn_models.status.active') },
        { value: 'frozen', text: this.$t('hn_models.status.frozen') }
      ]
    },
    commandCapabilityOptions () {
      return [
        { value: 'restart', text: this.$t('pod_control_panel.actions.restart_device') },
        { value: 'get_status', text: this.$t('pod_control_panel.actions.get_status') }
      ]
    },
    detailTypeOptions () {
      return [
        { value: true, text: this.$t('hn_models.type.host') },
        { value: false, text: this.$t('hn_models.type.node') }
      ]
    },
    detailStatusOptions () {
      return [
        { value: 'active', text: this.$t('hn_models.status.active') },
        { value: 'frozen', text: this.$t('hn_models.status.frozen') }
      ]
    },
    visibleTableFields () {
      const fieldConfig = {
        model_code: { key: 'model_code', label: this.$t('hn_models.column.model_code'), thStyle: { minWidth: '120px' } },
        model_name: { key: 'model_name', label: this.$t('hn_models.column.model_name'), thStyle: { minWidth: '120px' } },
        is_host: { key: 'is_host', label: this.$t('hn_models.column.type'), thStyle: { minWidth: '85px' } },
        hw_version: { key: 'hw_version', label: this.$t('hn_models.version_catalog.hw_version'), thStyle: { minWidth: '100px' } },
        version_summary: { key: 'version_summary', label: this.$t('hn_models.version_catalog.version_summary'), thStyle: { minWidth: '130px' } },
        status: { key: 'status', label: this.$t('hn_models.column.status'), thStyle: { minWidth: '90px' } },
        description: { key: 'desc', label: this.$t('hn_models.column.desc'), thStyle: { minWidth: '140px' } },
        url: { key: 'url', label: this.$t('hn_models.column.url'), thStyle: { minWidth: '100px' } },
        created_at: { key: 'created_at', label: this.$t('hn_models.column.created_at'), thStyle: { minWidth: '140px' } }
      }

      const visibleFields = this.modelColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [
        { key: 'version_tree', label: '', class: 'version-tree-cell', thClass: 'version-tree-cell', thStyle: { width: '52px' } },
        ...visibleFields,
        { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }
      ]
    },
    filteredIndexGroups () {
      return buildAttributeGroups(
        this.indexList,
        this.indexSearchQuery,
        this.$t('hn_models.index_tree.ungrouped')
      )
    }
  },
  created () {
    this.fetchData()
  },
  watch: {
    'form.is_host' (value) {
      if (value === false) this.form.command_capabilities = []
    },
    // 表单内容变化时标记 dirty（用户开始编辑后才生效，showCreateDialog 关闭时重置）
    form: {
      deep: true,
      handler () {
        if (this.showCreateDialog) {
          this.formDirtyFlag = true
        }
      }
    },
    showCreateDialog (val) {
      // 打开/关闭表单弹窗时重置 dirty 标志
      if (!val) {
        this.formDirtyFlag = false
      } else {
        // 打开瞬间 form 已被 editModel/resetForm 写入，等下一个 tick 再开始追踪
        this.$nextTick(() => { this.formDirtyFlag = false })
      }
    }
  },
  methods: {
    async openCreateDialog () {
      this.addingHardwareLine = false
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200, is_active: true })
        this.manufacturers = (response.items || []).filter(item =>
          item.is_pod_manufacturer && this.canWriteCompany(item.id)
        )
        this.showCreateDialog = true
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('factory_registry.options_failed'))
      }
    },
    async openAddHardwareDialog (row) {
      this.addingHardwareLine = true
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200, is_active: true })
        this.manufacturers = response.items || []
        this.form = {
          company_id: row.company_id,
          model_code: row.model_code || '',
          part_number: row.part_number || '',
          model_name: row.model_name || '',
          is_host: Boolean(row.is_host),
          vendor_id: row.vendor_id || '',
          product_code: row.product_code || '',
          hw_version: '',
          desc: row.desc || '',
          url: row.url || ''
        }
        this.modelErrors = {}
        this.showCreateDialog = true
      } catch (error) {
        this.addingHardwareLine = false
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('factory_registry.options_failed'))
      }
    },
    canViewWebUi () {
      return hasPermission(PERMISSION.FIRMWARE_VIEW, getCurrentUser())
    },
    canManageWebUi () {
      return hasPermission(PERMISSION.PLATFORM_MODEL_MANAGE, getCurrentUser())
    },
    canManageFirmware () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.FIRMWARE_MANAGE, user)
    },
    openFirmwareUpload (selection) {
      if (!this.canManageFirmware()) return
      const isNewOd = selection.odVersion === ''
      this.$router.push({
        path: '/debug/firmwares',
        query: {
          upload: '1',
          hardware_id: String(selection.hardwareLine.id),
          ...(isNewOd ? { new_od: '1' } : {}),
          ...(selection.odVersion ? { od_ver: selection.odVersion } : {})
        }
      })
    },
    openFirmwareEdit (firmware) {
      if (!this.canManageFirmware() || !firmware?.uuid) return
      this.$router.push({ path: '/debug/firmwares', query: { edit: firmware.uuid } })
    },
    openVersionCatalog (selection) {
      if (!this.canViewWebUi()) return
      this.selectedVersionLine = selection.hardwareLine || selection
      this.selectedVersionRevisionId = selection.revisionId || null
      this.selectedVersionUuid = selection.versionUuid || ''
      this.showVersionCatalog = true
    },
    buildModelColumns () {
      return [
        { prop: 'model_code', label: this.$t('hn_models.column.model_code'), visible: true },
        { prop: 'model_name', label: this.$t('hn_models.column.model_name'), visible: true },
        { prop: 'is_host', label: this.$t('hn_models.column.type'), visible: true },
        { prop: 'hw_version', label: this.$t('hn_models.version_catalog.hw_version'), visible: true },
        { prop: 'version_summary', label: this.$t('hn_models.version_catalog.version_summary'), visible: true },
        { prop: 'status', label: this.$t('hn_models.column.status'), visible: true },
        { prop: 'desc', label: this.$t('hn_models.column.desc'), visible: true },
        { prop: 'url', label: this.$t('hn_models.column.url'), visible: true },
        { prop: 'created_at', label: this.$t('hn_models.column.created_at'), visible: true }
      ]
    },
    // unsavedGuard mixin 接入：表单弹窗打开且 formDirtyFlag 时拦截路由切换/页面关闭
    isFormDirty () {
      return this.showCreateDialog && this.formDirtyFlag === true
    },
    // 检查是否可以删除型号
    // 型号删除是平台级破坏性操作，后端仅允许持平台型号管理权限的账号。
    canDelete () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.PLATFORM_MODEL_MANAGE, user)
    },
    canDeleteDetail () {
      return this.canDelete() && this.selectedModel && !this.selectedModel.hn_model_id
    },
    // 确认删除型号
    async confirmDeleteModel () {
      if (!this.canDeleteDetail()) return

      try {
        const confirmed = await this.$uiConfirm(this.$t('hn_models.confirm.delete_model', { name: this.selectedModel.model_name }), {
          title: this.$t('common.tip'),
          okTitle: this.$t('common.ok'),
          cancelTitle: this.$t('common.cancel'),
          okVariant: 'danger'
        })

        if (!confirmed) return

        await deleteHnModel(this.selectedModel.uuid)
        this.$uiToast.success(this.$t('hn_models.toast.delete_model_success'))
        this.showDetailDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.delete_model_failed'))
      }
    },
    canEditStatus () {
      const user = getCurrentUser()
      return hasPermission(PERMISSION.PLATFORM_MODEL_MANAGE, user)
    },
    detailUpdateUuid () {
      if (!this.selectedModel) return ''
      return this.selectedModel.detail_update_uuid ||
        (!this.selectedModel.hn_model_id ? this.selectedModel.uuid : '')
    },
    canEditDetail (field = '') {
      if (!this.canEdit() || !this.detailUpdateUuid()) return false
      return !this.selectedModel.hn_model_id ||
        !field ||
        CATALOG_DETAIL_EDITABLE_FIELDS.has(field)
    },
    canEditDetailStatus () {
      return this.canEditDetail('status') && this.canEditStatus()
    },

    statusLabel (status) {
      const map = {
        active: this.$t('hn_models.status.active'),
        frozen: this.$t('hn_models.status.frozen')
      }
      return map[status] || status
    },
    statusTagType (status) {
      const typeMap = {
        active: 'success',
        frozen: 'secondary'
      }
      return typeMap[status] || 'info'
    },
    formatDateTime (dateString) {
      return formatDate(dateString)
    },
    handleModelColumnsUpdate (updatedColumns) {
      this.modelColumns = updatedColumns
    },
    // 字段编辑方法
    startEdit (field, value) {
      if (this.saving) return
      if (field === 'status' && !this.canEditDetailStatus()) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      if (!this.canEditDetail(field)) {
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      this.editingField = field
      if (field === 'compatible_hw_versions') {
        this.editValue = (Array.isArray(value) ? value : []).join(', ')
        return
      }
      this.editValue = Array.isArray(value)
        ? [...value]
        : (value !== null && value !== undefined ? value : '')
    },
    saveCommandCapabilities (value) {
      if (this.saving) return
      this.editValue = [...value]
      this.saveFieldEdit('command_capabilities', true)
    },
    async saveFieldEdit (field, keepEditing = false) {
      if (this.saving) return
      if (!this.editingField || !this.selectedModel) return
      if (!this.canEditDetail(field)) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }
      if (field === 'status' && !this.canEditDetailStatus()) {
        this.editingField = null
        this.$uiToast.warning(this.$t('common.no_permission_edit'))
        return
      }

      const normalizedValue = this.normalizeDetailValue(field, this.editValue)
      if (!this.validateDetailField(field, normalizedValue)) return

      this.saving = true
      try {
        const updateData = { [field]: normalizedValue }
        if (field === 'is_host' && normalizedValue === false) {
          updateData.command_capabilities = []
        }
        await updateHnModel(this.detailUpdateUuid(), updateData)

        // 更新本地数据
        Object.entries(updateData).forEach(([key, value]) => {
          this.selectedModel[key] = Array.isArray(value) ? [...value] : value
        })
        this.selectedModel.updated_at = new Date().toISOString()

        // 同步到 tableData
        const index = this.tableData.findIndex(item => item.uuid === this.selectedModel.uuid)
        if (index !== -1) {
          this.tableData[index] = { ...this.selectedModel }
        }

        this.$uiToast.success(this.$t('hn_models.toast.field_updated'))
        this.fetchData()
      } catch (error) {
        if (keepEditing && Array.isArray(this.selectedModel[field])) {
          this.editValue = [...this.selectedModel[field]]
        }
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.update_failed'))
      } finally {
        this.saving = false
        if (!keepEditing) {
          this.editingField = null
          this.editValue = ''
        }
      }
    },
    normalizeDetailValue (field, value) {
      if (field === 'compatible_hw_versions') {
        return String(value || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)
      }
      if (field === 'auto_discovery_enabled') return Boolean(value)
      if (typeof value !== 'string') return value

      const normalized = value.trim()
      if (['product_code', 'hw_version'].includes(field) && !normalized) return null
      return normalized
    },
    validateDetailField (field, value) {
      const requiredMessages = {
        model_code: 'hn_models.validation.model_code_required',
        model_name: 'hn_models.validation.model_name_required'
      }
      if (requiredMessages[field] && !value) {
        this.$uiToast.warning(this.$t(requiredMessages[field]))
        return false
      }
      if (field === 'product_code' && this.selectedModel.auto_discovery_enabled && !value) {
        this.$uiToast.warning(this.$t('device_enrollment.product_code_required'))
        return false
      }
      if (field === 'auto_discovery_enabled' && value && !this.selectedModel.product_code) {
        this.editValue = Boolean(this.selectedModel.auto_discovery_enabled)
        this.$uiToast.warning(this.$t('device_enrollment.product_code_required'))
        return false
      }
      return true
    },
    resetDetailEdit () {
      this.editingField = null
      this.editValue = ''
    },
    async resolveDetailUpdateUuid (row) {
      if (!row?.hn_model_id) return row?.uuid || ''

      try {
        const revisions = await fetchHnModelRevisions(row.id)
        for (const revision of revisions || []) {
          const versions = await fetchHnModelVersions(revision.id)
          const target = (versions || []).find(version => version.uuid)
          if (target) return target.uuid
        }
      } catch (error) {
        // Older servers return exact-version rows from the hardware-line fallback.
        if (error?.response?.status === 404) return row.uuid || ''
        throw error
      }
      return ''
    },
    async viewDetail (row) {
      this.resetDetailEdit()
      const selectedModel = { ...row, detail_update_uuid: '' }
      try {
        selectedModel.detail_update_uuid = await this.resolveDetailUpdateUuid(row)
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.fetch_detail_failed'))
      }
      this.selectedModel = selectedModel
      this.showDetailDialog = true
    },
    resetForm () {
      this.addingHardwareLine = false
      this.form = {
        company_id: null,
        model_code: '',
        part_number: '',
        model_name: '',
        is_host: null,
        vendor_id: '',
        product_code: '',
        hw_version: '',
        desc: '',
        url: ''
      }
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
      if (!this.form.model_code) {
        errors.model_code = this.$t('hn_models.validation.model_code_required')
      }
      if (!this.form.model_name) {
        errors.model_name = this.$t('hn_models.validation.model_name_required')
      }
      if (!this.form.part_number) {
        errors.part_number = this.$t('hn_models.form.part_number')
      }
      if (!this.form.company_id) {
        errors.company_id = this.$t('factory_registry.manufacturer')
      }
      if (this.form.is_host === null || this.form.is_host === '') {
        errors.is_host = this.$t('hn_models.validation.type_required')
      }
      if (!this.form.vendor_id) {
        errors.vendor_id = this.$t('device_enrollment.vendor_id')
      }
      if (!this.form.product_code) {
        errors.product_code = this.$t('device_enrollment.product_code')
      }
      if (!this.form.hw_version) {
        errors.hw_version = this.$t('device_enrollment.hw_version')
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
        const payload = {
          company_id: Number(this.form.company_id),
          model_code: this.form.model_code.trim().toUpperCase(),
          part_number: this.form.part_number.trim().toUpperCase(),
          model_name: this.form.model_name.trim(),
          model_type: this.form.is_host ? 'product' : 'node',
          vendor_id: this.form.vendor_id.trim(),
          product_code: this.form.product_code.trim(),
          hw_version: this.form.hw_version.trim(),
          desc: this.form.desc || null,
          url: this.form.url || null
        }
        await createHnModel(payload)
        this.$uiToast.success(this.$t('hn_models.toast.create_model_success'))

        this.formDirtyFlag = false
        this.showCreateDialog = false
        this.fetchData()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.create_model_failed'))
      } finally {
        this.saving = false
      }
    },
    // 查看变更日志
    async viewLogs (row) {
      const modelId = row.uuid || row.id
      if (!modelId) {
        this.$uiToast.error(this.$t('hn_models.toast.model_id_missing'))
        return
      }

      this.logLoading = true
      this.currentLogData = null
      this.logDialogVisible = true
      try {
        const detail = await fetchHnModelDetail(modelId)
        this.currentLogData = detail.change_log || { changes: [], current: { status: detail.status } }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.fetch_detail_failed'))
      } finally {
        this.logLoading = false
      }
    },

    // 当前生效属性查看
    openNewAttributeManagement (row) {
      this.selectedModel = row
      this.showNewAttrDialog = true
      this.selectedNewAttrKey = null
      this.indexSearchQuery = ''
      this.collapsedIndexGroups = {}
      this.indexList = []
      this.attributePublication = null
      this.loadIndexList()
    },

    // CANopen 属性按索引定位；无索引 MQTT 属性按 attr_code 定位。
    makeIndexKey (coIndex, coSubIndex, attrCode) {
      return coIndex
        ? `od:${coIndex}::${coSubIndex || ''}`
        : `mqtt:${attrCode || ''}`
    },

    isIndexGroupCollapsed (groupKey) {
      if (this.indexSearchQuery) return false
      return this.collapsedIndexGroups[groupKey] === true
    },

    toggleIndexGroup (groupKey) {
      this.$set(
        this.collapsedIndexGroups,
        groupKey,
        !this.isIndexGroupCollapsed(groupKey)
      )
    },

    // 判断列表项是否为当前选中
    isSelectedIndex (item) {
      if (!item || !this.selectedNewAttrKey) return false
      return this.makeIndexKey(item.co_index, item.co_sub_index, item.attr_code) === this.selectedNewAttrKey
    },

    // 从接口加载当前生效属性
    async loadIndexList () {
      this.indexListLoading = true
      try {
        const modelId = this.selectedModel && (this.selectedModel.uuid || this.selectedModel.id)
        if (!modelId) {
          this.indexList = []
          return
        }
        const response = await fetchModelIndexes(modelId)
        const items = (response && (response.items || response.data)) || response || []
        const normalized = Array.isArray(items) ? items.map(item => this.normalizeIndexItem(item)) : []
        this.indexList = normalized
        this.attributePublication = this.normalizeAttributePublication(response, normalized.length > 0)
        this.collapsedIndexGroups = {}
      } catch (error) {
        this.indexList = []
        this.attributePublication = null
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('hn_models.toast.index_list_failed'))
      } finally {
        this.indexListLoading = false
      }
    },

    // 规范后端返回的数据类型简写。
    normalizeIndexItem (raw) {
      const dtMap = {
        U8: 'UNSIGNED8',
        U16: 'UNSIGNED16',
        U32: 'UNSIGNED32',
        I8: 'INTEGER8',
        I16: 'INTEGER16',
        I32: 'INTEGER32',
        BOOL: 'BOOLEAN',
        STR: 'STRING',
        F32: 'REAL32',
        REAL: 'REAL32'
      }
      const normalized = { ...raw }
      if (normalized.data_type && dtMap[normalized.data_type]) {
        normalized.data_type = dtMap[normalized.data_type]
      }
      // is_visible ↔ web_display 兼容（JSON 里用 is_visible）
      if (normalized.is_visible !== undefined && normalized.web_display === undefined) {
        normalized.web_display = !!normalized.is_visible
      }
      return normalized
    },

    normalizeAttributePublication (response, hasAttributes) {
      if (!response || Array.isArray(response)) {
        return hasAttributes
          ? { source: '', productModel: '', configVersion: '', profileId: '', publishedAt: '', active: null }
          : null
      }
      const metadata = response.publication || response.publish_info || response.release || response.source || response.metadata || {}
      const value = (keys, fallback = '') => {
        for (const key of keys) {
          if (metadata[key] !== undefined && metadata[key] !== null) return metadata[key]
          if (response[key] !== undefined && response[key] !== null) return response[key]
        }
        return fallback
      }
      const activeValue = value(['active', 'is_active', 'activated'], null)
      return {
        source: value(['source_name', 'source', 'managed_by']),
        productModel: value(['product_model', 'product_model_code', 'model_code']),
        configVersion: value(['config_version', 'version', 'package_version']),
        profileId: value(['profile_id', 'attribute_profile_id', 'attr_profile_id']),
        publishedAt: value(['published_at', 'publish_time', 'activated_at']),
        active: activeValue === null || activeValue === ''
          ? null
          : activeValue === true || activeValue === 1 || activeValue === 'true' || activeValue === 'active'
      }
    },

    // 选择索引（按 co_index + co_sub_index 组合定位，co_index 会重复）
    selectIndex (item) {
      if (!item) return
      const selectedKey = this.makeIndexKey(item.co_index, item.co_sub_index, item.attr_code)
      const indexData = this.indexList.find(it => this.makeIndexKey(
        it.co_index,
        it.co_sub_index,
        it.attr_code
      ) === selectedKey)
      if (indexData) {
        const valueOrEmpty = value => value === null || value === undefined ? '' : value
        this.selectedNewAttrKey = selectedKey
        this.newAttrForm = {
          uuid: indexData.uuid || null,
          attr_code: indexData.attr_code || '',
          attr_name: indexData.attr_name || '',
          co_index: indexData.co_index || '',
          co_sub_index: indexData.co_sub_index || '',
          data_type: indexData.data_type || '',
          access_type: indexData.access_type || '',
          min_val: valueOrEmpty(indexData.min_val),
          max_val: valueOrEmpty(indexData.max_val),
          default_val: valueOrEmpty(indexData.default_val),
          unit: indexData.unit || '',
          description: indexData.description || '',
          web_control_table: !!indexData.web_control_table,
          web_display: indexData.web_display !== false,
          web_editable: !!indexData.web_editable,
          display_order: valueOrEmpty(indexData.display_order),
          category: indexData.category || '',
          group_name: indexData.group_name || '',
          options: valueOrEmpty(indexData.options)
        }
      }
    },

    displayAttributeValue (value) {
      return value === '' || value === null || value === undefined ? '-' : value
    },

    formatBoolean (value) {
      if (value === null || value === undefined || value === '') return '-'
      return this.$t(value ? 'common.enabled' : 'common.disabled')
    },

    formatAttributeOptions (value) {
      if (value === '' || value === null || value === undefined) return '-'
      if (typeof value === 'string') return value || '-'
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    },

    // 关闭对话框
    handleNewAttrDialogClose () {
      this.showNewAttrDialog = false
      this.attributePublication = null
      this.selectedNewAttrKey = null
      this.indexList = []
      this.indexSearchQuery = ''
      this.collapsedIndexGroups = {}
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/hn-models.scss"></style>
