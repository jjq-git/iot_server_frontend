<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 编辑该客户的管理员用户（users role=admin）：display_name / is_active 走 PUT /api/v1/users/{id}；重置密码走受审计的 POST /api/v1/users/{id}/reset-password（待后端新增）。email 是唯一登录标识不可改（服务端也要拦）；确认密码仅前端校验，不进 payload。 -->
<dialog class="modal modal--wide" id="edit-client-admin-dialog" aria-labelledby="edit-client-admin-title">
  <form method="dialog" data-edit-client-admin-form>
    <header class="modal__header">
      <div><h2 id="edit-client-admin-title">编辑管理员</h2><p>修改管理员姓名、账号状态或重新设置密码。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body">
      <!-- 一个公司可有多个管理员：tab 切换不同管理员，末尾「＋ 增加」为新建。tab 由 client-demo.js 按该客户 data-admins 生成。 -->
      <div class="admin-tabs" data-admin-tabs role="tablist" aria-label="管理员"></div>
    <div class="form-grid">
      <label class="form-field"><span>登录邮箱</span><input name="email" type="email" readonly title="邮箱是唯一登录账号，不能修改" data-client-admin-input="email"></label>
      <label class="form-field"><span>姓名</span><input name="display_name" autocomplete="name" required data-client-admin-input="name"></label>
      <label class="form-field"><span>角色</span><input value="管理员" readonly title="公司管理员角色固定"><small>公司管理员，管理本公司用户与下级客户。</small></label>
      <div class="form-field"><span>账号状态</span><span class="form-switch form-switch--compact"><span><strong>启用账号</strong></span><label class="form-switch__toggle"><input name="is_active" type="checkbox" role="switch" value="true" checked aria-label="启用账号"><span class="form-switch__control" aria-hidden="true"></span></label></span><small>停用后该管理员不能登录。</small></div>
      <div class="form-field"><label for="edit-client-admin-password">重新设置密码</label><span class="form-password"><input id="edit-client-admin-password" name="password" type="password" autocomplete="new-password" minlength="8" placeholder="不修改请留空"><button class="form-password__toggle" type="button" data-password-toggle aria-controls="edit-client-admin-password" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <div class="form-field"><label for="edit-client-admin-password-confirmation">确认新密码</label><span class="form-password"><input id="edit-client-admin-password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" placeholder="再次输入新密码"><button class="form-password__toggle" type="button" data-password-toggle aria-controls="edit-client-admin-password-confirmation" aria-label="显示密码" title="显示密码"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-eye"></use></svg></button></span></div>
      <p class="form-help form-field--full">不修改密码时请留空；重新设置后，管理员下次登录必须修改密码。</p>
    </div>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
