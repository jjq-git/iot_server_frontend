# devices_nodes（控制器 · 节点）

> 最后更新：2026-09-10

`/devices/nodes` 管理**节点（CANopen 从节点）**。数据源 [nodes](../../../iot_server_backend/docs/数据模型/nodes.target.md) + [hn_bindings](../../../iot_server_backend/docs/数据模型/hn_bindings.md)（绑定主机 / 槽位 / 路由）+ [hn_models](../../../iot_server_backend/docs/数据模型/hn_models.target.md)（型号 / 固件）。扁平列表，可按主机 / 状态筛选。

> 设备走**工厂预登记 + 一机一密自动注册**：此页**不手工新增节点**，只查看与运维。节点无独立 `host_status`，在线态经**所属主机**聚合上报。原型：[nodes-list.tpl](html/templates/pages/nodes-list.tpl) + [device-demo.js](html/assets/js/device-demo.js)。

## 0. 权限

### 公司权限（按公司类型）

平＝平台、静＝静音仓厂家、中＝中间商、终＝最终用户。

| 页面 | 平 | 静 | 中 | 终 |
| --- | --- | --- | --- | --- |
| 节点 `/devices/nodes` | ✓ | ✓ | - | - |

- 节点是硬件层，仅平台 + 静音仓厂家可见。平台看全部；厂家按 `pod_com_id` scope 只看发给自己的节点。

### 角色权限（按角色）

A＝管理员、O＝运营管理、D＝数据录入、V＝数据查看。**RW**＝可读写、**RO**＝只读、**-**＝不可操作。

| 操作 | A | O | D | V |
| --- | --- | --- | --- | --- |
| 查看列表 | RO | RO | RO | RO |
| 编辑备注（remark） | RW | RW | RW | - |
| 触发 OTA | RW | RW | - | - |

> 吊销凭据 / 刷新在线是**主机级**能力（节点无独立凭据、在线态随主机），在[主机页](url-devices_hosts.md)做。

## 1. 实体与关系

节点是一个 CANopen 从节点 = 一行 `nodes`，经所属主机网关聚合上报：

| 维度 | 字段 / 来源 | 说明 |
| --- | --- | --- |
| **身份** | `serial_no`（序列号）/ `mac_address`（可空，ESP32 有、其它 MCU 可能无）/ `efuse_chip_id` / `uuid` | 序列号全局唯一 |
| **型号 / 版本** | `hn_model_id` → [hn_models](../../../iot_server_backend/docs/数据模型/hn_models.target.md) 一条精确版本行 | 派生 `model_code` / `hw_version` / `od_ver` / `sw_ver`；节点表**无独立 sw_ver 列** |
| **绑定主机 / 拓扑** | [hn_bindings](../../../iot_server_backend/docs/数据模型/hn_bindings.md)：`host_id` / `node_pos` / `route_device_id` / `physical_can_node_id` | 一节点至多绑一台主机；`node_id` 全局唯一 |
| **在线态** | 无 `node_status`；折叠进所属主机 / `pod_status` | 经主机聚合；未绑定则无在线态 |
| **归属** | `pod_com_id` → [companies](../../../iot_server_backend/docs/数据模型/companies.md) | 出厂发给哪个厂家（静态） |

- **OTA 只改 `hn_model_id`**：同型号同硬件下升到新精确版本行。
- **绑定不在 nodes 表**：主机 / 槽位 / 路由都在 `hn_bindings`；节点身份由主机上报、对 `device_factory_registry` 校验。

## 2. 主列表

### 2.1 列

| 列 | 字段 | 说明 |
| --- | --- | --- |
| 序列号 | `serial_no` | 节点图标 + 序列号；等宽字体 |
| 型号 | `hn_models.model_name` + `model_code` | 名称 + 料号（经 `hn_model_id`） |
| 固件 | `hn_models.sw_ver` | 当前固件版本 |
| 绑定主机 | `hn_bindings.host_id` → `hosts.serial_no` | 所属主机序列号；未绑定显示「未绑定」 |
| 槽位 / 路由 | `hn_bindings.node_pos` / `route_device_id` | 位置标签 + 路由号 |
| 客户 | `companies`（`pod_com_id`） | 归属厂家；**厂家视角隐藏此列** |
| 状态 | 经所属主机聚合 | 在线 / 离线 / 未绑定 |
| 操作 | — | 编辑备注 / 触发 OTA |

### 2.2 筛选

- 搜索：`serial_no` / `mac_address` / 型号。
- 绑定主机筛选：按 `hn_bindings.host_id`（含「未绑定」）。
- 状态筛选：在线 / 离线 / 未绑定。

## 3. 运维操作

节点自动注册，节点页只做（均为 Demo toast，未接后端）：

| 操作 | 说明 | 后端 |
| --- | --- | --- |
| **编辑备注** | 改 `nodes.remark` 自由文本 | PUT `/api/v1/nodes/{id}` 只改 remark |
| **触发 OTA** | 选目标 `sw_ver`（同型号同硬件下的活跃版本）→ 升级 `hn_model_id` | 经 `ota_tasks` 下发 |

> **吊销凭据 / 刷新在线**不在节点页：节点无独立 `device_credentials`、在线态随主机——去[主机页](url-devices_hosts.md)做。节点的**换绑 / 改槽位**属拓扑操作，走静音仓拓扑流程（`pod_topology_versions`），不在此页。

## 4. 后端 / API 参考（未逐条核对）

> 供后端实施参考；字段语义以 [nodes.target.md](../../../iot_server_backend/docs/数据模型/nodes.target.md) 为准。

- **主列表**：`GET /api/v1/nodes`，join `hn_bindings`（绑定主机 / 槽位 / 路由）、`hn_models`（型号 / 固件）、`companies`（客户）。
- **备注**：`PUT /api/v1/nodes/{id}`（仅 `remark`）。
- **OTA**：`POST /api/v1/nodes/{id}/ota`（目标精确版本行 → `ota_tasks`）。
- **在线态**：无节点级状态，读所属主机 `host_status` / `pod_status` 聚合。

## 待办

- [x] 建 Demo 原型：`nodes-list.tpl` + `device-demo.js`，节点扁平列表；运维 备注 / OTA（toast 占位）；筛选（绑定主机 / 状态 / 搜索）。
- [ ] 后端契约（列表 join / OTA 接口）逐条核对 `nodes.target.md` + `hn_bindings.md`。
