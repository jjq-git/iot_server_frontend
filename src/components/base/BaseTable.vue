<template>
  <div class="base-table-wrapper">
    <b-alert v-if="loadError" show variant="danger" class="base-table-load-error d-flex align-items-center justify-content-between">
      <span class="base-table-load-error-message">
        <strong>{{ $t('common.load_failed') }}</strong>
        <span v-if="loadError" class="ml-2">{{ loadError }}</span>
      </span>
      <base-button variant="outline-danger" size="sm" @click="$emit('retry')">
        {{ $t('common.retry') }}
      </base-button>
    </b-alert>
    <div v-if="hasStickyHeader" class="base-table-sticky-wrapper" :style="stickyWrapperStyle">
      <b-table
        :items="items"
        :fields="fields"
        :busy="loading"
        :empty-text="emptyText || $t('base_table.empty_text')"
        :show-empty="showEmpty"
        :striped="striped"
        :hover="hover"
        :responsive="responsive"
        :sticky-header="computedStickyHeader"
        :sort-by.sync="curSortBy"
        :sort-desc.sync="curSortDesc"
        v-bind="$attrs"
        v-on="$listeners"
      >
        <template v-for="(_, slotName) in $scopedSlots" #[slotName]="slotScope">
          <slot :name="slotName" v-bind="slotScope" />
        </template>
        <!-- 内置兜底表头：列名 + 三态排序图标（仅当父级未自定义通用 head() 插槽时启用） -->
        <template v-if="!$scopedSlots['head()']" #head()="scope">
          <span class="th-sort" :class="{ 'th-sort--sortable': scope.field.sortable }">
            <span class="th-sort__label">{{ scope.label }}</span>
            <span
              v-if="scope.field.sortable"
              class="th-sort__icon"
              :class="sortIconClass(scope.column)"
            />
          </span>
        </template>
      </b-table>
    </div>
    <b-table
      v-else
      :items="items"
      :fields="fields"
      :busy="loading"
      :empty-text="emptyText || $t('base_table.empty_text')"
      :show-empty="showEmpty"
      :striped="striped"
      :hover="hover"
      :responsive="responsive"
      :sticky-header="stickyHeader"
      :sort-by.sync="curSortBy"
      :sort-desc.sync="curSortDesc"
      v-bind="$attrs"
      v-on="$listeners"
    >
      <template v-for="(_, slotName) in $scopedSlots" #[slotName]="slotScope">
        <slot :name="slotName" v-bind="slotScope" />
      </template>
      <!-- 内置兜底表头：列名 + 三态排序图标（仅当父级未自定义通用 head() 插槽时启用） -->
      <template v-if="!$scopedSlots['head()']" #head()="scope">
        <span class="th-sort" :class="{ 'th-sort--sortable': scope.field.sortable }">
          <span class="th-sort__label">{{ scope.label }}</span>
          <span
            v-if="scope.field.sortable"
            class="th-sort__icon"
            :class="sortIconClass(scope.column)"
          />
        </span>
      </template>
    </b-table>
  </div>
</template>

<script>
import BaseButton from './BaseButton.vue'

export default {
  name: 'BaseTable',
  components: { BaseButton },
  inheritAttrs: false,
  props: {
    items: {
      type: Array,
      default: () => []
    },
    fields: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    emptyText: {
      type: String,
      default: ''
    },
    showEmpty: {
      type: Boolean,
      default: true
    },
    striped: {
      type: Boolean,
      default: true
    },
    hover: {
      type: Boolean,
      default: true
    },
    responsive: {
      type: [Boolean, String],
      default: true
    },
    // 表头固定高度（启用后 tbody 可滚动）
    // 传入字符串如 '400px' 或 '60vh'
    stickyHeader: {
      type: [String, Boolean],
      default: false
    },
    // 加载失败时的错误信息（非空时表格上方显示错误 alert + 重试按钮）
    // 父组件需要监听 @retry 事件重新拉数据
    loadError: {
      type: String,
      default: ''
    },
    // 排序状态（支持 .sync 从父级双向绑定；父级不传时组件内部自维护）
    // 供内置表头插槽的排序图标高亮当前排序列/方向
    sortBy: {
      type: String,
      default: ''
    },
    sortDesc: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      // 父级未使用 .sync 时的内部兜底状态
      innerSortBy: this.sortBy,
      innerSortDesc: this.sortDesc
    }
  },
  computed: {
    // 双向代理：优先反映 prop（父级 .sync），变更时同步 emit + 本地缓存
    curSortBy: {
      get () {
        return this.innerSortBy
      },
      set (val) {
        this.innerSortBy = val
        this.$emit('update:sortBy', val)
      }
    },
    curSortDesc: {
      get () {
        return this.innerSortDesc
      },
      set (val) {
        this.innerSortDesc = val
        this.$emit('update:sortDesc', val)
      }
    },
    hasStickyHeader () {
      return this.stickyHeader && this.stickyHeader !== false && this.stickyHeader !== 'false'
    },
    computedStickyHeader () {
      // BootstrapVue 支持 CSS 高度字符串。保留 vh 值，避免传 true 后退回
      // 默认 300px，造成外层很高而实际表格只显示几行。
      return this.stickyHeader
    },
    stickyWrapperStyle () {
      if (typeof this.stickyHeader === 'string') {
        return { height: this.stickyHeader }
      }
      return {}
    }
  },
  watch: {
    // 父级 .sync 外部变更时同步到内部
    sortBy (val) {
      this.innerSortBy = val
    },
    sortDesc (val) {
      this.innerSortDesc = val
    }
  },
  methods: {
    // 排序图标状态：未排序=双三角，当前列升序=上三角高亮，降序=下三角高亮
    sortIconClass (column) {
      if (this.innerSortBy !== column) return 'th-sort__icon--none'
      return this.innerSortDesc ? 'th-sort__icon--desc' : 'th-sort__icon--asc'
    }
  }
}
</script>
