const DEFAULT_PAGE_SIZE = 200
const DEFAULT_MAX_PAGES = 100

function pageItems (response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.data?.items)) return response.data.items
  return []
}

function pageTotal (response) {
  const value = response?.total ?? response?.data?.total
  if (value === undefined || value === null || value === '') return null
  const total = Number(value)
  return Number.isFinite(total) && total >= 0 ? total : null
}

export async function fetchAllPages (fetchPage, options = {}) {
  const pageSize = Number(options.pageSize) > 0 ? Math.floor(Number(options.pageSize)) : DEFAULT_PAGE_SIZE
  const maxPages = Number(options.maxPages) > 0 ? Math.floor(Number(options.maxPages)) : DEFAULT_MAX_PAGES
  const items = []

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetchPage({ page, page_size: pageSize })
    const currentItems = pageItems(response)
    const total = pageTotal(response)
    items.push(...currentItems)

    if (currentItems.length === 0) break
    if (total !== null && items.length >= total) break
    if (total === null && currentItems.length < pageSize) break
  }

  return items
}
