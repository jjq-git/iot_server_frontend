# mycompany

> 最后更新：2026-09-09

## 0. 权限

各分区（tab）的可见性分两层：**公司类型**决定该类型公司有没有这个 tab；**角色**决定公司内不同角色能否进入。数据源 = [company-profile.tpl](html/templates/pages/company-profile.tpl) 的 `data-company-roles`；生产以后端 scope / `require_roles` 为准，前端只做体验层门禁。

### 公司权限（按公司类型）

平＝平台、静＝静音仓厂家、中＝中间商、终＝最终用户。各分区四类公司都有。

| 分区 tab | 平  | 静  | 中  | 终  |
| -------- | --- | --- | --- | --- |
| 信息     | ✓   | ✓   | ✓   | ✓   |
| AI 额度  | ✓   | ✓   | ✓   | ✓   |
| 权限     | ✓   | ✓   | ✓   | ✓   |
| 人员     | ✓   | ✓   | ✓   | ✓   |
| 文件     | ✓   | ✓   | ✓   | ✓   |
| 操作记录 | ✓   | ✓   | ✓   | ✓   |

### 人员权限（按角色）

A＝管理员、O＝运营管理、D＝数据录入、V＝数据查看（`platform_admin` = 平台公司的 A）。**RW**＝可读写、**RO**＝只读、**-**＝不可进入。

| 分区 tab | A   | O   | D   | V   | 用途                     |
| -------- | --- | --- | --- | --- | ------------------------ |
| 信息     | RW  | RW  | RO  | RO  | 公司信息呈现/更新        |
| AI 额度  | RO  | RO  | RO  | RO  | 显示AI额度和重置入口     |
| 权限     | RW  | -   | -   | -   | 简单设置本公司的人员权限 |
| 人员     | RW  | RW  | -   | -   | 创建/编辑本公司的人员    |
| 文件     | RW  | RW  | RW  | RO  | 待考虑                   |
| 操作记录 | RO  | RO  | -   | -   | 待考虑                   |

## 信息

### 信息说明

本公司的基本信息.

1. 域名都不可以改, 只读
    1. 平台不要改
    2. 静音仓厂家等其他公司, 都需要和平台沟通对域名进行设置.
    3. 创建域名时, 创建人员可以指定 `subpath`, 即:`https://pods.dengtec.com/abc`
    4. 如果实在想修改, 需要由平台给他们进行修改.

e.g: 平台创建 静音仓厂家A时, 先问几个他们想要的 subpath. 然后进行搜索, 是否可用. 如果可用, 就可以.

### 需要实现

- company_code
  - 后端按 CO- + 6 位 Crockford Base32 生成且全局唯一；仅在基本信息标题说明中展示，不占用表单输入框
- 业务属性
  - is_pod_manufacturer、is_brand、is_channel_partner、is_enduser, 暂时, 但是不能修改, 创建的人, 可以进行修改.
- 状态与系统信息
  - `is_active` 可以由管理员修改, 或是创建的人进行对它修改.
- 地点
  - 需要弹窗一个对话框, 使用locations.json 进行选择, 最后选择增加备注.

## AI 额度

### AI 额度说明

AI 额度现在用于 静音仓里开通 AI 语音时, 使用的额度. 

1. 静音仓厂家可以充值, 转交到其客户那里, 比如每月赠送10000token. 平台也可以.
2. 平台也可以赠送给其他公司
3. 最终消费者, 管理员可以管理具体的静音仓额度上限.
4. 要能实现AI的自动充值.
    1. Stripe/Paypal微信/支付宝/

### AI 额度待实现

1. 额度购买页面.

## 权限

这个只给公司管理员使用, 有个默认的选项. 便于老板的简单操作, **权限列表的行, 需要和当前公司有的内容一致. 比如最终消费者没有设备信息, 那这个行也不要存在.**

## 人员

管理员用来管理本公司的人员.

## 后端 / API 参考（未逐条核对）

> 字段契约、字段语义、API 缺口，供后端实施参考；页面功能要求以上文（信息 / AI 额度 / 权限 / 人员）为准。

### `companies` 字段分类

| 页面分组       | 数据字段                                                              | 编辑方式                 | 说明                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 基本信息       | `company_code`                                                        | 只读                     | 后端按 `CO-` + 6 位 Crockford Base32 生成且全局唯一；仅在基本信息标题说明中展示，不占用表单输入框                                                                     |
| 基本信息       | `company_name`、`short_name`                                          | 可编辑                   | 分别表示公司正式全称和紧凑位置使用的简称                                                                                                                              |
| 基本信息       | 🔴 `slogan`                                                            | 可编辑                   | 新增（2026-09-08 目标）；公司标语，展示在左上角公司名下方，仅展示不参与寻址                                                                                           |
| 基本信息       | `logo_file_id` → `logo_url`                                           | 可编辑（上传）           | 走公司 Logo 专用上传接口；接口派生只读 `logo_url`                                                                                                                     |
| 业务属性       | `is_pod_manufacturer`、`is_brand`、`is_channel_partner`、`is_enduser` | 当前公司页不展示、不编辑 | 只能由上级公司在其创建或管理的下一级公司流程中设定；公司不能修改自身身份                                                                                              |
| 联系与地点     | `contact_person`、`contact_email`、`contact_phone`                    | 可编辑                   | 公司的主要业务联系方式                                                                                                                                                |
| 联系与地点     | `location_id`                                                         | 可编辑（选择）           | 提交整数 `location_id`；国家与地址由关联 `locations` 派生只读，`address` 已删                                                                                         |
| 登录入口       | 🔴 `domain`                                                            | 只读                     | 新增（2026-09-08 目标）；单一入口 URL（完整含 `https://`），平台人员手工配置、客户只读；合并原 `company_slug`/`subdomain`/`subpath`/`custom_domain`/`domain_verified` |
| 状态与系统信息 | `is_active`                                                           | 管理员编辑               | 停用影响整个公司访问，需要明确确认                                                                                                                                    |
| 状态与系统信息 | `id`、`uuid`、`created_at`、`updated_at`                              | 只读                     | 内部标识与审计时间                                                                                                                                                    |

### 不直接作为普通字段显示的数据

- `company_code` 由后端使用加密安全随机源生成，格式为 `CO-XXXXXX`，字符集为 `0123456789ABCDEFGHJKMNPQRSTVWXYZ`。前端只读展示，不生成、不允许编辑；平台公司也使用相同格式，平台身份仍由 `parent_com_id = NULL` 判断。
- 🔴 `slogan` 为 2026-09-08 目标新增字段（品牌口号，展示在左上角公司名下方，仅展示不参与寻址），后端 `CompanyResponse` / 更新 Schema 待增补。
- 🔴 域名 / 入口收敛为**单一 `domain`**（完整 URL，含 `https://`，平台配置只读），原 `company_slug`、`subdomain`、`subpath`、`custom_domain`、`domain_verified` 全部并入，页面不再单列这些字段。菜单其余路由均相对该 `domain`（如 `abc.dengtec.com/mycompany`）。
- `company_type` 不是数据库列，是后端根据 `parent_com_id` 和五个业务属性推导的展示值。平台公司优先由 `parent_com_id = NULL` 判断。
- `parent_com_id` 决定组织归属，但不在“我的公司”中展示或编辑；仅在上级公司的下级公司管理流程中维护。
- `business_type` 当前固定为 `pod`，不在“我的公司”中展示或编辑；等到平台确实支持多条业务线时，再设计独立的业务范围管理流程。
- `html_template` 已退出公司资料；品牌、看板和可选定制页面由 [company_dashboard_config](../../../iot_server_backend/docs/数据模型/company_dashboard_config.md) 管理。该配置每公司唯一，平台直接维护并用 `is_active` 启停，不再经过草稿、审核、发布或回滚流程。
- `change_log` 不作为文本框显示，解析后进入“操作记录”。
- `templates`、`children` 是关系数据，不属于公司资料字段。
- `is_soundproof_pod`、`is_info_collection` 只存在于兼容请求 Schema，不是当前 `companies` 数据列，不能继续作为页面业务类型选项。

### 当前 API 缺口

以下为 2026-09-08 companies 目标态与现有后端的差距（🔴 = 目标已定、后端待实现）。只记录在模板 `<!-- Handoff: ... -->` 注释和本文，不显示给最终用户；Demo 中出现输入框不代表现有接口已经支持保存。

- 🔴 **`slogan` 未落库**：目标新增字段，`CompanyResponse` 与 `CompanyUpdateRequest` 待增补；接入前 Demo 按目标展示。
- 🔴 **域名合并为单一 `domain` 未落库**：后端当前仍是 `company_slug` / `subdomain` / `subpath` / `custom_domain` / `domain_verified` 五字段；目标合并为单一 `domain`（完整 URL，含 `https://`，平台配置只读、无自助验证）。`template_service` 反查、`CompanyResponse` / `CompanyUpdateRequest` 待改。
- **`country` / `region` / `data_region` / `address` 已删**：迁移已移除，国家与地址由 `location_id → locations` 派生；页面用 `location_id`，不再出现这四个字段。
- `updated_at` 应在 `CompanyResponse` 返回。
- `html_template` 已删除，品牌视觉迁至 [company_dashboard_config](../../../iot_server_backend/docs/数据模型/company_dashboard_config.md) 的 `config_json.branding`，不并入公司详情通用更新接口。

#### 公司 Logo 存储与接口缺口

`companies` 已有可空的 `logo_file_id`，外键指向 `files.id`，作为当前 Logo 的唯一事实源；API 从关联文件派生只读 `logo_url` 供登录页和后台展示。前端不保存 URL（`html_template` 已删除）。

上传、替换和删除应使用公司 Logo 专用接口，在事务中处理文件和 `logo_file_id`。`file_relations` 继续服务于附件、资料和历史关联，不再承担当前 Logo 的主指针。

`html_template.branding.logo` 只作为迁移期兼容数据；完成迁移后应由 `logo_file_id` 统一解析，不能与数据库字段分别编辑。

