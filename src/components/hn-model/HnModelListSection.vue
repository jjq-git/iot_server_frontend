<template>
  <div class="hn-model-list-section">
    <list-page-card :total-rows="total" :page="query.page" :per-page="query.page_size">
      <template #filters>
        <b-form class="hn-models__filters" @submit.prevent="$emit('search')">
        <div class="filter-row">
          <div class="filter-left">
            <base-input
              :value="query.search"
              class="filter-control"
              :placeholder="$t('hn_models.filter.search_placeholder')"
              :aria-label="$t('hn_models.filter.search_placeholder')"
              @input="updateQuery('search', $event)"
              @keyup.enter="$emit('search')"
            />
            <base-select :value="query.is_host" class="filter-control" :options="typeOptions" :aria-label="typeOptions[0] && typeOptions[0].text" @input="updateAndSearch('is_host', $event)" />
            <base-select :value="query.status" class="filter-control" :options="statusOptions" :aria-label="statusOptions[0] && statusOptions[0].text" @input="updateAndSearch('status', $event)" />
            <div class="filter-actions">
              <base-button v-if="allowCreate" @click="$emit('create')">
                <app-icon name="product-model-add" class="mr-1" />
                {{ $t('common.add') }}
              </base-button>
            </div>
          </div>
        </div>
        </b-form>
      </template>

      <base-table :items="items" :fields="fields" :loading="loading" :load-error="loadError" bordered @retry="$emit('retry')">
        <template #cell(version_tree)="data">
          <base-icon-button
            class="hn-model-list-section__expand"
            :label="`${$t(data.detailsShowing ? 'common.collapse' : 'common.expand')} ${data.item.model_code}`"
            :aria-expanded="data.detailsShowing ? 'true' : 'false'"
            @click="toggleDetails(data)"
          >
            <app-icon :name="data.detailsShowing ? 'chevron-down' : 'chevron-right'" aria-hidden="true" />
          </base-icon-button>
        </template>
        <template #cell(is_host)="data">
          <base-badge :variant="data.item.is_host ? 'primary' : 'success'">
            {{ $t(data.item.is_host ? 'hn_models.type.host' : 'hn_models.type.node') }}
          </base-badge>
        </template>
        <template #cell(status)="data">
          <base-badge :variant="statusVariant(data.item.status)">{{ statusText(data.item.status) }}</base-badge>
        </template>
        <template #cell(url)="data">
          <a v-if="data.item.url" :href="data.item.url" target="_blank" rel="noopener noreferrer" class="link-text">{{ $t('hn_models.actions.view') }}</a>
          <span v-else>-</span>
        </template>
        <template #cell(created_at)="data">{{ formatDateTime(data.item.created_at) }}</template>
        <template #cell(version_summary)="data">
          {{ $t('hn_models.version_catalog.summary', { versions: data.item.version_count, revisions: data.item.revision_count }) }}
        </template>
        <template #head(actions)>
          <div class="column-visibility-header">
            <column-visibility :columns="columns" table-key="hn-models-table" @update:columns="$emit('columns-change', $event)" />
          </div>
        </template>
        <template #cell(actions)="data">
          <div class="action-cell action-cell--nowrap">
            <base-action-button v-if="allowCreate" :title="`${$t('common.add')} ${$t('hn_models.version_catalog.hw_version')}`" @click="$emit('add-hardware', data.item)"><app-icon name="plus" /><span>{{ $t('hn_models.version_catalog.hw_version') }}</span></base-action-button>
            <base-action-button :title="$t('common.detail')" @click="$emit('view', data.item)"><app-icon name="eye" /><span>{{ $t('common.detail') }}</span></base-action-button>
            <b-dropdown right no-caret variant="link" class="action-overflow-menu" toggle-class="action-overflow-menu__toggle" :toggle-attrs="{ title: $t('common.more'), 'aria-label': [$t('common.more'), data.item.model_code || data.item.name].filter(Boolean).join(' ') }">
              <template #button-content><app-icon name="list" aria-hidden="true" /></template>
              <b-dropdown-item-button @click="$emit('logs', data.item)"><app-icon name="journal-text" aria-hidden="true" /> {{ $t('hn_models.actions.view_logs') }}</b-dropdown-item-button>
              <b-dropdown-item-button @click="$emit('attributes', data.item)"><app-icon name="list-ul" aria-hidden="true" /> {{ $t('hn_models.actions.manage_attrs') }}</b-dropdown-item-button>
            </b-dropdown>
          </div>
        </template>
        <template #row-details="row">
          <hn-model-version-tree
            :hardware-line="row.item"
            :allow-web-ui="allowWebUi"
            :allow-firmware-manage="allowFirmwareManage"
            @web-ui="$emit('web-ui', $event)"
            @upload-firmware="$emit('upload-firmware', $event)"
            @edit-firmware="$emit('edit-firmware', $event)"
          />
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
  </div>
</template>

<script>
import ColumnVisibility from '@/components/ColumnVisibility.vue'
import ListPageCard from '@/components/shared/ListPageCard.vue'
import HnModelVersionTree from './HnModelVersionTree.vue'

export default {
  name: 'HnModelListSection',
  components: { ColumnVisibility, HnModelVersionTree, ListPageCard },
  props: {
    query: { type: Object, required: true },
    typeOptions: { type: Array, required: true },
    statusOptions: { type: Array, required: true },
    allowCreate: { type: Boolean, default: false },
    allowWebUi: { type: Boolean, default: false },
    allowFirmwareManage: { type: Boolean, default: false },
    items: { type: Array, required: true },
    fields: { type: Array, required: true },
    columns: { type: Array, required: true },
    loading: { type: Boolean, default: false },
    loadError: { type: String, default: '' },
    total: { type: Number, default: 0 },
    statusVariant: { type: Function, required: true },
    statusText: { type: Function, required: true },
    formatDateTime: { type: Function, required: true }
  },
  methods: {
    toggleDetails (row) {
      this.items.forEach(item => {
        if (item !== row.item && item._showDetails) this.$set(item, '_showDetails', false)
      })
      row.toggleDetails()
    },
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
    }
  }
}
</script>
