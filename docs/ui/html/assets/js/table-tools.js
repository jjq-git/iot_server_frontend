(function () {
  let initialized = false
  const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' })

  function cellValue (row, columnIndex, type) {
    const cell = row.cells[columnIndex]
    const value = cell?.dataset.sortValue || cell?.textContent.trim() || ''
    if (type === 'date') {
      const timestamp = Date.parse(value)
      return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
    }
    return value
  }

  function sortTable (button) {
    const heading = button.closest('th')
    const table = button.closest('[data-sortable-table]')
    const body = table?.tBodies[0]
    if (!heading || !table || !body) return

    const direction = heading.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending'
    const type = button.dataset.sortType || 'text'
    const columnIndex = heading.cellIndex
    const rows = [...body.rows]
    const fixedRows = rows.filter(row => row.hasAttribute('data-sort-ignore'))
    const sortableRows = rows
      .filter(row => !row.hasAttribute('data-sort-ignore'))
      .map((row, originalIndex) => ({ row, originalIndex }))

    sortableRows.sort((left, right) => {
      const leftValue = cellValue(left.row, columnIndex, type)
      const rightValue = cellValue(right.row, columnIndex, type)
      const comparison = type === 'date'
        ? leftValue - rightValue
        : collator.compare(leftValue, rightValue)
      return (direction === 'ascending' ? comparison : -comparison) || left.originalIndex - right.originalIndex
    })

    table.querySelectorAll('th[aria-sort]').forEach(cell => cell.setAttribute('aria-sort', 'none'))
    heading.setAttribute('aria-sort', direction)
    body.append(...sortableRows.map(item => item.row), ...fixedRows)
  }

  function init () {
    if (initialized) return
    initialized = true
    document.querySelectorAll('[data-sortable-table] .table-sort').forEach(button => {
      button.addEventListener('click', () => sortTable(button))
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
