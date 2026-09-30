<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: the matrix is an interactive UI Demo only. Persist these selections only after a feature-permission model and APIs exist. -->
<div class="company-panel__heading">
  <div><h3>权限设置</h3><p>查看本公司的角色分工与功能权限。</p></div>
  <button class="button button--secondary button--icon-only" type="submit" form="company-permission-form" aria-label="保存" title="保存">
    <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-save"></use></svg>
  </button>
</div>

<form class="content-card permission-matrix" id="company-permission-form" data-permission-form aria-label="权限设置">
  <div class="table-scroll" role="region" aria-label="角色功能权限，可横向滚动" tabindex="0">
    <table>
      <thead><tr><th scope="col">功能</th><th scope="col">管理员</th><th scope="col">运营管理</th><th scope="col">数据录入</th><th scope="col">数据查看</th></tr></thead>
      <tbody data-permission-rows></tbody>
    </table>
  </div>
</form>
