(function () {
  // 控制器·型号目录（/devices/model）Demo：基于 hn_models 层级。
  // 点型号行内联展开 → 硬件版本；点硬件版本 → OD；点 OD → 软件版本(↔固件)。静态数据。
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true

    const showToast = message => window.UiDemoShell?.showToast(message)
    const createDialog = document.querySelector('#create-controller-model-dialog')
    const editDialog = document.querySelector('#edit-controller-model-dialog')
    const levelDialog = document.querySelector('#edit-model-level-dialog')
    const table = document.querySelector('.model-table')
    const tbody = document.querySelector('[data-model-row]')?.closest('tbody')
    if (!tbody) return

    // 状态在 sw_ver 行级（hn_models 一行 = 一个软件版本）：draft/active/frozen
    const SW_STATUS = {
      draft: ['草稿', 'status--draft'],
      active: ['活跃', 'status--online'],
      frozen: ['停用', 'status--offline']
    }

    // —— 展开内容：基本信息 + 硬件版本/OD/软件版本 逐层折叠 ——
    function expandHtml (ds) {
      const isProduct = ds.kind === 'product'
      let hw = []
      try { hw = JSON.parse(ds.hw || '[]') } catch (e) { hw = [] }
      const chevron = '<svg class="app-icon app-icon--line tree__chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg>'
      const edit = (action, data, label) => `<button class="icon-button tree__action" type="button" data-action="${action}" ${data} title="${label}" aria-label="${label}"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>`
      const add = (action, data, label) => `<button class="icon-button tree__action" type="button" data-action="${action}" ${data} title="${label}" aria-label="${label}"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg></button>`
      const tag = (mod, text) => `<span class="tree__tag tree__tag--${mod}">${text}</span>`
      const swLeaf = (h, o, s) => { const ctx = `${h.hw} · 字典 ${o.od} · v${s.sw}`; const st = SW_STATUS[s.status] || SW_STATUS.draft; return `<div class="tree__leaf">${tag('sw', '软件')}<span class="mono tree__ver">v${s.sw}</span><span class="mono tree__fw">${s.fw || '—'}</span>${isProduct ? `<button class="model-tree__link" type="button" data-action="preview-ui" data-ctx="${ctx}">UI 预览</button>` : '<span class="model-tree__muted">无 UI</span>'}<span class="tree__leaf-right"><span class="status ${st[1]}">${st[0]}</span>${edit('edit-sw', `data-ctx="${ctx}" data-status="${s.status || 'draft'}"`, '编辑软件')}</span></div>` }
      const odNode = (h, o) => { const ctx = `${h.hw} · 字典 ${o.od}`; const sws = (o.sws || []).length ? (o.sws || []).map(s => swLeaf(h, o, s)).join('') : `<div class="tree__leaf tree__empty">还没有软件版本，<button class="model-tree__link" type="button" data-action="add-sw" data-ctx="${ctx}">加软件</button></div>`; return `<div class="tree__node tree__node--od"><div class="tree__row"><button class="tree__toggle" type="button" data-tree-toggle data-node-od="${o.od}">${chevron}${tag('od', '字典')}<strong class="mono tree__ver">${o.od}</strong><span class="tree__count">${(o.sws || []).length} 软件</span></button><span class="tree__row-actions">${edit('edit-od', `data-ctx="${ctx}"`, '编辑字典')}${add('add-sw', `data-ctx="${ctx}"`, '增加软件')}</span></div><div class="tree__children" hidden>${sws}</div></div>` }
      const hwNode = h => { const ods = (h.ods || []).length ? (h.ods || []).map(o => odNode(h, o)).join('') : `<div class="tree__leaf tree__empty">还没有字典版本，<button class="model-tree__link" type="button" data-action="add-od" data-hw="${h.hw}">加字典</button></div>`; return `<div class="tree__node tree__node--hw"><div class="tree__row"><button class="tree__toggle" type="button" data-tree-toggle data-node-hw="${h.hw}">${chevron}${tag('hw', '硬件')}<strong class="mono tree__ver">${h.hw}</strong><span class="tree__count">${(h.ods || []).length} 字典</span></button><span class="tree__row-actions">${edit('edit-hw', `data-hw="${h.hw}"`, '编辑硬件')}${add('add-od', `data-hw="${h.hw}"`, '增加字典')}</span></div><div class="tree__children" hidden>${ods}</div></div>` }
      const tree = hw.length ? hw.map(hwNode).join('') : '<div class="tree__leaf tree__empty">还没有硬件版本，<button class="model-tree__link" type="button" data-action="add-hw-version">加硬件版本</button></div>'
      return `<div class="tree">${tree}</div>`
    }

    function toggleModel (row) {
      const next = row.nextElementSibling
      if (next && next.classList.contains('model-expand')) { next.remove(); row.classList.remove('model-row--open'); return }
      const tr = document.createElement('tr')
      tr.className = 'model-expand'
      tr.setAttribute('data-sort-ignore', '')
      const td = document.createElement('td')
      td.colSpan = 8
      td.innerHTML = expandHtml(row.dataset)
      tr.appendChild(td)
      row.after(tr)
      row.classList.add('model-row--open')
    }

    // 找层级按钮所属的型号行：操作列按钮带 data-code；展开区内按钮取展开行的上一行
    function ownerRow (btn) {
      if (btn.dataset.code) return document.querySelector(`[data-model-row][data-code="${btn.dataset.code}"]`)
      const ex = btn.closest('.model-expand')
      return ex ? ex.previousElementSibling : null
    }
    function parseCtx (ctx) {
      const p = (ctx || '').split(' · ')
      return { hw: p[0] || '', od: (p[1] || '').replace('字典 ', ''), sw: (p[2] || '').replace(/^v/, '') }
    }
    // 数据变更后重渲展开区（折叠状态会重置）
    function reRenderExpand (row) {
      const ex = row.nextElementSibling
      if (ex && ex.classList.contains('model-expand')) ex.querySelector('td').innerHTML = expandHtml(row.dataset)
      else toggleModel(row)
    }
    // 重渲后按硬件/字典把路径重新展开，让新增/改动项可见
    function reopenPath (row, hw, od) {
      const ex = row.nextElementSibling
      if (!ex || !ex.classList.contains('model-expand')) return
      ex.querySelectorAll('[data-tree-toggle]').forEach(t => {
        if ((hw && t.dataset.nodeHw === hw) || (od && t.dataset.nodeOd === od)) {
          const kids = t.closest('.tree__row')?.nextElementSibling
          if (kids && kids.classList.contains('tree__children')) { kids.hidden = false; t.classList.add('is-open') }
        }
      })
    }

    // —— 编辑展示信息 ——
    let current = null
    function openEdit (ds) {
      current = ds
      editDialog.querySelector('[data-edit-model-code]').textContent = ds.code || '—'
      const set = (sel, val) => { const el = editDialog.querySelector(sel); if (el) el.value = val || '' }
      set('[data-edit-model-name]', ds.name)
      set('[data-edit-model-part]', ds.part)
      set('[data-edit-model-desc]', ds.desc)
      set('[data-edit-model-url]', ds.url && ds.url !== '—' ? ds.url : '')
      const avatar = editDialog.querySelector('[data-edit-model-avatar-name]')
      if (avatar) avatar.value = (ds.avatar && ds.avatar !== '未上传') ? ds.avatar : ''
      editDialog?.showModal()
    }

    // —— 行交互：点型号行展开；操作列按钮各自处理 ——
    tbody.addEventListener('click', event => {
      const row = event.target.closest('[data-model-row]')
      if (!row) return
      if (event.target.closest('[data-model-avatar]')) return
      const actionBtn = event.target.closest('[data-action]')
      if (actionBtn) {
        const action = actionBtn.dataset.action
        const ds = row.dataset
        if (action === 'edit-controller-model') openEdit(ds)
        else if (action === 'freeze-controller-model') {
          if (ds.status === 'draft') { showToast(`Demo：${ds.code} 是草稿，补齐固件（含 product 的 ui_json）后才能手动转活跃`); return }
          const active = ds.status === 'active'
          const verb = active ? '冻结' : '启用'
          if (window.confirm(`确认${verb}型号「${ds.code}」？${active ? '冻结后新静音仓型号不能再选此型号，存量设备继续运行。' : ''}`)) {
            showToast(`Demo：已${verb} ${ds.code}（未提交服务器）`)
          }
        }
        return
      }
      toggleModel(row)
    })

    // —— 展开区内的逐层折叠（硬件版本 / OD） ——
    table?.addEventListener('click', event => {
      const toggle = event.target.closest('[data-tree-toggle]')
      if (!toggle) return
      const children = toggle.closest('.tree__row')?.nextElementSibling
      if (children && children.classList.contains('tree__children')) {
        children.hidden = !children.hidden
        toggle.classList.toggle('is-open', !children.hidden)
      }
    })

    // —— 新建型号：类型 + 料号编号 → 自动生成 型号编码 / Product Code / 料号前缀 ——
    function syncModelIdentity () {
      if (!createDialog) return
      const isNode = (createDialog.querySelector('[data-model-type]')?.value || 'product') === 'node'
      const codeRaw = (createDialog.querySelector('[data-part-code]')?.value || '').trim().toUpperCase()
      const prefixEl = createDialog.querySelector('[data-part-prefix]')
      const modelCodeEl = createDialog.querySelector('[data-model-code]')
      const productCodeEl = createDialog.querySelector('[data-product-code]')
      if (prefixEl) prefixEl.textContent = 'WF2D-'
      const valid = /^[0-9A-F]{4}$/.test(codeRaw)
      if (modelCodeEl) modelCodeEl.value = valid ? `${isNode ? 'N-' : 'P-'}${codeRaw}` : ''
      if (productCodeEl) productCodeEl.value = valid ? `0x${isNode ? '4E' : '50'}00${codeRaw}` : ''
    }
    createDialog?.querySelector('[data-model-type]')?.addEventListener('change', syncModelIdentity)
    createDialog?.querySelector('[data-part-code]')?.addEventListener('input', syncModelIdentity)
    document.querySelector('[data-action="open-create-model-dialog"]')?.addEventListener('click', () => { syncModelIdentity(); createDialog?.showModal() })
    document.querySelector('[data-create-model-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value === 'confirm') showToast('Demo：型号骨架尚未提交（待后端骨架接口 / 随首份固件提交）')
    })
    document.querySelector('[data-edit-model-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value === 'confirm') showToast('Demo：型号展示信息尚未提交服务器')
    })

    // —— 编辑各层级：硬件 hw_desc / 字典 od_desc / 软件 firmwares.notes + 状态 ——
    const LEVEL_CFG = {
      'edit-hw': ['编辑硬件版本', '硬件说明（hw_desc）', b => b.dataset.hw],
      'edit-od': ['编辑字典', '字典说明（od_desc）', b => b.dataset.ctx],
      'edit-sw': ['编辑软件（固件 / UI / 状态）', '固件版本说明（firmwares.notes）', b => b.dataset.ctx]
    }
    let pendingEdit = null
    function openLevelEdit (btn) {
      if (!levelDialog) return
      const action = btn.dataset.action
      const cfg = LEVEL_CFG[action]
      const isSw = action === 'edit-sw'
      const isOd = action === 'edit-od'
      const isHw = action === 'edit-hw'
      const row = ownerRow(btn)
      const isProduct = !!row && row.dataset.kind === 'product'
      const c = parseCtx(btn.dataset.ctx)
      const hwKey = btn.dataset.hw || c.hw
      pendingEdit = { row, action, hw: hwKey, od: c.od, sw: c.sw }
      levelDialog.querySelector('[data-level-title]').textContent = cfg[0]
      levelDialog.querySelector('[data-level-sub]').textContent = cfg[2](btn) || ''
      levelDialog.querySelector('[data-level-desc-label]').textContent = cfg[1]
      const ta = levelDialog.querySelector('[data-level-desc]')
      if (ta) ta.value = ''
      const odField = levelDialog.querySelector('[data-level-od-field]'); if (odField) odField.hidden = !isOd
      const fwField = levelDialog.querySelector('[data-level-fw-field]'); if (fwField) fwField.hidden = !isSw
      const uiField = levelDialog.querySelector('[data-level-ui-field]'); if (uiField) uiField.hidden = !(isSw && isProduct)
      const odName = levelDialog.querySelector('[data-level-od-name]'); if (odName) odName.value = ''
      const fwName = levelDialog.querySelector('[data-level-fw-name]'); if (fwName) fwName.value = ''
      const uiName = levelDialog.querySelector('[data-level-ui-name]'); if (uiName) uiName.value = ''
      const statusField = levelDialog.querySelector('[data-level-status-field]')
      if (statusField) statusField.hidden = !isSw
      if (isSw) { const sel = levelDialog.querySelector('[data-level-status]'); if (sel) sel.value = btn.dataset.status || 'draft' }
      // 编辑硬件：硬件说明 + 最初 OD 版本；编辑字典只上传 od.json（无备注）；软件带固件/UI/状态/备注
      const odverField = levelDialog.querySelector('[data-level-odver-field]'); if (odverField) odverField.hidden = !isHw
      const odverInput = levelDialog.querySelector('[data-level-odver]')
      if (odverInput) {
        let firstOd = ''
        if (isHw && row) {
          let data = []
          try { data = JSON.parse(row.dataset.hw || '[]') } catch (e) { data = [] }
          const h = data.find(x => x.hw === hwKey)
          firstOd = (h && h.ods && h.ods[0] && h.ods[0].od) || ''
        }
        odverInput.value = firstOd
      }
      const descField = levelDialog.querySelector('[data-level-desc-field]'); if (descField) descField.hidden = false
      levelDialog.showModal()
    }
    document.querySelector('[data-edit-level-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm') return
      if (pendingEdit && pendingEdit.action === 'edit-sw' && pendingEdit.row) {
        const newStatus = levelDialog.querySelector('[data-level-status]')?.value || 'draft'
        const { row, hw, od, sw } = pendingEdit
        let data = []
        try { data = JSON.parse(row.dataset.hw || '[]') } catch (e) { data = [] }
        const h = data.find(x => x.hw === hw)
        const o = h && (h.ods || []).find(x => x.od === od)
        const s = o && (o.sws || []).find(x => String(x.sw) === String(sw))
        if (s) { s.status = newStatus; row.dataset.hw = JSON.stringify(data); reRenderExpand(row); reopenPath(row, hw, od) }
        showToast(`Demo：软件 v${sw} 状态改为「${(SW_STATUS[newStatus] || SW_STATUS.draft)[0]}」（未提交服务器）`)
      } else if (pendingEdit && pendingEdit.action === 'edit-od') {
        showToast('Demo：od.json + 字典说明尚未提交服务器（未接入）')
      } else if (pendingEdit && pendingEdit.action === 'edit-hw' && pendingEdit.row) {
        const { row, hw } = pendingEdit
        const newOd = (levelDialog.querySelector('[data-level-odver]')?.value || '').trim()
        if (newOd) {
          let data = []
          try { data = JSON.parse(row.dataset.hw || '[]') } catch (e) { data = [] }
          const h = data.find(x => x.hw === hw)
          if (h) {
            h.ods = h.ods || []
            if (h.ods.length) h.ods[0].od = newOd
            else h.ods.push({ od: newOd, sws: [] })
            row.dataset.hw = JSON.stringify(data); reRenderExpand(row); reopenPath(row, hw, newOd)
          }
        }
        showToast('Demo：硬件说明 + 最初 OD 版本尚未提交服务器')
      } else {
        showToast('Demo：尚未提交服务器')
      }
    })

    // —— 增加各层级：硬件版本 / 字典 / 软件（软件带固件 + 状态） ——
    const addDialog = document.querySelector('#add-model-level-dialog')
    const ADD_ACTIONS = new Set(['add-hw-version', 'add-od', 'add-sw'])
    let pendingAdd = null
    function openAddLevel (btn) {
      if (!addDialog) return
      const action = btn.dataset.action
      const row = ownerRow(btn)
      if (!row) return
      const c = parseCtx(btn.dataset.ctx)
      let level = 'hw'; let hw = ''; let od = ''; let title = '增加硬件版本'; let verLabel = '硬件版本号（hw_version）'; let verPh = '如 V1.0.0'; let descLabel = '硬件版本说明（hw_desc）'
      if (action === 'add-od') { level = 'od'; hw = btn.dataset.hw || ''; title = '增加字典'; verLabel = '字典（OD）版本号（od_ver）'; verPh = '如 V1'; descLabel = '字典说明（od_desc）' }
      else if (action === 'add-sw') { level = 'sw'; hw = c.hw; od = c.od; title = '增加软件'; verLabel = '软件版本号（sw_ver）'; verPh = '如 1.0.0'; descLabel = '软件说明（firmwares.notes）' }
      pendingAdd = { row, level, hw, od }
      addDialog.querySelector('[data-add-level-title]').textContent = title
      addDialog.querySelector('[data-add-level-sub]').textContent = [row.dataset.code, hw, od && `字典 ${od}`].filter(Boolean).join(' · ')
      addDialog.querySelector('[data-add-level-ver-label]').textContent = verLabel
      addDialog.querySelector('[data-add-level-desc-label]').textContent = descLabel
      const ver = addDialog.querySelector('[data-add-level-ver]'); if (ver) { ver.value = ''; ver.placeholder = verPh }
      const desc = addDialog.querySelector('[data-add-level-desc]'); if (desc) desc.value = ''
      const odver = addDialog.querySelector('[data-add-level-odver]'); if (odver) odver.value = ''
      const isSw = level === 'sw'
      const isHw = level === 'hw'
      const odverField = addDialog.querySelector('[data-add-level-odver-field]'); if (odverField) odverField.hidden = !isHw
      const stField = addDialog.querySelector('[data-add-level-status-field]'); if (stField) stField.hidden = !isSw
      if (isSw) { const st = addDialog.querySelector('[data-add-level-status]'); if (st) st.value = 'draft' }
      addDialog.showModal()
    }
    document.querySelector('[data-add-level-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm' || !pendingAdd) return
      const { row, level, hw, od } = pendingAdd
      const ver = (addDialog.querySelector('[data-add-level-ver]')?.value || '').trim()
      if (!ver) return
      let data = []
      try { data = JSON.parse(row.dataset.hw || '[]') } catch (e) { data = [] }
      let openHw = ''; let openOd = ''
      if (level === 'hw') {
        if (data.some(x => x.hw === ver)) { showToast(`Demo：硬件版本 ${ver} 已存在`); return }
        const odVer = (addDialog.querySelector('[data-add-level-odver]')?.value || '').trim()
        data.push({ hw: ver, ods: odVer ? [{ od: odVer, sws: [] }] : [] }); openHw = ver; openOd = odVer
      } else if (level === 'od') {
        const h = data.find(x => x.hw === hw); if (!h) return
        h.ods = h.ods || []
        if (h.ods.some(x => x.od === ver)) { showToast(`Demo：字典 ${ver} 已存在`); return }
        h.ods.push({ od: ver, sws: [] }); openHw = hw; openOd = ver
      } else if (level === 'sw') {
        const h = data.find(x => x.hw === hw); const o = h && (h.ods || []).find(x => x.od === od); if (!o) return
        o.sws = o.sws || []
        if (o.sws.some(x => String(x.sw) === ver)) { showToast(`Demo：软件 ${ver} 已存在`); return }
        const status = addDialog.querySelector('[data-add-level-status]')?.value || 'draft'
        o.sws.push({ sw: ver, fw: '', status }); openHw = hw; openOd = od
      }
      row.dataset.hw = JSON.stringify(data)
      reRenderExpand(row)
      reopenPath(row, openHw, openOd)
      showToast(`Demo：已增加 ${ver}（未提交服务器）`)
    })

    // —— 其余层级操作 / 图片占位：Demo toast ——
    const toasts = {
      'pick-firmware': () => 'Demo：选择固件 JSON（含 od_import_json，未接入）',
      'pick-od-file': () => 'Demo：选择 od.json（OD 字典导入，未接入）',
      'pick-ui-json': () => 'Demo：选择 ui.json（LVGL UI，仅主机产品，未接入）',
      'upload-firmware': btn => `Demo：为 ${btn.dataset.ctx} 上传固件 JSON（含 od_import_json）`,
      'preview-ui': btn => `Demo：预览 ${btn.dataset.ctx} 的 LVGL UI（ui_json）`,
      'pick-model-avatar': () => 'Demo：上传型号图片（未接入）',
      'pick-edit-model-avatar': () => 'Demo：上传型号图片（未接入）'
    }
    document.addEventListener('click', event => {
      const btn = event.target.closest('[data-action]')
      if (!btn) return
      const a = btn.dataset.action
      if (LEVEL_CFG[a]) { openLevelEdit(btn); return }
      if (ADD_ACTIONS.has(a)) { openAddLevel(btn); return }
      const fn = toasts[a]
      if (fn) showToast(fn(btn))
    })

    // —— 筛选 ——
    const search = document.querySelector('[data-model-search]')
    const kindFilter = document.querySelector('[data-model-kind]')
    const statusFilter = document.querySelector('[data-model-status]')
    const emptyRow = document.querySelector('[data-model-empty]')
    const rows = [...document.querySelectorAll('[data-model-row]')]
    function collapse (row) {
      const next = row.nextElementSibling
      if (next && next.classList.contains('model-expand')) next.remove()
      row.classList.remove('model-row--open')
    }
    function applyFilter () {
      const kw = (search?.value || '').trim().toLowerCase()
      const kind = kindFilter?.value || ''
      const status = statusFilter?.value || ''
      let visible = 0
      rows.forEach(row => {
        const ds = row.dataset
        const match = (!kw || ds.search.includes(kw)) && (!kind || ds.kind === kind) && (!status || ds.status === status)
        row.hidden = !match
        if (!match) collapse(row)
        if (match) visible += 1
      })
      if (emptyRow) emptyRow.hidden = visible > 0
    }
    document.querySelector('[data-model-filter]')?.addEventListener('submit', event => event.preventDefault())
    search?.addEventListener('input', applyFilter)
    kindFilter?.addEventListener('change', applyFilter)
    statusFilter?.addEventListener('change', applyFilter)
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
