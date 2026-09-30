(function () {
  let initialized = false

  function init () {
    if (initialized) return
    initialized = true
    window.UiDemoTheme.init()

    const form = document.querySelector('[data-login-form]')
    const password = document.querySelector('#password-input')
    const passwordButton = document.querySelector('[data-action="toggle-password"]')
    const passwordIcon = passwordButton.querySelector('use')
    const rememberButton = document.querySelector('[data-action="toggle-remember"]')
    const checkbox = rememberButton.querySelector('.login-checkbox')
    const errorBox = document.querySelector('.login-error')

    passwordButton.addEventListener('click', () => {
      const willShow = password.type === 'password'
      password.type = willShow ? 'text' : 'password'
      passwordIcon.setAttribute('href', `icons.svg#icon-${willShow ? 'eye-slash' : 'eye'}`)
      passwordButton.setAttribute('aria-label', willShow ? '隐藏密码' : '显示密码')
      passwordButton.setAttribute('title', passwordButton.getAttribute('aria-label'))
    })

    rememberButton.addEventListener('click', () => {
      const checked = rememberButton.getAttribute('aria-pressed') !== 'true'
      rememberButton.setAttribute('aria-pressed', String(checked))
      checkbox.classList.toggle('is-checked', checked)
    })

    form.addEventListener('submit', event => {
      event.preventDefault()
      errorBox.hidden = true
      const email = form.elements.email.value.trim()
      const passwordValue = form.elements.password.value

      if (!email || !passwordValue) {
        errorBox.textContent = !email ? '请输入邮箱' : '请输入密码'
        errorBox.hidden = false
        form.elements[!email ? 'email' : 'password'].focus()
        return
      }

      if (!form.elements.email.validity.valid) {
        errorBox.textContent = '请输入有效的邮箱地址'
        errorBox.hidden = false
        form.elements.email.focus()
        return
      }

      const submit = form.querySelector('.login-submit')
      submit.disabled = true
      submit.textContent = '登录中…'
      window.setTimeout(() => {
        submit.disabled = false
        submit.textContent = '登录'
        errorBox.textContent = 'Demo 页面不连接真实登录接口'
        errorBox.hidden = false
      }, 700)
    })
  }

  if (document.documentElement.dataset.templatesReady === 'true') init()
  else document.addEventListener('ui:templates-ready', init, { once: true })
})()
