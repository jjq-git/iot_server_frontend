<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: POST /api/v1/users with company_id fixed to the current company. assigned_scope defaults to [] and must remain within writable_companies; the base company scope is derived from company_id. -->
<!-- Handoff: the Demo requires display_name for a usable list label, although UserCreateRequest currently allows it to be null. platform_admin/admin cannot be granted here; operator can only grant data_entry/viewer. -->
<!-- Handoff: the target contract uses unique email as the sole login identifier. The backend currently still requires username in UserCreateRequest and authenticates User.username; migrate those contracts before integration instead of synthesizing a hidden username in the UI. -->
<!-- Handoff: is_active and must_change_password both default to true in the Demo. UserCreateRequest currently exposes neither; add both booleans to the create contract so the administrator's explicit choices can be persisted. -->
<!-- Handoff: keep unique email before display name in the first form row. Password confirmation is client-side only and must not be included in the API payload. -->
<dialog class="modal modal--wide" id="create-company-user-dialog" aria-labelledby="create-company-user-title">
  <form method="dialog" data-create-company-user-form>
    <header class="modal__header">
      <div><h2 id="create-company-user-title">新建用户</h2><p>创建本公司用户。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span>邮箱</span><input name="email" type="email" autocomplete="username" placeholder="name@example.com" required></label>
      <label class="form-field"><span>姓名</span><input name="display_name" autocomplete="name" placeholder="请输入姓名" required></label>
      <label class="form-field"><span>电话</span><input name="phone" type="tel" autocomplete="tel" placeholder="选填"></label>
      <label class="form-field"><span>角色</span><select name="role" required><option value="">请选择角色</option><option value="operator">运营管理</option><option value="data_entry">数据录入</option><option value="viewer">信息查看</option></select></label>
      <label class="form-field"><span>账号状态</span><span class="form-switch"><span><strong>启用账号</strong><small>关闭后暂时不能登录。</small></span><input name="is_active" type="checkbox" role="switch" value="true" checked><span class="form-switch__control" aria-hidden="true"></span></span></label>
      <label class="form-field"><span>登录安全</span><span class="form-switch"><span><strong>首次登录修改密码</strong><small>使用初始密码登录后必须修改。</small></span><input name="must_change_password" type="checkbox" role="switch" value="true" checked><span class="form-switch__control" aria-hidden="true"></span></span></label>
      <div class="form-field"><label for="create-user-password">密码</label><span class="form-password"><input id="create-user-password" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="至少 8 位" required><button class="form-password__toggle" type="button" data-password-toggle aria-controls="create-user-password" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <div class="form-field"><label for="create-user-password-confirmation">确认密码</label><span class="form-password"><input id="create-user-password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" placeholder="再次输入密码" required><button class="form-password__toggle" type="button" data-password-toggle aria-controls="create-user-password-confirmation" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <p class="form-help form-field--full">密码必须同时包含字母和数字；用户首次登录后需要修改。</p>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">创建用户</button></footer>
  </form>
</dialog>
