const CARTESIAN_SERIES_TYPES = new Set(['line', 'bar'])

export const normalizeChartAxisIndex = value => {
  const index = Number(value)
  return Number.isInteger(index) && index >= 0 ? index : 0
}

const asAxisList = axis => {
  if (Array.isArray(axis)) return axis
  return axis && typeof axis === 'object' ? [axis] : []
}

export const isChartOptionReady = option => {
  if (!option || typeof option !== 'object') return false

  const series = Array.isArray(option.series) ? option.series : []
  if (!series.length) return false

  const cartesianSeries = series.filter(item => CARTESIAN_SERIES_TYPES.has(item?.type))
  if (!cartesianSeries.length) return true

  const xAxes = asAxisList(option.xAxis)
  const yAxes = asAxisList(option.yAxis)
  return cartesianSeries.every(item => {
    const xAxisIndex = normalizeChartAxisIndex(item.xAxisIndex)
    const yAxisIndex = normalizeChartAxisIndex(item.yAxisIndex)
    return Boolean(xAxes[xAxisIndex] && yAxes[yAxisIndex])
  })
}
