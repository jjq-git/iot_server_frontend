<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: email is the sole login identifier in the target UI. Before integration, change LoginRequest/AuthService from username lookup to normalized unique email and update the production client payload. -->
<main class="login-page">
  <section class="login-visual" aria-label="德恩基 IoT 管理平台">
    <div class="login-platform-brand">
      <span class="login-platform-mark"><img src="../../../src/api/img/logo.svg" alt=""></span>
      <div class="login-platform-copy">
        <h1 class="login-visual-title">静音仓管理平台</h1>
        <p class="login-visual-subtitle">实时掌握设备状态，轻松预约会议，随时在线控制。</p>
      </div>
    </div>
  </section>

  <section class="login-panel">
    <div class="login-panel-spacer"></div>
    <div class="login-form-wrap">
      <h1 class="login-title">登录</h1>
      <p class="login-description">请输入您的邮箱和密码，进入静音仓管理平台。</p>

      <form class="login-form" data-login-form novalidate>
        <label class="login-field" for="email-input">
          <span class="login-field-label">邮箱</span>
          <span class="login-input-shell">
            <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-envelope"></use></svg>
            <input id="email-input" name="email" type="email" placeholder="name@example.com" autocomplete="username" required>
          </span>
        </label>

        <label class="login-field" for="password-input">
          <span class="login-field-label">密码</span>
          <span class="login-input-shell">
            <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-lock"></use></svg>
            <input id="password-input" name="password" type="password" placeholder="请输入密码" autocomplete="current-password" required>
            <button class="login-password-toggle" type="button" data-action="toggle-password" aria-label="显示密码" title="显示密码">
              <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg>
            </button>
          </span>
        </label>

        <div class="login-options">
          <button class="login-remember" type="button" data-action="toggle-remember" aria-pressed="true">
            <span class="login-checkbox is-checked" aria-hidden="true"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-check"></use></svg></span><span>记住登录状态</span>
          </button>
          <a class="login-forgot" href="#forgot">忘记密码？</a>
        </div>

        <div class="login-error" role="alert" hidden></div>
        <button class="login-submit" type="submit">登录</button>
      </form>
    </div>
    <div class="login-panel-spacer"></div>
    <footer class="login-footer">© 德恩基</footer>
  </section>
</main>
