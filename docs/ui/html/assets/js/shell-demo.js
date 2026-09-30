(function () {
  let initialized = false
  let toastTimer

  function configurePageIdentity (view) {
    const title = document.querySelector('[data-page-title-target]')
    const icon = document.querySelector('[data-page-icon-target]')
    const breadcrumb = document.querySelector('[data-page-breadcrumb]')

    if (title && view.dataset.pageTitle) {
      title.textContent = view.dataset.pageTitle
      if (view.dataset.pageTitleSource === 'company') title.setAttribute('data-current-company-name', '')
      else title.removeAttribute('data-current-company-name')
    }
    if (icon && view.dataset.pageIcon) {
      icon.setAttribute('href', `icons.svg#icon-${view.dataset.pageIcon}`)
      const iconSvg = icon.closest('svg')
      if (iconSvg) {
        iconSvg.classList.remove('app-icon--fill', 'app-icon--line', 'app-icon--mixed', 'app-icon--pod')
        iconSvg.classList.add(`app-icon--${view.dataset.pageIconStyle || 'line'}`)
      }
    }
    if (!breadcrumb) return

    breadcrumb.replaceChildren()
    const home = document.createElement('a')
    home.href = 'index.html'
    home.textContent = '首页'
    breadcrumb.append(home)

    if (view.dataset.pageParent) {
      const separator = document.createElement('span')
      separator.setAttribute('aria-hidden', 'true')
      separator.textContent = '/'
      const parent = document.createElement('a')
      parent.href = view.dataset.pageParentHref || '#'
      parent.textContent = view.dataset.pageParent
      breadcrumb.append(separator, parent)
    }
  }

  function init () {
    if (initialized) return
    initialized = true

    const body = document.body
    const toast = document.querySelector('.toast')
    const userMenuRoot = document.querySelector('[data-user-menu-root]')
    const userMenuTrigger = document.querySelector('[data-action="toggle-user-menu"]')
    const userMenu = document.querySelector('#topbar-user-menu')

    window.UiDemoTheme.init()
    function showToast (message) {
      if (!toast) return
      window.clearTimeout(toastTimer)
      toast.textContent = message
      toast.classList.add('is-visible')
      toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200)
    }

    function setUserMenuOpen (open) {
      if (!userMenu || !userMenuTrigger) return
      userMenu.hidden = !open
      userMenuTrigger.setAttribute('aria-expanded', String(open))
    }

    function requestedView () {
      const requested = new URLSearchParams(window.location.search).get('view')
      const available = [...document.querySelectorAll('[data-page-view]')].map(view => view.dataset.pageView)
      const hashView = window.location.hash.slice(1)
      if (available.includes(requested)) return requested
      if (available.includes(hashView)) return hashView
      return 'hosts'
    }

    function setPageView (viewId, updateHistory = false) {
      const views = [...document.querySelectorAll('[data-page-view]')]
      const selected = views.find(view => view.dataset.pageView === viewId) || views[0]
      if (!selected) return

      views.forEach(view => { view.hidden = view !== selected })
      body.dataset.pageKind = selected.dataset.pageView
      if (selected.dataset.pageView === 'company') body.dataset.sidebarActive = 'company-settings'
      else if (selected.dataset.pageView === 'personal') body.dataset.sidebarActive = 'personal-profile'
      else body.dataset.sidebarActive = selected.dataset.pageView
      configurePageIdentity(selected)
      window.UiDemoSidebar?.renderCurrent()
      const currentTitle = document.querySelector('[data-page-title-target]')?.textContent || selected.dataset.pageTitle
      document.title = `${currentTitle} · IoT UI Demo`

      if (updateHistory) {
        const url = new URL(window.location.href)
        if (selected.dataset.pageView !== 'hosts') url.searchParams.set('view', selected.dataset.pageView)
        else url.searchParams.delete('view')
        url.hash = ''
        if (selected.dataset.pageView !== 'company') url.searchParams.delete('section')
        window.history.pushState({ view: selected.dataset.pageView }, '', url)
      }
    }

    window.UiDemoShell = { showToast, setPageView }
    setPageView(requestedView())

    document.querySelector('[data-action="open-sidebar"]')?.addEventListener('click', () => body.classList.add('is-sidebar-open'))
    document.querySelector('[data-action="close-sidebar"]')?.addEventListener('click', () => body.classList.remove('is-sidebar-open'))
    document.querySelectorAll('[data-action="open-company-settings"]').forEach(button => {
      button.addEventListener('click', () => {
        body.classList.remove('is-sidebar-open')
        setUserMenuOpen(false)
        if (body.dataset.pageKind === 'company') {
          showToast('当前已在“我的公司”页面')
          return
        }
        setPageView('company', true)
      })
    })

    userMenuTrigger?.addEventListener('click', () => setUserMenuOpen(userMenu.hidden))
    userMenu?.addEventListener('click', event => {
      const command = event.target.closest('[data-user-command]')?.dataset.userCommand
      if (!command) return
      setUserMenuOpen(false)
      if (command === 'logout') showToast('Demo：退出登录')
      else setPageView('personal', true)
    })
    document.addEventListener('click', event => {
      if (userMenuRoot && !userMenuRoot.contains(event.target)) setUserMenuOpen(false)
    })
    document.querySelector('[data-sidebar-nav]')?.addEventListener('click', event => {
      const link = event.target.closest('a')
      if (!link) return
      body.classList.remove('is-sidebar-open')
      const viewId = link.getAttribute('href')?.replace(/^#/, '')
      if (document.querySelector(`[data-page-view="${viewId}"]`)) {
        event.preventDefault()
        setPageView(viewId, true)
      }
    })
    window.addEventListener('popstate', () => setPageView(requestedView()))
    window.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return
      body.classList.remove('is-sidebar-open')
      setUserMenuOpen(false)
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
