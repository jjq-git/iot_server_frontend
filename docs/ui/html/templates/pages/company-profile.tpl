<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: "登录入口与域名", "区域与数据" and "状态与系统信息" remain provisional sections. Confirm their field contracts, validation and permissions before treating this Demo as the production form. -->
<section class="company-profile" aria-label="公司设置">
  <div class="company-profile__layout">
    <nav class="company-area-nav" aria-label="公司设置分类">
      <button class="company-area-nav__item is-active" type="button" data-company-area="profile" data-company-area-label="信息" aria-current="page">
        <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-building"></use></svg><span>信息</span>
      </button>
      <button class="company-area-nav__item" type="button" data-company-area="ai-tokens" data-company-area-label="AI 额度">
        <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-credit-card"></use></svg><span>AI 额度</span>
      </button>
      <button class="company-area-nav__item" type="button" data-company-area="permissions" data-company-area-label="权限" data-company-roles="platform_admin admin">
        <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-shield-check"></use></svg><span>权限</span>
      </button>
      <button class="company-area-nav__item" type="button" data-company-area="users" data-company-area-label="人员" data-company-roles="platform_admin admin operator">
        <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-people"></use></svg><span>人员</span>
      </button>
      <button class="company-area-nav__item" type="button" data-company-area="files" data-company-area-label="文件">
        <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-box-seam"></use></svg><span>文件</span>
      </button>
      <button class="company-area-nav__item" type="button" data-company-area="activity" data-company-area-label="操作记录" data-company-roles="platform_admin admin operator">
        <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-clock"></use></svg><span>操作记录</span>
      </button>
    </nav>

    <!-- Handoff: editability is determined by role and writable_companies. operator may edit daily company data; owner/security sections marked data-owner-only remain admin-only. -->
    <form class="company-panel company-form" data-company-panel="profile" data-company-form>
      <div class="company-panel__heading">
        <div><h3>信息</h3><p>维护当前公司的基础资料与相关配置。</p></div>
        <button class="button button--secondary button--icon-only" type="submit" aria-label="保存资料" title="保存资料"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-save"></use></svg></button>
      </div>

      <div class="company-settings-grid">
        <section class="company-settings-card company-settings-card--wide" aria-labelledby="company-basic-title">
          <header class="company-settings-card__header">
            <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-building"></use></svg>
            <div><h4 id="company-basic-title">基本信息</h4><p>公司 Logo、名称与联系信息 · <span class="company-code">CO-7K3M9Q</span></p></div>
          </header>
          <div class="company-basic-layout">
            <section class="company-basic-pane" aria-label="公司 Logo 与名称">
              <!-- Handoff: companies.logo_file_id is the current Logo FK; upload/replace through the dedicated company Logo API and render its derived logo_url. -->
              <div class="company-logo-upload">
                <span class="company-logo-upload__preview">
                  <svg class="app-icon app-icon--fill" data-company-logo-placeholder aria-hidden="true"><use href="icons.svg#icon-building"></use></svg>
                  <img data-company-logo-preview alt="公司 Logo 预览" hidden>
                </span>
                <span class="company-logo-upload__copy"><strong>公司 Logo</strong><small>PNG、JPG 或 WebP，建议透明背景，最大 2 MB</small></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" data-company-logo-input hidden>
                <button class="button button--secondary button--icon-only company-logo-upload__action" type="button" data-action="choose-company-logo" aria-label="上传公司 Logo" title="上传公司 Logo">
                  <svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-upload"></use></svg>
                </button>
              </div>
              <!-- Handoff: company_name 与 short_name 是独立字段；display_name 已删除。slogan 为新增字段（companies 目标态），CompanyResponse/更新 Schema 待增补。 -->
              <div class="company-field-grid company-field-grid--single">
                <label class="company-field"><span>公司全称</span><input name="company_name" value="德恩基平台公司"></label>
                <label class="company-field"><span>公司简称</span><input name="short_name" value="德恩基"><small>显示在后台左上角公司名位置。</small></label>
                <label class="company-field"><span>公司标语</span><input name="slogan" value="让每一次沟通更专注"><small>显示在左上角公司名下方；仅展示，不参与寻址。</small></label>
              </div>
            </section>

            <section class="company-basic-pane" aria-label="公司联系方式">
              <div class="company-field-grid">
                <label class="company-field company-field--wide"><span>联系人</span><input name="contact_person" value="张经理"></label>
                <label class="company-field company-field--wide"><span>联系电话</span><input name="contact_phone" value="021-5555 0188"></label>
                <label class="company-field company-field--wide"><span>联系邮箱</span><input name="contact_email" type="email" value="service@dengtec.com"></label>
                <!-- Handoff: companies.address 已删除；地址改由 location_id 关联 locations 派生。提交整数 location_id，国家/地址只读展示。 -->
                <label class="company-field company-field--wide"><span>地点</span><select name="location_id"><option value="456" selected>上海市浦东新区示例路 88 号</option></select><small>从本公司可用地点中选择；国家与地址由所选地点派生。</small></label>
              </div>
            </section>
          </div>
        </section>

        <section class="company-settings-card company-settings-card--wide" aria-labelledby="company-domain-title" data-owner-only>
          <header class="company-settings-card__header">
            <svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-link-45deg"></use></svg>
            <div><h4 id="company-domain-title">登录入口</h4><p>公司访问地址，由平台配置，客户只读</p></div>
          </header>
          <div class="company-settings-card__body company-field-grid">
            <!-- Handoff: 域名/入口收敛为单一 domain（完整 URL 含 https），合并原 company_slug/subdomain/subpath/custom_domain/domain_verified。由平台人员手工配置，客户只读、无自助验证。菜单其余路由都相对本 domain。 -->
            <!-- Handoff: 只读；域名由创建该公司的上级公司配置。data-creator-company 取创建者公司名（`parent_com_id` 对应公司或平台）。 -->
            <label class="company-field company-field--wide"><span>公司域名</span><input name="domain" value="https://abc.com" readonly><small>如需更改，请联系 <strong data-creator-company>德恩基</strong> 公司进行修改。</small></label>
          </div>
        </section>
      </div>
    </form>

    <section class="company-panel" data-company-panel="permissions" hidden>
      <div data-include="templates/pages/company-permissions.tpl"></div>
    </section>

    <section class="company-panel" data-company-panel="users" hidden>
      <div data-include="templates/pages/company-users.tpl"></div>
    </section>

    <section class="company-panel" data-company-panel="files" hidden>
      <div data-include="templates/pages/company-files.tpl"></div>
    </section>

    <section class="company-panel" data-company-panel="ai-tokens" hidden>
      <div class="company-panel__heading">
        <div><h3>AI 额度</h3><p>本公司 AI 语音额度（按模型分池，用完即停）。</p></div>
        <!-- Handoff: 充值单独入口，跳支付页；本页不涉及具体支付方式，支付平台在支付页选择。可配自动充值规则。 -->
        <button class="button button--secondary button--icon-only" type="button" data-action="recharge-ai" aria-label="充值" title="充值"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-credit-card"></use></svg></button>
      </div>
      <!-- Handoff: 数据来自 company_ai_quotas（company_id × model_key）：quota 预付累加、used 累计消耗、余额 = quota - used；台账权威见 ai_token_ledger。转售 / 下拨走后端专用接口。 -->
      <div class="ai-quota-grid">
        <article class="ai-quota-card">
          <header class="ai-quota-card__head">
            <!-- Handoff: 用各模型真实 LOGO；Demo 用占位块（模型名首字）。 -->
            <span class="ai-quota-card__logo" data-ai-logo>G</span>
            <div class="ai-quota-card__title"><strong>gpt-4o</strong><small>OpenAI</small></div>
          </header>
          <div class="ai-quota-card__stats">
            <div><span>额度</span><strong>1,000,000</strong></div>
            <div><span>已用</span><strong>420,350</strong></div>
            <div class="is-balance"><span>余额</span><strong>579,650</strong></div>
          </div>
          <footer class="ai-quota-card__foot">
            <a href="#" data-action="view-ai-records" data-model="gpt-4o">使用 / 转换记录 →</a>
          </footer>
        </article>
        <article class="ai-quota-card">
          <header class="ai-quota-card__head">
            <span class="ai-quota-card__logo" data-ai-logo>D</span>
            <div class="ai-quota-card__title"><strong>deepseek-chat</strong><small>DeepSeek</small></div>
          </header>
          <div class="ai-quota-card__stats">
            <div><span>额度</span><strong>500,000</strong></div>
            <div><span>已用</span><strong>128,900</strong></div>
            <div class="is-balance"><span>余额</span><strong>371,100</strong></div>
          </div>
          <footer class="ai-quota-card__foot">
            <a href="#" data-action="view-ai-records" data-model="deepseek-chat">使用 / 转换记录 →</a>
          </footer>
        </article>
      </div>
    </section>

    <section class="company-panel" data-company-panel="activity" hidden>
      <div data-include="templates/pages/company-activity.tpl"></div>
    </section>
  </div>
</section>
