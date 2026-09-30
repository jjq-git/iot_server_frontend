import { fetchFiles, fetchFileStats } from '@/api/files'

const queryFields = ['page', 'page_size', 'file_type']
const defaultQuery = () => ({
  page: 1,
  page_size: 10,
  file_type: ''
})

function inferContentKind (item) {
  const explicitKind = item?.content_kind || item?.file_type
  if (explicitKind) return explicitKind

  const mimeType = item?.mime_type || item?.content_type || ''
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType) return 'document'
  return 'other'
}

function normalizeFileRecord (item) {
  if (!item || typeof item !== 'object') return item

  const rawSize = item.size_bytes ?? item.file_size ?? item.size
  const sizeBytes = rawSize === null || rawSize === undefined || rawSize === ''
    ? null
    : Number(rawSize)

  return {
    ...item,
    original_name: item.original_name || item.file_name || item.filename || item.name || item.uuid || '-',
    size_bytes: Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : null,
    content_kind: inferContentKind(item)
  }
}

export default {
  data () {
    return {
      loading: false,
      loadError: '',
      stats: {
        total_files: 0,
        total_size: 0,
        image_count: 0,
        video_count: 0
      },
      total: 0,
      tableData: [],
      query: defaultQuery()
    }
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
    },
    $route (to, from) {
      this.handleRouteIntent()
      if (to.path !== from.path) return
      const before = JSON.stringify(this.query)
      this._restoreQueryFromUrl()
      if (JSON.stringify(this.query) !== before) {
        this.fetchData({ skipUrlSync: true })
      }
    }
  },
  methods: {
    _restoreQueryFromUrl () {
      const routeQuery = this.$route.query || {}
      queryFields.forEach(field => {
        const value = routeQuery[field]
        if (value === undefined) return
        const currentValue = this.query[field]
        if (typeof currentValue === 'number') {
          const numberValue = parseInt(value, 10)
          if (!Number.isNaN(numberValue)) this.query[field] = numberValue
        } else {
          this.query[field] = value
        }
      })
    },
    _syncQueryToUrl () {
      const nextQuery = {}
      queryFields.forEach(field => {
        const value = this.query[field]
        if (value === '' || value === null || value === undefined) return
        if (field === 'page' && value === 1) return
        if (field === 'page_size' && value === defaultQuery().page_size) return
        nextQuery[field] = String(value)
      })
      const currentQuery = this.$route.query || {}
      const sameKeys = Object.keys(currentQuery).sort().join(',') === Object.keys(nextQuery).sort().join(',')
      const sameValues = sameKeys && Object.keys(nextQuery).every(key => currentQuery[key] === nextQuery[key])
      if (sameValues) return
      this.$router.replace({ query: nextQuery }).catch(() => {})
    },
    async fetchData (options = {}) {
      if (!options.skipUrlSync) this._syncQueryToUrl()
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }
        if (this.query.file_type) params.file_type = this.query.file_type

        const response = await fetchFiles(params)
        if (reqId !== this._listReqId) return
        const records = response?.list || response?.items || response?.data || []
        this.tableData = Array.isArray(records) ? records.map(normalizeFileRecord) : []
        this.total = response?.total ?? 0
      } catch (error) {
        if (reqId !== this._listReqId) return
        const fallback = this.$t('node_detail.toast.retry_later')
        this.loadError = this.$getErrorMessage(error) || fallback
        this.$uiToast.error(this.$t('file_manager.toast.load_list_failed') + (this.$getErrorMessage(error) || fallback))
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },
    async loadStats () {
      try {
        const response = await fetchFileStats()
        const statsData = response.data || response
        this.stats = {
          total_files: statsData.total_files || statsData.total || 0,
          total_size: statsData.total_size || 0,
          image_count: statsData.image_count || 0,
          video_count: statsData.video_count || 0,
          by_mime_type: statsData.by_mime_type || []
        }
      } catch (error) {
        this.$uiToast.error(this.$getErrorMessage(error) || this.$t('common.load_failed'))
      }
    },
    handleSearch () {
      this.query.page = 1
      this.fetchData()
    },
    resetFilters () {
      this.query = defaultQuery()
      this.fetchData()
    },
    handlePageChange (page) {
      this.query.page = page
      this.fetchData()
    },
    handleSizeChange (size) {
      this.query.page_size = size
      this.query.page = 1
      this.fetchData()
    }
  }
}
