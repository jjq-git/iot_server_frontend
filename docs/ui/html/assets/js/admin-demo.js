(function () {
  // 主机列表页的最小交互（新增主机弹窗 + 刷新）。型号页交互见 model-demo.js。
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true

    const dialog = document.querySelector('#create-host-dialog')
    const showToast = window.UiDemoShell?.showToast || (() => {})

    document.querySelector('[data-action="refresh"]')?.addEventListener('click', event => {
      event.currentTarget.querySelector('.app-icon')?.animate(
        [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
        { duration: 420, easing: 'ease-out' }
      )
      showToast('主机列表已刷新')
    })

    document.querySelector('[data-action="open-create-dialog"]')?.addEventListener('click', () => {
      if (typeof dialog?.showModal === 'function') dialog.showModal()
      else showToast('当前浏览器不支持原生对话框')
    })
    dialog?.addEventListener('close', () => {
      if (dialog.returnValue === 'confirm') showToast('Demo：主机信息尚未提交')
    })

    document.querySelectorAll('[data-demo-form]').forEach(form => {
      form.addEventListener('submit', event => event.preventDefault())
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
