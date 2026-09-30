<!-- Administrator user detail uses a compact read-only table instead of form controls. Internal database ID and UUID are deliberately omitted because they are implementation identifiers, not operator-facing account information. -->
<!-- Handoff: this view intentionally excludes hashed_password and raw change_log. Password changes, avatar upload and privacy requests use dedicated audited endpoints. -->
<table class="user-detail-table">
  <caption class="sr-only">用户账号详细信息</caption>
  <colgroup><col class="user-detail-table__label"><col><col class="user-detail-table__label"><col></colgroup>
  <tbody>
    <tr class="user-detail-table__section"><th colspan="4"><span><svg class="app-icon app-icon--fill" aria-hidden="true"><use href="icons.svg#icon-person"></use></svg>账号资料</span></th></tr>
    <tr><th scope="row">姓名</th><td data-user-profile-field="displayName"></td><th scope="row">登录邮箱</th><td data-user-profile-field="email"></td></tr>
    <tr><th scope="row">电话</th><td data-user-profile-field="phone"></td><th scope="row">头像</th><td data-user-profile-field="avatarLabel"></td></tr>
    <tr><th scope="row">所属公司</th><td data-user-profile-field="companyName"></td><th scope="row">角色</th><td data-user-profile-field="roleLabel"></td></tr>
    <tr><th scope="row">账号状态</th><td data-user-profile-field="activeLabel"></td><th scope="row">额外数据范围</th><td data-user-profile-field="assignedScopeLabel"></td></tr>

    <tr class="user-detail-table__section"><th colspan="4"><span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-gear"></use></svg>个人偏好</span></th></tr>
    <tr><th scope="row">语言与地区</th><td data-user-profile-field="locale"></td><th scope="row">时区</th><td data-user-profile-field="timezone"></td></tr>

    <tr class="user-detail-table__section"><th colspan="4"><span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-shield-check"></use></svg>登录与安全</span></th></tr>
    <tr><th scope="row">最后登录</th><td data-user-profile-field="lastLogin"></td><th scope="row">最后登录 IP</th><td data-user-profile-field="lastLoginIp"></td></tr>
    <!-- Handoff: 登录历史 → 链接打开该用户全部登录记录（user_login_logs where user_id）；链接文案 = 首次登录日期 ~ 最后一次登录日期。原「首次登录需改密」不在此展示。 -->
    <tr><th scope="row">登录历史</th><td><a href="#" data-action="view-user-login-logs">2026-08-15 ~ 2026-09-15 →</a></td><th scope="row">密码修改时间</th><td data-user-profile-field="passwordChangedAt"></td></tr>
  </tbody>
</table>
