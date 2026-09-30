(function () {
  // 控制器·主机（/devices/host）与节点（/devices/node）Demo。
  // 主机行内联展开 → hn_bindings 绑定的节点；运维：备注 / OTA / 刷新 / 吊销·恢复凭据。静态数据。
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true

    const showToast = message => window.UiDemoShell?.showToast(message)
    const remarkDialog = document.querySelector('#device-remark-dialog')
    const otaDialog = document.querySelector('#ota-device-dialog')

    const iconBtn = (action, icon, label, data) => `<button class="icon-button device-action" type="button" data-action="${action}" ${data || ''} title="${label}" aria-label="${label}"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-${icon}"></use></svg></button>`

    // —— 渲染操作列：主机 备注/OTA/刷新/吊销·恢复；节点 备注/OTA ——
    function renderHostActions (row) {
      const cell = row.querySelector('[data-host-actions]')
      if (!cell) return
      const revoked = row.dataset.revoked === 'true'
      cell.innerHTML =
        iconBtn('device-remark', 'pencil', '编辑备注') +
        iconBtn('device-ota', 'upload', '触发 OTA') +
        iconBtn('device-refresh', 'arrow-clockwise', '刷新在线状态') +
        iconBtn(revoked ? 'device-restore' : 'device-revoke', 'shield-check', revoked ? '恢复凭据' : '吊销凭据')
    }
    document.querySelectorAll('[data-host-row]').forEach(renderHostActions)
    document.querySelectorAll('[data-node-actions]').forEach(cell => {
      cell.innerHTML = iconBtn('device-remark', 'pencil', '编辑备注') + iconBtn('device-ota', 'upload', '触发 OTA')
    })

    // —— 主机展开：绑定节点子表 ——
    function nodesHtml (row) {
      let nodes = []
      try { nodes = JSON.parse(row.dataset.nodes || '[]') } catch (e) { nodes = [] }
      if (!nodes.length) return '<p class="subnode-empty">该主机暂无绑定节点。</p>'
      const rows = nodes.map(n => {
        const st = n.online ? '<span class="status status--online">在线</span>' : '<span class="status status--offline">离线</span>'
        return `<tr><td class="mono">${n.pos}</td><td class="mono">${n.route}</td><td class="mono">${n.can}</td><td class="mono">${n.serial}</td><td>${n.model}<span class="device-model__code mono">${n.code}</span></td><td class="mono">v${n.sw}</td><td>${st}</td></tr>`
      }).join('')
      return `<table class="subnode-table"><thead><tr><th>槽位</th><th>路由</th><th>CANID</th><th>节点序列号</th><th>型号</th><th>固件</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>`
    }
    function toggleHost (row) {
      const next = row.nextElementSibling
      if (next && next.classList.contains('device-expand')) { next.remove(); row.classList.remove('device-row--open'); return }
      const tr = document.createElement('tr')
      tr.className = 'device-expand'
      tr.setAttribute('data-sort-ignore', '')
      const td = document.createElement('td')
      td.colSpan = 8
      td.innerHTML = nodesHtml(row)
      tr.appendChild(td)
      row.after(tr)
      row.classList.add('device-row--open')
    }

    // —— 备注 / OTA 弹窗 ——
    let pending = null
    function deviceLabel (row) {
      const kind = row.hasAttribute('data-host-row') ? '主机' : '节点'
      return `${kind} ${row.dataset.serial} · ${row.dataset.model}（${row.dataset.code}）`
    }
    function openRemark (row) {
      if (!remarkDialog) return
      pending = row
      remarkDialog.querySelector('[data-remark-title]').textContent = deviceLabel(row)
      const ta = remarkDialog.querySelector('[data-remark-input]'); if (ta) ta.value = row.dataset.remark || ''
      remarkDialog.showModal()
    }
    function openOta (row) {
      if (!otaDialog) return
      pending = row
      otaDialog.querySelector('[data-ota-title]').textContent = deviceLabel(row)
      otaDialog.querySelector('[data-ota-current]').textContent = `${row.dataset.code} · 硬件同版 · 当前固件 v${row.dataset.sw}（OD ${row.dataset.od || 'V1'}）`
      otaDialog.showModal()
    }
    document.querySelector('[data-remark-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm' || !pending) return
      pending.dataset.remark = remarkDialog.querySelector('[data-remark-input]')?.value || ''
      showToast('Demo：备注尚未提交服务器')
    })
    document.querySelector('[data-ota-form]')?.addEventListener('submit', event => {
      if (event.submitter?.value !== 'confirm' || !pending) return
      const target = otaDialog.querySelector('[data-ota-target]')?.value || ''
      showToast(`Demo：已下发 OTA 到 ${pending.dataset.serial} → 目标固件 v${target}（未接入）`)
    })

    // —— 吊销 / 恢复凭据（危险，二次确认）——
    function setRevoked (row, revoked) {
      row.dataset.revoked = String(revoked)
      row.dataset.status = revoked ? 'revoked' : 'offline'
      const cell = row.children[6]
      if (cell) cell.innerHTML = revoked
        ? '<span class="status status--offline">已吊销</span>'
        : `<span class="status status--offline">离线</span><span class="device-seen">${row.dataset.lastSeen || '—'}</span>`
      renderHostActions(row)
    }

    // —— 行交互：点主机行展开；操作按钮各自处理 ——
    document.querySelectorAll('.device-table').forEach(table => {
      table.addEventListener('click', event => {
        const btn = event.target.closest('[data-action]')
        if (btn) {
          const action = btn.dataset.action
          const row = btn.closest('[data-host-row], [data-node-row]')
          if (action === 'device-remark') openRemark(row)
          else if (action === 'device-ota') openOta(row)
          else if (action === 'device-refresh') showToast(`Demo：已刷新 ${row.dataset.serial} 在线状态（host_status，未接入）`)
          else if (action === 'device-revoke') { if (window.confirm(`确认吊销主机「${row.dataset.serial}」的凭据？吊销后设备约 60 秒内 MQTT 断连。`)) { setRevoked(row, true); showToast(`Demo：已吊销 ${row.dataset.serial}（未提交服务器）`) } }
          else if (action === 'device-restore') { if (window.confirm(`确认恢复主机「${row.dataset.serial}」的凭据？`)) { setRevoked(row, false); showToast(`Demo：已恢复 ${row.dataset.serial}（未提交服务器）`) } }
          return
        }
        const hostRow = event.target.closest('[data-host-row]')
        if (hostRow) toggleHost(hostRow)
      })
    })

    // —— 顶部刷新按钮 ——
    document.querySelector('[data-action="refresh-hosts"]')?.addEventListener('click', () => showToast('Demo：已刷新全部主机在线状态（host_status，未接入）'))
    document.querySelector('[data-action="refresh-nodes"]')?.addEventListener('click', () => showToast('Demo：已刷新节点列表（未接入）'))

    // —— 主机筛选 ——
    const hostSearch = document.querySelector('[data-host-search]')
    const hostCompany = document.querySelector('[data-host-company]')
    const hostStatus = document.querySelector('[data-host-status]')
    const hostEmpty = document.querySelector('[data-host-empty]')
    const hostRows = [...document.querySelectorAll('[data-host-row]')]
    function collapseHost (row) {
      const next = row.nextElementSibling
      if (next && next.classList.contains('device-expand')) next.remove()
      row.classList.remove('device-row--open')
    }
    function applyHostFilter () {
      const kw = (hostSearch?.value || '').trim().toLowerCase()
      const company = hostCompany?.value || ''
      const status = hostStatus?.value || ''
      let visible = 0
      hostRows.forEach(row => {
        const ds = row.dataset
        const match = (!kw || ds.search.includes(kw)) && (!company || ds.company === company) && (!status || ds.status === status)
        row.hidden = !match
        if (!match) collapseHost(row)
        if (match) visible += 1
      })
      if (hostEmpty) hostEmpty.hidden = visible > 0
    }
    document.querySelector('[data-host-filter]')?.addEventListener('submit', event => event.preventDefault())
    hostSearch?.addEventListener('input', applyHostFilter)
    hostCompany?.addEventListener('change', applyHostFilter)
    hostStatus?.addEventListener('change', applyHostFilter)

    // —— 节点筛选 ——
    const nodeSearch = document.querySelector('[data-node-search]')
    const nodeHost = document.querySelector('[data-node-host]')
    const nodeStatus = document.querySelector('[data-node-status]')
    const nodeEmpty = document.querySelector('[data-node-empty]')
    const nodeRows = [...document.querySelectorAll('[data-node-row]')]
    function applyNodeFilter () {
      const kw = (nodeSearch?.value || '').trim().toLowerCase()
      const host = nodeHost?.value || ''
      const status = nodeStatus?.value || ''
      let visible = 0
      nodeRows.forEach(row => {
        const ds = row.dataset
        const hostMatch = !host || (host === '__unbound' ? !ds.host : ds.host === host)
        const match = (!kw || ds.search.includes(kw)) && hostMatch && (!status || ds.status === status)
        row.hidden = !match
        if (match) visible += 1
      })
      if (nodeEmpty) nodeEmpty.hidden = visible > 0
    }
    document.querySelector('[data-node-filter]')?.addEventListener('submit', event => event.preventDefault())
    nodeSearch?.addEventListener('input', applyNodeFilter)
    nodeHost?.addEventListener('change', applyNodeFilter)
    nodeStatus?.addEventListener('change', applyNodeFilter)
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
