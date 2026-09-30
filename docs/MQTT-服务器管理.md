# MQTT 服务器管理(EMQX 代理)

> 最后更新：2026-08-27
>
> 来源:commit `2d7553d`。本目录下的 5 个页面是 **EMQX dashboard 的前端代理**——前端不直连 EMQX,所有请求经后端 `/api/v1/mqtt-server/*`,后端用 admin 凭据查 EMQX REST API 后转发。

## 目录

- [概述](#概述)
- [入口与路由](#入口与路由)
- [API 引用](#api-引用)
- [子页面](#子页面)
  - [总览](#总览)
  - [客户端](#客户端)
  - [订阅](#订阅)
  - [主题](#主题)
  - [黑名单](#黑名单)
- [未配置时的降级](#未配置时的降级)
- [权限说明](#权限说明)

---

## 概述

侧栏顶级 "MQTT" group 共 5 个子项，与“系统调试”/“AI”两组并列。该组会读取 EMQX
全局客户端、Topic、订阅、监听器和封禁数据，**全部页面仅 `platform_admin` 可见**。

| 模块 | 路由 | 视图文件 |
|------|------|---------|
| 总览 | `/mqtt-server` | [src/views/mqtt_server/Overview.vue](../src/views/mqtt_server/Overview.vue) |
| 客户端 | `/mqtt-server/clients` | [src/views/mqtt_server/Clients.vue](../src/views/mqtt_server/Clients.vue) |
| 订阅 | `/mqtt-server/subscriptions` | [src/views/mqtt_server/Subscriptions.vue](../src/views/mqtt_server/Subscriptions.vue) |
| 主题 | `/mqtt-server/topics` | [src/views/mqtt_server/Topics.vue](../src/views/mqtt_server/Topics.vue) |
| 黑名单 | `/mqtt-server/banned` | [src/views/mqtt_server/Banned.vue](../src/views/mqtt_server/Banned.vue) |

API wrapper 集中在 [src/api/mqtt_server.js](../src/api/mqtt_server.js)。

---

## 入口与路由

[src/router/index.js](../src/router/index.js):

```js
{ path: 'mqtt-server',               name: 'MqttServerOverview', ... },
{ path: 'mqtt-server/clients',       name: 'MqttServerClients',  ... },
{ path: 'mqtt-server/subscriptions', name: 'MqttServerSubs',     ... },
{ path: 'mqtt-server/topics',        name: 'MqttServerTopics',   ... },
{ path: 'mqtt-server/banned',        name: 'MqttServerBanned',   ... },
```

五个命名路由统一映射到 `mqtt.admin` 能力；当前只有 `platform_admin` 拥有该能力。手输 URL
同样会被路由守卫拦截。

---

## API 引用

`EMQX_DASHBOARD_URL / USERNAME / PASSWORD` 仅写在后端 .env,前端不接触。所有请求走 [src/api/http.js](../src/api/http.js) axios 实例:

| 函数 | 路径 |
|---|---|
| `fetchMqttHealth()` | `GET /mqtt-server/health` |
| `fetchMqttOverview()` | `GET /mqtt-server/overview` |
| `fetchMqttClients(params)` | `GET /mqtt-server/clients` |
| `fetchMqttClientDetail(clientid)` | `GET /mqtt-server/clients/{clientid}` |
| `disconnectMqttClient(clientid)` | `DELETE /mqtt-server/clients/{clientid}` |
| `fetchMqttSubscriptions(params)` | `GET /mqtt-server/subscriptions` |
| `fetchMqttTopics(params)` | `GET /mqtt-server/topics` |
| `fetchMqttTopicMetrics()` | `GET /mqtt-server/topic-metrics` |
| `fetchMqttListeners()` | `GET /mqtt-server/listeners` |
| `fetchMqttBanned()` | `GET /mqtt-server/banned` |
| `addMqttBanned(payload)` | `POST /mqtt-server/banned` |
| `removeMqttBanned(as, who)` | `DELETE /mqtt-server/banned/{as}/{who}` |

---

## 子页面

### 总览

路由 `/mqtt-server`。

- 顶部健康徽标:`已配置 / 未配置 / 错误`
- 节点级统计:连接数、订阅数、消息吞吐(过去 1m/5m/1h)
- 监听器列表(`fetchMqttListeners`):tcp / ssl / ws / wss
- 主题指标:发送 / 接收速率、QoS 分布

### 客户端

路由 `/mqtt-server/clients`。

- 列表:`clientid / username / connected_at / proto_ver / ip / 最近订阅数`
- 搜索:clientid / username / ip
- **强制下线**(`disconnectMqttClient`):带 modal 二次确认,后端返回成功后从列表移除

### 订阅

路由 `/mqtt-server/subscriptions`。

- 列表当前所有活动订阅:`clientid / topic / qos / share / nl / rap / rh`
- 支持按 topic 过滤(EMQX 通配符,例如 `iot/dev/+/up`)

### 主题

路由 `/mqtt-server/topics`。

- 列表 broker 路由表 `topic → node`
- 主题级指标(发送/接收计数 + 速率)
- 高活跃主题排序

### 黑名单

路由 `/mqtt-server/banned`。

- 列表:`as(clientid|username|peerhost) / who / reason / by / at / until`
- 添加:输入 as / who / reason / 过期时间(可选,空 = 永久)
- 删除:按 as + who 移除

页面写操作（强制下线、拉黑、解封）只向 `platform_admin` 提供。后端仍保留少量带明确
`clientid` 且通过设备 scope 校验的单资源接口供租户业务流程调用，但这些接口不构成进入
EMQX 全局管理页的权限。

---

## 未配置时的降级

当后端 `EMQX_*` 环境变量未配置或代理 503 时,`/mqtt-server/health` 返回:

```json
{ "configured": false, "status": "unconfigured", "version": null }
```

每个页面在 `mounted` / `created` 里先调用 `fetchMqttHealth`,拿到 `configured: false` 时统一渲染:

```html
<b-card class="text-center py-4 mqtt-notconfigured">
  MQTT 服务器未配置,请联系运维在后端 .env 设置 EMQX_DASHBOARD_URL 等参数。
</b-card>
```

不再发起后续 EMQX REST 请求,避免控制台一片红。

---

## 权限说明

侧栏 MQTT group 和五个命名路由统一使用 `mqtt.admin` 能力，仅 `platform_admin` 可见和访问。

| 操作 | 角色 |
|---|---|
| 只读（总览/客户端列表/订阅/主题/黑名单） | `platform_admin` |
| 强制下线 | `platform_admin`（页面） |
| 拉黑 / 解封 | `platform_admin`（页面） |

后端 `/api/v1/mqtt-server/*` 按具体端点执行角色和 scope 校验。全局枚举、健康、总览和监听器
只允许 `platform_admin`；带明确 `clientid` 的单客户端读取或操作按后端契约另行校验。前端隐藏只是
UX，**不可作为权限边界**。

---

> 最后更新：2026-08-27
