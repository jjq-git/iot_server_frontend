(function () {
  // 首页看板：KPI 卡与图表按当前公司类型（平/静/中/终）显隐，并支持 KPI 卡下钻到对应列表页。
  // 生产由后端按公司类型 + company_dashboards 返回应展示的内容；此处仅演示显隐与下钻。
  let initialized = false

  function applyProfile () {
    const profile = document.body.dataset.companyProfile || 'platform'
    const dashboard = document.querySelector('.dashboard')
    if (!dashboard) return

    let visibleCharts = 0
    let visibleKpis = 0
    dashboard.querySelectorAll('[data-company-types]').forEach(node => {
      const types = node.dataset.companyTypes.split(/\s+/)
      const show = types.includes(profile)
      node.hidden = !show
      if (show && node.classList.contains('chart-card')) visibleCharts += 1
      if (show && node.classList.contains('kpi-card')) visibleKpis += 1
    })

    // KPI 区对最终用户为空（其首页改为"我的静音仓"），整段隐藏避免留白。
    const kpiSection = dashboard.querySelector('[data-kpi-section]')
    if (kpiSection) kpiSection.hidden = visibleKpis === 0

    const empty = dashboard.querySelector('[data-dashboard-empty]')
    if (empty) empty.hidden = visibleCharts > 0
  }

  function init () {
    if (initialized) return
    initialized = true

    applyProfile()
    document.addEventListener('ui:company-profile-change', applyProfile)

    document.querySelector('[data-kpi-grid]')?.addEventListener('click', event => {
      const card = event.target.closest('[data-kpi-view]')
      if (!card) return
      const view = card.dataset.kpiView
      if (document.querySelector(`[data-page-view="${view}"]`)) window.UiDemoShell?.setPageView(view, true)
      else window.UiDemoShell?.showToast('Demo：该列表页尚未接入')
    })

    // 最终用户点静音仓卡片 → 该仓控制页（控制页尚未建原型，Demo 以 toast 占位）。
    document.querySelector('.my-pods')?.addEventListener('click', event => {
      const card = event.target.closest('[data-pod-view]')
      if (!card) return
      window.UiDemoShell?.showToast(`Demo：进入 ${card.dataset.podName} 控制页`)
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
