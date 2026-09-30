<template>
  <!-- 根组件：路由出口 + 仅登录页显示 floating 主题按钮(进 admin 后由 Topbar 接管) -->
  <div id="app">
    <router-view />
    <theme-toggle v-if="showFloatingToggle" floating />
  </div>
</template>

<script>
import ThemeToggle from '@/components/ThemeToggle.vue'

export default {
  name: 'App',
  components: { ThemeToggle },
  computed: {
    showFloatingToggle () {
      // admin layout 自带 Topbar 里的 ThemeToggle,floating 仅在登录页/独立页面用
      const meta = this.$route && this.$route.meta
      return meta && meta.layout === 'blank'
    }
  }
}
</script>
