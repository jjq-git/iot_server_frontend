import { fetchHnModelHardwareLines } from '@/api'

const defaultQuery = () => ({
  page: 1,
  page_size: 10,
  search: '',
  is_host: null,
  status: ''
})

export default {
  data () {
    return {
      loading: false,
      loadError: '',
      total: 0,
      tableData: [],
      query: defaultQuery()
    }
  },
  watch: {
    'query.page_size' () {
      this.query.page = 1
      this.fetchData()
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

        if (this.query.search) params.keyword = this.query.search
        if (this.query.is_host !== null && this.query.is_host !== undefined && this.query.is_host !== '') {
          params.is_host = this.query.is_host
        }
        if (this.query.status) params.status = this.query.status

        const response = await fetchHnModelHardwareLines(params)
        if (reqId !== this._listReqId) return
        const items = response.items || response.data || response

        this.tableData = items
        this.total = response.total || items.length
      } catch (error) {
        if (reqId !== this._listReqId) return
        const message = this.$getErrorMessage(error) || this.$t('hn_models.toast.list_load_failed')
        this.loadError = message
        this.$uiToast.error(message)
      } finally {
        if (reqId === this._listReqId) this.loading = false
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
