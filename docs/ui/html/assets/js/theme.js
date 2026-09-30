(function () {
  const storageKey = 'iot-ui-demo-theme'

  function iconHref (name) {
    return `icons.svg#icon-${name}`
  }

  function applyTheme (theme, scope) {
    document.documentElement.dataset.theme = theme
    scope.querySelectorAll('[data-action="toggle-theme"]').forEach(button => {
      const use = button.querySelector('.theme-icon use')
      if (use) use.setAttribute('href', iconHref(theme === 'dark' ? 'sun' : 'moon'))
      const label = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'
      button.setAttribute('aria-label', label)
      button.setAttribute('title', label)
    })
  }

  function init (scope = document) {
    const savedTheme = window.localStorage.getItem(storageKey)
    const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    applyTheme(savedTheme || preferredTheme, scope)

    scope.querySelectorAll('[data-action="toggle-theme"]').forEach(button => {
      button.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
        window.localStorage.setItem(storageKey, nextTheme)
        applyTheme(nextTheme, scope)
      })
    })
  }

  window.UiDemoTheme = { init }
})()
