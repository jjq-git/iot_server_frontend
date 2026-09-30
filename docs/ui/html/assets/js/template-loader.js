(function () {
  const root = document.documentElement

  async function replaceInclude (placeholder) {
    const source = placeholder.dataset.include
    const response = await window.fetch(new URL(source, document.baseURI))
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)

    const template = document.createElement('template')
    template.innerHTML = await response.text()
    placeholder.replaceWith(template.content)
  }

  async function loadTemplates () {
    root.classList.add('is-loading-templates')
    const errors = []

    while (true) {
      const placeholders = [...document.querySelectorAll('[data-include]')]
      if (placeholders.length === 0) break

      await Promise.all(placeholders.map(async placeholder => {
        try {
          await replaceInclude(placeholder)
        } catch (error) {
          errors.push({ source: placeholder.dataset.include, error })
          const message = document.createElement('div')
          message.className = 'template-error'
          message.textContent = `模板加载失败：${placeholder.dataset.include}。请通过 Go Live / Live Server 打开。`
          placeholder.replaceWith(message)
        }
      }))
    }

    root.classList.remove('is-loading-templates')
    root.dataset.templatesReady = 'true'
    document.dispatchEvent(new CustomEvent('ui:templates-ready', { detail: { errors } }))
  }

  loadTemplates()
})()
