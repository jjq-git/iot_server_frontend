# 界面管理后端待办

> 已归档，仅保留历史记录。

> 最后更新：2026-08-14

本文是前端按《定制 UI 与仪表盘图表开发规划》实施后的后端差异清单。前端本轮没有修改后端仓库。

## 当前前端约定

- 登录页与页脚采用声明式 JSON 配置，`kind` 固定为 `iot-ui-config`，`schema_version` 当前为 `1`。
- 新模板不再允许用户直接编辑 HTML、CSS 或 JavaScript；历史 HTML/CSS 模板仅保留只读预览与迁移兼容。
- 仪表盘仅渲染白名单 Vue 组件，配置包括模块开关、顺序、栅格布局与受控参数。
- 在专用配置接口完成前，登录页/页脚配置暂存于 `company_templates.html_content`，仪表盘配置仍兼容存入 `dashboard_modules` 模板的 `html_content`。

## P0：阻塞完整发布链路

### 0. 收紧配置管理接口权限

规划文档规定只有 `platform_admin` 与 `admin` 可以进入界面配置管理，但当前以下接口只校验登录、没有执行 `require_roles("admin", "platform_admin")`：

- 模板列表、统计、详情、预览和版本历史。
- 仪表盘模块目录。

后端必须补齐角色门禁，并继续按公司 scope 校验资源归属。`data_entry`、`maintainer`、`viewer` 只能读取已经发布的运行时配置，不能读取草稿、驳回记录、审核意见或历史版本。

### 1. 补齐仪表盘配置接口

实现规划文档约定的接口，并统一公司 scope、角色校验、错误码和审计日志：

- `GET /api/v1/dashboard/modules/catalog`
- `GET /api/v1/dashboard/config/effective`
- `PUT /api/v1/dashboard/config/draft`
- `POST /api/v1/dashboard/config/preview`
- `POST /api/v1/dashboard/config/submit`
- `POST /api/v1/admin/dashboard/config/{id}/approve`
- `POST /api/v1/dashboard/config/{version_id}/rollback`

首期可以继续复用 `company_templates` 的版本、审核和回滚，不必新建第二套发布表，但响应应返回明确的 `draft_version`、`published_version`、`is_enabled` 与 `status`。

### 2. 修正 dashboard_modules 更新契约

`TemplateCreate` 已声明 `dashboard_modules`，但 `TemplateUpdate` 尚未声明该字段，导致编辑时只能把配置再次序列化到 `html_content`。需要：

- 给 `TemplateUpdate` 增加 `dashboard_modules: list[dict] | None`。
- 创建与更新共用同一套规范化、Schema 校验和持久化逻辑。
- 返回详情与版本详情时都稳定返回 `modules`，不要要求前端解析 `html_content`。
- 对模块 `id`、顺序、`layout.x/y/w/h`、开关和 `config` 做服务端校验。

### 3. 品牌配置进入版本与审核流程

当前 `POST /company/templates/branding` 直接修改 `companies.html_template.branding` 并立即生效，绕过草稿、审核、发布和回滚。建议将品牌与登录页配置作为同一发布单元，至少提供：

- 品牌/登录配置草稿读取与保存。
- 预览、提交审核、审核通过、发布、回滚。
- 生效配置按域名、公司 slug 或公司 ID 获取。
- Logo、背景图、favicon 使用文件 UUID 或受控资源引用，不接受任意脚本 URL。

### 4. 发布与回滚仅限平台管理员

规划文档规定审核、发布和回滚仅允许 `platform_admin`，但当前模板启停和版本回滚接口仍允许 `admin`。需要：

- 将 `POST /company/templates/{template_id}/toggle` 和 `POST /company/templates/versions/{version_id}/rollback` 收紧为仅 `platform_admin`。
- 提供平台管理员可跨公司 scope 发布审核通过配置的管理端接口；当前公司模板启停接口强制使用调用者 `company_id`，无法发布其他公司的审核结果。
- 发布、停用和回滚写入审计日志，并用事务保证同公司同类型最多一个已发布版本。

## P1：阻塞动态图表

### 5. 补齐图表批量查询

实现 `POST /api/v1/dashboard/chart-data/query`，支持单次最多 20 个查询项，并完成：

- 指标、聚合方式、时间粒度和资源 scope 白名单校验。
- PostgreSQL 区间聚合分片、Redis 热点缓存和 Redis 故障降级。
- 缺失区间补算、迟到数据失效、并发锁与稳定 cache key。
- 每图最多 2,000 点的默认限制和 10,000 点硬上限。
- 多租户隔离、限流、统一错误码和监控指标。

前端目前会在新接口不可用时回退到现有统计接口，因此基础仪表盘可用，但自定义指标、任意时间范围和高效批量查询不能完整验收。

### 6. 完整模块目录 Schema

当前 `/company/templates/dashboard-modules` 中多数模块的 `config_schema` 仍被注释或不完整。目录至少应为每个模块返回：

- 稳定的模块 `id`、名称 i18n key、描述 i18n key、组件 key。
- 默认开关、默认布局、允许的宽高范围。
- 完整字段 Schema：类型、默认值、枚举、最小值、最大值、必填与权限要求。
- 支持的数据源、指标、图表类型、时间范围和刷新间隔白名单。

## P2：契约与安全收口

### 7. 明确状态机

当前 `is_active` 使用 `N/P/Y/R`，同时还有 `is_enabled`。建议冻结为：

| is_active | is_enabled | 含义 |
|---|---:|---|
| `N` | `false` | 草稿 |
| `P` | `false` | 待审核 |
| `R` | `false` | 已驳回 |
| `Y` | `false` | 审核通过、未发布 |
| `Y` | `true` | 当前已发布 |

同一公司、同一模板类型最多只能有一个已发布版本。发布与回滚必须使用事务并处理版本冲突。

### 8. 声明式配置 Schema 与迁移

- 为登录页、页脚和仪表盘配置定义 Pydantic Schema，并增加 `schema_version` 校验。
- 禁止任意 JavaScript、事件属性、表达式、SQL/Python 和任意组件名。
- 对颜色、URL、文本长度、布局边界和资源归属做服务端校验。
- 为历史 HTML/CSS 模板提供显式的 `legacy` 标识和迁移策略，不再把安全清洗警告当作新模板的主要防线。
- 公共登录配置只返回渲染所需字段，不泄露内部版本、审核人或管理字段。

## 验收建议

- 覆盖平台管理员、公司管理员、运维员、录入员、查看员的权限矩阵。
- 覆盖公司 A 无法读取、预览、发布或命中公司 B 缓存的多租户测试。
- 覆盖草稿、提交、驳回、通过、发布、回滚和并发版本冲突。
- 覆盖恶意 URL、超长配置、未知组件、越界布局和 XSS 配置。
- 覆盖 PostgreSQL + Redis、Redis 不可用、区间部分命中和迟到数据回填。

完成以上 P0 后，前端可以移除当前 `html_content` JSON 兼容层，直接切换到专用配置接口。
