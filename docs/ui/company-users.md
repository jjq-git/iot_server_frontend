# 公司用户页面规划

> 最后更新：2026-09-02

本规划以后端 `users` 表、`UserResponse` 和 `/api/v1/users` 接口为事实依据。页面位于“我的公司 → 公司用户”，不增加全局左侧菜单。

## 1. 页面范围

- 角色和额外数据范围合并在“公司用户”的查看、编辑或权限面板中，不再设置独立的“用户权限”分类菜单。
- 页面只管理当前公司账号，列表请求必须显式传入当前 `company_id`；`allowed_companies` 只是访问上限，不能据此把下级公司用户混入本页。
- `platform_admin`、`admin` 和 `operator` 可以进入“公司用户”；`operator` 只能创建、修改或停用 `data_entry` 与 `viewer`，不能操作自己、同级账号或管理员。
- `platform_admin` 可管理可写范围内的公司用户；普通公司管理员和运营管理受 `writable_companies` 限制，且不能管理平台管理员。

## 2. 列表字段

| 页面字段 | `UserResponse` 字段 | 说明 |
| --- | --- | --- |
| 用户 | `display_name` | 用户显示名称；它不是计划删除的 `companies.display_name` |
| 电话 | `phone` | 为空时显示 `—` |
| 角色 | `role` | 本列表只显示 `operator`、`data_entry`、`viewer`，按职责显示名称 |
| 状态 | `is_active` | 统一使用中性色状态标签 |
| 最后登录 | `last_login` | 无登录记录时显示 `—` |

`email` 仍可参与搜索，但与 `assigned_scope`、`locale`、`timezone` 和 `created_at` 一起放入用户详情，不挤入紧凑列表；数据库内部 `id` 和 `uuid` 不显示。公司用户数量较少，页面不提供手动刷新按钮。

目标角色显示名称统一为：`operator` →“运营管理”、`data_entry` →“数据录入”、`viewer` →“信息查看”。后端尚需依据 `iot_server_backend#21` 将旧 `maintainer` 数据和接口合同迁移为 `operator`，迁移完成后不长期保留旧别名。

## 3. 操作边界

- 当前后端没有逐功能授权表，权限由固定 `role`、接口级策略和 `assigned_scope` 共同决定。因此公司用户的权限面板只配置角色与额外公司范围，不展示无法持久化的菜单或操作勾选项。
- 新建用户需要姓名、唯一登录邮箱、密码和角色，电话可选；首行固定为邮箱/姓名。密码至少 8 位并同时包含字母和数字，确认密码只在前端用于防止误输，不随请求提交。
- 目标产品只允许邮箱登录。当前后端仍要求 `users.username`、`UserCreateRequest.username` 和 `LoginRequest.username`，且认证服务按用户名查询；接入 Demo 前必须统一迁移为规范化后的唯一邮箱，前端不能暗中生成用户名补洞。
- 新建用户弹窗不允许切换公司：`company_id` 固定取当前公司，`assigned_scope` 默认为空且必须位于操作者的 `writable_companies` 内；所属公司范围由 `company_id` 自动派生，不重复写入。
- 管理员新建入口提供 `operator`、`data_entry` 和 `viewer`；运营管理的新建入口只提供 `data_entry` 和 `viewer`。普通公司用户流程不创建或授予管理员。
- 管理员账号不进入“公司用户”列表。当前管理员通过个人中心维护自身资料；管理员的授权、移交或撤销属于独立高权限流程，不能由普通公司用户编辑页代替。
- 管理员在界面中统一显示为“管理员”；平台公司的实际后端角色是 `platform_admin`，下级公司的实际角色是 `admin`，显示名称不能替代后端权限判断。
- 不能通过普通 API 创建或授予 `platform_admin`。
- 角色和 `assigned_scope` 使用专用接口更新；scope 必须是 `writable_companies` 的子集。
- 用户不能修改自己的角色，也不能停用自己。
- 租户管理员不能查看或修改平台管理员账号。
- 搜索对应后端 `keyword`，目标只匹配 `email` 和 `display_name`；角色与启用状态分别使用 `role`、`is_active`。后端在迁移完成前仍会额外匹配旧 `username`。

## 4. 查看、编辑与个人中心

- 管理员“查看用户”以紧凑的四列表格展示业务资料及安全字段，窄屏回落为两列，不显示数据库内部 ID 和 UUID。个人中心采用独立的 6+6 横向字段布局：左侧显示姓名、电话、只读角色、语言下拉框、时区下拉框，右侧显示创建时间、更新时间、最后登录、最后登录 IP 和密码修改时间；头像由页头的独立上传入口维护。
- 查看页展示姓名、登录邮箱、电话、头像状态、所属公司、角色、状态、额外范围、语言、时区、登录信息及系统标识。密码哈希和原始 `change_log` 永远不进入响应或页面。
- 管理员编辑页只展示五类内容：只读的 `email`，以及可修改的 `display_name`、`role`、`is_active` 和重新设置密码；电话、语言、时区、数据范围和系统字段均不放入编辑弹窗。邮箱是唯一登录标识，前后端都必须拒绝修改；电话由用户在个人中心维护。
- 编辑弹窗固定为三行双列：邮箱/姓名、角色/账号状态、重新设置密码/确认新密码，避免字段增减后破坏信息顺序。
- 管理员的角色选择开放 `operator`、`data_entry` 和 `viewer`；运营管理只开放 `data_entry` 和 `viewer`。角色通过既有 `PUT /users/{user_id}/role` 单独提交，不能与基本资料更新拼成一个未经后端支持的请求。
- 管理员重新设置密码为可选操作：留空表示不修改；提交新密码时必须再次确认并执行统一密码策略。后端需要新增受审计的管理员重置接口，成功后设置 `must_change_password=true`、更新 `password_changed_at` 并撤销旧会话，不能直接传输或编辑 `hashed_password`。
- 个人中心通过 `GET/PUT /api/v1/users/me` 读写当前用户，只允许本人修改 `display_name`、`phone`、`locale` 和 `timezone`。头像编辑按钮调用 `POST /api/v1/users/me/avatar`，以 `file` 字段上传不超过 5 MB 的 JPEG、PNG、GIF 或 WebP；密码及隐私请求继续使用各自的专用接口。
- 个人中心的“修改密码”打开独立弹窗，提交当前密码和符合统一策略的新密码至 `POST /api/v1/users/me/change-password`；确认密码仅用于前端校验。接口限速为每分钟 3 次，成功后旧令牌失效并要求重新登录。
- `UserResponse` 和 `UserProfileResponse` 当前尚未完整暴露表中的安全元数据；需要展示时应逐字段补充 Schema，不能把 ORM 用户对象直接序列化给前端。

## 5. API 映射

| 动作 | 接口 |
| --- | --- |
| 当前公司列表 | `GET /api/v1/users?company_id={currentCompanyId}` |
| 用户详情 | `GET /api/v1/users/{user_id}` |
| 新建用户 | `POST /api/v1/users` |
| 更新基本信息 | `PUT /api/v1/users/{user_id}` |
| 更新角色 | `PUT /api/v1/users/{user_id}/role` |
| 管理员重新设置密码 | `POST /api/v1/users/{user_id}/reset-password`（待后端新增） |
| 更新数据范围 | `PUT /api/v1/users/{user_id}/scope` |
| 当前用户资料 | `GET /api/v1/users/me` |
| 更新当前用户资料 | `PUT /api/v1/users/me` |
| 当前用户修改密码 | `POST /api/v1/users/me/change-password` |

HTML Demo 已实现列表、筛选、新建、查看、编辑、角色选择和个人中心；提交只更新本地演示状态，不伪造服务端写入结果。额外数据范围的合并面板尚未实现，后端接入要点同时写在页面模板的 `<!-- Handoff: ... -->` 注释中。
