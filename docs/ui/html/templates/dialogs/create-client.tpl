<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: POST /api/v1/companies —— 不接收 company_code（后端 CO-XXXXXX 生成）；parent_com_id 由后端按当前登录公司隐式写入；含 contact_person/phone/email 联系人。管理员账号不在本弹窗建，改在客户「人员」页单独增加（见 view-client 的"增加管理员"）。 -->
<!-- Handoff: 客户类型选项按当前公司类型限定（平台=全部；厂家/渠道=渠道 分销+最终用户）；is_enduser 与其他项互斥。domain 由平台配置。 -->
<dialog class="modal modal--wide" id="create-client-dialog" aria-labelledby="create-client-title">
  <form method="dialog" data-create-client-form>
    <header class="modal__header">
      <div>
        <h2 id="create-client-title">新建客户</h2>
        <p>创建客户的公司信息。</p>
      </div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span>公司全称</span><input name="company_name" placeholder="公司正式全称" required></label>
      <label class="form-field"><span>公司简称</span><input name="short_name" placeholder="页面标题用简称" required></label>

      <div class="form-field"><label>客户类型</label>
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

      <label class="form-field"><span>联系人</span><input name="contact_person" placeholder="选填" autocomplete="name"></label>
      <label class="form-field"><span>联系电话</span><input name="contact_phone" type="tel" placeholder="选填" autocomplete="tel"></label>
      <label class="form-field"><span>联系邮箱</span><input name="contact_email" type="email" placeholder="选填" autocomplete="email"></label>
      <div class="form-field"><label>地点</label><span class="picker-field"><input data-client-location placeholder="未选择地点" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-client-location">选择地点</button></span></div>

      <div class="form-field"><span>账号状态</span><span class="form-switch form-switch--compact"><span><strong>启用账号</strong></span><label class="form-switch__toggle"><input name="is_active" type="checkbox" role="switch" value="true" checked aria-label="启用账号"><span class="form-switch__control" aria-hidden="true"></span></label></span><small>停用后该客户不能登录。</small></div>

      <div class="form-field form-field--full"><label for="create-client-domain">登录入口</label><span class="domain-field"><span class="domain-field__prefix">https://pods.dengtec.com/</span><input id="create-client-domain" name="domain_subpath" placeholder="创建时可选填"><button class="button button--secondary button--icon-only" type="button" data-action="check-domain" aria-label="检查是否可用" title="检查是否可用"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-search"></use></svg></button></span><small class="form-help">如需自定义页面，请联系 德恩基 公司进行修改。</small></div>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">创建</button></footer>
  </form>
</dialog>
