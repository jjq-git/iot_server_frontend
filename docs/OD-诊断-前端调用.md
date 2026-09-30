# OD 诊断前端调用文档

> 最后更新:2026-09-14

OD 远程诊断是面向 **管理员 / 维护人员** 的内部诊断工具,用于在不接入实机串口的前提下,远程拉取节点(C3/C6 等)运行时的对象字典(Object Dictionary)快照,并与 YAML 规范文件做双列对比,快速定位 **缺失/多余/数值不符/只读运行时值** 等异常。

后端实现见 [OD 诊断 API](../../iot_server_backend/docs/api/OD诊断.md)；数据落库见 [od_snapshots](../../iot_server_backend/docs/数据模型/od_snapshots.md)。

## 目录

- [路由与菜单入口](#路由与菜单入口)
- [权限控制](#权限控制)
- [前端 API 封装](#前端-api-封装)
- [页面交互流程](#页面交互流程)
- [WebSocket 进度推送](#websocket-进度推送)
- [对齐策略](#对齐策略)
- [状态分类](#状态分类)
- [典型异常处理](#典型异常处理)

---

## 路由与菜单入口

- 路由路径:`/devices/od-manager`(注册在 [src/router/index.js](../src/router/index.js),`() => import('@/views/OdManager.vue')` 懒加载)
- 视图组件:[src/views/OdManager.vue](../src/views/OdManager.vue)(主机/设备级联选择 + snapshot profile + 双列实机 vs YAML 对比 + 进度条)
- 侧栏入口：[src/components/Sidebar.vue](../src/components/Sidebar.vue) 的“系统调试”组下 **“OD 诊断”**

## 权限控制

仅以下角色可见入口、可访问该路由:

| 角色 | 中文名 | 是否可访问 |
|------|--------|-----------|
| `platform_admin` | 平台管理员 | ✅ |
| `admin` | 管理员 | ✅ |
| `maintainer` | 维护人员 | ✅ |
| 其他角色 | — | ❌ 侧栏不展示该菜单项,直接访问路由也会被拦截 |

## 前端 API 封装

统一封装在 [src/api/od.js](../src/api/od.js),底层走 [src/api/http.js](../src/api/http.js) 的 axios 实例。

| 方法 | HTTP 路径 | 用途 |
|------|----------|------|
| `triggerOdDump(payload)` | `POST /api/v1/od/dump` | 下发 OD dump 命令到指定主机的指定设备 |
| `fetchOdSnapshot(hostUuid, nid)` | `GET /api/v1/od/snapshot` | 拉取实机最近一次 dump 结果(JSON) |
| `fetchOdSnapshots(hostUuid?)` | `GET /api/v1/od/snapshots` | 列出主机/全平台的快照历史 |
| `fetchOdSpec(id, ver='V0.0.1')` | `GET /api/v1/od/spec` | 拉取 YAML 规范(节点/版本) |
| `fetchOdCatalog()` | `GET /api/v1/od/catalog` | 列出后端可用的所有 OD 规范(id + 版本) |
| `fetchOdDeviceModels(hostUuid)` | `GET /api/v1/od/device-models` | 从 PostgreSQL 库存解析主机/节点路由型号与规范版本 |

请求体与响应字段详情见 [后端 OD 诊断 API](../../iot_server_backend/docs/api/OD诊断.md)。

## 页面交互流程

```
[选主机 (host_uuid)] ──→ GET /od/device-models（库存权威）
                                  │
                                  ▼
                         [选目标设备 (route_device_id)]
                                  │
                                  ▼
                  [选 profile；custom 时填写对象]
                                  │
                                  ▼
                       [点击"开始 dump" 按钮]
                                  │
                                  ▼
              POST /od/dump  { host_uuid, device_id, target,
                                profile, objects? }
                                  │
                                  ▼
            等待 WebSocket `od_dump_progress` 推送进度
                  (0% ──→ 100%,失败时下发错误码)
                                  │
                                  ▼
        dump 完成后并发请求:
          - GET /od/snapshot  (实机当前 OD)
          - GET /od/spec      (YAML 规范)
                                  │
                                  ▼
        左右双列渲染对比表 (按 name 严格匹配为主键对齐)
```

profile 取值为 `fault/startup/maintenance/full/custom`，默认 `full`。custom 输入采用逗号分隔的
`0xINDEX` 或 `0xINDEX:十进制SubIndex`，例如 `0x1001, 0x1003:1`；最多 128 项，页面在提交前
校验 index 范围、sub-index 范围及重复项。命名 profile 不允许客户端附带 objects，其对象集合由
Configs/OD 发布包统一定义。

## WebSocket 进度推送

dump 命令是异步任务，耗时取决于 profile 的对象数量。前端统一走平台已有的 WebSocket 推送（参见 [后端 WebSocket 文档](../../iot_server_backend/docs/api/WebSocket.md)）。

事件名:`od_dump_progress`,典型 payload:

```json
{
  "type": "od_dump_progress",
  "host_uuid": "...",
  "nid": 2,
  "data": {
    "nid": 2,
    "dump_id": 7,
    "seq": 3,
    "total": 12,
    "received": 8,
    "completed": false,
    "profile": "fault"
  },
  "timestamp": 1714463200000
}
```

收到 `data.completed = true` 后，触发 `fetchOdSnapshot` + `fetchOdSpec` 拉取最终结果。迁移期旧固件可不带 `profile`；新固件应回传命令中的同一值。

## 对齐策略

设备型号和路由不再由前端根据显示名、静态目录或正则表达式猜测。页面使用
`/od/device-models` 返回的 `route_device_id` 发起命令/快照请求，并仅在
`resolution_status=resolved` 且 `spec_status=available` 时自动加载返回的
`spec_id` 与 `preferred_spec_version`。`physical_can_node_id` 只用于展示物理 CAN 地址，
不能代替路由 ID。

实机快照 vs YAML 规范的对齐采用 **双层匹配**:

1. **主键 = `name`**(严格匹配):优先按 OD 条目的语义名匹配,容忍 index 偏移(参考 memory `feedback_od_json_generator_bug`,gen_json.js 已知存在 record 子项 index 错位 bug,因此不能用 index 当主键)
2. **同 index 多 spec 时用 `name` 二次校验**:同一个 index 下若 YAML 有多条(如 record 类),按 sub-index 区分,再按 name 兜底

未匹配上的条目也会显示出来,但状态会被标记为"实机有规范无"或"规范有实机无"。

## 状态分类

页面右侧每行根据对齐结果归类为 4 种状态,UI 上用不同颜色徽标区分:

| 状态 | 含义 | 显示策略 |
|------|------|----------|
| **匹配** | 实机值 == YAML 默认值,且名字、类型一致 | 绿色 / 默认 |
| **值不同** | 名字匹配,但实机值与 YAML 默认值不一致 | 黄色高亮,左右两列同时显示对比值 |
| **运行时值 ro** | YAML 标注 `access: ro`(只读统计/状态),实机有值规范无默认 | 灰色,提示"运行时只读,不参与对比" |
| **规范未定义** | 实机有该条目,但 YAML 完全没有 | 红色,提示研发同学补 YAML |
| **实机未上报** | YAML 定义了,实机快照里没出现 | 红色,提示节点固件可能漏注册 |

## 典型异常处理

| 现象 | 可能原因 | 处置建议 |
|------|---------|---------|
| 进度长时间停在 0% | 主机离线 / EMQX 推送中断 | 检查 [设备管理] 主机在线状态,看后端 MQTT 日志 |
| dump 完成但 snapshot 为空 | 节点固件未实现 OD dump 协议 | 找固件同事确认节点 SDO 回调是否实现 |
| 大量"规范未定义" | YAML 版本不对 | 在主机详情确认 OD 版本号,在 catalog 里换 ver 重试 |
| 大量"实机未上报" | 节点固件 OD 注册不全 | 提交 issue 给固件团队,把缺失 name 列表附上 |

---

最后更新:2026-09-14
