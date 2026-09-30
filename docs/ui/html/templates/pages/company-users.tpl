<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: request GET /api/v1/users with company_id set to the current company; do not silently include descendant companies from allowed_companies. -->
<!-- Handoff: this page is available to platform_admin/admin/operator. Admin may manage operator/data_entry/viewer; operator may manage data_entry/viewer only. Users cannot change their own role or disable themselves. -->
<!-- Handoff: exclude platform_admin/admin records from this list. The current administrator maintains personal data in Personal Center; administrator transfer requires a separate privileged workflow. -->
<!-- Handoff: users.display_name remains a valid user field and is unrelated to the planned removal of companies.display_name. assigned_scope belongs in user detail and must stay within writable_companies. -->
<!-- Handoff: target role values are operator/data_entry/viewer; their fixed UI labels are 运营管理/数据录入/信息查看. Backend migration and target-role authorization are tracked in iot_server_backend#21. -->
<div class="company-panel__heading">
  <div><h3>人员</h3><p>管理本公司的用户。</p></div>
  <button class="button button--secondary button--icon-only" type="button" data-action="create-company-user" aria-label="新增用户" title="新增用户">
    <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-person-add"></use></svg>
  </button>
</div>

<section class="content-card company-users-card" aria-label="公司用户列表">
  <!-- Handoff: 人员数量少，去掉搜索/筛选；新增移到标题。visible columns map to display_name, phone, role, is_active and last_login. -->
  <!-- Handoff: visible columns map to display_name, phone, role, is_active and last_login. Unique email stays searchable and belongs in detail/edit, not this compact list. -->
  <div class="table-scroll company-users-table" role="region" aria-label="公司用户列表，可横向滚动" tabindex="0">
    <table data-sortable-table>
      <thead>
        <tr>
          <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按用户排序"><span>用户</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
          <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按电话排序"><span>电话</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
          <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按角色排序"><span>角色</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
          <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按状态排序"><span>状态</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
          <th scope="col" aria-sort="none"><button class="table-sort" type="button" data-sort-type="date" aria-label="按最后登录时间排序"><span>最后登录</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
          <th scope="col" class="table-actions">操作</th>
        </tr>
      </thead>
      <tbody data-company-user-rows>
        <tr data-user-row data-user-key="wang" data-search="王工 wang.gong@dengtec.com" data-role="operator" data-active="true"><td data-sort-value="王工"><span class="company-user-identity"><span class="company-user-avatar" aria-hidden="true">王</span><strong>王工</strong></span></td><td>137 0000 6512</td><td>运营管理</td><td><span class="status">已启用</span></td><td>2026-09-01 16:20</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-user" data-user-key="wang" data-user-name="王工" aria-label="查看王工" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="edit-company-user" data-user-key="wang" data-user-name="王工" aria-label="编辑王工" title="编辑"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-pencil"></use></svg></button></td></tr>
        <tr data-user-row data-user-key="liu" data-search="刘敏 liu.min@dengtec.com" data-role="data_entry" data-active="true"><td data-sort-value="刘敏"><span class="company-user-identity"><span class="company-user-avatar" aria-hidden="true">刘</span><strong>刘敏</strong></span></td><td>136 0000 8240</td><td>数据录入</td><td><span class="status">已启用</span></td><td>2026-08-30 09:12</td><td class="table-actions"><button class="icon-button table-action-button" type="button" data-action="view-company-user" data-user-key="liu" data-user-name="刘敏" aria-label="查看刘敏" title="查看"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button><button class="icon-button table-action-button" type="button" data-action="edit-company-user" data-user-key="liu" data-user-name="刘敏" aria-label="编辑刘敏" title="编辑"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-pencil"></use></svg></button></td></tr>
        <tr class="company-users-empty" data-company-users-empty data-sort-ignore hidden><td colspan="6">没有符合条件的用户</td></tr>
      </tbody>
    </table>
  </div>

  <footer class="content-card__footer">
    <span data-company-user-count>第 1–2 条，共 2 条</span>
    <nav class="pagination" aria-label="用户列表分页"><button type="button" disabled aria-label="上一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-left"></use></svg></button><button class="is-current" type="button" aria-current="page">1</button><button type="button" disabled aria-label="下一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg></button></nav>
  </footer>
</section>
