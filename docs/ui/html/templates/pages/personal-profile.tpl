<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: load through GET /api/v1/users/me and save only display_name, phone, locale and timezone through PUT /api/v1/users/me. Email remains the immutable login identifier; password uses its dedicated endpoint. -->
<!-- Handoff: upload the signed-in user's avatar as multipart field "file" through POST /api/v1/users/me/avatar. Match the backend limit of 5 MB and JPEG/PNG/GIF/WebP; render the returned avatar_url and never persist a browser object URL. -->
<!-- Handoff: UserProfileResponse currently omits must_change_password, password_changed_at and updated_at. Add explicitly reviewed response fields if they must appear; never serialize the raw ORM model. -->
<!-- Handoff: Personal Center intentionally uses its own 6+6 inline-field layout. The left card contains self-service fields plus readonly role; the right card contains audited timestamps and login metadata. Administrator user detail continues to use the full shared partial. -->
<section class="personal-profile" aria-label="个人中心">
  <header class="personal-profile__header">
    <span class="personal-profile__avatar-wrap">
      <span class="personal-profile__avatar" data-personal-profile-avatar aria-hidden="true">管</span>
      <img class="personal-profile__avatar-image" data-personal-profile-avatar-image alt="个人头像" hidden>
      <button class="personal-profile__avatar-edit" type="button" data-action="choose-personal-avatar" aria-label="编辑头像" title="编辑头像"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-pencil"></use></svg></button>
      <input data-personal-avatar-input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden>
    </span>
    <span class="personal-profile__identity"><strong data-personal-profile-name>管理员</strong><small data-personal-profile-email>admin@dengtec.com</small></span>
    <button class="button button--secondary button--icon-only" type="submit" form="personal-profile-form" aria-label="保存个人资料" title="保存个人资料"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-save"></use></svg></button>
  </header>
  <form class="personal-profile__body user-profile-form" id="personal-profile-form" data-personal-profile-form>
    <div class="personal-profile__grid">
      <section class="user-profile-section" aria-labelledby="personal-details-title">
        <header><svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-person"></use></svg><div><h3 id="personal-details-title">个人资料</h3><p>维护个人联系方式与显示偏好</p></div></header>
        <div class="personal-profile__fields">
          <label class="profile-input-group"><span>姓名</span><input name="display_name" data-user-profile-field="displayName" data-user-profile-editable readonly></label>
          <label class="profile-input-group"><span>电话</span><input name="phone" type="tel" data-user-profile-field="phone" data-user-profile-editable readonly></label>
          <label class="profile-input-group"><span>角色</span><input name="role" data-user-profile-field="roleLabel" readonly></label>
          <label class="profile-input-group"><span>语言</span><select name="locale" data-user-profile-field="locale" data-user-profile-editable disabled><option value="zh-CN">简体中文（中国）</option><option value="en-US">English (United States)</option></select></label>
          <label class="profile-input-group"><span>时区</span><select name="timezone" data-user-profile-field="timezone" data-user-profile-editable disabled><option value="Asia/Shanghai">Asia/Shanghai</option><option value="UTC">UTC</option></select></label>
          <div class="profile-input-group"><span>密码</span><button class="button button--secondary profile-password-button" type="button" data-action="change-personal-password"><svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-key"></use></svg><span>修改密码</span></button></div>
        </div>
      </section>

      <section class="user-profile-section" aria-labelledby="personal-system-title">
        <header><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-info"></use></svg><div><h3 id="personal-system-title">账号信息</h3><p>系统记录的登录与安全信息</p></div></header>
        <div class="personal-profile__fields">
          <label class="profile-input-group"><span>创建时间</span><input name="created_at" data-user-profile-field="createdAt" readonly></label>
          <label class="profile-input-group"><span>更新时间</span><input name="updated_at" data-user-profile-field="updatedAt" readonly></label>
          <label class="profile-input-group"><span>最后登录</span><input name="last_login" data-user-profile-field="lastLogin" readonly></label>
          <label class="profile-input-group"><span>最后登录 IP</span><input name="last_login_ip" data-user-profile-field="lastLoginIp" readonly></label>
          <label class="profile-input-group"><span>密码修改时间</span><input name="password_changed_at" data-user-profile-field="passwordChangedAt" readonly></label>
        </div>
      </section>
    </div>
  </form>
</section>
