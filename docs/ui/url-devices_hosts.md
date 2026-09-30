# devices_hosts（控制器 · 主机）

> 最后更新：2026-09-10

`/devices/hosts` 管理**主机（CANopen 主站 / MQTT 网关）**。数据源 [hosts](../../../iot_server_backend/docs/数据模型/hosts.target.md) + [host_status](../../../iot_server_backend/docs/数据模型/host_status.target.md)（在线态）+ [hn_bindings](../../../iot_server_backend/docs/数据模型/hn_bindings.md)（绑定节点）。列表（点主机行内联展开它绑定的节点）+ 运维（备注 / OTA / 吊销·恢复凭据 / 刷新）。

> 设备走**工厂预登记 + 一机一密自动注册**（见 [注册设备](url-devices_credentials.md)）：此页**不手工新增主机**，只查看与运维。原型：[hosts-list.tpl](html/templates/pages/hosts-list.tpl) + [device-demo.js](html/assets/js/device-demo.js)。

## 0. 权限

### 公司权限（按公司类型）

平＝平台、静＝静音仓厂家、中＝中间商、终＝最终用户。

| 页面 | 平 | 静 | 中 | 终 |
| --- | --- | --- | --- | --- |
| 主机 `/devices/hosts` | ✓ | ✓ | - | - |

- 主机是硬件层，仅平台 + 静音仓厂家可见（对齐 [页面清单](README.md#页面清单与访问权限按公司类型)）。
- 平台看全部；厂家按 `pod_com_id` scope 只看发给自己的主机。

### 角色权限（按角色）

A＝管理员、O＝运营管理、D＝数据录入、V＝数据查看。**RW**＝可读写、**RO**＝只读、**-**＝不可操作。

| 操作 | A | O | D | V |
| --- | --- | --- | --- | --- |
| 查看列表 / 展开绑定节点 | RO | RO | RO | RO |
| 编辑备注（remark） | RW | RW | RW | - |
| 触发 OTA | RW | RW | - | - |
| 吊销 / 恢复凭据 | RW | RW | - | - |
| 刷新在线状态 | RW | RW | RW | RW |

## 1. 实体与关系

主机是一台物理设备 = 一行 `hosts`。身份、型号、在线、绑定分散在不同表：

| 维度 | 字段 / 来源 | 说明 |
| --- | --- | --- |
| **身份** | `serial_no`（序列号）/ `mac_address`（MQTT 用户名）/ `efuse_chip_id`（onboarding 密钥，不可变）/ `uuid` | 序列号 + MAC 全局唯一 |
| **型号 / 版本** | `hn_model_id` → [hn_models](../../../iot_server_backend/docs/数据模型/hn_models.target.md) 一条精确版本行 | 由该行派生 `model_code` / `hw_version` / `od_ver` / **`sw_ver`（当前固件）** / `vendor_id` / `product_code`；主机表**无独立 sw_ver 列** |
| **在线态** | [host_status](../../../iot_server_backend/docs/数据模型/host_status.target.md) `.is_online` / `.last_seen_at` | 来自 MQTT 心跳，超时用 `hosts.mqtt_upload_interval` 计算；**不在 hosts 表** |
| **绑定节点** | [hn_bindings](../../../iot_server_backend/docs/数据模型/hn_bindings.md)（`host_id` → 多个 `node_id`） | 一主机绑多节点；节点全局唯一属一台主机 |
| **归属** | `pod_com_id` → [companies](../../../iot_server_backend/docs/数据模型/companies.md) | 出厂发给哪个静音仓厂家（静态，不随转售变） |
| **凭据 / 生命周期** | [device_credentials](../../../iot_server_backend/docs/数据模型/device_credentials.target.md) `.revoked` / [device_enrollments](../../../iot_server_backend/docs/数据模型/device_enrollments.target.md) `.state` / [device_factory_registry](../../../iot_server_backend/docs/数据模型/device_factory_registry.target.md) | 预登记 → 认证 → 发凭据 → 认领；吊销 factory_registry 级联吊销 credential |

- **OTA 只改 `hn_model_id`**：升级把主机指向同型号同硬件下的新精确版本行（新 `sw_ver` / `od_ver`），设备行本身不存版本号。
- **状态不在 hosts 表**：在线态查 `host_status`，凭据有效性查 `device_credentials.revoked`，注册进度查 `device_enrollments.state`——不要用 `hosts` 的更新时间推断在线。

## 2. 主列表

列表遵循[列表页规范](widgets/lists.md)：Header → Filter → Table。

### 2.1 列

| 列 | 字段 | 说明 |
| --- | --- | --- |
| 序列号 | `serial_no` | 展开箭头 + 主机图标 + 序列号；等宽字体 |
| MAC 地址 | `mac_address` | 网络身份 / MQTT 用户名；等宽 |
| 型号 | `hn_models.model_name` + `model_code` | 名称 + 料号（经 `hn_model_id`） |
| 固件 | `hn_models.sw_ver` | 当前固件版本（经 `hn_model_id`） |
| 客户 | `companies`（`pod_com_id`） | 归属静音仓厂家；**厂家视角隐藏此列** |
| 节点 | COUNT(`hn_bindings`) | 绑定节点数（点行展开看明细） |
| 状态 | `host_status.is_online` / `device_credentials.revoked` | 在线 / 离线 / 已吊销 + 最后在线时间 |
| 操作 | — | 编辑备注 / 触发 OTA / 刷新在线状态 / 吊销·恢复凭据 |

### 2.2 筛选

- 搜索：`serial_no` / `mac_address` / 型号。
- 客户筛选：按 `pod_com_id`。
- 状态筛选：在线 / 离线 / 已吊销。

## 3. 展开：绑定节点

点主机行**内联展开**，显示该主机 `hn_bindings` 绑定的节点子表：

| 列 | 字段 | 说明 |
| --- | --- | --- |
| 槽位 | `hn_bindings.node_pos` | 位置标签（如 Slot-1），主机内唯一 |
| 路由 | `hn_bindings.route_device_id` | MQTT / Widget / OTA 路由号（2–127），主机内唯一 |
| CANID | `hn_bindings.physical_can_node_id` | 真实 CANopen Node-ID（1–127，可空，后填） |
| 节点序列号 | `nodes.serial_no` | 链接到[节点页](url-devices_nodes.md) |
| 型号 / 固件 | 节点 `hn_model_id` 派生 | 节点型号名 + 料号 + `sw_ver` |
| 状态 | 经所属主机聚合 | 在线 / 离线 |

- 空绑定显示「该主机暂无绑定节点」。
- 绑定由拓扑发现 / 人工识别产生，历史归档在 `pod_topology_versions`；`hn_bindings` 是当前工作快照（每节点一行）。

## 4. 运维操作

设备自动注册，主机页只做以下运维（均为 Demo toast，未接后端）：

| 操作 | 说明 | 后端 |
| --- | --- | --- |
| **编辑备注** | 改 `hosts.remark` 自由文本 | PUT `/api/v1/hosts/{id}` 只改 remark |
| **触发 OTA** | 选目标 `sw_ver`（同型号同硬件下的活跃版本）→ 升级 `hn_model_id` | 经 `ota_tasks` 下发 |
| **吊销 / 恢复凭据** | 切 `device_credentials.revoked`；吊销后设备约 60 秒内 MQTT 断连。危险，二次确认 | 与 `device_factory_registry` 吊销联动 |
| **刷新在线状态** | 重新拉 `host_status.is_online` / `last_seen_at` | 读接口 |

> 设备的**注册 / 发凭据**不在此页：走[注册设备 `/devices/credentials`](url-devices_credentials.md)（平台预登记 + 一机一密）。此页只对已注册主机做运维。

## 5. 后端 / API 参考（未逐条核对）

> 供后端实施参考；字段语义以 [hosts.target.md](../../../iot_server_backend/docs/数据模型/hosts.target.md) 为准。

- **主列表**：`GET /api/v1/hosts`，join `host_status`（在线 / last_seen）、`hn_models`（型号 / 固件 / OD）、`companies`（客户）、`hn_bindings`（节点数）。
- **展开绑定节点**：`GET /api/v1/hosts/{id}/nodes`（或 `hn_bindings` join `nodes` + `hn_models`）。
- **备注**：`PUT /api/v1/hosts/{id}`（仅 `remark`）。
- **OTA**：`POST /api/v1/hosts/{id}/ota`（目标精确版本行 → `ota_tasks`）。
- **吊销 / 恢复**：`POST /api/v1/hosts/{id}/credentials/revoke` / `.../restore`（`device_credentials.revoked`）。
- **在线态**：读 `host_status`；超时判定用 `hosts.mqtt_upload_interval`。

## 待办

- [x] 建 Demo 原型：`hosts-list.tpl` + `device-demo.js`，主机列表 + 内联展开绑定节点子表；运维 备注 / OTA / 刷新 / 吊销·恢复（toast 占位）；筛选（客户 / 状态 / 搜索）。
- [ ] 后端契约（列表 join / OTA / 吊销接口）逐条核对 `hosts.target.md` + `host_status.target.md` + `hn_bindings.md`。
