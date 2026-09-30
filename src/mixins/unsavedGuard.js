// 表单未保存改动拦截 mixin。
// 用法（在使用方 view 里）：
//   import unsavedGuard from '@/mixins/unsavedGuard'
//   export default {
//     mixins: [unsavedGuard],
//     methods: {
//       isFormDirty () { return this.formDirtyFlag === true }
//     }
//   }
// 使用方需要实现 isFormDirty() 方法：返回 true 表示有未保存改动，导航/关闭页面会弹确认。
// 简单实现可在保存成功后将 this.formDirtyFlag = false，编辑时通过 watch 标记 true。
//
// 工作机制：
// - beforeRouteLeave：vue-router 钩子，路由切走时弹 window.confirm
// - beforeunload：刷新/关闭浏览器时浏览器原生确认（returnValue 触发）
// - 不会强行阻止保存后的正常跳转，因为保存成功后业务方应将 dirty 标志重置

export default {
  beforeRouteLeave (to, from, next) {
    if (typeof this.isFormDirty === 'function' && this.isFormDirty()) {
      const confirmMsg = (this.$t && this.$t('common.unsaved_changes_confirm')) ||
        '您有未保存的更改，确定要离开吗？'
      const confirmed = window.confirm(confirmMsg)
      next(confirmed)
    } else {
      next()
    }
  },
  mounted () {
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  },
  beforeDestroy () {
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
  },
  methods: {
    handleBeforeUnload (e) {
      if (typeof this.isFormDirty === 'function' && this.isFormDirty()) {
        // 现代浏览器忽略自定义文案，但仍需 preventDefault + returnValue 触发原生确认
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
  }
}
