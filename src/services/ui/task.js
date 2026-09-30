import loading from './loading'
import toast from './toast'
import { getErrorMessage } from '@/services/error'

export async function runUiTask (task, {
  successMessage = '',
  errorMessage = '',
  notifySuccess = true,
  notifyError = true,
  successOptions = {},
  errorOptions = {},
  setPending = null,
  onSuccess = null,
  onError = null,
  onFinally = null,
  showGlobalLoading = true,
  rethrow = false
} = {}) {
  if (typeof setPending === 'function') setPending(true)
  if (showGlobalLoading) loading.show()
  try {
    const result = await task()
    if (notifySuccess && successMessage) toast.success(successMessage, successOptions)
    if (typeof onSuccess === 'function') await onSuccess(result)
    return result
  } catch (error) {
    const message = getErrorMessage(error, errorMessage)
    if (notifyError && message) toast.error(message, errorOptions)
    if (typeof onError === 'function') await onError(error, message)
    if (rethrow) throw error
    return undefined
  } finally {
    if (typeof setPending === 'function') setPending(false)
    if (showGlobalLoading) loading.hide()
    if (typeof onFinally === 'function') await onFinally()
  }
}

export default runUiTask
