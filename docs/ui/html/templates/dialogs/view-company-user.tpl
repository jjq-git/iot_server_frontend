<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: populate from GET /api/v1/users/{user_id}. Show all safe account metadata, but never return or render hashed_password. last_login_ip, must_change_password, password_changed_at and updated_at are present on the table but must be added to UserResponse if the product needs them here. -->
<dialog class="modal modal--wide" id="view-company-user-dialog" aria-labelledby="view-company-user-title">
  <form method="dialog">
    <header class="modal__header">
      <div><h2 id="view-company-user-title">查看用户</h2><p>查看账号资料、权限摘要与系统信息。</p></div>
      <button class="icon-button modal__close" value="cancel" aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body user-profile-form" data-user-profile-view>
      <div data-include="templates/shared/user-profile-fields.tpl"></div>
    </div>
    <footer class="modal__footer"><button class="button button--primary" value="cancel">关闭</button></footer>
  </form>
</dialog>
