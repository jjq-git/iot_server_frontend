<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<header class="topbar">
  <button class="icon-button topbar__menu" type="button" data-action="open-sidebar" aria-label="打开菜单">
    <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-menu"></use></svg>
  </button>

  <div class="page-identity">
    <span class="page-identity__icon">
      <svg class="app-icon app-icon--line" aria-hidden="true"><use data-page-icon-target href="icons.svg#icon-controller-host"></use></svg>
    </span>
    <div>
      <h1 data-page-title-target>主机</h1>
      <nav class="breadcrumb" data-page-breadcrumb aria-label="面包屑">
        <a href="#home">首页</a><span aria-hidden="true">/</span><a href="#controllers">控制器</a>
      </nav>
    </div>
  </div>

  <!-- Demo-only switchers: production derives company type and role from the authenticated session; users must never choose their own permission. -->
  <div class="demo-menu-switchers" aria-label="菜单权限预览">
    <label class="demo-company-view">
      <span>菜单视图</span>
      <select data-company-view aria-label="切换公司菜单视图">
        <option value="platform">平台公司</option>
        <option value="manufacturer">静音仓生产厂家</option>
        <option value="business">其他业务公司</option>
        <option value="enduser">最终客户</option>
      </select>
    </label>
    <label class="demo-company-view">
      <span>用户权限</span>
      <select data-user-role-view aria-label="切换用户权限视图">
        <option value="admin">管理员</option>
        <option value="operator">运营管理</option>
        <option value="data_entry">数据录入</option>
        <option value="viewer">信息查看</option>
      </select>
    </label>
  </div>

  <div class="topbar__actions">
    <button class="icon-button" type="button" data-action="toggle-theme" aria-label="切换深浅主题" title="切换深浅主题">
      <svg class="app-icon app-icon--fill theme-icon" aria-hidden="true"><use href="icons.svg#icon-moon"></use></svg>
    </button>
    <button class="icon-button notification-button" type="button" aria-label="通知，2 条未读" title="通知">
      <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-bell"></use></svg>
      <span class="notification-dot" aria-hidden="true"></span>
    </button>
    <div class="user-menu-wrap" data-user-menu-root>
      <button
        class="avatar-button"
        type="button"
        data-action="toggle-user-menu"
        aria-label="打开用户菜单"
        aria-expanded="false"
        aria-controls="topbar-user-menu"
        title="用户"
      >
        <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-person-circle"></use></svg>
      </button>

      <div class="user-menu" id="topbar-user-menu" hidden>
        <button class="user-menu__header" type="button" data-user-command="profile">
          <span class="user-menu__avatar" aria-hidden="true">管</span>
          <span class="user-menu__identity">
            <strong>管理员</strong>
            <span>admin</span>
          </span>
        </button>

        <dl class="user-menu__details">
          <div class="user-menu__detail user-menu__detail--icon">
            <dt>
              <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-shield-check"></use></svg>
              <span class="sr-only">角色</span>
            </dt>
            <!-- Handoff: show the unified label "管理员"; the backend role is platform_admin for the platform company and admin for tenant companies. -->
            <dd data-current-user-role-label>管理员</dd>
          </div>
        </dl>

        <!-- Handoff: company settings and Personal Center are page views inside this admin shell. Keep the current-company action above Personal Center and do not add a duplicate "My Company" sidebar entry. -->
        <div class="user-menu__actions">
          <button type="button" data-action="open-company-settings">
            <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-building"></use></svg>
            <span data-current-company-name>德恩基平台公司</span>
          </button>
          <button type="button" data-user-command="profile">
            <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-person"></use></svg>
            <span>个人中心</span>
          </button>
          <button class="user-menu__logout" type="button" data-user-command="logout">
            <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-box-arrow-right"></use></svg>
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</header>
