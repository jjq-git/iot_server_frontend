function resolveTextControl (target) {
  const element = target && target.$el ? target.$el : target
  if (!element || typeof element.select !== 'function') return null
  return element
}

function fallbackCopyText (text, target) {
  if (typeof document === 'undefined' || !document.body) {
    throw new Error('Clipboard is unavailable')
  }

  const activeElement = document.activeElement
  const selection = typeof window !== 'undefined' && window.getSelection
    ? window.getSelection()
    : null
  const previousRange = selection && selection.rangeCount > 0
    ? selection.getRangeAt(0).cloneRange()
    : null
  let textControl = resolveTextControl(target)
  let temporaryControl = null

  if (!textControl) {
    temporaryControl = document.createElement('textarea')
    temporaryControl.value = text
    temporaryControl.setAttribute('readonly', '')
    temporaryControl.style.position = 'fixed'
    temporaryControl.style.top = '0'
    temporaryControl.style.left = '-9999px'
    temporaryControl.style.opacity = '0'
    document.body.appendChild(temporaryControl)
    textControl = temporaryControl
  }

  textControl.focus()
  textControl.select()
  if (typeof textControl.setSelectionRange === 'function') {
    textControl.setSelectionRange(0, String(textControl.value || '').length)
  }

  let commandAccepted = false
  let copyEventHandled = false
  const handleCopy = (event) => {
    if (!event.clipboardData) return
    event.clipboardData.setData('text/plain', text)
    event.preventDefault()
    copyEventHandled = true
  }

  document.addEventListener('copy', handleCopy)
  try {
    commandAccepted = Boolean(document.execCommand && document.execCommand('copy'))
  } finally {
    document.removeEventListener('copy', handleCopy)
    if (temporaryControl && temporaryControl.parentNode) {
      temporaryControl.parentNode.removeChild(temporaryControl)
    }
    if (selection) {
      selection.removeAllRanges()
      if (previousRange) selection.addRange(previousRange)
    }
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus()
    }
  }

  // execCommand() 的 true 仅代表命令被接受；必须确认 copy 事件实际写入了 payload，
  // 避免 LAN HTTP 等受限环境中出现“提示成功但剪贴板没内容”的假成功。
  if (!commandAccepted || !copyEventHandled) {
    throw new Error('Copy command was rejected')
  }

  return 'exec-command'
}

export async function copyText (value, { target = null } = {}) {
  const text = String(value ?? '')
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null

  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text)
      return 'clipboard-api'
    } catch (error) {
      // HTTP、权限策略或用户拒绝时继续使用兼容方案。
    }
  }

  return fallbackCopyText(text, target)
}
