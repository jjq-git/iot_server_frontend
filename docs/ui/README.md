# 后台 UI 规划

> 最后更新：2026-09-09

本目录集中保存后台的**页面规划**、样式规范和可交互原型。页面**按 URL 组织**（一个页面一个文档），不再和数据库表严格一一对应——一个页面可能聚合多张表，一张表也可能拆到多个页面。

- **样式 / 组件规范**：见 [widgets/](widgets/)（Card / 列表 / 图标 / 主题等，含统一图标 Sprite `icons.svg`）。
- **可交互原型**：见 [html/](html/README.md)（Go Live 直接浏览；`js/css/templates` 都在其中）。
- **每个页面一个文档**：文件名按路由取——单段路由 `url_<段>.md`，多段路由 `url-<段1>_<段2>.md`。详细定义该页面的内容、字段、权限与前端 Handoff。

## 路由约定

菜单里的路由是**应用内相对路径**，真实 URL = 当前公司的 `domain`（见后端 [companies](../../../iot_server_backend/docs/数据模型/companies.md)）+ 路由。例如 abc 公司访问 `/mycompany` 实为：

- 子域名形态：`abc.dengtec.com/mycompany`
- 平台路径形态：`dengtec.com/abc/mycompany`
- 自有域名形态：`www.abc.com/mycompany`

下表统一省略公司 `domain` 前缀。生产用 vue-router 路径路由；Demo 的 `?view=`、`?company=`、`?role=` 只是原型审核参数，不属于正式导航。

## 页面清单与访问权限（按公司类型）

访问权限**只按公司类型**：平＝平台、静＝静音仓厂家、中＝中间商（代理 / 分销）、终＝最终用户。✓＝该类型可见，空＝待逐页核定，`-`＝不可见。具体角色（管理员 / 运营 / 录入 / 查看）与数据 scope 不在本表，属各页面文档与后端权限校验。文档列指向按路由命名的页面文档（多数尚待建）。

| 分组   | 页面        | 路由                   | 平  | 静  | 中  | 终  | 文档                                                     |
| ------ | ----------- | ---------------------- | --- | --- | --- | --- | -------------------------------------------------------- |
| 公司   |             |                        | ✓   | ✓   | ✓   | ✓   |                                                          |
| -      | 首页        | `/`                    | ✓   | ✓   | ✓   | ✓   | [url_home.md](url_home.md)                               |
| -      | 设置(按钮)  | `/mycompany`           | ✓   | ✓   | ✓   | ✓   | [url_mycompany.md](url_mycompany.md)                     |
| 数据   |             | `/data`                | ✓   | ✓   | ✓   | ✓   | [url_data.md](url_data.md)                               |
| 客户   |             | `/client`              | ✓   | ✓   | ✓   | -   | [url_client.md](url_client.md)                           |
| 控制器 |             |                        | ✓   | ✓   | -   | -   |                                                          |
| -      | 型号        | `/devices/model`       | ✓   | ✓   | -   | -   | [url-devices_model.md](url-devices_model.md)             |
| -      | 主机        | `/devices/hosts`       | ✓   | ✓   | -   | -   | [url-devices_hosts.md](url-devices_hosts.md)             |
| -      | 节点        | `/devices/nodes`       | ✓   | ✓   | -   | -   | [url-devices_nodes.md](url-devices_nodes.md)             |
| 静音仓 |             |                        | ✓   | ✓   | ✓   | ✓   |                                                          |
| -      | 型号        | `/pods/model`          | ✓   | ✓   | ✓   | ✓   | [url-pods_model.md](url-pods_model.md)                   |
| -      | 列表        | `/pods`                | ✓   | ✓   | ✓   | ✓   | [url_pods.md](url_pods.md)                               |
| 生产   |             |                        | ✓   | ✓   | -   | -   |                                                          |
| -      | 注册静音仓  | `/pods/binding`        | -   | ✓   | -   | -   | [url-pods_binding.md](url-pods_binding.md)               |
| -      | 注册设备    | `/devices/credentials` | ✓   | -   | -   | -   | [url-devices_credentials.md](url-devices_credentials.md) |
| 系统   |             |                        | ✓   | -   | -   | -   |                                                          |
| -      | 调试控制台  | `/debug/console`       | ✓   | -   | -   | -   | [url-debug_console.md](url-debug_console.md)             |
| -      | OD 诊断     | `/debug/od`            | ✓   | -   | -   | -   | [url-debug_od.md](url-debug_od.md)                       |
| -      | 固件发布    | `/debug/firmwares`     | ✓   | -   | -   | -   | [url-debug_firmwares.md](url-debug_firmwares.md)         |
| -      | MQTT 服务器 | `/mqtt-server`         | ✓   | -   | -   | -   | [url_mqtt-server.md](url_mqtt-server.md)                 |
| -      | 文件        | `/files`               | ✓   | -   | -   | -   | [url_files.md](url_files.md)                             |
| -      | 审计日志    | `/history/audit`       | ✓   | -   | -   | -   | [url-history_audit.md](url-history_audit.md)             |
| -      | AI 服务密钥 | `/api-keys`            | ✓   | -   | -   | -   | [url_api-keys.md](url_api-keys.md)                       |

- `系统` 只给平台使用, 和系统相关的都放在这个下面.
- `生产` 组是数据录入的核心: 平台在 `注册设备` 下发设备凭证, 静音仓厂家在 `注册静音仓` 把设备绑成静音仓; 各自只见自己的注册页. (静音仓/控制器的 `型号` 归各自业务组, 不放这里.)
- 「系统」组收敛(对齐后端)：调试控制台合并调试设备/设备控制/串口日志/EMCY；设备运维包含 OTA、固件和固件内置语言切换；MQTT 服务器合并六项。独立语言包文件机制已退役。
- 传感器历史、设备日志、EMCY 是每台设备/静音仓的遥测，放静音仓（列表）详情 / 调试控制台，不在系统单列；某个静音仓自己的文件也放该静音仓详情。
- 最终用户(终)侧栏特殊：不用抽象分组，直接 = 首页(概览) + 我的静音仓(有多型号按型号分组，否则平铺)；点某仓 → 该仓控制页。其他公司类型侧栏不变。其公司设置(mycompany)后续可能增加「会议定义 API 设置」(会议室预约 / 集成)。

> `设置(/mycompany)` 是聚合页，内含信息 / AI 额度 / 权限 / 人员 / 文件 / 操作记录多个区；页面规划见 [url_mycompany.md](url_mycompany.md)，人员区细节见 [company-users.md](company-users.md)。
> `个人资料(/user/profile)` 也不在侧栏菜单，经右上角头像菜单进入；页面仍保留 → [url-user_profile.md](url-user_profile.md)。

## 每个页面文档写什么

1. **详细定义页面内容**：页面结构、区块 / 卡片、字段（对照后端[数据模型](../../../iot_server_backend/docs/数据模型/README.md)的**目标字段**）、控件、可编辑性。
2. **给前端的备注 / Handoff 按 URL 组织**：因为页面已和数据库表对不上，备注挂在页面（URL）而非表；目标字段未落库时用 `<!-- Handoff -->` 记缺口，不退回旧字段。
3. 业务流程（用户从哪进、走哪几步、调哪些接口）并入对应页面文档，不再单列。

## 样式规范（widgets/）

- [Card 布局规范](widgets/cards.md)：设置页 Card 栅格、组合与响应式。
- [列表页规范](widgets/lists.md)：列表结构、高度、筛选、排序、操作与分页。
- [表单与弹窗规范](widgets/forms.md)：弹窗结构、表单栅格、控件、复选框选中色（`#067a7a`）、查看详情分节键值表。
- [UI 图标规范](widgets/icons.md)：统一图标库、线宽与组合修饰符（`icons.svg`）。
- [深色 / 浅色主题系统](widgets/深色主题移植.md)：设计变量、主题映射与接入。

## 可交互原型（html/）

- [HTML 前端说明](html/README.md) · [首页](html/index.html) · [后台标准布局](html/admin.html) · [登录页](html/login.html)
- 原型样式 / 脚本 / 模板都在 `html/`（`assets/`、`templates/`），本次重组不动。

## 其它

- [公司自定义登录页模板方案](LOGIN_TEMPLATE_SOLUTION.md)
- [全页面交互审计（2026-07-30）](interaction-audit-20260730.md)
- 角色能力与数据 scope 的事实源在后端[权限设计](../权限设计-20260827.md)。
