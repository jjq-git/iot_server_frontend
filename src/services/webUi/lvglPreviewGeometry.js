// LVGL 9.5 defaults used by the Designer runtime. Keep this module limited to
// geometry: the renderer's palette lives in the isolated preview stylesheet.
function finiteNumber (value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function rangePercent (props) {
  const minimum = finiteNumber(props.min_value, 0)
  const maximum = finiteNumber(props.max_value, 100)
  const value = finiteNumber(props.value, minimum)
  if (maximum <= minimum) return 0
  return Math.max(0, Math.min(100, (value - minimum) / (maximum - minimum) * 100))
}

function point (angle, radius) {
  const radians = angle * Math.PI / 180
  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)]
}

function arcPath (start, end, radius) {
  if (Math.abs(end - start) >= 360) {
    const [x1, y1] = point(start, radius)
    const [x2, y2] = point(start + 180, radius)
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x1} ${y1}`
  }
  const span = ((end - start) % 360 + 360) % 360
  if (span === 0) return ''
  const [x1, y1] = point(start, radius)
  const [x2, y2] = point(start + span, radius)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${span > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

function arcGeometry (props, partStyles = {}, dpi = 160) {
  // lv_arc_constructor: bg 135..45, indicator 135..270, VALUE_UNSET.
  const rotation = finiteNumber(props.rotation, 0)
  const backgroundStart = finiteNumber(props.bg_start_angle, 135)
  const backgroundEnd = finiteNumber(props.bg_end_angle, 45)
  const backgroundSpan = ((backgroundEnd - backgroundStart) % 360 + 360) % 360
  const indicatorStart = finiteNumber(props.start_angle, backgroundStart)
  let indicatorEnd = finiteNumber(props.end_angle, 270)
  if (props.value !== undefined && props.end_angle === undefined) {
    indicatorEnd = backgroundStart + backgroundSpan * rangePercent(props) / 100
  }
  const widgetSize = Math.max(1, Math.min(finiteNumber(props.width, 60), finiteNumber(props.height, 60)))
  const defaultArcPixels = Math.max(1, Math.round(finiteNumber(dpi, 160) * 15 / 160))
  const trackPixels = Math.max(1, finiteNumber(partStyles.main?.arc_width, defaultArcPixels))
  const indicatorPixels = Math.max(1, finiteNumber(partStyles.indicator?.arc_width, trackPixels))
  const trackWidth = Math.max(1, Math.min(35, trackPixels / widgetSize * 100))
  const indicatorWidth = Math.max(1, Math.min(35, indicatorPixels / widgetSize * 100))
  const radius = 50 - Math.max(trackWidth, indicatorWidth) / 2 - 5
  const knobPadding = Math.max(1, Math.round(finiteNumber(dpi, 160) * 6 / 160)) / widgetSize * 100
  return {
    background: arcPath(backgroundStart + rotation, backgroundStart + backgroundSpan + rotation, radius),
    indicator: arcPath(indicatorStart + rotation, indicatorEnd + rotation, radius),
    trackWidth,
    indicatorWidth,
    knob: point(indicatorEnd + rotation, radius),
    knobRadius: indicatorWidth / 2 + knobPadding
  }
}

module.exports = { rangePercent, arcGeometry }
