<template>
  <div class="app-breadcrumb-wrap">
    <b-breadcrumb class="app-breadcrumb mb-0">
      <b-breadcrumb-item to="/dashboard">{{ $t('breadcrumb.home') }}</b-breadcrumb-item>
      <b-breadcrumb-item
        v-for="(item, index) in breadcrumbItems"
        :key="index"
        :to="index < breadcrumbItems.length - 1 ? item.path : null"
        :active="index === breadcrumbItems.length - 1"
      >
        {{ item.title }}
      </b-breadcrumb-item>
    </b-breadcrumb>
  </div>
</template>

<script>

export default {
  name: 'AppBreadcrumb',
  data () {
    return {
      breadcrumbItems: []
    }
  },
  watch: {
    $route: {
      immediate: true,
      handler () {
        this.updateBreadcrumb()
      }
    }
  },
  methods: {
    updateBreadcrumb () {
      const path = this.$route.path
      const allRoutes = this.$router.options.routes[0].children || []
      const items = []
      const pathSegments = path.split('/').filter(Boolean)
      const navGroups = {
        devices: { title: this.$t('sidebar.menu.device_mgmt'), path: '/devices/hn-models' },
        config: { title: this.$t('breadcrumb.groups.config'), path: '/config/rules' },
        monitor: { title: this.$t('breadcrumb.groups.monitor'), path: '/monitor/health' },
        integration: { title: this.$t('breadcrumb.groups.integration'), path: '/integration/api' },
        docs: { title: this.$t('breadcrumb.groups.docs'), path: '/docs/project-overview' }
      }

      pathSegments.forEach((segment, index) => {
        const prefix = '/' + pathSegments.slice(0, index + 1).join('/')
        const matchedRoute = allRoutes.find(route => this.routeMatchesPath(route.path, prefix))

        if (matchedRoute) {
          const titleKey = matchedRoute.meta && matchedRoute.meta.title
          items.push({
            title: titleKey ? this.$t(titleKey) : segment,
            path: prefix
          })
          return
        }

        if (index === 0 && navGroups[segment]) items.push(navGroups[segment])
      })

      this.breadcrumbItems = items.map(item => ({
        ...item,
        path: this.resolveRoutePath(item.path)
      }))
    },
    resolveRoutePath (path) {
      return Object.entries(this.$route.params || {}).reduce((resolvedPath, [key, value]) => {
        return resolvedPath.replace(`:${key}`, encodeURIComponent(value))
      }, path)
    },
    routeMatchesPath (routePath, actualPath) {
      const routeSegments = routePath.split('/').filter(Boolean)
      const actualSegments = actualPath.split('/').filter(Boolean)
      if (routeSegments.length !== actualSegments.length) return false

      return routeSegments.every((segment, index) => {
        return segment.startsWith(':') || segment === actualSegments[index]
      })
    }
  }
}
</script>
