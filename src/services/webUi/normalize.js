const { validateWebUiDocument } = require('./validate')

class WebUiValidationError extends Error {
  constructor (issues) {
    super('WebUiDocumentV1 validation failed')
    this.name = 'WebUiValidationError'
    this.issues = issues
  }
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

function indexById (items) {
  return Object.fromEntries(items.map(item => [item.id, item]))
}

function normalizeWebUiDocument (raw) {
  const validation = validateWebUiDocument(raw)
  if (!validation.valid) throw new WebUiValidationError(validation.errors)

  const document = clone(raw)
  const project = document.uiProject
  const screens = project.screens.map(screen => ({
    ...screen,
    styleIndex: {
      ...indexById(project.styles),
      ...indexById(screen.styles)
    },
    constIndex: {
      ...Object.fromEntries(project.consts.map(item => [item.name, item])),
      ...Object.fromEntries(screen.consts.map(item => [item.name, item]))
    }
  }))
  const homeScreen = screens.find(screen => screen.isHome) || screens[0]

  return {
    kind: document.kind,
    schemaVersion: document.schemaVersion,
    source: document.source,
    displayProfile: document.displayProfile,
    screens,
    screenIndex: indexById(screens),
    homeScreenId: homeScreen.id,
    subjectIndex: indexById(project.subjects),
    initialSubjects: Object.fromEntries(project.subjects.map(subject => [subject.id, subject.initial])),
    tokenIndex: Object.fromEntries(project.themes.flatMap(theme => theme.tokens.map(token => [token.id, token.value]))),
    actionRegistry: document.actionRegistry,
    assetManifest: document.assetManifest
  }
}

function compareBinding (value, operation, reference) {
  if (operation === 'eq') return value === reference
  if (operation === 'not_eq') return value !== reference
  if (operation === 'gt') return value > reference
  if (operation === 'ge') return value >= reference
  if (operation === 'lt') return value < reference
  if (operation === 'le') return value <= reference
  return false
}

function resolveValue (value, ir, screen) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  if (Object.prototype.hasOwnProperty.call(value, '$token')) return ir.tokenIndex[value.$token]
  if (Object.prototype.hasOwnProperty.call(value, '$const')) return screen.constIndex[value.$const]?.value
  return undefined
}

function selectorMatches (selector, resolvedStates) {
  if (!selector || !Array.isArray(selector.states) || selector.states.length === 0) return true
  return selector.states.every(state => resolvedStates[state] === true)
}

function formatBindingValue (value, format) {
  if (!format) return value
  const stringValue = String(value)
  return String(format).replace(/%%|%[dfs]/g, token => token === '%%' ? '%' : stringValue)
}

function resolveWebUiNode (ir, screen, node, subjects, overrides = {}) {
  const props = {
    ...Object.fromEntries(Object.entries(node.props).map(([key, value]) => [key, resolveValue(value, ir, screen)])),
    ...(overrides.props || {})
  }
  const flags = { ...(node.flags || {}) }
  const states = { ...(node.states || {}), ...(overrides.states || {}) }

  node.bindings.forEach(binding => {
    const subjectValue = subjects[binding.subject]
    if (binding.kind === 'prop') props[binding.prop] = formatBindingValue(subjectValue, binding.fmt)
    else if (binding.kind === 'flag') flags[binding.flag] = compareBinding(subjectValue, binding.op, binding.refValue)
    else if (binding.kind === 'state') states[binding.state] = compareBinding(subjectValue, binding.op, binding.refValue)
  })

  const styleLayers = []
  const addStyleLayer = (selector, props) => {
    if (selectorMatches(selector, states)) {
      styleLayers.push({ part: selector?.part || 'main', props })
    }
  }
  node.styleRefs.forEach(reference => {
    const style = screen.styleIndex[reference.styleId]
    if (style) addStyleLayer(reference.selector, style.props)
  })
  node.bindings.forEach(binding => {
    if (binding.kind !== 'style' || subjects[binding.subject] !== binding.refValue) return
    const style = screen.styleIndex[binding.styleId]
    if (style) addStyleLayer(binding.selector, style.props)
  })
  node.styles.forEach(style => {
    addStyleLayer(style.selector, style.props)
  })
  const partStyles = {}
  styleLayers.forEach(layer => {
    const resolved = Object.fromEntries(Object.entries(layer.props)
      .map(([key, value]) => [key, resolveValue(value, ir, screen)]))
    partStyles[layer.part] = { ...(partStyles[layer.part] || {}), ...resolved }
  })
  const styles = partStyles.main || {}

  return { props, flags, states, styles, partStyles }
}

function safeDimension (value) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (/^-?\d+(?:\.\d+)?(?:px|%)?$/.test(trimmed)) return /(?:px|%)$/.test(trimmed) ? trimmed : `${trimmed}px`
  if (['auto', 'min-content', 'max-content', 'fit-content'].includes(trimmed)) return trimmed
  return undefined
}

function safeColor (value) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed
  if (/^(?:rgb|hsl)a?\([\d\s.,%+-]+\)$/i.test(trimmed)) return trimmed
  if (['transparent', 'currentColor'].includes(trimmed)) return trimmed
  return undefined
}

function opacityValue (value) {
  if (!Number.isFinite(Number(value))) return undefined
  const numeric = Number(value)
  return String(numeric > 1 ? Math.max(0, Math.min(255, numeric)) / 255 : Math.max(0, Math.min(1, numeric)))
}

function opacityNumber (value, fallback = 1) {
  const opacity = opacityValue(value)
  return opacity === undefined ? fallback : Number(opacity)
}

function colorWithOpacity (color, opacity) {
  const safe = safeColor(color)
  if (!safe) return undefined
  const alpha = opacityNumber(opacity)
  if (alpha >= 1) return safe
  const short = /^#([0-9a-f]{3}|[0-9a-f]{4})$/i.exec(safe)
  const long = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(safe)
  const hex = short
    ? short[1].slice(0, 3).split('').map(part => part + part).join('')
    : long?.[1].slice(0, 6)
  if (hex) {
    const red = parseInt(hex.slice(0, 2), 16)
    const green = parseInt(hex.slice(2, 4), 16)
    const blue = parseInt(hex.slice(4, 6), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }
  return `color-mix(in srgb, ${safe} ${alpha * 100}%, transparent)`
}

function safeAssetUrl (assetId, assetUrls) {
  if (typeof assetId !== 'string' || !Object.prototype.hasOwnProperty.call(assetUrls, assetId)) return undefined
  const url = assetUrls[assetId]
  return typeof url === 'string' && /^blob:/i.test(url) ? `url("${url}")` : undefined
}

function finiteNumber (value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function assignDimension (css, key, value) {
  const dimension = safeDimension(value)
  if (dimension !== undefined) css[key] = dimension
}

function applySpacing (css, source, prefix, cssPrefix) {
  const all = safeDimension(source[`${prefix}_all`])
  const horizontal = safeDimension(source[`${prefix}_hor`])
  const vertical = safeDimension(source[`${prefix}_ver`])
  if (all !== undefined) css[cssPrefix] = all
  if (horizontal !== undefined) {
    css[`${cssPrefix}Left`] = horizontal
    css[`${cssPrefix}Right`] = horizontal
  }
  if (vertical !== undefined) {
    css[`${cssPrefix}Top`] = vertical
    css[`${cssPrefix}Bottom`] = vertical
  }
  const sides = ['top', 'right', 'bottom', 'left']
  sides.forEach(side => {
    const value = safeDimension(source[`${prefix}_${side}`])
    if (value !== undefined) css[`${cssPrefix}${side[0].toUpperCase()}${side.slice(1)}`] = value
  })
}

function flexPlacement (value) {
  return ({
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    space_around: 'space-around',
    space_between: 'space-between',
    space_evenly: 'space-evenly',
    stretch: 'stretch'
  })[value]
}

function applyAlignment (css, source) {
  const x = safeDimension(source.x ?? 0)
  const y = safeDimension(source.y ?? 0)
  const align = source.align || 'top_left'
  const transforms = []
  if (align.includes('right')) {
    css.right = x === '0px' ? '0px' : `calc(0px - ${x})`
  } else if (align.includes('mid') || align === 'center') {
    css.left = x === '0px' ? '50%' : `calc(50% + ${x})`
    transforms.push('translateX(-50%)')
  } else {
    css.left = x
  }
  if (align.startsWith('bottom')) {
    css.bottom = y === '0px' ? '0px' : `calc(0px - ${y})`
  } else if (align.endsWith('_mid') || align === 'center') {
    css.top = y === '0px' ? '50%' : `calc(50% + ${y})`
    transforms.push('translateY(-50%)')
  } else {
    css.top = y
  }
  return transforms
}

function webUiStyleToCss (props, styles, assetUrls = {}) {
  const source = { ...styles, ...props }
  const css = {}
  const dimensions = {
    width: 'width',
    height: 'height',
    min_width: 'minWidth',
    min_height: 'minHeight',
    max_width: 'maxWidth',
    max_height: 'maxHeight',
    pad_row: 'rowGap',
    pad_column: 'columnGap',
    pad_gap: 'gap',
    border_width: 'borderWidth',
    radius: 'borderRadius',
    outline_width: 'outlineWidth',
    outline_pad: 'outlineOffset',
    text_letter_space: 'letterSpacing',
    text_line_space: 'lineHeight',
    translate_radial: '--web-ui-translate-radial'
  }
  Object.entries(dimensions).forEach(([key, cssKey]) => {
    assignDimension(css, cssKey, source[key])
  })
  applySpacing(css, source, 'pad', 'padding')
  applySpacing(css, source, 'margin', 'margin')
  const transforms = applyAlignment(css, source)

  const colors = {
    border_color: 'borderColor',
    outline_color: 'outlineColor',
    arc_color: 'color',
    line_color: 'color'
  }
  Object.entries(colors).forEach(([key, cssKey]) => {
    const value = safeColor(source[key])
    if (value !== undefined) css[cssKey] = value
  })

  const backgroundColor = colorWithOpacity(source.bg_color, source.bg_opa)
  const textColor = colorWithOpacity(source.text_color, source.text_opa)
  const borderColor = colorWithOpacity(source.border_color, source.border_opa)
  const outlineColor = colorWithOpacity(source.outline_color, source.outline_opa)
  if (backgroundColor) css.backgroundColor = backgroundColor
  if (textColor) css.color = textColor
  if (borderColor) css.borderColor = borderColor
  if (outlineColor) css.outlineColor = outlineColor

  const gradientColor = colorWithOpacity(source.bg_grad_color, source.bg_opa)
  if (backgroundColor && gradientColor && ['hor', 'ver'].includes(source.bg_grad_dir)) {
    const mainStop = Math.max(0, Math.min(100, (finiteNumber(source.bg_main_stop) ?? 0) / 2.55))
    const gradientStop = Math.max(0, Math.min(100, (finiteNumber(source.bg_grad_stop) ?? 255) / 2.55))
    const direction = source.bg_grad_dir === 'hor' ? 'to right' : 'to bottom'
    css.backgroundImage = `linear-gradient(${direction}, ${backgroundColor} ${mainStop}%, ${gradientColor} ${gradientStop}%)`
  }

  const opacity = opacityValue(source.opa)
  if (opacity !== undefined) css.opacity = opacity
  if (css.borderWidth !== undefined) {
    css.borderStyle = 'solid'
    if (source.border_side === 'none') css.borderWidth = '0px'
    else if (source.border_side && source.border_side !== 'full') {
      const width = css.borderWidth
      css.borderWidth = '0px'
      css[`border${source.border_side[0].toUpperCase()}${source.border_side.slice(1)}Width`] = width
    }
  }
  if (css.outlineWidth !== undefined) css.outlineStyle = 'solid'

  const shadowWidth = finiteNumber(source.shadow_width)
  if (shadowWidth !== undefined && shadowWidth > 0) {
    const shadowColor = colorWithOpacity(source.shadow_color || '#000000', source.shadow_opa)
    const offsetX = finiteNumber(source.shadow_offset_x) || 0
    const offsetY = finiteNumber(source.shadow_offset_y) || 0
    const spread = finiteNumber(source.shadow_spread) || 0
    css.boxShadow = `${offsetX}px ${offsetY}px ${shadowWidth}px ${spread}px ${shadowColor}`
  }
  if (source.flex_grow !== undefined && Number.isFinite(Number(source.flex_grow))) css.flexGrow = String(Number(source.flex_grow))
  if (source.text_align && ['left', 'center', 'right', 'justify'].includes(source.text_align)) css.textAlign = source.text_align
  if (source.text_decor === 'underline') css.textDecoration = 'underline'
  else if (source.text_decor === 'strikethrough') css.textDecoration = 'line-through'
  else if (source.text_decor === 'none') css.textDecoration = 'none'
  if (source.base_dir === 'ltr' || source.base_dir === 'rtl') css.direction = source.base_dir
  if (typeof source.text_font === 'string') {
    const fontSize = /^montserrat_(\d+)$/.exec(source.text_font)
    if (fontSize) {
      css.fontFamily = "Montserrat, Arial, 'Microsoft YaHei', sans-serif"
      css.fontSize = `${fontSize[1]}px`
    }
  }

  const flow = source.flex_flow
  if (source.layout === 'flex' || typeof flow === 'string') {
    const normalizedFlow = typeof flow === 'string' ? flow : 'row'
    css.display = 'flex'
    css.flexDirection = normalizedFlow.includes('column') ? 'column' : 'row'
    css.flexWrap = normalizedFlow.includes('wrap') ? 'wrap' : 'nowrap'
    if (normalizedFlow.includes('reverse')) css.flexDirection += '-reverse'
    const mainPlacement = flexPlacement(source.flex_main_place)
    const crossPlacement = flexPlacement(source.flex_cross_place)
    const trackPlacement = flexPlacement(source.flex_track_place)
    if (mainPlacement) css.justifyContent = mainPlacement
    if (crossPlacement) css.alignItems = crossPlacement
    if (trackPlacement) css.alignContent = trackPlacement
  } else if (source.layout === 'grid') {
    css.display = 'grid'
    const columnPlacement = flexPlacement(source.grid_column_align)
    const rowPlacement = flexPlacement(source.grid_row_align)
    if (columnPlacement) css.justifyContent = columnPlacement
    if (rowPlacement) css.alignContent = rowPlacement
  }

  const gridColumn = finiteNumber(source.grid_cell_column_pos)
  const gridRow = finiteNumber(source.grid_cell_row_pos)
  const gridColumnSpan = finiteNumber(source.grid_cell_column_span)
  const gridRowSpan = finiteNumber(source.grid_cell_row_span)
  if (gridColumn !== undefined) css.gridColumn = `${gridColumn + 1} / span ${Math.max(1, gridColumnSpan || 1)}`
  if (gridRow !== undefined) css.gridRow = `${gridRow + 1} / span ${Math.max(1, gridRowSpan || 1)}`
  if (flexPlacement(source.grid_cell_x_align)) css.justifySelf = flexPlacement(source.grid_cell_x_align)
  if (flexPlacement(source.grid_cell_y_align)) css.alignSelf = flexPlacement(source.grid_cell_y_align)

  const translateX = finiteNumber(source.translate_x)
  const translateY = finiteNumber(source.translate_y)
  if (translateX !== undefined || translateY !== undefined) transforms.push(`translate(${translateX || 0}px, ${translateY || 0}px)`)
  const scaleX = finiteNumber(source.transform_scale_x)
  const scaleY = finiteNumber(source.transform_scale_y)
  if (scaleX !== undefined || scaleY !== undefined) transforms.push(`scale(${(scaleX ?? 256) / 256}, ${(scaleY ?? 256) / 256})`)
  const rotation = finiteNumber(source.transform_rotation)
  if (rotation !== undefined) transforms.push(`rotate(${rotation / 10}deg)`)
  const skewX = finiteNumber(source.transform_skew_x)
  const skewY = finiteNumber(source.transform_skew_y)
  if (skewX !== undefined || skewY !== undefined) transforms.push(`skew(${(skewX || 0) / 10}deg, ${(skewY || 0) / 10}deg)`)
  if (transforms.length) css.transform = transforms.join(' ')
  const pivotX = safeDimension(source.transform_pivot_x)
  const pivotY = safeDimension(source.transform_pivot_y)
  if (pivotX !== undefined || pivotY !== undefined) css.transformOrigin = `${pivotX || '50%'} ${pivotY || '50%'}`

  const backgroundImage = safeAssetUrl(source.bg_image_src, assetUrls)
  if (backgroundImage) {
    css.backgroundImage = css.backgroundImage ? `${backgroundImage}, ${css.backgroundImage}` : backgroundImage
    css.backgroundPosition = 'center'
    css.backgroundRepeat = source.bg_image_tiled === true ? 'repeat' : 'no-repeat'
  }
  return css
}

module.exports = {
  WebUiValidationError,
  compareBinding,
  normalizeWebUiDocument,
  resolveWebUiNode,
  webUiStyleToCss
}
