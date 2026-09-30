const INTEGER_TYPES = new Set([
  'INTEGER',
  'UNSIGNED8',
  'UNSIGNED16',
  'UNSIGNED32',
  'INTEGER8',
  'INTEGER16',
  'INTEGER32'
])

const NUMBER_TYPES = new Set([...INTEGER_TYPES, 'REAL', 'REAL32', 'REAL64', 'FLOAT', 'DOUBLE', 'NUMBER'])
const CONTROL_OUTPUT_INTERLOCKS = [
  {
    switchCodes: ['light_on', 'light_switch', 'light_enable'],
    outputCodes: ['brightness', 'light_brightness'],
    offValue: 0
  },
  {
    switchCodes: ['fan_on', 'fan_switch', 'fan_enable'],
    outputCodes: ['fan_speed', 'speed'],
    offValue: 0
  },
  {
    switchCodes: ['led_output', 'led_enable', 'led_on'],
    outputCodes: ['brightness_percent', 'led_brightness'],
    offValue: 0
  }
]

const isMissing = value => value === undefined || value === null || value === ''

function finiteLimit (value) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function validateControlFieldValue (field = {}, value) {
  const dataType = String(field.data_type || '').toUpperCase()
  if (!NUMBER_TYPES.has(dataType)) return { valid: true }

  const number = Number(value)
  if (!Number.isFinite(number)) return { valid: false, reason: 'not_number' }
  if (INTEGER_TYPES.has(dataType) && !Number.isInteger(number)) {
    return { valid: false, reason: 'not_integer' }
  }
  if (dataType.startsWith('UNSIGNED') && number < 0) {
    return { valid: false, reason: 'below_min', min: 0 }
  }

  const min = finiteLimit(field.min_val)
  const max = finiteLimit(field.max_val)
  if (min !== null && number < min) return { valid: false, reason: 'below_min', min, max }
  if (max !== null && number > max) return { valid: false, reason: 'above_max', min, max }
  return { valid: true, value: number }
}

export function normalizeControlFieldValue (field = {}, value) {
  const dataType = String(field.data_type || '').toUpperCase()
  let normalized = value

  if (isMissing(normalized)) {
    if (isMissing(field.default_val)) return null
    normalized = field.default_val
  }

  if (dataType === 'BOOLEAN') {
    return normalized === true || normalized === 1 || normalized === '1' || normalized === 'true'
  }
  if (NUMBER_TYPES.has(dataType)) {
    const number = Number(normalized)
    return Number.isFinite(number) ? number : null
  }
  return normalized
}

export function sliderDisplayValue (value, minimum = 0, maximum = 100) {
  const min = Number(minimum)
  const max = Number(maximum)
  const lower = Number.isFinite(min) ? min : 0
  const upper = Number.isFinite(max) ? Math.max(lower, max) : Math.max(lower, 100)
  if (isMissing(value)) return lower
  const number = Number(value)
  if (!Number.isFinite(number)) return lower
  return Math.min(upper, Math.max(lower, number))
}

export function applyControlSafetyInterlocks (fields = [], values = {}) {
  const next = { ...values }
  const fieldsByCode = new Map(fields
    .filter(field => field?.attr_code)
    .map(field => [String(field.attr_code).toLowerCase(), field.attr_code]))

  // Some compatibility switches are acknowledged independently from the
  // numeric output that actually energizes the hardware. Submit both sides of
  // each known pair so an off ACK cannot leave the output running.
  CONTROL_OUTPUT_INTERLOCKS.forEach(rule => {
    const switchCode = rule.switchCodes.map(code => fieldsByCode.get(code)).find(Boolean)
    const outputCode = rule.outputCodes.map(code => fieldsByCode.get(code)).find(Boolean)
    if (switchCode && outputCode && next[switchCode] === false) {
      next[outputCode] = rule.offValue
    }
  })

  return next
}

export function reconcileControlDisplayState (fields = [], values = {}) {
  const next = { ...values }
  const fieldsByCode = new Map(fields
    .filter(field => field?.attr_code)
    .map(field => [String(field.attr_code).toLowerCase(), field.attr_code]))
  const fanRule = CONTROL_OUTPUT_INTERLOCKS.find(rule => rule.switchCodes.includes('fan_on'))
  const switchCode = fanRule.switchCodes.map(code => fieldsByCode.get(code)).find(Boolean)
  const outputCode = fanRule.outputCodes.map(code => fieldsByCode.get(code)).find(Boolean)

  // A non-zero physical fan request is an active fan even when an older
  // firmware reports a stale/false compatibility switch. Showing it as on
  // gives the operator a real on -> off transition and therefore emits the
  // paired false + zero safety command.
  if (switchCode && outputCode && Number(next[outputCode]) > 0) {
    next[switchCode] = true
  }

  return next
}

export function isControlFieldInterlocked (field = {}, values = {}) {
  const fieldCode = String(field.attr_code || '').toLowerCase()
  const rule = CONTROL_OUTPUT_INTERLOCKS.find(item => item.outputCodes.includes(fieldCode))
  if (!rule) return false

  const valueKeysByCode = new Map(Object.keys(values).map(code => [code.toLowerCase(), code]))
  const switchCode = rule.switchCodes.map(code => valueKeysByCode.get(code)).find(Boolean)
  return Boolean(switchCode) && values[switchCode] === false
}

export function pendingControlKey (targetUuid, field) {
  return [targetUuid || '', field?.co_index || '', field?.co_sub_index || '0', field?.attr_code || ''].join(':')
}

export function shouldRollbackControlDraft ({ pending, shadow, draft }) {
  if (!pending || !shadow || !['failed', 'timeout'].includes(shadow.state)) return false
  if (shadow.command_id && pending.commandId && String(shadow.command_id) !== String(pending.commandId)) return false
  return JSON.stringify(draft) === JSON.stringify(pending.submittedValue)
}
