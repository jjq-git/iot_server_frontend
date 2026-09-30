<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 只读详情来自 GET /api/v1/companies/{uuid}；"联系人"=contact_person（与管理员用户不同概念）；国家/地址由 location_id→locations 派生；下钻范围（下级公司/静音仓/人员）按公司类型 + scope 决定，前端按权限显隐。 -->
<!-- 样式：沿用管理员「查看用户」的分节键值表（user-detail-table + __section），不用扁平表。 -->
<dialog class="modal modal--wide" id="view-client-dialog" aria-labelledby="view-client-title">
  <form method="dialog">
    <header class="modal__header">
      <div class="model-detail-heading">
        <span class="model-detail-heading__avatar" aria-hidden="true"><svg class="app-icon app-icon--fill"><use href="icons.svg#icon-building"></use></svg></span>
        <div class="model-detail-heading__summary">
          <span class="client-detail-heading__titles">
            <h2 id="view-client-title" data-view-client-field="shortName">—</h2>
            <span class="cell-sub mono" data-view-client-field="code">—</span>
          </span>
          <span class="status" data-view-client-field="status">—</span>
        </div>
      </div>
      <button class="icon-button modal__close" value="cancel" aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body">
      <table class="user-detail-table">
        <caption class="sr-only">客户详细信息</caption>
        <colgroup><col class="user-detail-table__label"><col><col class="user-detail-table__label"><col></colgroup>
        <tbody>
          <tr class="user-detail-table__section"><th colspan="4"><span><svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-building"></use></svg>客户资料</span></th></tr>
          <tr><th scope="row">公司全称</th><td data-view-client-field="name">—</td><th scope="row">联系人</th><td data-view-client-field="contact">—</td></tr>
          <tr><th scope="row">客户类型</th><td data-view-client-field="roles">—</td><th scope="row">联系电话</th><td data-view-client-field="contactPhone">—</td></tr>
          <tr><th scope="row">地点</th><td data-view-client-field="location">—</td><th scope="row">联系邮箱</th><td data-view-client-field="contactEmail">—</td></tr>
          <tr><th scope="row">域名</th><td class="mono" colspan="3" data-view-client-field="domain">—</td></tr>
        </tbody>
      </table>
      <div class="client-stats" aria-label="客户概况">
        <div class="client-stat"><span class="client-stat__label">客户数</span><strong class="client-stat__value" data-view-client-field="clientCount">—</strong></div>
        <div class="client-stat"><span class="client-stat__label">管理员</span><span class="client-stat__value client-stat__value--text" data-view-client-field="adminName" hidden>—</span><button class="button button--secondary button--sm" type="button" data-action="edit-client-admin" hidden>编辑</button><button class="button button--secondary button--sm" type="button" data-action="add-client-admin" hidden>增加管理员</button></div>
        <div class="client-stat"><span class="client-stat__label">静音仓型号</span><strong class="client-stat__value" data-view-client-field="podModelCount">—</strong></div>
        <div class="client-stat"><span class="client-stat__label">静音仓</span><strong class="client-stat__value" data-view-client-field="podCount">—</strong></div>
      </div>
    </div>
    <footer class="modal__footer"><button class="button button--primary" value="cancel">关闭</button></footer>
  </form>
</dialog>
