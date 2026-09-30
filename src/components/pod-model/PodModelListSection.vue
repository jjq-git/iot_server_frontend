<template>
  <div class="pod-model-list-section">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="pod-models__filters" @submit.prevent="$emit('search')">
        <div class="filter-row">
          <div class="filter-left">
            <base-select :value="query.company_id" class="filter-control" :options="companyOptions" :aria-label="companyOptions[0] && companyOptions[0].text" @input="updateAndSearch('company_id', $event)" />
            <base-input :value="query.search" class="filter-control" :placeholder="$t('pod_models.filter.search_placeholder')" :aria-label="$t('pod_models.filter.search_placeholder')" @input="updateQuery('search', $event)" @keyup.enter="$emit('search')" />
            <base-select :value="query.is_active" class="filter-control" :options="activeOptions" :aria-label="activeOptions[0] && activeOptions[0].text" @input="updateAndSearch('is_active', $event)" />
            <div class="filter-actions">
              <base-button v-if="createAllowed" @click="$emit('create')"><app-icon name="product-model-add" />{{ $t('pod_models.actions.create') }}</base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table :items="items" :fields="fields" :loading="loading" :load-error="loadError" bordered @retry="$emit('retry')">
        <template #cell(avatar)="data">
          <div class="table-image-wrapper">
            <img
              v-if="data.item.avatar && !imageErrors[data.item.id]"
              :src="imageUrls[data.item.id] || normalizeImageUrl(data.item.avatar)"
              class="table-image"
              loading="lazy"
              @mouseenter="$emit('image-preview-show', $event, imageUrls[data.item.id] || normalizeImageUrl(data.item.avatar))"
              @mouseleave="$emit('image-preview-hide')"
              @error="$emit('image-error', data.item.id)"
            />
            <app-icon v-else name="image" class="table-image-placeholder" :title="$t('pod_models.table.no_image')" />
          </div>
        </template>
        <template #cell(attributes)="data">
          <button type="button" class="attr-count-chip" :title="$t('pod_models.table.attributes')" @click="$emit('attributes', data.item)">
            <span class="attr-count-chip__num">{{ attributeCount(data.item) }}</span>
            <app-icon name="chevron-right" class="attr-count-chip__icon" />
          </button>
        </template>
        <template #cell(is_active)="data">
          <base-badge :variant="data.item.is_active ? 'success' : 'secondary'">{{ $t(data.item.is_active ? 'common.active' : 'common.inactive') }}</base-badge>
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility :columns="columns" table-key="pod-models-table" @update:columns="$emit('columns-change', $event)" />
          </div>
        </template>
        <template #cell(actions)="data">
          <base-action-button :title="$t('pod_models.icons.details')" @click="$emit('view', data.item)"><app-icon name="eye" /><span>{{ $t('pod_models.icons.details') }}</span></base-action-button>
          <base-action-button :title="$t('pod_models.icons.view_logs')" @click="$emit('logs', data.item)"><app-icon name="journal-text" /><span>{{ $t('pod_models.icons.view_logs') }}</span></base-action-button>
          <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.model_name || data.item.name].filter(Boolean).join(' ') }">
            <template #button-content><app-icon name="list" aria-hidden="true" /></template>
            <b-dropdown-item-button @click="$emit('devices', data.item)"><app-icon name="gear" aria-hidden="true" /> {{ $t('pod_models.icons.device_config') }}</b-dropdown-item-button>
            <b-dropdown-item-button v-if="deleteAllowed(data.item)" class="text-danger" @click="$emit('delete', data.item)"><app-icon name="trash" aria-hidden="true" /> {{ $t('common.delete') }}</b-dropdown-item-button>
          </b-dropdown>
        </template>
      </base-table>
      <template #footer>
        <base-pagination :value="query.page" :total-rows="total" :per-page="query.page_size" :show-per-page="true" @input="changePage" @update:perPage="changePageSize" />
      </template>
    </list-page-card>
  </div>
</template>

<script>
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'

export default {
  name: 'PodModelListSection',
  components: { ColumnVisibility, ListPageCard },
  props: {
    query: { type: Object, required: true },
    companyOptions: { type: Array, required: true },
    activeOptions: { type: Array, required: true },
    createAllowed: { type: Boolean, default: false },
    deleteAllowed: { type: Function, required: true },
    items: { type: Array, required: true },
    fields: { type: Array, required: true },
    columns: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    loadError: { type: String, default: '' },
    total: { type: Number, default: 0 },
    imageErrors: { type: Object, required: true },
    imageUrls: { type: Object, required: true },
    normalizeImageUrl: { type: Function, required: true }
  },
  methods: {
    updateQuery (field, value) {
      this.$emit('query-change', { ...this.query, [field]: value })
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
      this.$emit('page-size-change', value)
    },
    attributeCount (item) {
      return item.attributes && item.attributes.length > 0 ? (item.attributes[0].attr_value || 0) : 0
    }
  }
}
</script>
