import spriteUrl from '@/assets/icons/icons.svg'

const STATE_KEY = '__editableTriggerState__'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

function createEditIcon () {
  const icon = document.createElementNS(SVG_NAMESPACE, 'svg')
  const use = document.createElementNS(SVG_NAMESPACE, 'use')
  const href = `${spriteUrl}#icon-pencil`

  icon.classList.add('editable-trigger__icon')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('focusable', 'false')
  use.setAttribute('href', href)
  use.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', href)
  icon.appendChild(use)
  return icon
}

function updateElement (el, binding) {
  const state = el[STATE_KEY]
  if (!state) return

  state.value = binding.value || {}
  const disabled = Boolean(state.value.disabled)
  const label = state.value.label || ''

  el.classList.toggle('editable-trigger', !disabled)
  state.icon.hidden = disabled
  if (disabled) {
    el.removeAttribute('role')
    el.removeAttribute('tabindex')
    el.removeAttribute('title')
    el.removeAttribute('aria-label')
    el.setAttribute('aria-disabled', 'true')
    return
  }

  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.removeAttribute('aria-disabled')
  if (label) {
    el.setAttribute('title', label)
    el.setAttribute('aria-label', label)
  } else {
    el.removeAttribute('title')
    el.removeAttribute('aria-label')
  }
}

function activate (el, event) {
  const value = el[STATE_KEY]?.value
  if (!value || value.disabled || typeof value.activate !== 'function') return
  if (event.type === 'keydown') {
    if (!['Enter', ' '].includes(event.key)) return
    event.preventDefault()
  }
  value.activate()
}

export default {
  inserted (el, binding) {
    const click = event => activate(el, event)
    const keydown = event => activate(el, event)
    const icon = createEditIcon()
    el.appendChild(icon)
    el[STATE_KEY] = { value: binding.value || {}, click, keydown, icon }
    el.addEventListener('click', click)
    el.addEventListener('keydown', keydown)
    updateElement(el, binding)
  },
  update: updateElement,
  unbind (el) {
    const state = el[STATE_KEY]
    if (!state) return
    el.removeEventListener('click', state.click)
    el.removeEventListener('keydown', state.keydown)
    state.icon.remove()
    delete el[STATE_KEY]
  }
}
