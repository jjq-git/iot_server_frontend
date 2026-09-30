<template>
  <div class="base-pagination-wrapper">
    <b-form-select
      v-if="showPerPage"
      v-model="localPerPage"
      :options="resolvedPerPageOptions"
      class="per-page-select"
      :aria-label="$t('base_pagination.per_page_label')"
      @change="onPerPageChange"
    />
    <b-pagination
      v-model="localValue"
      :total-rows="totalRows"
      :per-page="perPage"
      :size="size"
      :align="align"
      :label-prev-page="$t('base_pagination.previous_page')"
      :label-next-page="$t('base_pagination.next_page')"
      @change="onPageChange"
    >
      <template #prev-text>
        <app-icon name="chevron-left" aria-hidden="true" />
      </template>
      <template #next-text>
        <app-icon name="chevron-right" aria-hidden="true" />
      </template>
    </b-pagination>
  </div>
</template>

<script>
import AppIcon from '@/components/AppIcon.vue'

export default {
  name: 'BasePagination',
  components: { AppIcon },
  inheritAttrs: false,
  props: {
    value: {
      type: Number,
      default: 1
    },
    totalRows: {
      type: Number,
      default: 0
    },
    perPage: {
      type: Number,
      default: 10
    },
    size: {
      type: String,
      default: null
    },
    align: {
      type: String,
      default: 'center'
    },
    showPerPage: {
      type: Boolean,
      default: false
    },
    perPageOptions: {
      type: Array,
      default: null
    }
  },
  data () {
    return {
      localPerPage: this.perPage,
      localValue: this.value
    }
  },
  computed: {
    resolvedPerPageOptions () {
      if (this.perPageOptions) return this.perPageOptions
      return [
        { value: 10, text: this.$t('base_pagination.per_page', { count: 10 }) },
        { value: 20, text: this.$t('base_pagination.per_page', { count: 20 }) },
        { value: 50, text: this.$t('base_pagination.per_page', { count: 50 }) },
        { value: 100, text: this.$t('base_pagination.per_page', { count: 100 }) }
      ]
    }
  },
  watch: {
    perPage (val) {
      this.localPerPage = val
    },
    value (val) {
      if (val !== this.localValue) {
        this.localValue = val
      }
    }
  },
  methods: {
    onPageChange (val) {
      this.$emit('input', val)
    },
    onPerPageChange (newPerPage) {
      this.$emit('update:perPage', newPerPage)
    }
  }
}
</script>
