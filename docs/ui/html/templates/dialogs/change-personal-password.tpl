<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: submit old_password and new_password through POST /api/v1/users/me/change-password. password_confirmation is client-side only. The endpoint is rate-limited to 3/minute; a successful change invalidates old tokens and requires a fresh login. -->
<dialog class="modal" id="change-personal-password-dialog" aria-labelledby="change-personal-password-title">
  <form method="dialog" data-change-personal-password-form>
    <header class="modal__header">
      <div><h2 id="change-personal-password-title">修改密码</h2><p>修改成功后需要重新登录。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <div class="form-field form-field--full"><label for="personal-current-password">当前密码</label><span class="form-password"><input id="personal-current-password" name="old_password" type="password" autocomplete="current-password" placeholder="请输入当前密码" required><button class="form-password__toggle" type="button" data-password-toggle aria-controls="personal-current-password" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <div class="form-field"><label for="personal-new-password">新密码</label><span class="form-password"><input id="personal-new-password" name="new_password" type="password" autocomplete="new-password" minlength="8" placeholder="至少 8 位" required><button class="form-password__toggle" type="button" data-password-toggle aria-controls="personal-new-password" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <div class="form-field"><label for="personal-new-password-confirmation">确认新密码</label><span class="form-password"><input id="personal-new-password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" placeholder="再次输入新密码" required><button class="form-password__toggle" type="button" data-password-toggle aria-controls="personal-new-password-confirmation" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <p class="form-help form-field--full">新密码至少 8 位，并同时包含字母和数字。</p>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">修改密码</button></footer>
  </form>
</dialog>
