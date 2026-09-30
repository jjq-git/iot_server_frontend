// 「列可见性」列定义的 i18n 响应式 mixin。
//
// 背景：带 visible 状态的列定义(`[{ prop, label, visible }]`)通常在 data() /
// created() 里一次性求值，其中的 this.$t(...) 只翻译一次，切换语言后 label
// 不会更新。这类数组又必须保持可写(用户勾选列显隐)，不能直接改成 computed，
// 否则会丢掉用户的列设置。
//
// 本 mixin 在 locale 变化时用页面提供的构造方法重建列定义，并按 prop / key
// 把用户当前的 visible 状态迁移过去。
//
// 用法（在使用方 view 里）：
//   import localizedColumns from '@/mixins/localizedColumns'
//   export default {
//     mixins: [localizedColumns],
//     // key = data 中的字段名，value = methods 中返回完整列定义的方法名
//     localizedColumns: { userColumns: 'buildUserColumns' },
//     data () { return { userColumns: this.buildUserColumns() } },
//     methods: {
//       buildUserColumns () {
//         return [{ prop: 'username', label: this.$t('users.table.column.username'), visible: true }]
//       }
//     }
//   }
// 注意：data() 里可以直接调用 methods（Vue 2 中 methods 先于 data 初始化）。

export default {
  watch: {
    '$i18n.locale' () {
      this._relabelLocalizedColumns()
    }
  },
  methods: {
    _relabelLocalizedColumns () {
      const map = this.$options.localizedColumns
      if (!map) return
      Object.keys(map).forEach(field => {
        const builder = this[map[field]]
        if (typeof builder !== 'function' || !Array.isArray(this[field])) return
        // 记下当前显隐状态，重建后按 prop / key 迁移回去
        const visible = {}
        this[field].forEach(col => {
          const k = col.prop || col.key
          if (k !== undefined) visible[k] = col.visible
        })
        this[field] = builder.call(this).map(col => {
          const k = col.prop || col.key
          return k !== undefined && k in visible ? { ...col, visible: visible[k] } : col
        })
      })
    }
  }
}
