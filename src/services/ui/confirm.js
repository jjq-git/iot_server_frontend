import Vue from 'vue'
import i18n from '@/locales'

const confirmVm = new Vue()
const okVariantMap = {
  warning: 'warning',
  danger: 'danger',
  info: 'primary',
  success: 'success'
}

export function confirm (messageOrOptions, modalOptions = {}) {
  const normalized = typeof messageOrOptions === 'object' && messageOrOptions !== null
    ? messageOrOptions
    : { ...modalOptions, message: messageOrOptions }
  let {
    message,
    title,
    confirmButtonText,
    cancelButtonText,
    type = 'warning',
    okTitle,
    cancelTitle,
    okVariant
  } = normalized
  confirmButtonText = confirmButtonText || okTitle
  cancelButtonText = cancelButtonText || cancelTitle
  type = okVariant || type
  if (title == null) title = i18n.t('common.tip')
  if (confirmButtonText == null) confirmButtonText = i18n.t('common.ok')
  if (cancelButtonText == null) cancelButtonText = i18n.t('common.cancel')
  const text = message == null ? '' : String(message)
  const msgBoxConfirm = confirmVm.$bvModal && confirmVm.$bvModal.msgBoxConfirm
  if (typeof msgBoxConfirm === 'function') {
    return msgBoxConfirm(text, {
      title,
      okTitle: confirmButtonText,
      cancelTitle: cancelButtonText,
      okVariant: okVariantMap[type] || 'warning',
      cancelVariant: 'secondary',
      centered: true,
      hideHeaderClose: false
    })
  }
  if (typeof window !== 'undefined' && window.confirm(text)) {
    return Promise.resolve(true)
  }
  return Promise.resolve(false)
}

export default confirm
