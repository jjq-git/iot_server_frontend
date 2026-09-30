(function () {
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true

    const showToast = window.UiDemoShell?.showToast || (() => {})
    const form = document.querySelector('[data-company-form]')
    const logoInput = document.querySelector('[data-company-logo-input]')
    const logoButton = document.querySelector('[data-action="choose-company-logo"]')
    const logoPreview = document.querySelector('[data-company-logo-preview]')
    const logoPlaceholder = document.querySelector('[data-company-logo-placeholder]')
    const areaButtons = [...document.querySelectorAll('[data-company-area]')]
    const panels = [...document.querySelectorAll('[data-company-panel]')]
    const userFilter = document.querySelector('[data-company-user-filter]')
    const userSearch = document.querySelector('[data-company-user-search]')
    const userRole = document.querySelector('[data-company-user-role]')
    const userActive = document.querySelector('[data-company-user-active]')
    const userRows = [...document.querySelectorAll('[data-user-row]')]
    const userEmpty = document.querySelector('[data-company-users-empty]')
    const userCount = document.querySelector('[data-company-user-count]')
    const fileFilter = document.querySelector('[data-company-file-filter]')
    const fileSearch = document.querySelector('[data-company-file-search]')
    const fileType = document.querySelector('[data-company-file-type]')
    const fileRows = [...document.querySelectorAll('[data-company-file-row]')]
    const fileEmpty = document.querySelector('[data-company-files-empty]')
    const fileCount = document.querySelector('[data-company-file-count]')
    const companyFileInput = document.querySelector('[data-company-file-input]')
    const fileWriteActions = [...document.querySelectorAll('[data-file-write-action]')]
    const integrationSearch = document.querySelector('[data-company-integration-search]')
    const integrationStatus = document.querySelector('[data-company-integration-status]')
    const integrationRows = [...document.querySelectorAll('[data-company-integration-row]')]
    const integrationEmpty = document.querySelector('[data-company-integrations-empty]')
    const integrationCount = document.querySelector('[data-company-integration-count]')
    const activitySearch = document.querySelector('[data-company-activity-search]')
    const activityResult = document.querySelector('[data-company-activity-result]')
    const activityRows = [...document.querySelectorAll('[data-company-activity-row]')]
    const activityEmpty = document.querySelector('[data-company-activity-empty]')
    const activityCount = document.querySelector('[data-company-activity-count]')
    const permissionForm = document.querySelector('[data-permission-form]')
    const permissionRows = document.querySelector('[data-permission-rows]')
    const createUserDialog = document.querySelector('#create-company-user-dialog')
    const createUserForm = document.querySelector('[data-create-company-user-form]')
    const createUserRoleSelect = createUserForm?.elements.namedItem('role')
    const createUserPassword = createUserForm?.elements.namedItem('password')
    const createUserPasswordConfirmation = createUserForm?.elements.namedItem('password_confirmation')
    const createUserPasswordToggles = [...(createUserForm?.querySelectorAll('[data-password-toggle]') || [])]
    const viewUserDialog = document.querySelector('#view-company-user-dialog')
    const editUserDialog = document.querySelector('#edit-company-user-dialog')
    const editUserForm = document.querySelector('[data-edit-company-user-form]')
    const editUserRoleSelect = editUserForm?.elements.namedItem('role')
    const editUserPassword = editUserForm?.elements.namedItem('password')
    const editUserPasswordConfirmation = editUserForm?.elements.namedItem('password_confirmation')
    const editUserPasswordToggles = [...(editUserForm?.querySelectorAll('[data-password-toggle]') || [])]
    const personalProfile = document.querySelector('[data-page-view="personal"]')
    const personalProfileForm = document.querySelector('[data-personal-profile-form]')
    const personalAvatarInput = document.querySelector('[data-personal-avatar-input]')
    const personalAvatarButton = document.querySelector('[data-action="choose-personal-avatar"]')
    const personalAvatarImage = document.querySelector('[data-personal-profile-avatar-image]')
    const changePasswordDialog = document.querySelector('#change-personal-password-dialog')
    const changePasswordForm = document.querySelector('[data-change-personal-password-form]')
    const personalCurrentPassword = changePasswordForm?.elements.namedItem('old_password')
    const personalNewPassword = changePasswordForm?.elements.namedItem('new_password')
    const personalNewPasswordConfirmation = changePasswordForm?.elements.namedItem('password_confirmation')
    const changePasswordToggles = [...(changePasswordForm?.querySelectorAll('[data-password-toggle]') || [])]
    const companyFormControls = [...(form?.querySelectorAll('input, select, textarea') || [])]
    const companyFormActions = [...(form?.querySelectorAll('button') || [])]
    let logoPreviewUrl
    let personalAvatarPreviewUrl

    const permissionResources = [
      ['companies', '公司'],
      ['users', '用户'],
      ['hn_models', '设备型号'],
      ['hosts', '主机'],
      ['nodes', '节点'],
      ['unit_models', '静音仓型号'],
      ['units', '静音仓'],
      ['files', '文件资料'],
      ['records', '运行记录']
    ]
    const permissionRoles = [
      ['admin', '管理员', ['create', 'delete', 'update', 'read']],
      ['operator', '运营管理', ['create', 'update', 'read']],
      ['data_entry', '数据录入', ['create', 'update', 'read']],
      ['viewer', '数据查看', ['read']]
    ]
    const permissionOperations = [
      ['create', '增', 'plus'],
      ['delete', '删', 'trash'],
      ['update', '改', 'pencil'],
      ['read', '查', 'eye']
    ]

    if (permissionRows) {
      permissionResources.forEach(([resourceId, resourceLabel]) => {
        const row = document.createElement('tr')
        const heading = document.createElement('th')
        heading.scope = 'row'
        heading.textContent = resourceLabel
        row.append(heading)

        permissionRoles.forEach(([roleId, roleLabel, enabledOperations]) => {
          const cell = document.createElement('td')
          const operationGroup = document.createElement('span')
          operationGroup.className = 'permission-operation-group'
          operationGroup.setAttribute('aria-label', `${resourceLabel}·${roleLabel}`)
          permissionOperations.forEach(([operationId, operationLabel, operationIcon]) => {
            const label = document.createElement('label')
            const input = document.createElement('input')
            const control = document.createElement('span')
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            const iconUse = document.createElementNS('http://www.w3.org/2000/svg', 'use')
            input.type = 'checkbox'
            input.name = `${resourceId}_${roleId}_${operationId}`
            input.checked = enabledOperations.includes(operationId)
            input.disabled = roleId === 'admin'
            input.setAttribute('aria-label', `${roleLabel}${operationLabel}${resourceLabel}`)
            label.classList.toggle('is-disabled', input.disabled)
            label.title = input.disabled ? '管理员权限不可修改' : `${operationLabel}${resourceLabel}`
            icon.classList.add('app-icon', 'app-icon--line')
            icon.setAttribute('aria-hidden', 'true')
            iconUse.setAttribute('href', `icons.svg#icon-${operationIcon}`)
            icon.append(iconUse)
            control.className = 'permission-operation-control'
            control.append(icon)
            label.append(input, control)
            operationGroup.append(label)
          })
          cell.append(operationGroup)
          row.append(cell)
        })
        permissionRows.append(row)
      })
    }

    companyFormControls.forEach(control => {
      control.dataset.demoInitialDisabled = String(control.disabled)
      if ('readOnly' in control) control.dataset.demoInitialReadonly = String(control.readOnly)
    })

    const companyUserRecords = {
      wang: {
        id: '1021',
        uuid: 'f89d907c-a21a-49ba-885e-1764f2cf6512',
        displayName: '王工',
        email: 'wang.gong@dengtec.com',
        phone: '137 0000 6512',
        avatarLabel: '未设置',
        role: 'operator',
        isActive: true,
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        assignedScopeLabel: '—',
        lastLogin: '2026-09-01 16:20',
        lastLoginIp: '192.168.1.64',
        mustChangePassword: false,
        passwordChangedAt: '2026-02-18 09:42',
        createdAt: '2026-01-12 10:18',
        updatedAt: '2026-09-01 16:20'
      },
      liu: {
        id: '1022',
        uuid: 'b2e45367-093f-4814-bb13-2a4b2b468240',
        displayName: '刘敏',
        email: 'liu.min@dengtec.com',
        phone: '136 0000 8240',
        avatarLabel: '未设置',
        role: 'data_entry',
        isActive: true,
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        assignedScopeLabel: '—',
        lastLogin: '2026-08-30 09:12',
        lastLoginIp: '192.168.1.82',
        mustChangePassword: false,
        passwordChangedAt: '2026-03-06 14:35',
        createdAt: '2026-03-05 11:06',
        updatedAt: '2026-08-30 09:12'
      }
    }

    const currentUserRecord = {
      id: '1',
      uuid: 'c18ad68b-5a9b-4c35-aadb-cf7ce51b5930',
      displayName: '管理员',
      email: 'admin@dengtec.com',
      phone: '138 0000 0001',
      avatarLabel: '未设置',
      role: document.body.dataset.userRole || 'platform_admin',
      isActive: true,
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      assignedScopeLabel: '全部公司',
      lastLogin: '2026-09-02 21:48',
      lastLoginIp: '192.168.1.38',
      mustChangePassword: false,
      passwordChangedAt: '2026-08-18 10:26',
      createdAt: '2026-01-08 09:00',
      updatedAt: '2026-09-02 21:48'
    }

    const roleCopy = {
      operator: ['运营管理', '代公司管理员处理日常业务，并管理数据录入与信息查看账号。'],
      data_entry: ['数据录入', '负责授权范围内的业务数据录入与维护，不具备管理员权限。'],
      viewer: ['信息查看', '只读查看授权范围内的数据，不允许新增、修改、删除或控制。']
    }

    function roleLabel (role) {
      if (role === 'platform_admin' || role === 'admin') return '管理员'
      return (roleCopy[role] || roleCopy.viewer)[0]
    }

    function canManageTargetRole (targetRole) {
      const actorRole = document.body.dataset.userRole || 'platform_admin'
      if (['platform_admin', 'admin'].includes(actorRole)) return ['operator', 'data_entry', 'viewer'].includes(targetRole)
      if (actorRole === 'operator') return ['data_entry', 'viewer'].includes(targetRole)
      return false
    }

    function applyUserManagementVisibility () {
      const actorRole = document.body.dataset.userRole || 'platform_admin'
      const canManageUsers = ['platform_admin', 'admin', 'operator'].includes(actorRole)
      const operatorOptionAllowed = actorRole !== 'operator'
      const roleSelects = [createUserRoleSelect, editUserRoleSelect]

      roleSelects.forEach(select => {
        const option = select?.querySelector('option[value="operator"]')
        if (!option) return
        option.disabled = !operatorOptionAllowed
        option.hidden = !operatorOptionAllowed
        if (!operatorOptionAllowed && select.value === 'operator') select.value = ''
      })

      const createButton = document.querySelector('[data-action="create-company-user"]')
      if (createButton) createButton.hidden = !canManageUsers
      userRows.forEach(row => {
        const editButton = row.querySelector('[data-action="edit-company-user"]')
        if (editButton) editButton.hidden = !canManageTargetRole(row.dataset.role)
      })
    }

    function formatDemoDateTime (date = new Date()) {
      const part = value => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`
    }

    function currentCompanyName () {
      return document.querySelector('[data-current-company-name]')?.textContent.trim() || '—'
    }

    function activateArea (area, updateUrl = false) {
      const panel = panels.find(item => item.dataset.companyPanel === area)
      const button = areaButtons.find(item => item.dataset.companyArea === area)
      if (!panel || !button || button.hidden) return false
      areaButtons.forEach(button => {
        const active = button.dataset.companyArea === area
        button.classList.toggle('is-active', active)
        if (active) button.setAttribute('aria-current', 'page')
        else button.removeAttribute('aria-current')
      })
      panels.forEach(item => { item.hidden = item !== panel })
      if (updateUrl) {
        const url = new URL(window.location.href)
        if (area === 'profile') url.searchParams.delete('section')
        else url.searchParams.set('section', area)
        window.history.replaceState(window.history.state, '', url)
      }
      return true
    }

    function applyCompanyVisibility () {
      const isPlatform = document.body.dataset.companyProfile === 'platform'
      const role = document.body.dataset.userRole || 'platform_admin'
      areaButtons.forEach(item => {
        const tenantAllowed = !item.hasAttribute('data-tenant-company-only') || !isPlatform
        const platformAllowed = !item.hasAttribute('data-platform-company-only') || isPlatform
        const roles = item.dataset.companyRoles?.split(/\s+/).filter(Boolean)
        const roleAllowed = !roles?.length || roles.includes(role)
        item.hidden = !(tenantAllowed && platformAllowed && roleAllowed)
      })
      const activeButton = areaButtons.find(item => item.classList.contains('is-active'))
      if (activeButton?.hidden) activateArea('profile', true)

      const isCompanyAdmin = ['platform_admin', 'admin'].includes(role)
      const isCompanyOperator = role === 'operator'
      companyFormControls.forEach(control => {
        const initiallyDisabled = control.dataset.demoInitialDisabled === 'true'
        const requiresDisabledState = control.matches('select, input[type="file"]')
        const ownerOnly = Boolean(control.closest('[data-owner-only]'))
        const canEdit = isCompanyAdmin || (isCompanyOperator && !ownerOnly)
        control.disabled = initiallyDisabled || (!canEdit && requiresDisabledState)
        if ('readOnly' in control) {
          const initiallyReadonly = control.dataset.demoInitialReadonly === 'true'
          control.readOnly = initiallyReadonly || !canEdit
        }
      })
      companyFormActions.forEach(button => {
        const ownerOnly = Boolean(button.closest('[data-owner-only]'))
        button.hidden = !(isCompanyAdmin || (isCompanyOperator && !ownerOnly))
      })
      fileWriteActions.forEach(action => {
        action.hidden = !['platform_admin', 'admin', 'operator', 'data_entry'].includes(role)
      })
      applyUserManagementVisibility()
    }

    function filterCompanyFiles () {
      const keyword = fileSearch?.value.trim().toLocaleLowerCase() || ''
      const selectedType = fileType?.value || ''
      let visibleCount = 0
      fileRows.forEach(row => {
        const matchesKeyword = !keyword || row.dataset.search.toLocaleLowerCase().includes(keyword)
        const matchesType = !selectedType || row.dataset.fileType === selectedType
        row.hidden = !(matchesKeyword && matchesType)
        if (!row.hidden) visibleCount += 1
      })
      if (fileEmpty) fileEmpty.hidden = visibleCount !== 0
      if (fileCount) fileCount.textContent = visibleCount ? `第 1–${visibleCount} 条，共 ${visibleCount} 条` : '共 0 条'
    }

    function filterRows (rows, keywordInput, selectInput, selectKey, empty, count) {
      const keyword = keywordInput?.value.trim().toLocaleLowerCase() || ''
      const selected = selectInput?.value || ''
      let visibleCount = 0
      rows.forEach(row => {
        const matchesKeyword = !keyword || row.dataset.search.toLocaleLowerCase().includes(keyword)
        const matchesSelect = !selected || row.dataset[selectKey] === selected
        row.hidden = !(matchesKeyword && matchesSelect)
        if (!row.hidden) visibleCount += 1
      })
      if (empty) empty.hidden = visibleCount !== 0
      if (count) count.textContent = visibleCount ? `第 1–${visibleCount} 条，共 ${visibleCount} 条` : '共 0 条'
    }

    function filterUsers () {
      const keyword = userSearch?.value.trim().toLocaleLowerCase('zh-CN') || ''
      const role = userRole?.value || ''
      const active = userActive?.value || ''
      let visible = 0
      userRows.forEach(row => {
        const matches = (!keyword || row.dataset.search.toLocaleLowerCase('zh-CN').includes(keyword)) &&
          (!role || row.dataset.role === role) && (!active || row.dataset.active === active)
        row.hidden = !matches
        if (matches) visible += 1
      })
      if (userEmpty) userEmpty.hidden = visible !== 0
      if (userCount) userCount.textContent = visible ? `第 1–${visible} 条，共 ${visible} 条` : '共 0 条'
    }

    function profileDetail (record) {
      return {
        ...record,
        companyName: currentCompanyName(),
        roleLabel: roleLabel(record.role),
        activeLabel: record.isActive ? '已启用' : '已停用',
        mustChangePasswordLabel: record.mustChangePassword ? '是' : '否'
      }
    }

    function populateUserProfile (container, record) {
      if (!container || !record) return
      const detail = profileDetail(record)
      container.querySelectorAll('[data-user-profile-field]').forEach(field => {
        const value = detail[field.dataset.userProfileField] ?? '—'
        if ('value' in field) field.value = value
        else field.textContent = value
      })
    }

    function populatePersonalProfile () {
      populateUserProfile(personalProfile, currentUserRecord)
      const name = personalProfile?.querySelector('[data-personal-profile-name]')
      const email = personalProfile?.querySelector('[data-personal-profile-email]')
      const avatar = personalProfile?.querySelector('[data-personal-profile-avatar]')
      if (name) name.textContent = currentUserRecord.displayName
      if (email) email.textContent = currentUserRecord.email
      if (avatar) {
        avatar.textContent = currentUserRecord.displayName.slice(0, 1)
        avatar.hidden = Boolean(personalAvatarPreviewUrl)
      }
      if (personalAvatarImage) {
        personalAvatarImage.hidden = !personalAvatarPreviewUrl
        if (personalAvatarPreviewUrl) personalAvatarImage.src = personalAvatarPreviewUrl
        else personalAvatarImage.removeAttribute('src')
      }
    }

    function populateEditUser (key, record) {
      if (!editUserForm || !record) return
      editUserForm.elements.namedItem('user_key').value = key
      editUserForm.elements.namedItem('display_name').value = record.displayName
      editUserForm.elements.namedItem('email').value = record.email
      editUserForm.elements.namedItem('role').value = record.role
      editUserForm.elements.namedItem('is_active').checked = record.isActive
    }

    function updateUserRow (key, record) {
      const row = userRows.find(item => item.dataset.userKey === key)
      if (!row) return
      const cells = row.cells
      const avatar = row.querySelector('.company-user-avatar')
      const name = row.querySelector('.company-user-identity strong')
      if (avatar) avatar.textContent = record.displayName.slice(0, 1)
      if (name) name.textContent = record.displayName
      cells[0].dataset.sortValue = record.displayName
      cells[1].textContent = record.phone || '—'
      cells[2].textContent = roleLabel(record.role)
      cells[3].querySelector('.status').textContent = record.isActive ? '已启用' : '已停用'
      row.dataset.search = `${record.displayName} ${record.email}`
      row.dataset.role = record.role
      row.dataset.active = String(record.isActive)
      row.querySelectorAll('[data-user-name]').forEach(button => {
        button.dataset.userName = record.displayName
        const action = button.dataset.action === 'view-company-user' ? '查看' : '编辑'
        button.setAttribute('aria-label', `${action}${record.displayName}`)
      })
      filterUsers()
    }

    form?.addEventListener('submit', event => {
      event.preventDefault()
      if (!['platform_admin', 'admin', 'operator'].includes(document.body.dataset.userRole)) return
      const companyName = form.elements.namedItem('company_name')?.value.trim()
      const shortName = form.elements.namedItem('short_name')?.value.trim()
      const sidebarName = document.querySelector('[data-company-name]')
      if (sidebarName) sidebarName.textContent = shortName || companyName || ''
      document.querySelectorAll('[data-current-company-name]').forEach(item => { item.textContent = companyName || '' })
      if (companyName) document.title = `${companyName} · IoT UI Demo`
      showToast('Demo：公司资料已保存')
    })

    areaButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.classList.contains('is-active')) return
        if (!activateArea(button.dataset.companyArea, true)) {
          showToast(`Demo：进入${button.dataset.companyAreaLabel}`)
        }
      })
    })

    applyCompanyVisibility()
    document.addEventListener('ui:company-profile-change', () => {
      applyCompanyVisibility()
      populatePersonalProfile()
    })
    document.addEventListener('ui:user-role-change', event => {
      currentUserRecord.role = event.detail.roleId
      applyCompanyVisibility()
      populatePersonalProfile()
    })
    const requestedArea = new URLSearchParams(window.location.search).get('section')
    if (!activateArea(requestedArea || 'profile')) activateArea('profile', true)
    personalProfile?.querySelectorAll('[data-user-profile-editable]').forEach(input => {
      input.removeAttribute('readonly')
      input.removeAttribute('disabled')
    })
    populatePersonalProfile()

    userFilter?.addEventListener('submit', event => event.preventDefault())
    userSearch?.addEventListener('input', filterUsers)
    userRole?.addEventListener('change', filterUsers)
    userActive?.addEventListener('change', filterUsers)
    fileFilter?.addEventListener('submit', event => event.preventDefault())
    fileSearch?.addEventListener('input', filterCompanyFiles)
    fileType?.addEventListener('change', filterCompanyFiles)

    document.querySelector('[data-action="upload-company-file"]')?.addEventListener('click', () => {
      companyFileInput?.click()
    })
    companyFileInput?.addEventListener('change', () => {
      const file = companyFileInput.files?.[0]
      if (!file) return
      showToast(`Demo：已选择 ${file.name}`)
      companyFileInput.value = ''
    })
    document.querySelectorAll('[data-action="view-company-file"]').forEach(button => {
      button.addEventListener('click', () => showToast(`Demo：查看 ${button.dataset.fileName}`))
    })
    document.querySelectorAll('[data-action="delete-company-file"]').forEach(button => {
      button.addEventListener('click', () => showToast(`Demo：删除 ${button.dataset.fileName}`))
    })
    document.querySelector('[data-company-integration-filter]')?.addEventListener('submit', event => event.preventDefault())
    integrationSearch?.addEventListener('input', () => filterRows(integrationRows, integrationSearch, integrationStatus, 'integrationStatus', integrationEmpty, integrationCount))
    integrationStatus?.addEventListener('change', () => filterRows(integrationRows, integrationSearch, integrationStatus, 'integrationStatus', integrationEmpty, integrationCount))
    document.querySelector('[data-action="create-company-integration"]')?.addEventListener('click', () => showToast('Demo：新增集成配置'))
    document.querySelectorAll('[data-action="test-company-integration"]').forEach(button => button.addEventListener('click', () => showToast(`Demo：正在测试 ${button.dataset.integrationName}`)))
    document.querySelectorAll('[data-action="sync-company-integration"]').forEach(button => button.addEventListener('click', () => showToast(`Demo：正在同步 ${button.dataset.integrationName}`)))

    document.querySelector('[data-company-activity-filter]')?.addEventListener('submit', event => event.preventDefault())
    activitySearch?.addEventListener('input', () => filterRows(activityRows, activitySearch, activityResult, 'activityResult', activityEmpty, activityCount))
    activityResult?.addEventListener('change', () => filterRows(activityRows, activitySearch, activityResult, 'activityResult', activityEmpty, activityCount))
    document.querySelectorAll('[data-action="view-company-activity"]').forEach(button => button.addEventListener('click', () => showToast('Demo：查看操作记录详情')))

    permissionForm?.addEventListener('submit', event => {
      event.preventDefault()
      showToast('Demo：权限设置已保存')
    })

    document.querySelector('[data-action="create-company-user"]')?.addEventListener('click', () => {
      applyUserManagementVisibility()
      if (typeof createUserDialog?.showModal === 'function') {
        createUserDialog.returnValue = ''
        createUserDialog.showModal()
      }
      else showToast('当前浏览器不支持原生对话框')
    })

    createUserForm?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm') return
      const password = createUserPassword?.value || ''
      const passwordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
      createUserRoleSelect?.setCustomValidity(canManageTargetRole(createUserRoleSelect.value) ? '' : '无权授予该角色')
      createUserPassword?.setCustomValidity(passwordValid ? '' : '密码至少 8 位，并同时包含字母和数字')
      createUserPasswordConfirmation?.setCustomValidity(password === createUserPasswordConfirmation?.value ? '' : '两次输入的密码不一致')
      if (!createUserForm.checkValidity()) {
        event.preventDefault()
        createUserForm.reportValidity()
      }
    })

    createUserPassword?.addEventListener('input', () => createUserPassword.setCustomValidity(''))
    createUserPasswordConfirmation?.addEventListener('input', () => createUserPasswordConfirmation.setCustomValidity(''))
    createUserRoleSelect?.addEventListener('change', () => createUserRoleSelect.setCustomValidity(''))

    function setPasswordVisibility (button, visible) {
      const input = document.getElementById(button.getAttribute('aria-controls'))
      const icon = button.querySelector('use')
      if (!input || !icon) return
      input.type = visible ? 'text' : 'password'
      icon.setAttribute('href', `icons.svg#icon-${visible ? 'eye-slash' : 'eye'}`)
      button.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码')
      button.setAttribute('title', button.getAttribute('aria-label'))
    }

    createUserPasswordToggles.forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'))
        setPasswordVisibility(button, input?.type === 'password')
      })
    })

    editUserPasswordToggles.forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'))
        setPasswordVisibility(button, input?.type === 'password')
      })
    })

    changePasswordToggles.forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.getAttribute('aria-controls'))
        setPasswordVisibility(button, input?.type === 'password')
      })
    })

    createUserDialog?.addEventListener('close', () => {
      if (createUserDialog.returnValue === 'confirm') showToast('Demo：用户信息尚未提交')
      createUserForm?.reset()
      createUserRoleSelect?.setCustomValidity('')
      createUserPasswordToggles.forEach(button => setPasswordVisibility(button, false))
      createUserPassword?.setCustomValidity('')
      createUserPasswordConfirmation?.setCustomValidity('')
      createUserDialog.returnValue = ''
    })

    document.querySelectorAll('[data-action="view-company-user"]').forEach(button => {
      button.addEventListener('click', () => {
        const record = companyUserRecords[button.dataset.userKey]
        populateUserProfile(viewUserDialog, record)
        if (typeof viewUserDialog?.showModal === 'function') viewUserDialog.showModal()
        else showToast('当前浏览器不支持原生对话框')
      })
    })

    document.querySelectorAll('[data-action="edit-company-user"]').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.userKey
        const record = companyUserRecords[key]
        if (!canManageTargetRole(record?.role)) {
          showToast('当前权限不能管理该账号')
          return
        }
        populateEditUser(key, record)
        if (typeof editUserDialog?.showModal === 'function') {
          editUserDialog.returnValue = ''
          editUserDialog.showModal()
        }
        else showToast('当前浏览器不支持原生对话框')
      })
    })

    editUserForm?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm') return
      const password = editUserPassword?.value || ''
      const passwordConfirmation = editUserPasswordConfirmation?.value || ''
      const changesPassword = Boolean(password || passwordConfirmation)
      const passwordValid = !changesPassword || (password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password))
      editUserPassword?.setCustomValidity(passwordValid ? '' : '密码至少 8 位，并同时包含字母和数字')
      editUserPasswordConfirmation?.setCustomValidity(!changesPassword || password === passwordConfirmation ? '' : '两次输入的密码不一致')
      if (!editUserForm.checkValidity()) {
        event.preventDefault()
        editUserForm.reportValidity()
        return
      }
      const key = editUserForm.elements.namedItem('user_key').value
      const record = companyUserRecords[key]
      if (!record) return
      const nextRole = editUserRoleSelect?.value || ''
      if (!canManageTargetRole(record.role) || !canManageTargetRole(nextRole)) {
        event.preventDefault()
        editUserRoleSelect?.setCustomValidity('无权管理或授予该角色')
        editUserForm.reportValidity()
        return
      }
      record.displayName = editUserForm.elements.namedItem('display_name').value.trim()
      record.role = nextRole
      record.isActive = editUserForm.elements.namedItem('is_active').checked
      record.updatedAt = formatDemoDateTime()
      if (changesPassword) {
        record.mustChangePassword = true
        record.passwordChangedAt = record.updatedAt
      }
      updateUserRow(key, record)
    })

    editUserPassword?.addEventListener('input', () => editUserPassword.setCustomValidity(''))
    editUserPasswordConfirmation?.addEventListener('input', () => editUserPasswordConfirmation.setCustomValidity(''))
    editUserRoleSelect?.addEventListener('change', () => editUserRoleSelect.setCustomValidity(''))

    editUserDialog?.addEventListener('close', () => {
      if (editUserDialog.returnValue === 'confirm') showToast('Demo：用户资料尚未提交')
      editUserForm?.reset()
      editUserRoleSelect?.setCustomValidity('')
      editUserPasswordToggles.forEach(button => setPasswordVisibility(button, false))
      editUserPassword?.setCustomValidity('')
      editUserPasswordConfirmation?.setCustomValidity('')
      editUserDialog.returnValue = ''
    })

    personalProfileForm?.addEventListener('submit', event => {
      event.preventDefault()
      currentUserRecord.displayName = personalProfileForm.elements.namedItem('display_name').value.trim()
      currentUserRecord.phone = personalProfileForm.elements.namedItem('phone').value.trim()
      currentUserRecord.locale = personalProfileForm.elements.namedItem('locale').value.trim()
      currentUserRecord.timezone = personalProfileForm.elements.namedItem('timezone').value.trim()
      currentUserRecord.updatedAt = formatDemoDateTime()
      populatePersonalProfile()
      showToast('Demo：个人资料尚未提交')
    })

    document.querySelector('[data-action="change-personal-password"]')?.addEventListener('click', () => {
      if (typeof changePasswordDialog?.showModal === 'function') {
        changePasswordDialog.returnValue = ''
        changePasswordDialog.showModal()
      } else showToast('当前浏览器不支持原生对话框')
    })

    changePasswordForm?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm') return
      const newPassword = personalNewPassword?.value || ''
      const passwordValid = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)
      personalNewPassword?.setCustomValidity(passwordValid ? '' : '密码至少 8 位，并同时包含字母和数字')
      personalNewPasswordConfirmation?.setCustomValidity(newPassword === personalNewPasswordConfirmation?.value ? '' : '两次输入的密码不一致')
      if (!changePasswordForm.checkValidity()) {
        event.preventDefault()
        changePasswordForm.reportValidity()
        return
      }
      const changedAt = formatDemoDateTime()
      currentUserRecord.passwordChangedAt = changedAt
      currentUserRecord.updatedAt = changedAt
      currentUserRecord.mustChangePassword = false
      populatePersonalProfile()
    })

    personalCurrentPassword?.addEventListener('input', () => personalCurrentPassword.setCustomValidity(''))
    personalNewPassword?.addEventListener('input', () => personalNewPassword.setCustomValidity(''))
    personalNewPasswordConfirmation?.addEventListener('input', () => personalNewPasswordConfirmation.setCustomValidity(''))

    changePasswordDialog?.addEventListener('close', () => {
      if (changePasswordDialog.returnValue === 'confirm') showToast('Demo：密码尚未提交；生产环境成功后需要重新登录')
      changePasswordForm?.reset()
      changePasswordToggles.forEach(button => setPasswordVisibility(button, false))
      personalCurrentPassword?.setCustomValidity('')
      personalNewPassword?.setCustomValidity('')
      personalNewPasswordConfirmation?.setCustomValidity('')
      changePasswordDialog.returnValue = ''
    })

    personalAvatarButton?.addEventListener('click', () => personalAvatarInput?.click())

    personalAvatarInput?.addEventListener('change', () => {
      const file = personalAvatarInput.files?.[0]
      if (!file) return
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        personalAvatarInput.value = ''
        showToast('头像仅支持 JPEG、PNG、GIF 或 WebP 图片')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        personalAvatarInput.value = ''
        showToast('头像不能超过 5 MB')
        return
      }
      if (personalAvatarPreviewUrl) URL.revokeObjectURL(personalAvatarPreviewUrl)
      personalAvatarPreviewUrl = URL.createObjectURL(file)
      currentUserRecord.avatarLabel = file.name
      personalAvatarInput.value = ''
      populatePersonalProfile()
      showToast('Demo：头像已选择，生产环境将立即上传')
    })

    document.querySelector('[data-action="verify-domain"]')?.addEventListener('click', () => {
      showToast('Demo：已发起域名验证')
    })

    logoButton?.addEventListener('click', () => logoInput?.click())

    logoInput?.addEventListener('change', () => {
      const file = logoInput.files?.[0]
      if (!file || !logoPreview) return
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        logoInput.value = ''
        showToast('仅支持 PNG、JPG 或 WebP 图片')
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        logoInput.value = ''
        showToast('公司 Logo 不能超过 2 MB')
        return
      }
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl)
      logoPreviewUrl = URL.createObjectURL(file)
      logoPreview.src = logoPreviewUrl
      logoPreview.hidden = false
      if (logoPlaceholder) logoPlaceholder.hidden = true
      showToast('Demo：公司 Logo 已选择，保存后生效')
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
