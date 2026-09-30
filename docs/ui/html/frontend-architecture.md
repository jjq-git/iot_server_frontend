# 前端代码架构

> 适用范围：`iot_server_frontend/docs/ui/html/`
>
> 最后更新：2026-09-09

本文规定 HTML UI Demo 的文件结构、职责边界、模板装配、交互组织和数据字段来源。视觉规则见[样式规范](style-guide.md)。

## 1. 技术边界

- Demo 使用原生 HTML、CSS 和 JavaScript，不依赖安装或构建步骤。
- Demo 用于验证产品设计，不连接真实 API，不承担生产权限或持久化逻辑。
- 验证通过的页面需要映射到 Vue Base 组件、API、权限和状态管理，不能直接把 Demo JavaScript 当作生产业务代码。
- 只有页面入口使用 `.html`；通过 `data-include` 加载的片段使用 `.tpl`，避免 Live Server 向 partial 注入脚本并破坏 SVG Sprite。

## 2. 目录职责

```text
html/
├── README.md
├── frontend-architecture.md
├── style-guide.md
├── index.html / admin.html / login.html    # 页面入口，只声明依赖和根模板
├── templates/
│   ├── admin-shell.tpl                     # 后台页面装配关系
│   ├── catalog.tpl                         # Demo 目录页主体
│   ├── sidebar.tpl / topbar.tpl            # 后台公共壳层
│   ├── login-page.tpl                      # 登录页主体
│   ├── pages/                              # 右侧完整业务页面（含 home.tpl、client-list.tpl 等）
│   ├── dialogs/                            # 独立弹窗（含 create/edit/view-client.tpl、edit-client-admin.tpl 等）
│   └── shared/                             # 跨页面稳定复用的结构片段（user-profile-fields.tpl）
└── assets/
    ├── css/
    │   ├── tokens.css                      # 唯一设计变量
    │   ├── base.css                        # 重置、图标和基础控件
    │   ├── admin.css / company.css         # 后台页面族样式
    │   ├── login.css                       # 登录页面样式
    │   └── catalog.css                     # Demo 目录样式
    └── js/                                 # 扁平结构，无子目录
        ├── template-loader.js              # 递归加载 partial
        ├── theme.js                        # 共用主题行为
        ├── sidebar-menu.js                 # 公司类型与侧栏菜单配置
        ├── table-tools.js                  # 声明式表格排序
        ├── shell-demo.js                   # 后台壳层与页面切换
        ├── login-demo.js                   # 登录页演示交互
        ├── admin-demo.js                   # 平台管理页族演示交互
        ├── company-demo.js                 # 公司页族演示交互
        ├── client-demo.js                  # 客户页族演示交互
        └── home-demo.js                    # 首页演示交互
```

## 3. 文件放置规则

| 内容 | 放置位置 | 规则 |
|---|---|---|
| 浏览器入口与资源加载 | `*.html` | 保持轻量，不直接写完整业务页面 |
| 后台页面注册 | `templates/admin-shell.tpl` | 使用 `data-page-view` 声明页面并 include 对应模板 |
| 完整业务页面 | `templates/pages/*.tpl` | 一个资源页面一个文件；列表、筛选、空态和分页放在同一页面模板 |
| 创建、查看、编辑、删除弹窗 | `templates/dialogs/*.tpl` | 独立弹窗独立文件，并在所属 shell 中 include |
| 三个及以上页面稳定复用的结构 | `templates/shared/*.tpl` | 未达到稳定复用条件时不要提前抽象 |
| 全局变量与基础控件 | `assets/css/tokens.css`、`base.css` | 页面样式不得重复定义全局基础规则 |
| 页面族布局 | `assets/css/admin.css` 等 | 优先扩展已有页面族文件，不新建单页 CSS |
| Demo 交互 | `assets/js/*-demo.js` | 按页面族组织；以 `data-*` 选择器连接模板和脚本 |
| 通用排序、主题等行为 | 独立公共脚本 | 只保留与具体业务无关的稳定行为 |
| 图标 | `icons.svg` | 统一引用现有 symbol，不引入其他图标库或零散内联 SVG |

## 4. 模板装配与初始化

`template-loader.js` 会递归解析所有 `[data-include]`，完成后设置：

```text
document.documentElement.dataset.templatesReady = "true"
```

并派发：

```text
ui:templates-ready
```

依赖 partial 的脚本必须在模板加载完成后初始化。新增页面的一般流程为：

1. 在 `templates/pages/` 创建页面模板。
2. 在 `admin-shell.tpl` 注册 `data-page-view` 并 include 对应模板。
3. 需要弹窗时，在 `templates/dialogs/` 创建文件并由 shell include。
4. 在对应 `*-demo.js` 中监听 `ui:templates-ready` 后绑定交互。
5. 在 `sidebar-menu.js` 中按既有公司类型和角色规则增加入口。
6. 使用 `data-*` 表达交互挂点，不使用展示文案或脆弱 DOM 层级定位业务元素。

## 5. 数据字段契约

页面字段必须来自对应的[数据库模型文档](../../../../iot_server_backend/docs/数据模型/README.md)。创建页面前必须完成以下核对：

1. 找到页面主资源对应的表文档。
2. 确认一条数据代表什么业务实体。
3. 列出页面读取、创建、更新、筛选和关联选择所需字段。
4. 核对字段类型、空值、默认值、枚举、唯一约束和外键关系。
5. 文档并列记录当前态与目标态时，以目标字段为页面设计依据。
6. 核对哪些字段由用户填写、配置包导入、系统生成或 Backend 独立管理。

不得实施以下做法：

- 为满足页面展示临时创造数据库文档中不存在的业务字段。
- 用名称、编号截取或前端拼接代替明确的外键关系。
- 因为当前 API 尚未支持目标字段，继续在新页面使用已计划删除的旧字段。
- 把数据库字段名、API 路径或“待后端实现”直接显示为面向用户的说明。
- 让前端静态校验代替 Backend 的唯一性、权限、引用和状态迁移校验。

目标 API 尚未落地时，在相关模板附近记录：

```html
<!-- Handoff: production API must read/write the target field defined in <database-doc>. -->
```

跨文件的数据缺口同时记录在本文“开发交接”部分。

## 6. 页面与交互边界

- 列表、详情、创建、编辑和删除应使用同一资源定义，不得各自采用不同字段或枚举。
- 创建表单只开放允许创建时写入的字段；系统默认值显示为只读或不显示。
- 编辑表单不得开放不可变身份字段；状态迁移按照数据库文档允许的方向设计。
- 删除、解绑、冻结等危险操作必须二次确认，并展示后端返回的引用阻断原因。
- 搜索和筛选使用目标字段及枚举；Demo 静态数据也必须遵守相同契约。
- Demo 中的权限切换只用于审查页面差异，生产权限必须由后端独立校验。

## 7. JavaScript 规则

- 一个页面族只初始化一次，避免 partial 事件重复绑定。
- 通过 `data-*` 获取元素；class 主要服务样式，不作为业务状态的唯一来源。
- 静态 Demo 可以在内存中模拟新增、编辑和删除，但必须明确提示没有提交服务器。
- 文件解析可以提供即时反馈，但“数据库可写”“身份无冲突”等结论必须归属于 Backend preview。
- 可复用行为达到三个页面且契约稳定后，再提取到公共脚本。
- 不复制 `table-tools.js`、主题、Toast 或 shell 已提供的行为。

## 8. 开发交接

字段名、API 缺口和实现映射属于开发交接信息。页面模板使用 `<!-- Handoff: ... -->` 就近记录；真正帮助用户填写或理解业务影响的说明才使用可见的 `<small>`。

当前“我的公司”相关交接事项：

- 🔴 `slogan`（公司标语）为 2026-09-08 目标新增字段，Demo 按目标展示在左上角公司名下方，仅展示不参与寻址；后端 `CompanyResponse` / 更新 Schema 待增补。
- `company-demo.js` 仅演示保存后同步更新侧栏简称、顶部公司全称和文档标题，没有持久化能力。生产实现必须以 API 响应为准。
- 🔴 登录入口收敛为单一 `domain`（完整 URL 含 `https://`，平台配置只读），合并原 `company_slug` / `subdomain` / `subpath` / `custom_domain` / `domain_verified`；菜单其余路由都相对该 `domain`（如 `abc.dengtec.com/mycompany`）。后端五字段合并待实现。
- `country`、`region`、`data_region`、`address` 已删除；国家与地址由 `location_id → locations` 派生，页面用 `location_id`。`updated_at` 应在 `CompanyResponse` 返回。
- 公司 Logo 以规划中的 `companies.logo_file_id` 为当前文件指针，接口派生 `logo_url`；Demo 本地预览不能落库，生产实现应调用专用上传、替换和删除接口。
- “公司用户”列表固定查询当前 `company_id`；`platform_admin`、`admin` 可管理 `operator` / `data_entry` / `viewer`，`operator` 只可管理 `data_entry` / `viewer`，其余角色、scope 和自身账号保护见[公司用户页面规划](../company-users.md)。
- 前端统一显示“管理员”，平台公司向后端映射 `platform_admin`，下级公司映射 `admin`；显示名称不能替代后端角色和 scope 校验。
- “公司用户”列表排除 `platform_admin`、`admin` 账号；当前管理员资料从个人中心维护，管理员授权或移交必须另设高权限流程。
- “用户权限”不设置独立分类菜单。公司用户编辑弹窗直接选择现有角色并调用既有角色接口；额外数据范围后续合并到公司用户的权限面板。当前后端没有逐功能授权模型，不能提交按菜单或按钮拆分的权限开关。
- “新建用户”提交 `POST /api/v1/users`：`company_id` 固定为当前公司，`assigned_scope` 默认为空并受 `writable_companies` 约束；所属公司范围由 `company_id` 自动派生。UI 要求填写姓名，但确认密码仅用于前端校验，不进入请求。管理员可授予 `operator`、`data_entry`、`viewer`，运营管理只可授予 `data_entry`、`viewer`。
- 目标登录标识统一为唯一邮箱，新建用户与登录 Demo 均不再显示用户名或手机号登录。当前后端仍要求 `UserCreateRequest.username`、`LoginRequest.username` 并按 `User.username` 认证；生产接入前必须同步迁移 Schema、认证查询、客户端 payload 和旧数据，不能由前端生成隐藏用户名。
- 管理员查看用户使用 `templates/shared/user-profile-fields.tpl`，以紧凑的四列表格展示业务资料与安全字段；窄屏回落为两列，不显示数据库内部 ID 和 UUID。个人中心采用独立 6+6 横向字段布局，开放姓名、电话、语言下拉框、时区下拉框，角色及右侧系统记录只读，并通过 `POST /users/me/avatar` 单独上传本人头像。密码哈希与原始变更日志不得进入任一响应。
- 个人中心通过独立弹窗调用 `POST /users/me/change-password` 修改密码，只提交 `old_password` 和 `new_password`；确认密码不进入请求。成功后应清除旧认证状态并返回登录页。
- 邮箱在目标产品中不可修改。当前管理员更新 Schema 仍接受 `email`，必须在后端移除或拒绝该字段；只把输入框设为只读不构成安全边界。
- 新建用户的“启用账号”和“首次登录修改密码”分别映射 `is_active`、`must_change_password`，默认都开启，并在同一行显示。当前创建 Schema 尚未开放这两个字段，接入前需要补齐受审计的后端契约。
- 管理员编辑用户按三行显示邮箱/姓名、预设角色/账号状态、重新设置密码/确认密码；邮箱只读，电话及其余资料不在该弹窗显示。基本资料与角色分别调用现有接口；管理员密码重置接口尚不存在，后端需新增受审计操作，并在成功后强制用户下次登录改密及撤销旧会话。
- 平台公司隐藏“界面配置”；厂家、其他公司和最终用户保留该入口，用于维护随公司生效的定制界面。后端和路由权限仍须独立校验。
- 公司设置页的后台顶部标题使用当前 `company_name`，图标调用 `icons.svg#icon-building` 的填充版本，与公司分类入口保持一致；内容区不重复显示公司 Logo、全称或类型。

## 9. 新页面检查清单

- [ ] 文件位于规定目录，入口只负责装配。
- [ ] 页面已在 shell 和菜单中按权限注册。
- [ ] 所有业务字段已逐项对照数据库模型文档。
- [ ] 当前字段与目标字段并存时，页面使用目标字段。
- [ ] 创建、详情、编辑、列表、筛选使用同一组字段和枚举。
- [ ] API 缺口写入 Handoff 注释，没有暴露给最终用户。
- [ ] 交互选择器使用稳定的 `data-*` 属性。
- [ ] 没有复制已有公共脚本或创建无必要的抽象。
- [ ] 已按[样式规范](style-guide.md)完成视觉和响应式检查。
