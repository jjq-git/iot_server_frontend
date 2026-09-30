# API Keys 管理

> 最后更新：2026-09-02

API Keys 是平台级系统工具，入口位于侧栏“系统调试”，路由为 `/api-keys`。只有具备
`platform.permission.manage` 能力的平台管理员可以进入；路由和菜单统一消费
[permission.js](../src/utils/permission.js) 的 `API_KEY_MANAGE` 能力。

页面 [ApiKeys.vue](../src/views/ApiKeys.vue) 通过 [api_keys.js](../src/api/api_keys.js) 管理
Provider 密钥。列表和详情只接收脱敏值，明文仅在创建/更新时提交给后端；Provider 调用、
加密存储、审计及最终鉴权均由后端负责。

主要接口：

| 操作 | 请求 |
| --- | --- |
| 列表 / Provider 元信息 | `GET /api-keys`、`GET /api-keys/providers` |
| 创建 / 更新 / 删除 | `POST /api-keys`、`PATCH /api-keys/{uuid}`、`DELETE /api-keys/{uuid}` |
| 激活 / 连通测试 | `POST /api-keys/{uuid}/activate`、`POST /api-keys/{uuid}/test` |

前端不得记录、回显或持久化明文密钥。
