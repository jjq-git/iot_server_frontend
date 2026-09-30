(function () {
  // 客户（下级公司）页 Demo 交互：筛选、查看/新建/编辑弹窗、业务角色互斥、停用二次确认。
  // 静态数据，不提交服务器；生产走 companies 接口（见 client-list.tpl 的 Handoff）。
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true

    const showToast = message => window.UiDemoShell?.showToast(message)
    const createDialog = document.querySelector('#create-client-dialog')
    const editDialog = document.querySelector('#edit-client-dialog')
    const viewDialog = document.querySelector('#view-client-dialog')
    const editAdminDialog = document.querySelector('#edit-client-admin-dialog')
    const tbody = document.querySelector('[data-client-row]')?.closest('tbody')
    if (!tbody) return

    let current = null
    let currentAdmins = []
    const parseAdmins = ds => (ds?.admins || '').split(';').map(s => s.trim()).filter(Boolean).map(s => { const [name, email] = s.split('|'); return { name: name || '', email: email || '' } })

    // —— 客户类型多选下拉：互斥（最终用户 vs 其他）+ 选中摘要 + 开合 ——
    const ROLE_LABELS = { manufacturer: '静音仓厂家', brand: '品牌方', channel: '分销', enduser: '最终用户' }
    function updateRoleSummary (scope) {
      const picked = [...scope.querySelectorAll('input[type="checkbox"]:checked')].map(c => ROLE_LABELS[c.value] || c.value)
      const summary = scope.querySelector('[data-multi-select-summary]')
      const note = scope.closest('.form-field')?.querySelector('[data-client-roles-note]')
      if (summary) summary.textContent = picked.length ? picked.join('、') : '请选择'
      if (note) note.textContent = picked.length ? `已选择：${picked.join('、')}` : '已选择：—'
    }
    document.querySelectorAll('[data-client-roles]').forEach(scope => {
      const enduser = scope.querySelector('[data-role-enduser]')
      const upstream = [...scope.querySelectorAll('[data-role-upstream]')]
      enduser?.addEventListener('change', () => { if (enduser.checked) upstream.forEach(c => { c.checked = false }); updateRoleSummary(scope) })
      upstream.forEach(c => c.addEventListener('change', () => { if (c.checked && enduser) enduser.checked = false; updateRoleSummary(scope) }))
      const trigger = scope.querySelector('[data-multi-select-trigger]')
      const panel = scope.querySelector('.multi-select__panel')
      trigger?.addEventListener('click', () => {
        const open = panel.hidden
        panel.hidden = !open
        trigger.setAttribute('aria-expanded', String(open))
      })
      updateRoleSummary(scope)
    })
    document.addEventListener('click', event => {
      document.querySelectorAll('.multi-select').forEach(ms => {
        if (ms.contains(event.target)) return
        const panel = ms.querySelector('.multi-select__panel')
        if (panel && !panel.hidden) { panel.hidden = true; ms.querySelector('[data-multi-select-trigger]')?.setAttribute('aria-expanded', 'false') }
      })
    })

    // —— 客户类型选项按当前公司类型限定：平台=全部；厂家/渠道=渠道 分销 + 最终用户 ——
    const ROLE_BY_PROFILE = {
      platform: ['manufacturer', 'brand', 'channel', 'enduser'],
      manufacturer: ['channel', 'enduser'],
      business: ['channel', 'enduser']
    }
    function filterRoleOptions (scope) {
      const allowed = ROLE_BY_PROFILE[document.body.dataset.companyProfile] || ROLE_BY_PROFILE.platform
      scope.querySelectorAll('[data-role-option]').forEach(opt => {
        const ok = allowed.includes(opt.dataset.roleOption)
        opt.hidden = !ok
        if (!ok) { const cb = opt.querySelector('input'); if (cb) cb.checked = false }
      })
      const rolesScope = scope.querySelector('[data-client-roles]')
      if (rolesScope) updateRoleSummary(rolesScope)
    }

    // —— 填充查看弹窗 ——
    function setStatus (el, isActive) {
      el.textContent = isActive ? '正常' : '停用'
      if (el.classList.contains('status')) {
        el.classList.toggle('status--online', isActive)
        el.classList.toggle('status--offline', !isActive)
      }
    }
    function fillView (ds) {
      const isActive = ds.status === 'active'
      viewDialog.querySelectorAll('[data-view-client-field]').forEach(el => {
        const key = el.dataset.viewClientField
        if (key === 'status') { setStatus(el, isActive); return }
        if (key === 'clientCount' || key === 'podModelCount' || key === 'podCount') { el.textContent = ds[key] || '0'; return }
        if (key === 'adminName') {
          const item = el.parentElement
          const addBtn = item?.querySelector('[data-action="add-client-admin"]')
          const editBtn = item?.querySelector('[data-action="edit-client-admin"]')
          const admins = parseAdmins(ds)
          const has = admins.length > 0
          el.textContent = has ? (admins.length > 1 ? `${admins[0].name} 等 ${admins.length} 人` : admins[0].name) : ''
          el.hidden = !has
          if (editBtn) editBtn.hidden = !has
          if (addBtn) addBtn.hidden = has
          return
        }
        el.textContent = ds[key] || '—'
      })
    }
    function fillEdit (ds) {
      editDialog.querySelector('[data-edit-client-field="code"]').textContent = ds.code || '—'
      editDialog.querySelectorAll('[data-edit-client-input]').forEach(el => {
        const key = el.dataset.editClientInput
        if (key === 'active') { el.checked = ds.status === 'active'; return }
        if (key === 'domainSubpath') { const m = (ds.domain || '').match(/pods\.dengtec\.com\/(.+)$/); el.value = m ? m[1] : ''; return }
        el.value = (ds[key] && ds[key] !== '—') ? ds[key] : ''
      })
      const rolesScope = editDialog.querySelector('[data-client-roles]')
      rolesScope?.querySelectorAll('input[type="checkbox"]').forEach(c => { c.checked = c.value === ds.role })
      if (rolesScope) updateRoleSummary(rolesScope)
    }

    function openView (ds) { current = ds; fillView(ds); viewDialog?.showModal() }
    function openEdit (ds) { current = ds; fillEdit(ds); filterRoleOptions(editDialog); editDialog?.showModal() }

    // —— 表格交互：点行看详情，操作列按钮各自处理 ——
    tbody.addEventListener('click', event => {
      const row = event.target.closest('[data-client-row]')
      if (!row) return
      const ds = row.dataset
      const actionButton = event.target.closest('[data-action]')
      if (actionButton) {
        const action = actionButton.dataset.action
        if (action === 'edit-client') openEdit(ds)
        else if (action === 'toggle-client-active') {
          const isActive = ds.status === 'active'
          const verb = isActive ? '停用' : '启用'
          if (window.confirm(`确认${verb}客户「${ds.shortName}」？${isActive ? '停用后该客户暂时不能登录。' : ''}`)) {
            showToast(`Demo：已${verb} ${ds.shortName}（未提交服务器）`)
          }
        }
        return
      }
      openView(ds)
    })

    // —— 新建 ——
    document.querySelector('[data-action="open-create-client-dialog"]')?.addEventListener('click', () => {
      filterRoleOptions(createDialog)
      createDialog?.showModal()
    })

    // —— 登录入口 subpath 可用性检查占位 ——
    document.querySelector('[data-action="check-domain"]')?.addEventListener('click', () => showToast('Demo：检查 subpath 是否可用（未接入）'))

    // —— 详情弹窗内：编辑 / 下钻 ——
    document.querySelector('[data-action="edit-client-from-view"]')?.addEventListener('click', () => {
      viewDialog?.close('cancel')
      if (current) openEdit(current)
    })
    // —— 管理员：一个公司可多个管理员，弹窗顶部 tab 切换；末尾「＋ 增加」新建 ——
    function fillAdminForm (admin) {
      const emailEl = editAdminDialog?.querySelector('[data-client-admin-input="email"]')
      const nameEl = editAdminDialog?.querySelector('[data-client-admin-input="name"]')
      if (!emailEl || !nameEl) return
      if (admin) { emailEl.value = admin.email; emailEl.readOnly = true; nameEl.value = admin.name } else { emailEl.value = ''; emailEl.readOnly = false; nameEl.value = '' }
    }
    function renderAdminTabs (activeIndex) {
      const bar = editAdminDialog?.querySelector('[data-admin-tabs]')
      if (!bar) return
      const tabs = currentAdmins.map((a, i) => `<button type="button" class="admin-tab${i === activeIndex ? ' is-active' : ''}" data-admin-index="${i}">${a.name}</button>`)
      tabs.push(`<button type="button" class="admin-tab admin-tab--add${activeIndex < 0 ? ' is-active' : ''}" data-admin-add aria-label="增加管理员" title="增加管理员"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-plus"></use></svg></button>`)
      bar.innerHTML = tabs.join('')
    }
    function openAdminEditor (addMode) {
      if (!current || !editAdminDialog) return
      currentAdmins = parseAdmins(current)
      const idx = (addMode || !currentAdmins.length) ? -1 : 0
      renderAdminTabs(idx)
      fillAdminForm(idx < 0 ? null : currentAdmins[idx])
      viewDialog?.close('cancel')
      editAdminDialog.showModal()
    }
    viewDialog?.querySelector('[data-action="edit-client-admin"]')?.addEventListener('click', () => openAdminEditor(false))
    viewDialog?.querySelector('[data-action="add-client-admin"]')?.addEventListener('click', () => openAdminEditor(true))
    editAdminDialog?.querySelector('[data-admin-tabs]')?.addEventListener('click', event => {
      const tab = event.target.closest('[data-admin-index]')
      const add = event.target.closest('[data-admin-add]')
      if (tab) { const i = Number(tab.dataset.adminIndex); renderAdminTabs(i); fillAdminForm(currentAdmins[i]) }
      else if (add) { renderAdminTabs(-1); fillAdminForm(null) }
    })
    document.querySelector('[data-edit-client-admin-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value === 'confirm') showToast('Demo：管理员改动尚未提交服务器')
    })

    // —— 地点选择占位 ——
    document.querySelectorAll('[data-action="pick-client-location"]').forEach(button => {
      button.addEventListener('click', () => showToast('Demo：从 locations 选择地点（未接入）'))
    })

    // —— 前往客户「人员」页占位（管理员账号在那里维护） ——
    document.querySelector('[data-action="manage-client-users"]')?.addEventListener('click', () => {
      editDialog?.close('cancel')
      showToast(`Demo：前往 ${current?.shortName || ''} 的人员页管理管理员`)
    })

    // —— 编辑管理员密码显隐 ——
    document.querySelectorAll('#edit-client-admin-dialog [data-password-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'))
        if (!input) return
        const reveal = input.type === 'password'
        input.type = reveal ? 'text' : 'password'
        button.setAttribute('aria-label', reveal ? '隐藏密码' : '显示密码')
        button.querySelector('use')?.setAttribute('href', reveal ? 'icons.svg#icon-eye-slash' : 'icons.svg#icon-eye')
      })
    })

    // —— 表单提交提示 ——
    document.querySelector('[data-create-client-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value === 'confirm') showToast('Demo：客户信息尚未提交服务器')
    })
    document.querySelector('[data-edit-client-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value === 'confirm') showToast('Demo：客户改动尚未提交服务器')
    })

    // —— 筛选 ——
    const search = document.querySelector('[data-client-search]')
    const roleFilter = document.querySelector('[data-client-role]')
    const statusFilter = document.querySelector('[data-client-status]')
    const emptyRow = document.querySelector('[data-client-empty]')
    const rows = [...document.querySelectorAll('[data-client-row]')]

    function applyFilter () {
      const keyword = (search?.value || '').trim().toLowerCase()
      const role = roleFilter?.value || ''
      const status = statusFilter?.value || ''
      let visible = 0
      rows.forEach(row => {
        const ds = row.dataset
        const match = (!keyword || ds.search.includes(keyword)) && (!role || ds.role === role) && (!status || ds.status === status)
        row.hidden = !match
        if (match) visible += 1
      })
      if (emptyRow) emptyRow.hidden = visible > 0
    }

    document.querySelector('[data-client-filter]')?.addEventListener('submit', event => event.preventDefault())
    search?.addEventListener('input', applyFilter)
    roleFilter?.addEventListener('change', applyFilter)
    statusFilter?.addEventListener('change', applyFilter)
    applyFilter() // 应用默认筛选（状态默认「正常」，初始只显示正常客户）
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
