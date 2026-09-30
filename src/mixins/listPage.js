const DEFAULT_PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

function positiveInteger (value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizedFilters (factory) {
  const filters = typeof factory === 'function' ? factory() : {}
  return filters && typeof filters === 'object' ? { ...filters } : {}
}

function listRows (response) {
  if (Array.isArray(response)) return response
  return response && Array.isArray(response.data) ? response.data : []
}

function listTotal (response, rows) {
  const candidate = response && response.meta && response.meta.total
  const total = Number(candidate)
  return Number.isFinite(total) ? total : rows.length
}

/**
 * Options-API list contract used only after three pages share the same lifecycle.
 * Resource fetching stays in the page through the injected fetchPage function.
 */
export function createListPageMixin ({
  fetchPage,
  initialFilters = () => ({}),
  errorMessageKey,
  toastTitleKey,
  pageSize = DEFAULT_PAGE_SIZE
}) {
  if (typeof fetchPage !== 'function') throw new TypeError('fetchPage must be a function')

  return {
    data () {
      return {
        filter: normalizedFilters(initialFilters),
        pagination: {
          page: 1,
          limit: pageSize
        },
        rows: [],
        total: 0,
        loading: false,
        loadError: ''
      }
    },
    computed: {
      listPageSizeOptions () {
        return PAGE_SIZE_OPTIONS.map(value => ({
          value,
          text: this.$t(`common.page_size_options.${{
            10: 'ten',
            20: 'twenty',
            50: 'fifty',
            100: 'hundred'
          }[value]}`)
        }))
      }
    },
    created () {
      this.hydrateListQuery()
    },
    methods: {
      hydrateListQuery () {
        const query = (this.$route && this.$route.query) || {}
        this.pagination.page = positiveInteger(query.page, 1)
        this.pagination.limit = positiveInteger(query.page_size, pageSize)
        Object.keys(this.filter).forEach(key => {
          if (query[key] !== undefined) this.$set(this.filter, key, String(query[key]))
        })
      },
      buildListParams () {
        const params = {
          _page: this.pagination.page,
          _limit: this.pagination.limit
        }
        Object.entries(this.filter).forEach(([key, value]) => {
          const normalized = typeof value === 'string' ? value.trim() : value
          if (normalized !== '' && normalized !== null && normalized !== undefined) params[key] = normalized
        })
        return params
      },
      syncListQuery () {
        if (!this.$route || !this.$router) return Promise.resolve()
        const query = { ...this.$route.query }
        Object.keys(this.filter).forEach(key => { delete query[key] })
        delete query.page
        delete query.page_size
        Object.entries(this.filter).forEach(([key, value]) => {
          const normalized = typeof value === 'string' ? value.trim() : value
          if (normalized !== '' && normalized !== null && normalized !== undefined) query[key] = normalized
        })
        if (this.pagination.page > 1) query.page = String(this.pagination.page)
        if (this.pagination.limit !== pageSize) query.page_size = String(this.pagination.limit)
        const current = JSON.stringify(this.$route.query || {})
        if (JSON.stringify(query) === current) return Promise.resolve()
        return this.$router.replace({ query }).catch(error => {
          if (!error || error.name !== 'NavigationDuplicated') throw error
        })
      },
      async loadList () {
        // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
        const reqId = (this._listReqId = (this._listReqId || 0) + 1)
        this.loading = true
        this.loadError = ''
        try {
          await this.syncListQuery()
          const response = await fetchPage(this.buildListParams())
          if (reqId !== this._listReqId) return
          const rows = listRows(response)
          this.rows = rows
          this.total = listTotal(response, rows)
        } catch (error) {
          if (reqId !== this._listReqId) return
          const fallback = errorMessageKey ? this.$t(errorMessageKey) : ''
          this.loadError = this.$getErrorMessage(error, fallback)
          this.rows = []
          this.total = 0
          if (this.$uiToast && this.loadError) {
            this.$uiToast.toast(this.loadError, {
              title: toastTitleKey ? this.$t(toastTitleKey) : undefined,
              variant: 'danger'
            })
          }
        } finally {
          if (reqId === this._listReqId) this.loading = false
        }
      },
      onSearch () {
        this.pagination.page = 1
        return this.loadList()
      },
      onReset () {
        this.filter = normalizedFilters(initialFilters)
        this.pagination.page = 1
        return this.loadList()
      },
      onPageChange (page) {
        this.pagination.page = positiveInteger(page, 1)
        return this.loadList()
      },
      onPageSizeChange (limit) {
        this.pagination.limit = positiveInteger(limit, pageSize)
        this.pagination.page = 1
        return this.loadList()
      }
    }
  }
}

export default createListPageMixin
