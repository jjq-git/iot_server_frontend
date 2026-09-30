import { fetchCompanies, fetchPodModels } from '@/api/podModels'

const defaultQuery = () => ({
  page: 1,
  page_size: 10,
  company_id: '',
  search: '',
  is_active: ''
})

export default {
  data () {
    return {
      loading: false,
      loadError: '',
      total: 0,
      tableData: [],
      companyOptions: [],
      query: defaultQuery(),
      tableImageUrls: {},
      tableImageErrors: {}
    }
  },
  methods: {
    async fetchData () {
      // 请求序号防竞态：快速切筛选/翻页时旧响应不得覆盖新响应
      const reqId = (this._listReqId = (this._listReqId || 0) + 1)
      this.loading = true
      this.loadError = ''
      try {
        const params = {
          page: this.query.page,
          page_size: this.query.page_size
        }
        if (this.query.company_id) params.company_id = this.query.company_id
        if (this.query.search) params.search = this.query.search
        if (this.query.is_active !== '') params.is_active = this.query.is_active

        const response = await fetchPodModels(params)
        if (reqId !== this._listReqId) return
        let items = []
        if (response.data?.list) {
          items = response.data.list
        } else if (Array.isArray(response.data)) {
          items = response.data
        } else if (response.items) {
          items = response.items
        } else if (Array.isArray(response)) {
          items = response
        }
        this.tableData = items
        this.total = response.data?.total || response.total || items.length

        this.tableImageUrls = {}
        this.tableImageErrors = {}
        for (const item of items) {
          if (item.avatar) {
            const imageUrl = this.normalizeImageUrl(item.avatar)
            const resolved = await this.fetchAuthenticatedImage(imageUrl)
            if (reqId !== this._listReqId) return
            this.tableImageUrls[item.id] = resolved
          }
        }
      } catch (error) {
        if (reqId !== this._listReqId) return
        const message = this.$getErrorMessage(error) || ''
        this.loadError = message || this.$t('pod_models.toast.load_failed')
        this.$uiToast.error(this.$t('pod_models.toast.load_failed') + message)
      } finally {
        if (reqId === this._listReqId) this.loading = false
      }
    },
    async loadOptions () {
      try {
        const response = await fetchCompanies({ page: 1, page_size: 200 })
        this.companyOptions = response.data?.list || response.items || response.data || []
      } catch (error) {
        this.$uiToast.error(this.$t('pod_models.toast.load_options_failed') + (this.$getErrorMessage(error) || ''))
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
