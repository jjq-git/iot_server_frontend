# devices_model（控制器 · 型号目录）

> 最后更新：2026-09-09

`/devices/model` 管理**主机（Product）与节点（Node）的型号目录**。数据源 [hn_models](../../../iot_server_backend/docs/数据模型/hn_models.md)（单表精确版本目录）。列表（点行内联展开 硬件 → 字典 → 软件 三层）+ 分层创建 + 各层编辑 / 上传。

> 数据模型：一行 `hn_models` = 一个不可变精确版本 `(model_code, hw_version, od_ver, sw_ver)`；目标态字段见 [hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md)。原型：[controller-models-list.tpl](html/templates/pages/controller-models-list.tpl) + [model-demo.js](html/assets/js/model-demo.js)（已按本文重建：内联手风琴 + 分层增 / 删 / 改）。

## 0. 权限

### 公司权限（按公司类型）

平＝平台、静＝静音仓厂家、中＝中间商、终＝最终用户。

| 页面 | 平 | 静 | 中 | 终 |
| --- | --- | --- | --- | --- |
| 型号 `/devices/model` | ✓ | ✓ | - | - |

- 型号是硬件层，仅平台 + 静音仓厂家可见（对齐 [页面清单](README.md#页面清单与访问权限按公司类型)）。
- 平台看全部；厂家按 `company_id` scope 只看自己的型号。

### 角色权限（按角色）

A＝管理员、O＝运营管理、D＝数据录入、V＝数据查看。**RW**＝可读写、**RO**＝只读、**-**＝不可操作。型号录入是 **D 的核心职责**。

| 操作 | A | O | D | V |
| --- | --- | --- | --- | --- |
| 查看列表 / 详情 | RO | RO | RO | RO |
| 新建型号 / 加硬件 / 加字典（传 `od.json`）/ 加软件（传固件、主机 `ui.json`） | RW | RW | RW | - |
| 编辑展示信息（名称 / 描述 / 图片）/ 各层说明（`hw_desc` / `od_desc` / `notes`） | RW | RW | RW | - |
| 软件版本转活跃 / 停用（`status`） | RW | RW | - | - |

## 1. 模型层级（决定页面结构）

`hn_models` 是**追加式精确版本目录**，页面按四层组织（自上而下手工建）：

| 层 | 键 | 说明 |
| --- | --- | --- |
| **型号** | `model_code`（`P-` 主机 / `N-` 节点） | 主列表一行；带类型、料号、展示信息 + **身份 `vendor_id`/`product_code`**（`0x1018`，同型号跨硬件版本不变） |
| **硬件版本** | `+ hw_version` | 一个型号可有多个硬件版本；`hw_version`（`0x1009`）落此层；带 `hw_desc` 更新说明 |
| **OD 版本（字典）** | `+ od_ver` | UI 显示为「字典」；`hn_model_attrs` / `hn_model_slots` 锚点；建字典后上传 `od.json`（OD 字典导入）+ `od_desc` |
| **软件版本** | `+ sw_ver` | 完整五元组 = 一条精确版本行 ↔ **一份真实固件**（[firmwares](../../../iot_server_backend/docs/数据模型/firmwares.md)）；**状态 `status`（草稿 / 活跃 / 停用）落此行**；主机再传 `ui_json`（LVGL UI）+ `firmwares.notes` |

- **状态生命周期 `draft` → `active` → `frozen`**（见 [hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md) 手工分层创建）：
  - **`draft`（草稿）**：信息未设完 / 未接固件的骨架（型号只到 `model_code`、硬件骨架到 `hw_version`、OD 骨架到 `od_ver`）。**新建默认 draft**；catalog 标「待补固件」；draft 行**不可被 hosts/nodes 引用、不参与设备匹配、不计入正式目录**。
  - **`active`（活跃）**：信息（含 `sw_ver`/固件、主机的 `ui_json`）都齐后，**录入方手动**从 draft 转 active（不自动转）。只有 active 能被引用。
  - **`frozen`（冻结 / 停用）**：已发布后停用；目录只追加、不物理删除。
- **状态是 `sw_ver` 行级字段**：一行 `hn_models` = 一个软件版本，草稿 / 活跃 / 停用逐行独立设置（在软件层的「增加软件 / 编辑软件」里设），非型号级。
- `vendor_id` / `product_code` 必须逐字对应设备真实上报的 `0x1018`，不能从 `P-`/`N-` 编码推算；三者（+ `hw_version`）合起来才定位设备。
- **已废弃字段不再出现**（`tpl_0x*_ver` / `command_capabilities` / `compatible_hw_versions` / `latest_sw_version` / `is_host` / `composition`）。

## 2. 主列表（型号）

列表遵循[列表页规范](widgets/lists.md)：Header → Filter → Table → Footer。

### 2.1 列

| 列 | 字段 | 说明 |
| --- | --- | --- |
| 头像 | `avatar` | 型号图片；悬停放大，缺省用类型图标 |
| 编号 | `model_code` | 展开箭头 + `P-`/`N-` + 类型图标；等宽字体（不显状态图标，状态在软件行级） |
| 类型 | `model_type` | 主机产品（product）/ 节点（node） |
| 客户 | `company` | 主机显示所属静音仓厂家，节点显示「通用」；**静音仓厂家视角隐藏此列** |
| 型号名称 | `model_name` | |
| 描述 | `desc` | 单行截断，超出加省略号 |
| 创建日期 | `created_at` | |
| 操作 | — | 编辑（展示信息）/ 增加硬件版本；**点行内联展开层级树** |

### 2.2 筛选

- 搜索：`model_code` / `part_number` / `model_name`。
- 类型筛选：主机 / 节点。
- 状态筛选：草稿 / 活跃 / 停用（按型号级状态汇总）。

## 3. 型号展开与编辑

主列表无独立详情页：点型号行**内联展开**层级树；展示信息经「编辑」弹窗改。

### 3.1 展示信息（编辑弹窗）

| 字段 | 编辑 | 说明 |
| --- | --- | --- |
| `model_code` / `model_type` | 只读 | 创建后不可改 |
| `part_number` | 可编辑 | 固定 `WF2D-` 前缀 + 4 位 HEX 编号 |
| `vendor_id` / `product_code` | 只读 | 硬件身份（型号级），取设备真实上报值；`vendor_id` 固定 `0x44454E47`（DENG） |
| `model_name` / `desc` / `avatar` / `url` | 可编辑 | 展示信息 |
| `company_id` | 只读 | 归属厂家 |

### 3.2 层级展开树（内联手风琴）

点型号行展开 **硬件 → 字典 → 软件** 三层，逐层折叠；各层带编辑 / 增加按钮：

| 层 | 展开显示 | 操作按钮 |
| --- | --- | --- |
| **硬件**（`hw_version`） | 硬件版本号 | 编辑（`hw_desc` + 最初 OD 版本）/ 增加字典 |
| **字典**（`od_ver`，即 OD） | 字典版本号 | 编辑（上传 `od.json` + `od_desc`）/ 增加软件 |
| **软件**（`sw_ver`） | `v{sw_ver}` · 固件 · UI 预览（主机）/ 无 UI（节点）· **状态徽标** | 编辑（重传固件 + 主机 `ui.json` + `status` + `firmwares.notes`） |

### 3.3 各层上传 / 归属

| 上传物 | 归属层 | 字段 | 范围 |
| --- | --- | --- | --- |
| `od.json`（OD 字典导入） | 字典 / `od_ver` | `od_import_json` | 主机 + 节点 |
| 固件 | 软件 / `sw_ver` | `firmwares` + `firmwares.notes` | 主机 + 节点 |
| `ui.json`（LVGL UI） | 软件 / `sw_ver` | `ui_json` | **仅主机产品** |
| 状态 | 软件 / `sw_ver` 行 | `status`（草稿 / 活跃 / 停用） | 主机 + 节点 |

- **创建 = 建骨架**：增加硬件 / 字典 / 软件只填版本号 + 备注（软件另设状态），落 draft；上表的**文件（`od.json` / 固件 / `ui.json`）一律在对应「编辑」里上传**，不在创建时传。
- 🔴 `ui_json`：主机 LVGL UI 转 JSON，按 `sw_ver` 一份、网页还原显示；节点恒无。目标新增字段（[hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md)），后端待落。
- **状态在软件行级**：一行 `hn_models` = 一个 `sw_ver`，草稿 / 活跃 / 停用逐行独立；只有活跃能被 hosts / nodes 引用。

## 4. 创建流程（手工分层，骨架 = `draft`）

逐层建、骨架先落库（`status=draft`），最后传固件补齐再手动转 `active`：

1. **新建型号（+ 首个硬件版本）**：选类型（主机产品 / 节点）→ 料号编号（4 位 HEX）→ 产品名称 → 硬件版本；`model_code` / `part_number` / `product_code` 由 类型 + 编号 **自动生成**，`vendor_id` 固定 `0x44454E47`（DENG）**自动写入**。落一条 `status=draft` 骨架行。
2. **加字典（OD）建骨架**：在硬件版本下填 `od_ver`（增加硬件版本时可顺带建首个字典）。`od.json`（OD 字典导入 `od_import_json`，建 attrs / slots 锚点）在**编辑该字典**时上传。仍 draft。
3. **加软件建骨架**：某字典下填 `sw_ver` + 设 `status`（默认 draft）。固件（`firmwares` + `firmwares.notes`）与**主机 `ui.json`（`ui_json`）在编辑该软件**时上传。
4. **转活跃**：某 `sw_ver` 的固件（主机含 `ui_json`）齐后，在「编辑软件」里把该行 `status` 从 draft 改 active——**逐行、手动、不自动转**。只有 active 能被引用、参与匹配。

> draft 骨架允许下层版本键为空；catalog 端点标「待补固件」。骨架落库走后端**分层骨架接口**（[hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md) 已定方案 a）。

## 5. 后端 / API 参考（未逐条核对）

> 供后端实施参考；字段语义以 [hn_models.md](../../../iot_server_backend/docs/数据模型/hn_models.md) + [hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md) 为准。

- **主列表（硬件线）**：`GET /api/v1/hn-model-catalog/hardware-lines`（一条记录 = 一个 `(model_code, hw_version)` 硬件线）；展开 `/revisions`（OD 版本）与 `/versions`（软件版本）。`GET /api/v1/hn-models` 保留精确版本行语义，不在前端二次聚合。
- **分层骨架创建**：后端已定**方案 (a)**——提供型号 / 硬件版本 / OD 分层骨架创建（`status=draft`，下层版本键可空），骨架无需 JSON。
- **OD 字典导入**：字典（`od_ver`）层上传 `od.json`（`od_import_json`），导入该 OD 组 attrs / slots（UI 把「传字典」放在 OD 层，非固件时）。
- **固件上传建版本**：某字典下 `POST /api/v1/firmwares/upload` 建 `sw_ver` + `firmwares`（+ `firmwares.notes`）；`ui_json` 仅 `model_type=product` 的 `sw_ver` 行接受。
- **状态（`sw_ver` 行级）**：`draft`（新建默认，catalog 标「待补固件」，不可被引用 / 不参与匹配）→ 补齐后录入方**逐行手动**转 `active`（不自动）→ 停用 `frozen`。目录只追加不物理删。
- **身份字段**：`vendor_id` / `product_code`（型号级，`0x1018`）+ `hw_version`（硬件版本级，`0x1009`）；`vendor_id` 固定 `0x44454E47`，`product_code` 保留设备真实上报值、不接受从编码推算。
- `ui_json`：🔴 目标新增字段（[hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md)），`hn_models` 与相关响应待落。

## 待办

- ✅ 骨架落库 = 后端分层骨架接口（方案 a，`status=draft`）；硬件身份三元组归属已定（`vendor_id`/`product_code` 型号级、`hw_version` 硬件版本级）——见 [hn_models.target.md](../../../iot_server_backend/docs/数据模型/hn_models.target.md)。
- [x] 建 Demo 原型：`controller-models-list.tpl` + `model-demo.js` 重建为型号列表 + 内联手风琴（硬件 → 字典 → 软件）；新建型号（选类型）/ 编辑展示信息。
- [x] 分层增 / 改可用：增加硬件版本 / 字典 / 软件（真改数据 + 重渲 + 自动展开）；编辑硬件（`hw_desc`）/ 字典（`od_desc`）/ 软件（`status` + `firmwares.notes`）。
- [x] 各层上传字段就位（占位 toast，未接后端）：字典层 `od.json`、软件层固件 + 主机 `ui.json`；软件行级 `status`（草稿 / 活跃 / 停用）徽标 + 可设。
