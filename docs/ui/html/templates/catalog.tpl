<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<main class="catalog">
  <header class="catalog__header">
    <img src="../../../src/api/img/logo.svg" alt="" width="42" height="42">
    <div>
      <p>UI DEMO</p>
      <h1>可交互页面 Demo</h1>
    </div>
  </header>

  <p class="catalog__intro">用于确认页面结构、图标、颜色、间距、响应式和基础交互。页面不连接真实 API。</p>

  <section class="catalog__grid" aria-label="Demo 页面">
    <a class="demo-card" href="admin.html">
      <span class="demo-card__icon">
        <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg>
      </span>
      <span>
        <strong>后台标准布局</strong>
        <small>侧栏、顶部页名与面包屑、标准主机列表和新增弹窗</small>
      </span>
      <svg class="app-icon app-icon--line demo-card__arrow" aria-hidden="true"><use href="icons.svg#icon-arrow-right"></use></svg>
    </a>

    <a class="demo-card" href="login.html">
      <span class="demo-card__icon">
        <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-lock"></use></svg>
      </span>
      <span>
        <strong>登录页面</strong>
        <small>复用现有 Login.vue 的左右分栏、品牌区、表单与主题交互</small>
      </span>
      <svg class="app-icon app-icon--line demo-card__arrow" aria-hidden="true"><use href="icons.svg#icon-arrow-right"></use></svg>
    </a>

  </section>

  <footer class="catalog__footer">请通过 Go Live / Live Server 访问，以保证外部 SVG Sprite 和 HTML 模板正常加载。</footer>
</main>
