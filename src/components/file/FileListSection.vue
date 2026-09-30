<template>
  <section class="file-list-section">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form inline class="files__filters" @submit.prevent="$emit('search')">
        <div class="filter-row">
          <div class="filter-left">
            <base-select
              :value="query.file_type"
              class="filter-control"
              :options="businessTypeOptions"
              :placeholder="$t('file_manager.filters.type_placeholder')"
              :aria-label="$t('file_manager.filters.type_placeholder')"
              @input="updateAndSearch('file_type', $event)"
            />
            <div class="filter-actions">
              <base-button v-if="canManageFiles" variant="primary" @click="$emit('upload')">
                <app-icon name="upload" /> {{ $t('file_manager.actions.upload') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table :items="items" :fields="fields" :loading="loading" :load-error="loadError" bordered @retry="$emit('retry')">
        <template #cell(file)="data">
          <div class="file-item">
            <div class="file-icon" :class="getFileTypeClass(data.item.content_kind)">
              <app-icon :name="getFileIcon(data.item.content_kind)" />
            </div>
            <div class="file-info">
              <div class="file-name">{{ data.item.original_name }}</div>
              <div class="file-meta">
                <span>{{ formatFileSize(data.item.size_bytes) }}</span>
                <span>&middot;</span>
                <span>{{ data.item.content_kind }}</span>
                <span>&middot;</span>
                <span>{{ formatDate(data.item.created_at) }}</span>
              </div>
            </div>
          </div>
        </template>
        <template #cell(uploader_name)="data">
          {{ data.item.metadata && data.item.metadata.upload_ip ? data.item.metadata.upload_ip : '-' }}
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility :columns="columns" table-key="files-table" @update:columns="$emit('columns-change', $event)" />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button :title="$t('file_manager.actions.preview')" @click="$emit('preview', data.item)">
            <app-icon name="eye" /> <span>{{ $t('file_manager.actions.preview') }}</span>
          </base-action-button>
          <base-action-button :title="$t('file_manager.actions.view_logs')" @click="$emit('logs', data.item)">
            <app-icon name="journal-text" /> <span>{{ $t('file_manager.actions.view_logs') }}</span>
          </base-action-button>
          <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.original_name].filter(Boolean).join(' ') }">
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button @click="$emit('download', data.item)"><app-icon name="download" aria-hidden="true" /> {{ $t('file_manager.actions.download') }}</b-dropdown-item-button>
            <b-dropdown-item-button @click="$emit('relations', data.item)"><app-icon name="link-45deg" aria-hidden="true" /> {{ $t('file_manager.actions.manage_relations') }}</b-dropdown-item-button>
            <b-dropdown-item-button v-if="canDeleteFiles" class="text-danger" @click="$emit('delete', data.item)"><app-icon name="trash" aria-hidden="true" /> {{ $t('file_manager.actions.delete') }}</b-dropdown-item-button>
          </b-dropdown>
        </template>
      </base-table>

      <template #footer>
        <base-pagination
          :value="query.page"
          :total-rows="total"
          :per-page="query.page_size"
          :show-per-page="true"
          @input="changePage"
          @update:perPage="changePageSize"
        />
      </template>
    </list-page-card>
  </section>
</template>

<script>
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'FileListSection',
  components: { ColumnVisibility, ListPageCard },
  props: {
    query: { type: Object, required: true },
    businessTypeOptions: { type: Array, required: true },
    canManageFiles: { type: Boolean, default: false },
    canDeleteFiles: { type: Boolean, default: false },
    items: { type: Array, required: true },
    fields: { type: Array, required: true },
    columns: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    loadError: { type: String, default: '' },
    total: { type: Number, default: 0 },
    getFileTypeClass: { type: Function, required: true },
    getFileIcon: { type: Function, required: true },
    formatFileSize: { type: Function, required: true },
    formatDate: { type: Function, required: true }
  },
  methods: {
    updateQuery (field, value) {
      this.$emit('update:query', { ...this.query, [field]: value })
    },
    updateAndSearch (field, value) {
      this.updateQuery(field, value)
      this.$emit('search')
    },
    changePage (value) {
      this.updateQuery('page', value)
      this.$emit('page-change', value)
    },
    changePageSize (value) {
      this.updateQuery('page_size', value)
    }
  }
}
</script>
