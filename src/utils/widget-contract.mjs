export const WIDGET_TYPES = Object.freeze([
  'readout',
  'button',
  'switch',
  'badge',
  'gauge',
  'slider',
  'stepper',
  'color_picker',
  'channel_switch',
  'dropdown',
  'progress_bar',
  'chart',
  'text'
])

export function normalizeWidgetType (value) {
  const normalized = String(value || '').toLowerCase()
  return WIDGET_TYPES.includes(normalized) ? normalized : 'readout'
}

function legacyWidgetType (field) {
  const explicit = String(field?.widget || '').toLowerCase()
  if (WIDGET_TYPES.includes(explicit)) return explicit
  if (field?.options && (Array.isArray(field.options) || Array.isArray(field.options.enum))) return 'dropdown'
  if (field?.data_type === 'BOOLEAN') return 'switch'
  const numeric = ['UNSIGNED8', 'UNSIGNED16', 'UNSIGNED32', 'INTEGER8', 'INTEGER16', 'INTEGER32', 'REAL32'].includes(field?.data_type)
  if (numeric && field?.min_val != null && field?.max_val != null) return 'slider'
  return field?.access_type === 'RW' ? 'text' : 'readout'
}

export function widgetsForModule (module) {
  if (Array.isArray(module?.widgets) && module.widgets.length) {
    return module.widgets.map(widget => ({
      ...widget,
      widget: normalizeWidgetType(widget.widget),
      fields: Array.isArray(widget.fields) ? widget.fields : []
    }))
  }
  return (module?.fields || []).map(field => ({
    id: field.widget_id || field.attr_code,
    widget: legacyWidgetType(field),
    label: field.widget_label || field.attr_name,
    code: field.widget_code,
    object_type: field.object_type || 'VAR',
    idx: field.co_index,
    sidx: Number.parseInt(field.co_sub_index || '0', 16) || 0,
    unit: field.unit,
    operations: field.operations || (field.access_type === 'RW' ? ['get', 'set'] : ['get']),
    options: field.options || {},
    time_windows: field.time_windows || [],
    fields: [field]
  }))
}

export function fieldForRole (widget, role) {
  return (widget?.fields || []).find(field => field.widget_role === role)
}

export function optionList (options) {
  if (Array.isArray(options)) return options
  if (!options || typeof options !== 'object') return []
  if (Array.isArray(options.enum)) return options.enum
  return Object.entries(options).map(([value, text]) => ({ value, text }))
}
