<template>
  <!-- 文件管理：上传、列表、关联 -->
  <div class="file-manager">

    <file-stats-overview
      :stats="stats"
      :format-file-size="formatFileSize"
      :get-image-count="getImageCount"
      :get-video-count="getVideoCount"
    />
    <file-list-section
      :query="query"
      :business-type-options="businessTypeOptions"
      :can-manage-files="canManageFiles"
      :can-delete-files="canDeleteFiles"
      :items="tableData"
      :fields="visibleTableFields"
      :columns="fileColumns"
      :loading="loading"
      :load-error="loadError"
      :total="total"
      :get-file-type-class="getFileTypeClass"
      :get-file-icon="getFileIcon"
      :format-file-size="formatFileSize"
      :format-date="formatDate"
      @update:query="query = $event"
      @search="handleSearch"
      @upload="showUploadDialog = true"
      @retry="fetchData"
      @preview="previewFile"
      @logs="viewLogs"
      @download="downloadFile"
      @relations="manageRelations"
      @delete="deleteFileConfirm"
      @columns-change="handleFileColumnsUpdate"
      @page-change="handlePageChange"
    />

    <!-- 文件预览对话框 -->
    <base-modal
      id="file-manager-preview-modal"
      :title="previewFileData.original_name"
      v-model="showPreviewDialog"
      size="lg"
      hide-footer
      modal-class="dialog-with-header-bg"
      @hidden="closePreviewDialog"
    >
      <div v-if="previewFileData.content_kind === 'image'" class="preview-content">
        <div v-if="previewImageLoading" class="image-loading">
          <app-icon name="arrow-clockwise" animation="spin" class="mr-1" /> {{ $t('file_manager.preview.loading') }}
        </div>
        <img
          v-show="!previewImageLoading"
          :src="previewImageUrl"
          :alt="previewFileData.original_name"
          loading="lazy"
          class="modal-media-preview"
          @load="handleImageLoad"
          @error="handleImageError"
        />
      </div>
      <div v-else-if="previewFileData.content_kind === 'video'" class="preview-content">
        <video controls class="modal-video-preview">
          <source :src="previewFileData.download_url" :type="getVideoMimeType(previewFileData.original_name)" />
          {{ $t('file_manager.preview.video_unsupported') }}
        </video>
      </div>
      <div v-else class="preview-content">
        <p>{{ $t('file_manager.preview.type_unsupported') }}</p>
      </div>
      <div class="d-flex justify-content-end mt-3">
        <base-button variant="outline-secondary" class="mr-2" @click="closePreviewDialog">{{ $t('file_manager.actions.close') }}</base-button>
        <base-button @click="downloadFile(previewFileData)">
          <app-icon name="download" class="mr-1" />
          {{ $t('file_manager.actions.download') }}
        </base-button>
      </div>
    </base-modal>

    <!-- 上传文件对话框 -->
    <base-modal
      id="file-manager-upload-modal"
      :title="$t('file_manager.upload.title')"
      v-model="showUploadDialog"
      size="lg"
      :ok-title="$t('file_manager.upload.ok_title')"
      :cancel-title="$t('file_manager.upload.cancel_title')"
      :busy="uploading"
      :ok-disabled="uploading"
      modal-class="file-manager-upload-modal"
      @hidden="handleUploadHidden"
      @ok="handleUploadModalOk"
    >
      <b-form class="file-upload-form" @submit.prevent="handleUpload">
        <!-- 文件选择 -->
        <base-form-group
          class="upload-file-field"
          :label="$t('file_manager.upload.select_file')"
          label-for="file-manager-upload-trigger"
          :state="uploadFieldState('file')"
          :invalid-feedback="uploadErrors.file"
          required
        >
          <div
            class="upload-dropzone"
            :class="{
              'upload-dropzone--selected': uploadForm.file,
              'upload-dropzone--invalid': uploadFieldState('file') === false
            }"
          >
            <input
              id="file-manager-upload-input"
              ref="uploadInput"
              class="upload-dropzone__input"
              type="file"
              hidden
              accept=".bin,.mp3,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,.pdf"
              :disabled="uploading"
              :aria-invalid="uploadFieldState('file') === false ? 'true' : null"
              @change="handleFileChange"
            >
            <base-button
              id="file-manager-upload-trigger"
              type="button"
              variant="link"
              class="upload-dropzone__trigger"
              :disabled="uploading"
              aria-controls="file-manager-upload-input"
              aria-describedby="file-manager-upload-tip"
              @click="openUploadFilePicker"
            >
              <span class="upload-dropzone__icon" aria-hidden="true">
                <app-icon :name="uploadForm.file ? 'check-circle' : 'upload'" />
              </span>
              <span class="upload-dropzone__text">
                {{ $t('file_manager.upload.click_to_select') }}
              </span>
              <span id="file-manager-upload-tip" class="upload-dropzone__tip">
                {{ $t('file_manager.upload.tip') }}
              </span>
            </base-button>
          </div>
          <div v-if="uploadForm.file" class="selected-file-info">
            <app-icon name="file-earmark-text" class="selected-file-info__icon" aria-hidden="true" />
            <span class="selected-file-info__name">{{ uploadForm.file.name }}</span>
            <span class="file-size">{{ formatFileSize(uploadForm.file.size) }}</span>
            <base-button variant="link" size="sm" class="selected-file-info__remove" @click="handleFileRemove">
              {{ $t('file_manager.actions.remove') }}
            </base-button>
          </div>
        </base-form-group>

        <!-- 文件分类 -->
        <base-form-group :label="$t('file_manager.upload.category_label')" label-for="file-manager-upload-category" :state="uploadFieldState('category_id')" :invalid-feedback="uploadErrors.category_id" required>
          <base-select id="file-manager-upload-category" v-model="uploadForm.category_id" :options="uploadCategoryOptions" :state="uploadFieldState('category_id')" />
        </base-form-group>

        <!-- 文件描述 -->
        <base-form-group :label="$t('file_manager.upload.description_label')" label-for="file-manager-upload-description" :state="uploadFieldState('description')" :invalid-feedback="uploadErrors.description" required>
          <base-textarea id="file-manager-upload-description" v-model="uploadForm.description" :rows="3" :placeholder="$t('file_manager.upload.description_placeholder')" :state="uploadFieldState('description')" />
        </base-form-group>

        <!-- 动态元数据字段 - 根据文件类型显示 -->
        <h4 v-if="uploadForm.fileType" class="form-section-title">{{ $t('file_manager.upload.metadata_title') }}</h4>

        <!-- 固件文件元数据 -->
        <template v-if="uploadForm.fileType === 'firmware'">
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.version_label')">
                <base-input v-model="uploadForm.metadata.version" :placeholder="$t('file_manager.upload.version_placeholder_firmware')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.build_number_label')">
                <base-input v-model.number="uploadForm.metadata.build_number" type="number" :min="1" />
              </base-form-group>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.build_date_label')">
                <base-input
                  v-model="uploadForm.metadata.build_date"
                  type="date"
                  :placeholder="$t('file_manager.upload.build_date_placeholder')"
                />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.is_stable_label')">
                <base-switch v-model="uploadForm.metadata.is_stable">
                  {{ uploadForm.metadata.is_stable ? $t('file_manager.relations.yes') : $t('file_manager.relations.no') }}
                </base-switch>
              </base-form-group>
            </b-col>
          </b-row>
            <base-form-group :label="$t('file_manager.upload.release_notes_label')">
              <base-textarea v-model="uploadForm.metadata.release_notes" :rows="2" :placeholder="$t('file_manager.upload.release_notes_placeholder')" />
            </base-form-group>
        </template>

        <!-- 音乐文件元数据 -->
        <template v-if="uploadForm.fileType === 'audio'">
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.artist_label')">
                <base-input v-model="uploadForm.metadata.artist" :placeholder="$t('file_manager.upload.artist_placeholder')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.album_label')">
                <base-input v-model="uploadForm.metadata.album" :placeholder="$t('file_manager.upload.album_placeholder')" />
              </base-form-group>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.genre_label')">
                <base-input v-model="uploadForm.metadata.genre" :placeholder="$t('file_manager.upload.genre_placeholder')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.duration_label')">
                <base-input v-model.number="uploadForm.metadata.duration" type="number" :min="1" />
              </base-form-group>
            </b-col>
          </b-row>
          <base-form-group :label="$t('file_manager.upload.tags_label')">
            <base-badge
              v-for="(tag, index) in uploadForm.metadata.tags"
              :key="index"
              variant="secondary"
              class="mr-2"
            >
              {{ tag }}
              <button
                type="button"
                class="tag-remove"
                :title="$t('common.delete')"
                :aria-label="`${$t('common.delete')}: ${tag}`"
                @click.stop="removeTag(index)"
              ><app-icon name="x" aria-hidden="true" /></button>
            </base-badge>
            <base-input
              v-if="inputVisible"
              ref="saveTagInput"
              v-model="inputValue"
              class="filter-width-110"
              @keyup.enter="addTag"
              @blur="addTag"
            />
            <base-button v-else size="sm" variant="outline-secondary" @click="showInput">{{ $t('file_manager.actions.add_tag') }}</base-button>
          </base-form-group>
        </template>

        <!-- 图片文件元数据 -->
        <template v-if="uploadForm.fileType === 'image'">
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.width_label')">
                <base-input v-model.number="uploadForm.metadata.width" type="number" :min="1" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.height_label')">
                <base-input v-model.number="uploadForm.metadata.height" type="number" :min="1" />
              </base-form-group>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.format_label')">
                <base-select v-model="uploadForm.metadata.format" :options="imageFormatOptions" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.orientation_label')">
                <base-select v-model="uploadForm.metadata.orientation" :options="orientationOptions" />
              </base-form-group>
            </b-col>
          </b-row>
        </template>

        <!-- 文档文件元数据 -->
        <template v-if="uploadForm.fileType === 'pdf'">
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.author_label')">
                <base-input v-model="uploadForm.metadata.author" :placeholder="$t('file_manager.upload.author_placeholder')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.language_label')">
                <base-select v-model="uploadForm.metadata.language" :options="languageOptions" />
              </base-form-group>
            </b-col>
          </b-row>
          <b-row>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.version_label')">
                <base-input v-model="uploadForm.metadata.version" :placeholder="$t('file_manager.upload.version_placeholder_doc')" />
              </base-form-group>
            </b-col>
            <b-col cols="12" md="6">
              <base-form-group :label="$t('file_manager.upload.pages_label')">
                <base-input v-model.number="uploadForm.metadata.pages" type="number" :min="1" />
              </base-form-group>
            </b-col>
          </b-row>
        </template>
      </b-form>
    </base-modal>

    <!-- 文件关联管理对话框 -->
    <base-modal
      id="file-manager-relations-modal"
      :title="$t('file_manager.relations.title')"
      v-model="showRelationsDialog"
      size="xl"
      hide-footer
      modal-class="model-el dialog-with-header-bg"
      @hidden="resetRelationsForm"
    >
      <div v-if="currentFile" class="relations-dialog-header">
        <b-row class="model-meta-row">
          <b-col cols="12" md="6"><strong>{{ $t('file_manager.relations.file_name_label') }}</strong>{{ currentFile.original_name || '-' }}</b-col>
          <b-col cols="12" md="6"><strong>{{ $t('file_manager.relations.file_type_label') }}</strong>{{ currentFile.content_kind || '-' }}</b-col>
          <b-col cols="12"><strong>{{ $t('file_manager.relations.file_size_label') }}</strong>{{ formatFileSize(currentFile.size_bytes) }}</b-col>
        </b-row>
      </div>

      <div class="relations-toolbar">
        <base-button v-if="canManageFiles && canCreateRelation" @click="goshowAddRelationForm">
          <app-icon name="plus" class="mr-1" />
          {{ $t('file_manager.actions.add_relation') }}
        </base-button>
        <base-button variant="outline-secondary" @click="fetchRelations">
          <app-icon name="arrow-clockwise" class="mr-1" />
          {{ $t('file_manager.actions.refresh') }}
        </base-button>
      </div>

      <!-- 关联列表 -->
      <base-table
        class="mt-2"
        :items="relationsList"
        :fields="relationTableFields"
        :loading="relationsLoading"
        bordered
      >
        <template #cell(target_scope)="data">
          {{ getRelationTypeLabel(data.item.hn_model_id ? 'hn_model' : 'host') }}
        </template>
        <template #cell(kind)="data">
          {{ getRelationFileTypeLabel(data.item.kind) }}
        </template>
        <template #cell(enabled)="data">
          <base-badge v-if="isPublishRelation(data.item)" :variant="data.item.enabled ? 'success' : 'secondary'">
            {{ data.item.enabled ? $t('host_files.published') : $t('host_files.draft') }}
          </base-badge>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell(is_primary)="data">
          <template v-if="data.item.is_primary">
            <app-icon name="status-active" class="text-success" aria-hidden="true" />
            <span class="sr-only">{{ $t('common.yes') }}</span>
          </template>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell(metadata)="data">
          <span v-if="data.item.metadata && Object.keys(data.item.metadata).length > 0">
            {{ formatMetadata(data.item.metadata) }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
        <template #cell(actions)="data">
          <base-action-button v-if="canManageFiles && isPublishRelation(data.item) && !data.item.enabled" @click="publishRelation(data.item)" :title="$t('host_files.publish')">
            <app-icon name="cloud-upload"  /> <span>{{ $t('host_files.publish') }}</span>
          </base-action-button>
          <base-action-button v-if="canManageFiles && isPublishRelation(data.item) && data.item.enabled" @click="disableRelation(data.item)" :title="$t('host_files.disable')">
            <app-icon name="pause-circle"  /> <span>{{ $t('host_files.disable') }}</span>
          </base-action-button>
          <base-action-button v-if="canManageFiles" @click="editRelation(data.item)" :title="$t('file_manager.modal.edit')">
            <app-icon name="pencil"  /> <span>{{ $t('file_manager.modal.edit') }}</span>
          </base-action-button>
          <base-action-button v-if="canManageFiles" class="text-danger" @click="deleteRelation(data.item)" :title="$t('file_manager.actions.delete')">
            <app-icon name="trash"  /> <span>{{ $t('file_manager.actions.delete') }}</span>
          </base-action-button>
        </template>
      </base-table>

      <!-- 添加/编辑关联表单 -->
      <base-modal
        id="file-manager-add-relation-modal"
        :title="isEditRelation ? $t('file_manager.relations.edit_title') : $t('file_manager.relations.add_title')"
        v-model="showAddRelationForm"
        size="lg"
        :ok-title="$t('file_manager.modal.save')"
        :cancel-title="$t('file_manager.upload.cancel_title')"
        :busy="relationSaving"
        :ok-disabled="relationSaving"
        modal-class="dialog-with-header-bg"
        @hidden="resetRelationForm"
        @ok="handleSaveRelationModalOk"
      >
        <b-form>
          <base-form-group :label="$t('file_manager.relations.type_label')" :state="relationFieldState('target_scope')" :invalid-feedback="relationErrors.target_scope">
            <base-select v-model="relationForm.target_scope" :options="relationTypeOptions" :state="relationFieldState('target_scope')" :disabled="isEditRelation" @input="onRelationTypeChange" />
          </base-form-group>

          <base-form-group :label="$t('file_manager.relations.object_label')" :state="relationFieldState('target_id')" :invalid-feedback="relationErrors.target_id">
            <base-select
              v-model="relationForm.target_id"
              :placeholder="$t('file_manager.relations.object_placeholder_prefix') + getRelationTypeLabel(relationForm.target_scope)"
              :options="relationObjectOptions"
              :state="relationFieldState('target_id')"
              :disabled="isEditRelation"
            />
          </base-form-group>

          <base-form-group :label="$t('file_manager.relations.file_type_select_label')" :state="relationFieldState('kind')" :invalid-feedback="relationErrors.kind">
            <base-select v-model="relationForm.kind" :options="relationFileTypeOptions" :state="relationFieldState('kind')" :disabled="isEditRelation" @input="onRelationKindChange" />
          </base-form-group>

          <base-form-group v-if="isDocumentKind" :label="$t('file_manager.upload.language_label')" :state="relationFieldState('lang')" :invalid-feedback="relationErrors.lang">
            <base-select v-model="relationForm.lang" :options="languageOptions" :state="relationFieldState('lang')" />
          </base-form-group>

          <base-form-group :label="$t('file_manager.relations.is_primary_label')">
            <base-switch v-model="relationForm.is_primary">
              {{ relationForm.is_primary ? $t('file_manager.relations.yes') : $t('file_manager.relations.no') }}
            </base-switch>
          </base-form-group>

          <base-form-group :label="$t('file_manager.relations.sort_order_label')">
            <base-input v-model.number="relationForm.sort_order" type="number" :min="0" />
          </base-form-group>

          <base-form-group v-if="!isDocumentKind" :label="$t('host_files.purpose')" :state="relationFieldState('purpose')" :invalid-feedback="relationErrors.purpose">
            <base-select v-model="relationForm.purpose" :options="purposeOptions" :state="relationFieldState('purpose')" />
          </base-form-group>

          <base-form-group v-if="relationForm.kind === 'image'" :label="$t('host_files.slot')">
            <base-input v-model.trim="relationForm.slot_key" :placeholder="$t('host_files.slot_placeholder')" />
          </base-form-group>

          <!-- 音乐元数据 -->
          <template v-if="relationForm.kind === 'audio'">
            <h4 class="form-section-title">{{ $t('file_manager.relations.metadata_music_title') }}</h4>
            <b-row>
              <b-col cols="12" md="6">
                <base-form-group :label="$t('file_manager.relations.volume_label')">
                  <base-input v-model.number="relationForm.metadata.volume" type="number" :min="0" :max="100" />
                </base-form-group>
              </b-col>
              <b-col cols="12" md="6">
                <base-form-group :label="$t('file_manager.relations.play_mode_label')">
                  <base-select v-model="relationForm.metadata.play_mode" :options="playModeOptions" />
                </base-form-group>
              </b-col>
            </b-row>
            <b-row>
              <b-col cols="12" md="6">
                <base-form-group :label="$t('file_manager.relations.start_time_label')">
                  <base-input
                    v-model="relationForm.metadata.start_time"
                    type="time"
                    :placeholder="$t('file_manager.relations.start_time_placeholder')"
                  />
                </base-form-group>
              </b-col>
              <b-col cols="12" md="6">
                <base-form-group :label="$t('file_manager.relations.end_time_label')">
                  <base-input
                    v-model="relationForm.metadata.end_time"
                    type="time"
                    :placeholder="$t('file_manager.relations.end_time_placeholder')"
                  />
                </base-form-group>
              </b-col>
            </b-row>
            <base-form-group :label="$t('file_manager.relations.play_days_label')">
              <b-form-checkbox-group v-model="relationForm.metadata.days_of_week" :options="weekDayOptions" />
            </base-form-group>
            <base-form-group :label="$t('file_manager.relations.is_enabled_label')">
              <base-switch v-model="relationForm.metadata.is_enabled">
                {{ relationForm.metadata.is_enabled ? $t('file_manager.relations.yes') : $t('file_manager.relations.no') }}
              </base-switch>
            </base-form-group>
          </template>

          <!-- 图片元数据 -->
          <template v-if="relationForm.kind === 'image'">
            <h4 class="form-section-title">{{ $t('file_manager.relations.metadata_image_title') }}</h4>
            <base-form-group :label="$t('file_manager.relations.caption_label')">
              <base-input v-model="relationForm.metadata.caption" :placeholder="$t('file_manager.relations.caption_placeholder')" />
            </base-form-group>
            <base-form-group :label="$t('file_manager.relations.alt_text_label')">
              <base-input v-model="relationForm.metadata.alt_text" :placeholder="$t('file_manager.relations.alt_text_placeholder')" />
            </base-form-group>
            <base-form-group :label="$t('file_manager.relations.display_order_label')">
              <base-input v-model.number="relationForm.metadata.display_order" type="number" :min="0" />
            </base-form-group>
            <base-form-group :label="$t('file_manager.relations.is_thumbnail_label')">
              <base-switch v-model="relationForm.metadata.is_thumbnail">
                {{ relationForm.metadata.is_thumbnail ? $t('file_manager.relations.yes') : $t('file_manager.relations.no') }}
              </base-switch>
            </base-form-group>
          </template>
        </b-form>
      </base-modal>
      <div class="d-flex justify-content-end mt-3">
        <base-button variant="outline-secondary" @click="showRelationsDialog = false">{{ $t('file_manager.actions.close') }}</base-button>
      </div>
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
import ChangeLogDialog from '@/components/ChangeLogDialog.vue'
import {
  uploadFile,
  deleteFile,
  downloadFile,
  fetchFileRelations,
  createFileRelation,
  updateFileRelation,
  deleteFileRelation,
  publishFileRelation,
  disableFileRelation
} from '@/api/files'
import { fetchHnModelHardwareLines } from '@/api/hnModels'
import { fetchHosts } from '@/api/hosts'
import { normalizeImageUrl, fetchAuthenticatedImage } from '@/utils/imageUrlHelper'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseFormGroup from '@/components/base/BaseFormGroup.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseTextarea from '@/components/base/BaseTextarea.vue'
import { formatDate as formatDateUtil } from '@/utils/format'
import { getCurrentUser, hasPermission, PERMISSION } from '@/utils/permission'
import FileStatsOverview from '@/components/file/FileStatsOverview.vue'
import FileListSection from '@/components/file/FileListSection.vue'
import fileManagerListWorkspace from '@/mixins/fileManagerListWorkspace'
import localizedColumns from '@/mixins/localizedColumns'

export default {
  name: 'FileManager',
  mixins: [fileManagerListWorkspace, localizedColumns],
  localizedColumns: { fileColumns: 'buildFileColumns' },
  components: {
    BaseButton,
    BaseFormGroup,
    BaseInput,
    BaseModal,
    ChangeLogDialog,
    BaseSelect,
    BaseTextarea,
    FileStatsOverview,
    FileListSection
  },
  data () {
    return {
      showPreviewDialog: false,
      previewFileData: {},
      previewImageUrl: '',
      previewImageLoading: false,
      // 上传相关
      showUploadDialog: false,
      uploading: false,
      uploadForm: {
        file: null,
        category_id: null,
        description: '',
        fileType: '',
        metadata: {
          version: '',
          build_number: null,
          build_date: '',
          is_stable: true,
          release_notes: '',
          artist: '',
          album: '',
          genre: '',
          duration: null,
          tags: [],
          width: null,
          height: null,
          format: '',
          orientation: '',
          author: '',
          language: '',
          pages: null
        }
      },
      uploadErrors: {},
      // 标签输入
      inputVisible: false,
      inputValue: '',
      // 文件关联相关
      showRelationsDialog: false,
      showAddRelationForm: false,
      relationsLoading: false,
      relationSaving: false,
      isEditRelation: false,
      currentFile: null,
      relationsList: [],
      relationForm: {
        id: null,
        target_scope: '',
        target_id: null,
        kind: '',
        lang: '',
        is_primary: false,
        sort_order: 0,
        purpose: '',
        slot_key: '',
        metadata: {
          version: '',
          is_latest: false,
          min_hw_ver: '',
          release_notes: '',
          is_stable: false,
          volume: 60,
          play_mode: 'loop',
          start_time: '',
          end_time: '',
          days_of_week: [],
          is_enabled: true,
          caption: '',
          alt_text: '',
          display_order: 0,
          is_thumbnail: false
        }
      },
      relationErrors: {},
      relationObjects: [],
      // 列显示配置
      fileColumns: [
        { prop: 'file', label: '', visible: true },
        { prop: 'content_kind', label: '', visible: true },
        { prop: 'uploader_name', label: '', visible: true },
        { prop: 'download_count', label: '', visible: true },
        { prop: 'play_count', label: '', visible: true },
        { prop: 'status', label: '', visible: true }
      ],
      // 变更日志相关
      logDialogVisible: false,
      logLoading: false,
      currentLogData: null
    }
  },
  created () {
    this.fileColumns = this.buildFileColumns()
    // 进入页面：先把 URL query 写回 this.query.*，再发起请求，避免刷新丢状态
    this._restoreQueryFromUrl()
    this.fetchData()
    this.loadStats()
    this.handleRouteIntent()
  },
  computed: {
    canManageFiles () {
      return hasPermission(PERMISSION.FILE_UPLOAD, getCurrentUser())
    },
    canDeleteFiles () {
      return hasPermission(PERMISSION.FILE_UPLOAD, getCurrentUser())
    },
    canManageFirmware () {
      return hasPermission(PERMISSION.FIRMWARE_MANAGE, getCurrentUser())
    },
    uploadCategoryOptions () {
      return [
        { value: null, text: this.$t('file_manager.category.select_placeholder') },
        { value: 1, text: this.$t('file_manager.category.product_doc') },
        { value: 2, text: this.$t('file_manager.category.user_doc') },
        { value: 3, text: this.$t('file_manager.category.background') },
        { value: 4, text: this.$t('file_manager.category.audio') },
        { value: 5, text: this.$t('file_manager.category.firmware') },
        { value: 99, text: this.$t('file_manager.category.other') }
      ]
    },
    imageFormatOptions () {
      return [
        { value: '', text: this.$t('file_manager.image_format.select_placeholder') },
        { value: 'JPEG', text: 'JPEG' },
        { value: 'PNG', text: 'PNG' },
        { value: 'GIF', text: 'GIF' },
        { value: 'WEBP', text: 'WEBP' }
      ]
    },
    orientationOptions () {
      return [
        { value: '', text: this.$t('file_manager.orientation.select_placeholder') },
        { value: 'landscape', text: this.$t('file_manager.orientation.landscape') },
        { value: 'portrait', text: this.$t('file_manager.orientation.portrait') }
      ]
    },
    languageOptions () {
      return [
        { value: '', text: this.$t('file_manager.language.select_placeholder') },
        { value: 'zh-CN', text: this.$t('file_manager.language.zh_cn') },
        { value: 'en', text: this.$t('file_manager.language.en') }
      ]
    },
    relationTypeOptions () {
      const options = [
        { value: '', text: this.$t('file_manager.relations.type_placeholder') },
        { value: 'hn_model', text: this.$t('file_manager.relation_type.hn_model') }
      ]
      if (!this.isDocumentKind) {
        options.push({ value: 'host', text: this.$t('file_manager.relation_type.host') })
      }
      return options
    },
    relationObjectOptions () {
      return this.relationObjects.map(item => ({
        value: item.id,
        text: item.name
      }))
    },
    relationFileTypeOptions () {
      const type = this.currentFile?.content_kind
      if (type === 'pdf') {
        return [
          { value: 'spec', text: this.$t('file_manager.category.product_doc') },
          { value: 'manual', text: this.$t('file_manager.relation_file_type_label.manual') }
        ]
      }
      return ['audio', 'image'].includes(type)
        ? [{ value: type, text: this.getRelationFileTypeLabel(type) }]
        : []
    },
    isDocumentKind () {
      return ['spec', 'manual'].includes(this.relationForm.kind)
    },
    canCreateRelation () {
      return ['audio', 'image', 'pdf'].includes(this.currentFile?.content_kind)
    },
    purposeOptions () {
      const options = {
        audio: ['background_music', 'prompt'],
        image: ['background', 'screensaver', 'boot_logo', 'custom_slot']
      }
      return (options[this.relationForm.kind] || []).map(value => ({
        value,
        text: this.$t('host_files.purpose_' + value)
      }))
    },
    playModeOptions () {
      return [
        { value: 'loop', text: this.$t('file_manager.play_mode.loop') },
        { value: 'shuffle', text: this.$t('file_manager.play_mode.shuffle') },
        { value: 'once', text: this.$t('file_manager.play_mode.once') }
      ]
    },
    weekDayOptions () {
      return [
        { value: 1, text: this.$t('file_manager.weekday.mon') },
        { value: 2, text: this.$t('file_manager.weekday.tue') },
        { value: 3, text: this.$t('file_manager.weekday.wed') },
        { value: 4, text: this.$t('file_manager.weekday.thu') },
        { value: 5, text: this.$t('file_manager.weekday.fri') },
        { value: 6, text: this.$t('file_manager.weekday.sat') },
        { value: 7, text: this.$t('file_manager.weekday.sun') }
      ]
    },
    businessTypeOptions () {
      return [
        { value: '', text: this.$t('file_manager.business_type.select_placeholder') },
        { value: 'firmware', text: this.$t('file_manager.relation_file_type.firmware') },
        { value: 'pdf', text: 'PDF' },
        { value: 'image', text: this.$t('file_manager.business_type.image') },
        { value: 'audio', text: this.$t('file_manager.business_type.audio') }
      ]
    },
    visibleTableFields () {
      const fieldConfig = {
        file: { key: 'file', label: this.$t('file_manager.table.file'), thStyle: { minWidth: '300px' } },
        content_kind: { key: 'content_kind', label: this.$t('file_manager.table.category'), thStyle: { width: '120px' } },
        uploader_name: { key: 'uploader_name', label: this.$t('file_manager.table.uploader'), thStyle: { width: '140px' } }
      }

      const visibleFields = this.fileColumns
        .filter(col => col.visible && fieldConfig[col.prop])
        .map(col => fieldConfig[col.prop])
      return [...visibleFields, { key: 'actions', label: '', class: 'actions-cell', thClass: 'actions-cell' }]
    },
    relationTableFields () {
      return [
        { key: 'target_scope', label: this.$t('file_manager.table.relation_type_col'), thStyle: { width: '120px' } },
        { key: 'relation_name', label: this.$t('file_manager.table.relation_object'), thStyle: { minWidth: '180px' } },
        { key: 'kind', label: this.$t('file_manager.table.file_type'), thStyle: { width: '120px' } },
        { key: 'lang', label: this.$t('file_manager.upload.language_label'), thStyle: { width: '100px' } },
        { key: 'purpose', label: this.$t('host_files.purpose'), thStyle: { width: '150px' } },
        { key: 'slot_key', label: this.$t('host_files.slot'), thStyle: { width: '120px' } },
        { key: 'enabled', label: this.$t('host_files.status'), thStyle: { width: '100px' } },
        { key: 'is_primary', label: this.$t('file_manager.table.is_primary'), thStyle: { width: '80px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'sort_order', label: this.$t('file_manager.table.sort_order'), thStyle: { width: '80px' }, class: 'text-center', thClass: 'text-center' },
        { key: 'metadata', label: this.$t('file_manager.table.metadata'), thStyle: { minWidth: '200px' } },
        { key: 'actions', label: this.$t('file_manager.table.actions'), class: 'actions-cell', thClass: 'actions-cell' }
      ]
    }
  },
  methods: {
    handleRouteIntent () {
      this.$nextTick(() => {
        const mode = this.$route.meta && this.$route.meta.fileMode
        if (this.$route.path === '/files/upload' && this.canManageFiles) {
          this.showUploadDialog = true
          return
        }
        if (this.showUploadDialog) this.showUploadDialog = false
        if (mode === 'stats') {
          const stats = this.$el && this.$el.querySelector('.file-stats')
          if (stats && typeof stats.scrollIntoView === 'function') {
            stats.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          return
        }
        if (mode === 'relations') {
          this.$uiToast.info(this.$t('file_manager.toast.relations_hint', {
            action: this.$t('file_manager.actions.manage_relations')
          }))
        }
      })
    },
    handleUploadHidden () {
      this.resetUploadForm()
      if (this.$route.path === '/files/upload') {
        this.$router.replace('/files').catch(() => {})
      }
    },
    buildFileColumns () {
      return [
        { prop: 'file', label: this.$t('file_manager.table.file'), visible: true },
        { prop: 'content_kind', label: this.$t('file_manager.table.category'), visible: true },
        { prop: 'uploader_name', label: this.$t('file_manager.table.uploader'), visible: true }
      ]
    },
    getFileTypeClass (fileType) {
      const map = {
        image: 'file-icon-image',
        video: 'file-icon-video',
        audio: 'file-icon-audio',
        document: 'file-icon-document',
        other: 'file-icon-other'
      }
      return map[fileType] || 'file-icon-other'
    },
    // 从 by_mime_type 数组中计算图片数量
    getImageCount (byMimeType) {
      if (!byMimeType || !Array.isArray(byMimeType)) return 0
      return byMimeType
        .filter(item => item.mime_type && item.mime_type.startsWith('image/'))
        .reduce((sum, item) => sum + (item.count || 0), 0)
    },
    // 从 by_mime_type 数组中计算视频数量
    getVideoCount (byMimeType) {
      if (!byMimeType || !Array.isArray(byMimeType)) return 0
      return byMimeType
        .filter(item => item.mime_type && item.mime_type.startsWith('video/'))
        .reduce((sum, item) => sum + (item.count || 0), 0)
    },
    getFileIcon (fileType) {
      const map = {
        image: 'image',
        video: 'camera-video',
        audio: 'headphones',
        document: 'file-earmark-text',
        other: 'file-earmark'
      }
      return map[fileType] || 'file-earmark'
    },
    formatFileSize (bytes) {
      if (bytes === null || bytes === undefined || bytes === '') return '-'
      const value = Number(bytes)
      if (!Number.isFinite(value) || value < 0) return '-'
      if (value === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.min(Math.floor(Math.log(value) / Math.log(k)), sizes.length - 1)
      return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },
    formatDate (dateString) {
      return formatDateUtil(dateString)
    },
    previewFile (row) {
      this.previewFileData = row
      this.showPreviewDialog = true
      // 如果是图片，预加载图片 URL
      if (row.content_kind === 'image') {
        this.loadPreviewImage(row)
      }
    },
    async loadPreviewImage (file) {
      this.previewImageLoading = true
      try {
        this.previewImageUrl = await this.getImagePreviewUrl(file)
      } catch (error) {
        this.previewImageUrl = ''
      } finally {
        this.previewImageLoading = false
      }
    },
    handleImageLoad () {
      this.previewImageLoading = false
    },
    handleImageError () {
      this.previewImageLoading = false
    },
    closePreviewDialog () {
      // 清理 Blob URL
      if (this.previewImageUrl && this.previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.previewImageUrl)
      }
      this.previewImageUrl = ''
      this.showPreviewDialog = false
    },
    async viewLogs (row) {
      this.logLoading = false
      this.currentLogData = null
      this.logDialogVisible = true

      // 直接使用列表中的 change_log 数据
      if (row.change_log) {
        this.currentLogData = row.change_log
      } else {
        // 如果没有 change_log 数据，显示提示
        this.$uiToast.info(this.$t('file_manager.toast.no_change_log'))
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
    async downloadFile (row) {
      try {
        const blob = await downloadFile(row.uuid)
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = row.original_name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        this.$uiToast.success(this.$t('file_manager.toast.download_success'))
      } catch (error) {
        this.$uiToast.error(this.$t('file_manager.toast.download_failed') + (this.$getErrorMessage(error) || this.$t('node_detail.toast.retry_later')))
      }
    },
    async deleteFileConfirm (row) {
      try {
        const confirmed = await this.$uiConfirm(this.$t('file_manager.modal.delete_file_confirm', { name: row.original_name }),
          {
            title: this.$t('file_manager.modal.delete_title'),
            okTitle: this.$t('file_manager.modal.ok_title_delete'),
            cancelTitle: this.$t('file_manager.upload.cancel_title'),
            type: 'warning'
          })
        if (!confirmed) return

        await deleteFile(row.uuid || row.id)
        this.$uiToast.success(this.$t('file_manager.toast.delete_success'))
        this.fetchData()
        this.loadStats()
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          return
        }
        const errorMsg = this.$getErrorMessage(error) || this.$t('file_manager.toast.delete_failed_default')
        this.$uiToast.error(this.$t('file_manager.toast.delete_failed') + errorMsg)
      }
    },
    manageRelations (row) {
      this.currentFile = row
      this.showRelationsDialog = true
      this.fetchRelations()
    },
    // 获取图片预览 URL（带 token 认证）
    async getImagePreviewUrl (file) {
      // 优先使用 uuid 构建 /api/v1/upload/{uuid} 格式
      const fileId = file.uuid || file.id
      if (fileId) {
        const url = `/api/v1/upload/${fileId}`
        // 走统一 axios 实例：自动带 Authorization，401 触发统一登录跳转
        // fetchAuthenticatedImage 失败时返回原 URL 字符串（已封装异常）
        const blobUrl = await fetchAuthenticatedImage(url)
        return blobUrl || url
      }

      // 如果没有 uuid，使用后端返回的 URL
      const url = file.download_url || ''
      return normalizeImageUrl(url)
    },
    getVideoMimeType (filename) {
      const ext = filename.split('.').pop().toLowerCase()
      const map = {
        mp4: 'video/mp4',
        webm: 'video/webm',
        ogg: 'video/ogg'
      }
      return map[ext] || 'video/mp4'
    },

    // 关联类型标签和文本映射
    getRelationTypeLabel (type) {
      const map = {
        hn_model: this.$t('file_manager.relation_type_label.hn_model'),
        host: this.$t('file_manager.relation_type_label.host')
      }
      return map[type] || type
    },
    getRelationFileTypeLabel (type) {
      const map = {
        spec: this.$t('file_manager.category.product_doc'),
        manual: this.$t('file_manager.relation_file_type_label.manual'),
        audio: this.$t('file_manager.business_type.audio'),
        image: this.$t('file_manager.relation_file_type_label.image')
      }
      return map[type] || type
    },
    formatMetadata (metadata) {
      if (!metadata || typeof metadata !== 'object') return '-'
      const parts = []
      if (metadata.version) parts.push(this.$t('file_manager.metadata_format.version', { value: metadata.version }))
      if (metadata.is_latest !== undefined) parts.push(this.$t('file_manager.metadata_format.is_latest', { value: metadata.is_latest ? this.$t('file_manager.relations.yes') : this.$t('file_manager.relations.no') }))
      if (metadata.volume !== undefined) parts.push(this.$t('file_manager.metadata_format.volume', { value: metadata.volume }))
      if (metadata.play_mode) parts.push(this.$t('file_manager.metadata_format.play_mode', { value: metadata.play_mode }))
      if (metadata.caption) parts.push(metadata.caption)
      return parts.join(' | ') || '-'
    },

    // 关联管理相关方法
    async fetchRelations () {
      if (!this.currentFile) return

      this.relationsLoading = true
      try {
        const fileId = this.currentFile.uuid || this.currentFile.id
        const res = await fetchFileRelations(fileId)
        this.relationsList = res?.list || res?.items || res || []
      } catch (error) {
        this.$uiToast.error(this.$t('file_manager.toast.load_relations_failed') + (this.$getErrorMessage(error) || this.$t('node_detail.toast.retry_later')))
      } finally {
        this.relationsLoading = false
      }
    },
    onRelationTypeChange () {
      // 根据关联类型加载关联对象
      this.loadRelationObjects()
    },
    onRelationKindChange () {
      if (this.isDocumentKind && this.relationForm.target_scope !== 'hn_model') {
        this.relationForm.target_scope = 'hn_model'
        this.loadRelationObjects()
      }
      if (!this.isDocumentKind) this.relationForm.lang = ''
    },
    isPublishRelation (relation) {
      return ['audio', 'image'].includes(relation?.kind)
    },
    async loadRelationObjects () {
      const type = this.relationForm.target_scope
      if (!type) return

      try {
        let res
        switch (type) {
          case 'hn_model':
            res = await fetchHnModelHardwareLines({ page_size: 200 })
            break
          case 'host':
            res = await fetchHosts()
            break
        }

        // http 拦截器已经返回了 response.data，所以直接访问 items
        const data = res?.items || res?.list || res || []

        // 转换为统一格式
        const nameGetter = {
          hn_model: item => [item.model_code, item.model_name].filter(Boolean).join(' · '),
          host: item => item.serial_no
        }
        const getName = nameGetter[type] || (() => '')
        const uniqueTargets = new Map()
        data.forEach(item => {
          const id = type === 'hn_model' ? item.hn_model_id : item.id
          if (id && !uniqueTargets.has(Number(id))) {
            uniqueTargets.set(Number(id), { id: Number(id), name: getName(item) || '' })
          }
        })
        this.relationObjects = [...uniqueTargets.values()]

        // 只在新增模式时重置，编辑模式保留原值
        if (!this.isEditRelation) {
          this.relationForm.target_id = null
        }
      } catch (error) {
        this.relationObjects = []
        this.$uiToast.error(this.$t('file_manager.toast.load_relations_failed') +
          (this.$getErrorMessage(error) || this.$t('node_detail.toast.retry_later')))
        return false
      }
      return true
    },
    resetRelationForm () {
      this.relationForm = {
        id: null,
        target_scope: '',
        target_id: null,
        kind: '',
        lang: '',
        is_primary: false,
        sort_order: 0,
        purpose: '',
        slot_key: '',
        metadata: {
          version: '',
          is_latest: false,
          min_hw_ver: '',
          release_notes: '',
          is_stable: false,
          volume: 60,
          play_mode: 'loop',
          start_time: '',
          end_time: '',
          days_of_week: [],
          is_enabled: true,
          caption: '',
          alt_text: '',
          display_order: 0,
          is_thumbnail: false
        }
      }
      this.relationErrors = {}
    },
    resetRelationsForm () {
      this.showAddRelationForm = false
      this.resetRelationForm()
    },
    async editRelation (row) {
      this.isEditRelation = true
      this.relationForm = {
        id: row.uuid,
        target_scope: row.hn_model_id ? 'hn_model' : 'host',
        target_id: Number(row.hn_model_id || row.host_id),
        kind: row.kind,
        lang: row.lang || '',
        is_primary: row.is_primary || false,
        sort_order: row.sort_order || 0,
        purpose: row.purpose || '',
        slot_key: row.slot_key || '',
        metadata: {
          version: row.metadata?.version || '',
          is_latest: row.metadata?.is_latest || false,
          min_hw_ver: row.metadata?.min_hw_ver || '',
          release_notes: row.metadata?.release_notes || '',
          is_stable: row.metadata?.is_stable || false,
          volume: row.metadata?.volume || 60,
          play_mode: row.metadata?.play_mode || 'loop',
          start_time: row.metadata?.start_time || '',
          end_time: row.metadata?.end_time || '',
          days_of_week: row.metadata?.days_of_week || [],
          is_enabled: row.metadata?.is_enabled !== false,
          caption: row.metadata?.caption || '',
          alt_text: row.metadata?.alt_text || '',
          display_order: row.metadata?.display_order || 0,
          is_thumbnail: row.metadata?.is_thumbnail || false
        }
      }
      // 先加载关联对象，等数据加载完成后再显示弹框
      const loaded = await this.loadRelationObjects()
      if (loaded) {
        this.showAddRelationForm = true
      }
    },
    goshowAddRelationForm () {
      this.isEditRelation = false
      const fileType = this.currentFile?.content_kind || ''
      const defaults = { audio: 'background_music', image: 'background' }
      this.relationForm.kind = fileType === 'pdf' ? 'manual' : fileType
      this.relationForm.purpose = defaults[fileType] || ''
      if (fileType === 'pdf') {
        this.relationForm.target_scope = 'hn_model'
        this.loadRelationObjects()
      }
      this.showAddRelationForm = true
    },
    handleSaveRelationModalOk (event) {
      event.preventDefault()
      this.saveRelation()
    },
    relationFieldState (field) {
      if (!(field in this.relationErrors)) {
        return null
      }
      return !this.relationErrors[field]
    },
    validateRelationForm () {
      const errors = {}
      if (!this.relationForm.target_scope) {
        errors.target_scope = this.$t('file_manager.toast.validate_relation_type')
      }
      if (!this.relationForm.target_id) {
        errors.target_id = this.$t('file_manager.toast.validate_relation_object')
      }
      if (!this.relationForm.kind) {
        errors.kind = this.$t('file_manager.toast.validate_file_type')
      }
      if (this.isDocumentKind && !this.relationForm.lang) {
        errors.lang = this.$t('file_manager.toast.validate_language')
      }
      if (!this.isDocumentKind && !this.relationForm.purpose) {
        errors.purpose = this.$t('host_files.purpose_required')
      }
      this.relationErrors = errors
      return Object.keys(errors).length === 0
    },
    async saveRelation () {
      if (!this.validateRelationForm()) {
        return
      }

      this.relationSaving = true
      try {
        // 清理 metadata 空值
        const cleanMetadata = {}
        Object.keys(this.relationForm.metadata).forEach(key => {
          const value = this.relationForm.metadata[key]
          if (value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
            cleanMetadata[key] = value
          }
        })

        const fileId = this.currentFile.uuid || this.currentFile.id
        const mutableData = {
          is_primary: this.relationForm.is_primary,
          sort_order: this.relationForm.sort_order,
          lang: this.isDocumentKind ? this.relationForm.lang : undefined,
          purpose: this.isDocumentKind ? undefined : this.relationForm.purpose,
          slot_key: this.isDocumentKind ? undefined : (this.relationForm.slot_key || undefined),
          metadata: Object.keys(cleanMetadata).length > 0 ? cleanMetadata : undefined
        }

        if (this.isEditRelation) {
          await updateFileRelation(fileId, this.relationForm.id, mutableData)
          this.$uiToast.success(this.$t('file_manager.toast.relation_update_success'))
        } else {
          const relationData = {
            ...mutableData,
            hn_model_id: this.relationForm.target_scope === 'hn_model' ? Number(this.relationForm.target_id) : undefined,
            host_id: this.relationForm.target_scope === 'host' ? Number(this.relationForm.target_id) : undefined,
            kind: this.relationForm.kind
          }
          await createFileRelation(fileId, relationData)
          this.$uiToast.success(this.$t('file_manager.toast.relation_add_success'))
        }

        this.showAddRelationForm = false
        this.resetRelationForm()
        this.fetchRelations()
      } catch (error) {
        const errorMsg = this.$getErrorMessage(error) || this.$t('file_manager.toast.relation_save_failed')
        this.$uiToast.error(this.isEditRelation ? this.$t('file_manager.toast.relation_update_failed') + errorMsg : this.$t('file_manager.toast.relation_add_failed') + errorMsg)
      } finally {
        this.relationSaving = false
      }
    },
    async deleteRelation (row) {
      try {
        const confirmed = await this.$uiConfirm(this.$t('file_manager.modal.delete_relation_confirm'),
          {
            title: this.$t('file_manager.modal.delete_title'),
            okTitle: this.$t('file_manager.modal.ok_title_delete'),
            cancelTitle: this.$t('file_manager.upload.cancel_title'),
            type: 'warning'
          })
        if (!confirmed) return

        const fileId = this.currentFile.uuid || this.currentFile.id
        const relationId = row.uuid || row.id
        await deleteFileRelation(fileId, relationId)
        this.$uiToast.success(this.$t('file_manager.toast.delete_success'))
        this.fetchRelations()
      } catch (error) {
        if (error === 'cancel' || error === 'close') {
          return
        }
        const errorMsg = this.$getErrorMessage(error) || this.$t('file_manager.toast.relation_save_failed')
        this.$uiToast.error(this.$t('file_manager.toast.delete_failed') + errorMsg)
      }
    },
    async publishRelation (row) {
      try {
        const fileId = this.currentFile.uuid || this.currentFile.id
        await publishFileRelation(fileId, row.uuid || row.id)
        this.$uiToast.success(this.$t('host_files.publish_success'))
        await this.fetchRelations()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_files.action_failed'))
      }
    },
    async disableRelation (row) {
      try {
        const fileId = this.currentFile.uuid || this.currentFile.id
        await disableFileRelation(fileId, row.uuid || row.id)
        this.$uiToast.success(this.$t('host_files.disable_success'))
        await this.fetchRelations()
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('host_files.action_failed'))
      }
    },

    // 上传相关方法
    openUploadFilePicker () {
      if (!this.uploading && this.$refs.uploadInput) {
        this.$refs.uploadInput.click()
      }
    },
    handleFileChange (payload) {
      const file = payload?.target?.files?.[0] || payload?.raw || null
      if (!file) {
        this.handleFileRemove()
        return
      }
      if (!this.beforeUpload(file)) {
        this.handleFileRemove()
        return
      }
      this.uploadForm.file = file
      this.uploadErrors = {}
      // 根据文件扩展名判断类型
      const ext = file.name.split('.').pop().toLowerCase()
      const firmwareExts = ['bin']
      const audioExts = ['mp3']
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
      const documentExts = ['pdf']

      if (firmwareExts.includes(ext)) {
        this.uploadForm.fileType = 'firmware'
      } else if (audioExts.includes(ext)) {
        this.uploadForm.fileType = 'audio'
      } else if (imageExts.includes(ext)) {
        this.uploadForm.fileType = 'image'
      } else if (documentExts.includes(ext)) {
        this.uploadForm.fileType = 'pdf'
      } else {
        this.$uiToast.error(this.$t('host_files.unsupported_type'))
        this.handleFileRemove()
      }
    },
    handleFileRemove () {
      this.uploadForm.file = null
      this.uploadForm.fileType = ''
      this.uploadErrors = {}
      if (this.$refs.uploadInput) {
        this.$refs.uploadInput.value = ''
      }
    },
    beforeUpload (file) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['bin', 'mp3', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'].includes(ext)) {
        this.$uiToast.error(this.$t('host_files.unsupported_type'))
        return false
      }
      if (ext === 'bin' && !this.canManageFirmware) {
        this.$uiToast.error(this.$t('host_files.firmware_forbidden'))
        return false
      }
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        this.$uiToast.error(this.$t('file_manager.toast.size_too_large'))
        return false
      }
      return true
    },
    showInput () {
      this.inputVisible = true
      this.$nextTick(() => {
        const inputRef = this.$refs.saveTagInput
        if (inputRef && inputRef.$el && typeof inputRef.$el.focus === 'function') {
          inputRef.$el.focus()
        } else if (inputRef && typeof inputRef.focus === 'function') {
          inputRef.focus()
        }
      })
    },
    addTag () {
      const value = this.inputValue.trim()
      if (value) {
        this.uploadForm.metadata.tags.push(value)
      }
      this.inputVisible = false
      this.inputValue = ''
    },
    removeTag (index) {
      this.uploadForm.metadata.tags.splice(index, 1)
    },
    resetUploadForm () {
      this.uploadForm = {
        file: null,
        category_id: null,
        description: '',
        fileType: '',
        metadata: {
          version: '',
          build_number: null,
          build_date: '',
          is_stable: true,
          release_notes: '',
          artist: '',
          album: '',
          genre: '',
          duration: null,
          tags: [],
          width: null,
          height: null,
          format: '',
          orientation: '',
          author: '',
          language: '',
          pages: null
        }
      }
      if (this.$refs.uploadInput) {
        this.$refs.uploadInput.value = ''
      }
      this.uploadErrors = {}
    },
    handleUploadModalOk (event) {
      event.preventDefault()
      this.handleUpload()
    },
    uploadFieldState (field) {
      if (!(field in this.uploadErrors)) {
        return null
      }
      return !this.uploadErrors[field]
    },
    validateUploadForm () {
      const errors = {}
      if (!this.uploadForm.file) {
        errors.file = this.$t('file_manager.toast.select_file')
      }
      if (!this.uploadForm.category_id) {
        errors.category_id = this.$t('file_manager.toast.validate_category')
      }
      if (!this.uploadForm.description || !this.uploadForm.description.trim()) {
        errors.description = this.$t('file_manager.toast.validate_description')
      }
      this.uploadErrors = errors
      return Object.keys(errors).length === 0
    },
    async handleUpload () {
      if (!this.uploadForm.file) {
        this.validateUploadForm()
        return
      }

      if (!this.validateUploadForm()) {
        return
      }

      this.uploading = true
      try {
        // 构建 formData
        const formData = new FormData()
        formData.append('file', this.uploadForm.file)
        formData.append('file_type', this.uploadForm.fileType)
        if (this.uploadForm.category_id) {
          formData.append('category_id', this.uploadForm.category_id)
        }
        if (this.uploadForm.description) {
          formData.append('description', this.uploadForm.description)
        }

        // 清理 metadata 中的空值
        const cleanMetadata = {}
        Object.keys(this.uploadForm.metadata).forEach(key => {
          const value = this.uploadForm.metadata[key]
          if (value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)) {
            cleanMetadata[key] = value
          }
        })

        // 如果有元数据，添加到 formData
        if (Object.keys(cleanMetadata).length > 0) {
          formData.append('metadata', JSON.stringify(cleanMetadata))
        }

        // 调用上传 API
        await uploadFile(formData)

        this.$uiToast.success(this.$t('file_manager.toast.upload_success'))
        this.showUploadDialog = false
        this.resetUploadForm()
        this.fetchData()
        this.loadStats()
      } catch (error) {
        const errorMsg = this.$getErrorMessage(error) || this.$t('file_manager.toast.upload_failed_default')
        this.$uiToast.error(this.$t('file_manager.toast.upload_failed') + errorMsg)
      } finally {
        this.uploading = false
      }
    },

    handleFileColumnsUpdate (newColumns) {
      this.fileColumns = newColumns
    }
  }
}
</script>

<style lang="scss" src="@/assets/styles/pages/file-manager.scss"></style>
