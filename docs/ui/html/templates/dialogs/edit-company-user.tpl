<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: submit only display_name and is_active through PUT /api/v1/users/{user_id}; submit role separately through PUT /api/v1/users/{user_id}/role. Admin may manage operator/data_entry/viewer; operator may manage data_entry/viewer only. This form does not display or submit phone, and never submits email. -->
<!-- Handoff: email is the immutable login identifier. The current UserUpdateRequest still accepts email, so immutability must also be enforced server-side rather than relying on readonly HTML. -->
<!-- Handoff: the backend does not yet provide an administrator password-reset endpoint. Add an audited POST /api/v1/users/{user_id}/reset-password that validates policy, hashes the new password, sets must_change_password=true, updates password_changed_at and revokes existing sessions. Never accept or expose hashed_password. -->
<!-- Handoff: keep the three two-column rows in this order: readonly email/name, role/account status, new password/confirmation. Phone and all other user fields are intentionally absent. -->
<dialog class="modal modal--wide" id="edit-company-user-dialog" aria-labelledby="edit-company-user-title">
  <form method="dialog" data-edit-company-user-form>
    <header class="modal__header">
      <div><h2 id="edit-company-user-title">编辑用户</h2><p>修改用户角色、账号状态或重新设置密码。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <input name="user_key" type="hidden">
      <label class="form-field"><span>登录邮箱</span><input name="email" type="email" readonly title="邮箱是唯一登录账号，不能修改" aria-description="邮箱是唯一登录账号，不能修改"></label>
      <label class="form-field"><span>姓名</span><input name="display_name" autocomplete="name" required></label>
      <!-- Handoff: 权限说明 → 打开角色权限对照（对应「权限」区 / 角色权限基线）。不同角色 = 不同功能权限。 -->
      <label class="form-field"><span>角色</span><select name="role" required><option value="operator">运营管理</option><option value="data_entry">数据录入</option><option value="viewer">信息查看</option></select><small>不同角色对应不同权限，参考 <a href="#" data-action="view-role-permissions">权限说明</a>。</small></label>
      <div class="form-field"><span>账号状态</span><span class="form-switch form-switch--compact"><span><strong>启用账号</strong></span><label class="form-switch__toggle"><input name="is_active" type="checkbox" role="switch" value="true" aria-label="启用账号"><span class="form-switch__control" aria-hidden="true"></span></label></span><small>停用后该用户不能登录。</small></div>
      <div class="form-field"><label for="edit-user-password">重新设置密码</label><span class="form-password"><input id="edit-user-password" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="不修改请留空"><button class="form-password__toggle" type="button" data-password-toggle aria-controls="edit-user-password" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <div class="form-field"><label for="edit-user-password-confirmation">确认新密码</label><span class="form-password"><input id="edit-user-password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" placeholder="再次输入新密码"><button class="form-password__toggle" type="button" data-password-toggle aria-controls="edit-user-password-confirmation" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <p class="form-help form-field--full">不修改密码时请留空；重新设置后，用户下次登录必须修改密码。</p>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
