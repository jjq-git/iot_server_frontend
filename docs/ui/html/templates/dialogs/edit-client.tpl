<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: PUT /api/v1/companies/{uuid} —— company_code 不可改；short_name 不可置空；客户类型（is_*）由上级维护、is_enduser 与其他项互斥；contact_* 为公司联系人。管理员账号不在此弹窗，走客户详情的「编辑 / 增加管理员」。 -->
<dialog class="modal modal--wide" id="edit-client-dialog" aria-labelledby="edit-client-title">
  <form method="dialog" data-edit-client-form>
    <header class="modal__header">
      <div><h2 id="edit-client-title">编辑客户</h2><p>编码 <span class="mono" data-edit-client-field="code">—</span></p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span>公司名称</span><input name="company_name" data-edit-client-input="name" required></label>
      <label class="form-field"><span>联系人</span><input name="contact_person" data-edit-client-input="contact" placeholder="选填"></label>

      <label class="form-field"><span>公司简称</span><input name="short_name" data-edit-client-input="shortName" required></label>
      <label class="form-field"><span>手机号码</span><input name="contact_phone" type="tel" data-edit-client-input="contactPhone" placeholder="选填"></label>

      <div class="form-field"><label>公司类型</label>
        <div class="multi-select" data-client-roles>
          <button type="button" class="multi-select__trigger" data-multi-select-trigger aria-expanded="false"><span class="multi-select__summary" data-multi-select-summary>请选择</span><svg class="app-icon app-icon--fill multi-select__caret" aria-hidden="true"><use href="icons.svg#icon-chevron-down"></use></svg></button>
          <div class="multi-select__panel" hidden>
            <label class="role-check" data-role-option="manufacturer"><input type="checkbox" name="role" value="manufacturer" data-role-upstream><span>静音仓厂家</span></label>
            <label class="role-check" data-role-option="brand"><input type="checkbox" name="role" value="brand" data-role-upstream><span>品牌方</span></label>
            <label class="role-check" data-role-option="channel"><input type="checkbox" name="role" value="channel" data-role-upstream><span>渠道 / 分销</span></label>
            <label class="role-check" data-role-option="enduser"><input type="checkbox" name="role" value="enduser" data-role-enduser><span>最终用户</span></label>
          </div>
        </div>
        <small class="form-help" data-client-roles-note>已选择：—</small>
      </div>
      <label class="form-field"><span>邮箱</span><input name="contact_email" type="email" data-edit-client-input="contactEmail" placeholder="选填"></label>

      <div class="form-field"><label for="edit-client-domain">登录入口</label><span class="domain-field"><span class="domain-field__prefix">https://pods.dengtec.com/</span><input id="edit-client-domain" name="domain_subpath" data-edit-client-input="domainSubpath" placeholder="可选填"><button class="button button--secondary button--icon-only" type="button" data-action="check-domain" aria-label="检查是否可用" title="检查是否可用"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-search"></use></svg></button></span></div>
      <div class="form-field"><span>账号状态</span><span class="form-switch form-switch--compact"><span><strong>启用账号</strong></span><label class="form-switch__toggle"><input name="is_active" type="checkbox" role="switch" value="true" data-edit-client-input="active" aria-label="启用账号"><span class="form-switch__control" aria-hidden="true"></span></label></span><small>停用后该客户不能登录。</small></div>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
