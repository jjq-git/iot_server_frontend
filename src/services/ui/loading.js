let activeCount = 0

export function show () {
  activeCount += 1
}

export function hide () {
  activeCount = Math.max(0, activeCount - 1)
}

export function isLoading () {
  return activeCount > 0
}

export default {
  show,
  hide,
  isLoading
}
