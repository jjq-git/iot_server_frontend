(function () {
  const ICONS_URL = 'icons.svg'
  const permissionLabels = {
    admin: '管理员',
    data_entry: '数据录入',
    operator: '运营管理',
    viewer: '信息查看'
  }

  const icons = {
    data: ['speedometer2', 'fill'],
    customers: ['customer-company-users', 'mixed'],
    controllers: ['controller-system', 'line'],
    model: ['product-model', 'line'],
    host: ['controller-host', 'line'],
    node: ['controller-node', 'line'],
    pods: ['soundproof-pod', 'line pod'],
    binding: ['link-45deg', 'fill'],
    settings: ['gear', 'fill'],
    system: ['system-platform', 'line'],
    credential: ['key', 'fill'],
    diagnostics: ['controller-console', 'line'],
    ota: ['arrow-clockwise', 'line'],
    firmware: ['box-seam', 'fill'],
    langpack: ['envelope', 'fill'],
    od: ['json-validate', 'line'],
    file: ['box-seam', 'fill'],
    history: ['clock', 'fill'],
    key: ['key', 'fill'],
    mqtt: ['mqtt-broker', 'line'],
    production: ['box-seam', 'line']
  }

  // 菜单只按公司类型（平/静/中/终）区分，见 docs/ui/README.md「页面清单与访问权限」。首页(/) 走品牌 Logo、设置(/mycompany) 走品牌齿轮，均不在此列。
  const groups = {
    data: { id: 'data', label: '数据', icon: icons.data },
    client: { id: 'client', label: '客户', icon: icons.customers },
    controllers: {
      id: 'controllers', label: '控制器', icon: icons.controllers,
      children: [
        { id: 'devices-model', label: '型号', icon: icons.model },
        { id: 'hosts', label: '主机', icon: icons.host },
        { id: 'nodes', label: '节点', icon: icons.node }
      ]
    },
    pods: {
      id: 'pods', label: '静音仓', icon: icons.pods,
      children: [
        { id: 'pods-model', label: '型号', icon: icons.model },
        { id: 'pods-list', label: '列表', icon: icons.pods }
      ]
    },
    podsTenant: {
      id: 'pods', label: '静音仓', icon: icons.pods,
      children: [
        { id: 'pods-list', label: '列表', icon: icons.pods }
      ]
    },
    // 生产（数据录入核心）：平台注册设备、静音仓厂家注册静音仓；各自只见自己的注册页。
    production: {
      id: 'production', label: '生产', icon: icons.production,
      children: [
        { id: 'devices-credentials', label: '注册设备', icon: icons.credential }
      ]
    },
    productionTenant: {
      id: 'production', label: '生产', icon: icons.production,
      children: [
        { id: 'pods-binding', label: '注册静音仓', icon: icons.binding }
      ]
    },
    system: {
      id: 'system', label: '系统', icon: icons.system,
      children: [
        { id: 'debug-console', label: '调试控制台', icon: icons.diagnostics },
        { id: 'debug-od', label: 'OD 诊断', icon: icons.od },
        { id: 'debug-firmwares', label: '固件发布', icon: icons.firmware },
        { id: 'mqtt-server', label: 'MQTT 服务器', icon: icons.mqtt },
        { id: 'files', label: '文件', icon: icons.file },
        { id: 'history-audit', label: '审计日志', icon: icons.history },
        { id: 'api-keys', label: 'AI 服务密钥', icon: icons.key }
      ]
    }
  }

  const profiles = {
    platform: {
      name: '德恩基平台公司',
      shortName: '德恩基',
      active: 'data',
      menu: [groups.data, groups.client, groups.controllers, groups.pods, groups.production, groups.system]
    },
    manufacturer: {
      name: '静音仓厂家 A',
      shortName: '厂家 A',
      active: 'data',
      menu: [groups.data, groups.client, groups.controllers, groups.pods, groups.productionTenant]
    },
    business: {
      name: '业务公司 B',
      shortName: '公司 B',
      active: 'data',
      menu: [groups.data, groups.client, groups.pods]
    },
    enduser: {
      name: '最终客户 C',
      shortName: '客户 C',
      active: 'home',
      // 最终用户特殊：侧栏 = 首页(概览) + 我的静音仓；有多个型号则按型号分组，只有一个/无型号则平铺 pod。
      // 生产按该用户实际 pods 动态生成；下方为 Demo 示例(两个型号)。
      menu: [
        { id: 'home', label: '首页', icon: icons.data },
        {
          id: 'pod-model-pro', label: '会议仓 Pro', icon: icons.model,
          children: [
            { id: 'pod-a01', label: '会议仓 A01', icon: icons.pods },
            { id: 'pod-a02', label: '会议仓 A02', icon: icons.pods }
          ]
        },
        {
          id: 'pod-model-lite', label: '静音舱 Lite', icon: icons.model,
          children: [
            { id: 'pod-b01', label: '静音舱 B01', icon: icons.pods }
          ]
        }
      ]
    }
  }


  function iconMarkup ([name, variants]) {
    const classes = variants.split(' ').map(variant => `app-icon--${variant}`).join(' ')
    return `<svg class="app-icon ${classes}" aria-hidden="true"><use href="${ICONS_URL}#icon-${name}"></use></svg>`
  }

  function menuForRole (menu, roleId) {
    return menu.flatMap(item => {
      if (item.roles && !item.roles.includes(roleId)) return []
      if (!item.children) return [item]
      const children = menuForRole(item.children, roleId)
      return children.length ? [{ ...item, children }] : []
    })
  }

  function leafMarkup (item, active) {
    const isActive = item.id === active
    const activeAttributes = isActive ? ' is-active" aria-current="page' : ''
    const readonlyLabel = item.readonly ? ` aria-label="${item.label}，只读"` : ''
    const readonly = item.readonly ? '<span class="sidebar-readonly">只读</span>' : ''
    return `<a class="sidebar-subitem${activeAttributes}" href="#${item.id}"${readonlyLabel}>${iconMarkup(item.icon)}<span class="sidebar-item__label">${item.label}</span>${readonly}</a>`
  }

  function itemMarkup (item, active) {
    if (!item.children) {
      const isActive = item.id === active
      const activeAttributes = isActive ? ' is-active" aria-current="page' : ''
      return `<a class="sidebar-item${activeAttributes}" href="#${item.id}">${iconMarkup(item.icon)}<span class="sidebar-item__label">${item.label}</span></a>`
    }

    const isOpen = item.children.some(child => child.id === active)
    const openClass = isOpen ? ' is-open' : ''
    const activeClass = isOpen ? ' is-active' : ''
    return `
      <section class="sidebar-group${openClass}">
        <button class="sidebar-item sidebar-item--group${activeClass}" type="button" aria-expanded="${isOpen}" aria-controls="sidebar-${item.id}">
          ${iconMarkup(item.icon)}
          <span class="sidebar-item__label">${item.label}</span>
          <svg class="app-icon app-icon--chevron" aria-hidden="true"><use href="${ICONS_URL}#icon-chevron-down"></use></svg>
        </button>
        <div class="sidebar-submenu" id="sidebar-${item.id}">
          ${item.children.map(child => leafMarkup(child, active)).join('')}
        </div>
      </section>`
  }

  function requestedProfile () {
    const company = new URLSearchParams(window.location.search).get('company')
    return Object.prototype.hasOwnProperty.call(profiles, company) ? company : 'platform'
  }

  function requestedPermission () {
    const role = new URLSearchParams(window.location.search).get('role')
    if (role === 'platform_admin') return 'admin'
    return Object.prototype.hasOwnProperty.call(permissionLabels, role) ? role : 'admin'
  }

  function effectiveRole (profileId, permissionId) {
    return permissionId === 'admin' && profileId === 'platform' ? 'platform_admin' : permissionId
  }

  function render (profileId, permissionId) {
    const profile = profiles[profileId]
    const roleId = effectiveRole(profileId, permissionId)
    const menu = menuForRole(profile.menu, roleId)
    const active = document.body.dataset.sidebarActive || profile.active
    const nav = document.querySelector('[data-sidebar-nav]')
    const companyName = document.querySelector('[data-company-name]')
    const companySwitcher = document.querySelector('[data-company-view]')
    const roleSwitcher = document.querySelector('[data-user-role-view]')
    if (!nav || !companyName || !companySwitcher || !roleSwitcher) return

    document.body.dataset.companyProfile = profileId
    document.body.dataset.userRole = roleId
    document.body.dataset.userPermission = permissionId
    nav.innerHTML = menu.map(item => itemMarkup(item, active)).join('')
    companyName.textContent = profile.shortName || profile.name
    document.querySelectorAll('[data-current-company-name]').forEach(item => { item.textContent = profile.name })
    document.querySelectorAll('[data-current-user-role-label]').forEach(item => { item.textContent = permissionLabels[permissionId] })
    companySwitcher.value = profileId
    roleSwitcher.value = permissionId
    if (document.body.dataset.pageKind === 'company') document.title = `${profile.name} · IoT UI Demo`
    document.dispatchEvent(new CustomEvent('ui:company-profile-change', { detail: { profileId, permissionId, roleId } }))
    document.dispatchEvent(new CustomEvent('ui:user-role-change', { detail: { profileId, permissionId, roleId } }))
  }

  function init () {
    const nav = document.querySelector('[data-sidebar-nav]')
    const companySwitcher = document.querySelector('[data-company-view]')
    const roleSwitcher = document.querySelector('[data-user-role-view]')
    if (!nav || !companySwitcher || !roleSwitcher) return

    render(requestedProfile(), requestedPermission())

    nav.addEventListener('click', event => {
      const button = event.target.closest('.sidebar-item--group')
      if (button) {
        const group = button.closest('.sidebar-group')
        const willOpen = !group.classList.contains('is-open')
        group.classList.toggle('is-open', willOpen)
        button.setAttribute('aria-expanded', String(willOpen))
        return
      }

      const link = event.target.closest('.sidebar-item, .sidebar-subitem')
      if (!link) return
      nav.querySelectorAll('[aria-current="page"]').forEach(current => current.removeAttribute('aria-current'))
      nav.querySelectorAll('.is-active').forEach(current => current.classList.remove('is-active'))
      link.classList.add('is-active')
      link.setAttribute('aria-current', 'page')

      const parentGroup = link.closest('.sidebar-group')
      if (parentGroup) {
        parentGroup.classList.add('is-open')
        const parentButton = parentGroup.querySelector('.sidebar-item--group')
        parentButton.classList.add('is-active')
        parentButton.setAttribute('aria-expanded', 'true')
      }
    })

    companySwitcher.addEventListener('change', event => {
      const profileId = event.target.value
      const url = new URL(window.location.href)
      url.searchParams.set('company', profileId)
      url.hash = ''
      window.history.replaceState({}, '', url)
      render(profileId, requestedPermission())
    })

    roleSwitcher.addEventListener('change', event => {
      const permissionId = event.target.value
      const url = new URL(window.location.href)
      url.searchParams.set('role', permissionId)
      url.hash = ''
      window.history.replaceState({}, '', url)
      render(requestedProfile(), permissionId)
    })

    window.UiDemoSidebar = { renderCurrent: () => render(requestedProfile(), requestedPermission()) }
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
