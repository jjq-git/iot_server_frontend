<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<aside class="sidebar" id="sidebar" aria-label="主导航">
  <div class="company-brand">
    <!-- Handoff: 品牌 Logo 链接到首页；生产为 `/`（首页 = 数据看板落地页），Demo 指 admin.html。 -->
    <a class="company-brand__home" href="admin.html?view=home" aria-label="返回首页" title="首页"><img class="company-brand__logo" src="../../../src/api/img/logo.svg" alt=""></a>
    <!-- Handoff: company-brand__name 取 companies.short_name；company-brand__slogan 取目标新增字段 companies.slogan（未落库前 Demo 静态展示）。 -->
    <span class="company-brand__title">
      <span class="company-brand__name" data-company-name>德恩基</span>
      <span class="company-brand__slogan" data-company-slogan>让每一次沟通更专注</span>
    </span>
    <button class="icon-button company-brand__settings" type="button" data-action="open-company-settings" aria-label="公司设置" title="公司设置">
      <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-gear"></use></svg>
    </button>
  </div>

  <nav class="sidebar-nav" data-sidebar-nav aria-label="功能菜单"></nav>
</aside>
