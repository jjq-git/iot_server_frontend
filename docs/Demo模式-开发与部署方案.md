# Demo 模式开发与部署方案

> 最后更新：2026-09-17
>
> 状态：实施候选稿；代码侧完成，待真实环境验收
>
> 适用站点：`demo.podsc.com`

## 目录

- [1. 文档目的与结论](#1-文档目的与结论)
- [2. 业务目标与边界](#2-业务目标与边界)
- [3. 仓库现状与实施影响](#3-仓库现状与实施影响)
- [4. 模式模型](#4-模式模型)
- [5. 总体架构与代码边界](#5-总体架构与代码边界)
- [6. 启动判断与安全闸门](#6-启动判断与安全闸门)
- [7. Demo 会话、权限与业务场景](#7-demo-会话权限与业务场景)
- [8. 本地数据设计](#8-本地数据设计)
- [9. API 与实时数据模拟](#9-api-与实时数据模拟)
- [10. 构建方案](#10-构建方案)
- [11. 部署方案](#11-部署方案)
- [12. 实施顺序](#12-实施顺序)
- [13. 测试与验收](#13-测试与验收)
- [14. 风险与明确不采用的方案](#14-风险与明确不采用的方案)
- [15. 参考资料](#15-参考资料)

## 1. 文档目的与结论

本方案把 `demo.podsc.com` 建成一个纯前端、零业务后端的产品演示站，同时保证 Demo 代码不会影响连接真实后端的测试站和正式站。

当前代码实现评审结论为**通过**：阶段 0–4 的仓库内实现、P0 fixture、自动化质量门禁和发布脚本已经完成。第 1.1 节中的受控 Runner、真实浏览器、Nginx 和非生产发布演练仍属于上线前强制门槛；这些外部验收完成前，本文件不是生产部署实施基线。

最终决策如下：

| 事项 | 决策 |
|---|---|
| 源码 | Demo 与正式业务共用同一代码库，不复制长期维护的前端工程 |
| 应用模式 | 使用 `backend` 与 `demo`，表示数据来源；不使用容易与 webpack 混淆的 `production/demo` |
| 构建优化 | webpack 仍独立使用 `development/production`；Demo 发布包同样是 production 优化构建 |
| 模式判断 | 编译期 `buildAppMode` + `config.json.appMode` 必须完全一致；域名只做第三道合理性检查 |
| HTTP | 页面继续请求真实契约路径 `/api/v1`；Demo 由 MSW 在浏览器内拦截，不另造一套 API 前缀 |
| 数据 | 合成种子数据写入 IndexedDB；会话继续兼容现有 `token`、`user` 本地键 |
| 实时 | 通过统一实时服务接口选择真实 WebSocket 或浏览器模拟器，不全局篡改 `window.WebSocket` |
| 登录 | Demo 登录页展示厂家、渠道、办公、租赁四个场景入口，无账号密码和真实鉴权 |
| 重置 | 默认刷新后保留操作结果；用户主动重置时只清 Demo 数据和 Demo 会话，不清语言、主题等偏好 |
| 网络 | Demo 包不包含生产地址，Nginx 不代理 API，CSP 限制连接，未覆盖 API 请求直接失败 |
| 制品 | 默认 backend 构建继续输出现有 `dist/`；Demo 单独输出 `dist-demo/`，正式包不包含种子数据和 MSW worker |

模式校验是一种防误部署机制，不是安全边界。真正的隔离来自 Demo 制品不含凭据、不配置后端代理、浏览器连接策略受限，以及服务器直接拒绝业务服务路径。

### 1.1 转为实施基线的门槛

以下事项全部关闭后，文档状态才能从“实施候选稿”改为“实施基线”：

- 以自动化测试证明默认 `npm run build` 仍生成可被现有消费者使用的 `dist/`。
- 完成独立 Demo 开发端口、关闭 Demo 开发服务的 `/api`/`/emqx` 代理、`sessionAppMode` 和本项目 worker 精确清理验证。
- 第 9.3 节全部 P0 项已绑定真实 fixture、permission/scope 断言、测试负责人，并用真实浏览器网络轨迹证明没有隐式请求。
- CP 公司类型独立迁移已通过评审，读兼容/写收敛和八语言范围明确。
- 启动错误码、IndexedDB 异常和 worker 版本校验已通过浏览器原型验证。
- 明确公开 Demo 的浏览器支持矩阵；至少覆盖当前稳定版 Chrome/Edge/Firefox/Safari，不支持的浏览器显示可理解的启动错误。
- Demo Nginx 配置通过 `nginx -t`，发布脚本的在线 smoke 与自动回滚流程已在非生产环境演练。

### 1.2 本次评审基线

本文档的仓库事实以 2026-09-17 的以下版本为基线：

| 对象 | 基线 |
|---|---|
| 前端 | `iot_server_frontend` `dev@76609046c0bfa767e73db8313cd95de20b87ba67` |
| 后端契约 | `iot_server_backend` `origin/dev@f7dca24d661b7831c574193ce25b60724c747095` |
| 后端 Wiki | `Home`、`客户端Demo`，其中客户端 Demo 页面最后编辑时间为 2026-09-16 14:55:49 +08:00 |

P0 契约已冻结到上述后端远端 `dev` 提交，并由 `config/demo-contract.json`、`tests/fixtures/demo/manifest.json` 和 `dist-demo/build-info.json.contractBackendCommit` 三处一致记录。后端变更后必须重新审查 Schema、更新配置并执行 `npm run generate:demo-contracts`；只改文档或 commit 字符串不能更新契约。

### 1.3 与后端 Wiki 的口径决议

Wiki 是产品概念来源，本文档是前端实施设计。两者表述不同时，按下表执行，并在方案落定后回写 Wiki：

| Wiki 概念表述 | 实施决议 | 原因 |
|---|---|---|
| 按 host 或构建 flag 进入 Demo | 构建模式 + `config.json` 必须一致，host 只做额外校验 | 避免单点误判和错制品部署 |
| MSW 拦截 `api.podsc.com` | 保留现有同源 `/api/v1`，Demo 服务器对 `/api` 直接 404 | 当前前端默认是同源 API；不把真实 API 域名打入 Demo 制品更安全 |
| 刷新/按钮可重置 | 普通刷新保留本地修改，只有显式“重置演示数据”才恢复种子 | 否则无法演示持久化，也容易在表单操作后意外丢数据 |
| “厂家/渠道/办公/租赁角色” | 它们是演示场景，具体授权仍使用 permission code 和 company scope | 防止 Demo 权限逻辑与正式系统分叉 |
| CDN 静态托管 | 首次基线给出 Nginx 静态源站配置；CDN 可选 | CDN 必须原样保留 CSP、缓存和 `/api` 404 语义，否则不得接入 |

Demo 使用 Service Worker 做请求拦截，但不是 PWA，首期不承诺离线启动或静态资源预缓存。

## 2. 业务目标与边界

### 2.1 用户体验目标

潜在客户、渠道伙伴或演示人员访问 `demo.podsc.com` 后应能够：

1. 在厂家、渠道、办公、租赁四个业务场景中选择一个身份。
2. 进入与真实产品一致的页面结构，并看到符合该身份权限和数据范围的内容。
3. 浏览公司、位置、静音舱、主机/节点、预约、看板与基础监控数据。
4. 执行经过批准的新增、编辑、预约和设备控制演示；结果保存在当前浏览器。
5. 看到合理变化的在线状态、占用状态和遥测值。
6. 随时切换场景或一键恢复标准演示数据。

### 2.2 四类环境必须区分

| 环境 | 应用模式 | 数据来源 | 用途 |
|---|---|---|---|
| 本地/CI 开发 | `backend` 或 `demo` | 本地后端或浏览器数据 | 开发和自动化测试 |
| `test.podsc.com` | `backend` | 隔离的 staging 后端 | 客户沙箱、真实接口联调 |
| 正式站/租户站 | `backend` | 正式后端 | 真实业务 |
| `demo.podsc.com` | `demo` | 合成种子和浏览器数据 | 公开产品演示 |

`test.podsc.com` 不是 Demo。它有真实后端、数据库和鉴权，不应复用 Demo 的本地数据或假 Token。

### 2.3 明确不在 Demo 范围内

- 不连接生产或 staging API、WebSocket、MQTT、EMQX、文件服务和第三方 AI 服务。
- 不保存真实客户、用户、设备、位置、预约、遥测、Token、API Key 或证书。
- 不提供真实 OTA、固件上传、凭据下发、设备注册、系统调试或平台运维操作。
- 不把浏览器本地权限模拟描述为真实安全鉴权。
- 不要求一次覆盖全部后台页面；演示脚本之外的入口应从权限集中移除或明确显示不可用。

## 3. 仓库现状与实施影响

实施必须建立在当前代码事实上，不能只增加一个域名判断：

| 当前现状 | 实施影响 |
|---|---|
| `src/utils/config.js` 只读取 `apiBase` 和 `uploadBaseUrl`，加载失败会回退 | 需增加严格的 `appMode`；模式缺失、非法或不匹配时阻止启动 |
| `src/main.js` 在挂载 Vue 前加载运行时配置 | 适合在同一启动链中先校验模式，再等待 MSW 就绪 |
| `src/api/` 当前有 37 个 JS 文件，其中 34 个直接导入统一 HTTP 实例 | 保留现有资源层；Demo 不在页面里分叉 API 调用；统计变更时由测试动态盘点，不在代码中硬编码数量 |
| Router 通过 `localStorage.token` 和 `user.permissions` 控制登录与路由 | Demo 会话写入兼容字段，继续使用现有路由与能力判断 |
| `permission.js` 使用 permission code、`writable_companies` 和公司范围 | 种子用户必须包含完整权限与范围，不能只写角色字符串 |
| 项目存在通用主机 WebSocket、Pod WebSocket、MQTT 调试 WebSocket 三条路径 | Demo 前必须收敛为可切换的实时服务；调试入口不授予公开 Demo 用户 |
| `public/index.html` 会访问 Google Fonts | 若要求零外部连接，Demo 构建必须使用本地/系统字体并移除这些标签 |
| webpack 目前只有一个 `dist/`，`npm run build` 无应用模式 | 需增加双构建命令、独立输出和制品元数据 |
| production 使用 `output.publicPath: "auto"`，JS/CSS/资源文件名使用 8 位 hash | 根路径 Demo 与现有子路径部署可共存；缓存规则必须与实际文件名验证 |
| dev server 目前始终代理 `/api` 和 `/emqx`，且 `allowedHosts: "all"` | `dev:demo` 必须关闭两个代理并收紧 host 白名单，不能只换端口 |
| Dashboard 路由实际加载 `DashboardRuntime.vue`，并通过 `extends` 继承 `Dashboard.vue` | Vue 会合并父子生命周期；首屏实际请求 summary、effective config 和 chart-data query，三者都必须进入 P0 请求图 |
| `scripts/deploy.sh` 只有 `test/prod`，构建后直接改写 `dist/config.json` | 需加入 `demo` 目标，并在上传前验证制品模式和目标环境 |
| 当前未安装 `msw` 和 IndexedDB Promise 封装 | 实施时新增运行时依赖，并锁定版本、提交 lockfile |

还有一项独立前置迁移：后端现行渠道类型是 `CP`，前端 `COMPANY_TYPES` 及多个页面仍保留旧的 `DS/AG`。这不是只改一个常量即可完成，具体范围见[第 7.5 节](#75-cp-公司类型独立迁移)。Demo 种子不得继续固化旧值。

## 4. 模式模型

### 4.1 两个维度不能混用

webpack 构建优化与应用数据来源是两个独立维度：

```text
webpack mode: development | production
app mode:     backend     | demo
```

示例：

- 本地连接开发后端：`development + backend`
- 本地开发 Demo：`development + demo`
- staging/正式发布：`production + backend`
- Demo 发布：`production + demo`

因此应用模式统一命名为：

```js
export const APP_MODE = Object.freeze({
  BACKEND: 'backend',
  DEMO: 'demo'
})
```

### 4.2 模式信息的职责

| 信息 | 来源 | 是否可在部署后修改 | 职责 |
|---|---|---|---|
| `buildAppMode` | webpack `DefinePlugin` | 否，已写入 JS | 决定制品包含哪个基础设施实现 |
| `appMode` | 运行时 `config.json` | 是 | 声明部署者期望运行的模式 |
| hostname | `window.location.hostname` | 由访问地址决定 | 检查制品是否放错站点 |
| `NODE_ENV` | webpack mode | 否 | 优化、压缩和开发工具，不决定数据来源 |

## 5. 总体架构与代码边界

```text
Views / Components / Router / permission.js
                    │
          现有 src/api 资源模块
                    │
             src/api/http.js
                    │
       ┌────────────┴────────────┐
       │                         │
 backend 构建                demo 构建
 真实 HTTP/WS         MSW + IndexedDB + 模拟实时
```

建议代码结构：

```text
src/
├── app-mode/
│   ├── constants.js           # APP_MODE 常量
│   ├── runtime.js             # getAppMode/isDemoMode
│   └── validate.js            # 构建、配置、域名和 API 约束
├── app-mode-entries/
│   ├── backend.js             # 空/真实基础设施启动器，不引用 Demo 模块
│   └── demo.js                # 引用并启动 Demo 基础设施
├── demo/
│   ├── bootstrap.js           # 初始化并等待 Demo 基础设施
│   ├── session.js             # 选择场景、模拟会话、退出和切换
│   ├── database.js            # IndexedDB schema、事务和升级
│   ├── reset.js               # 精确重置 Demo 数据
│   ├── scope.js               # 基于当前公司和范围过滤数据
│   ├── handlers/              # 按现有 src/api 模块分组的 MSW handlers
│   ├── realtime/              # 确定性遥测与事件模拟
│   └── seeds/                 # 不可变合成种子
├── services/realtime/
│   ├── index.js               # 统一工厂/门面
│   ├── backend/               # 现有真实 WebSocket 实现
│   └── demo/                  # Demo 实时实现
└── components/demo/
    ├── DemoRolePicker.vue
    └── DemoModeBar.vue
```

代码边界：

- View 和普通组件不读取域名、环境变量或 `config.json`。
- View 仍通过 `src/api/` 资源模块访问数据，不直接导入 Axios、MSW 或 Demo 数据库。
- 权限仍通过 `src/utils/permission.js` 判断，不按厂家/渠道等场景名称授权。
- Demo 专属界面放在 `components/demo/`，不把业务语义塞进 `components/base/`。
- webpack 根据 `appMode` 把统一入口别名解析到 `app-mode-entries/backend.js` 或 `demo.js`。backend 入口不得引用任何 Demo 模块，从依赖图层面排除 MSW、种子和 Demo 资源；不能只依赖 Terser 删除一个包含 `import()` 的死分支。

## 6. 启动判断与安全闸门

### 6.1 运行时配置

连接后端的配置：

```json
{
  "appMode": "backend",
  "apiBase": "auto",
  "uploadBaseUrl": "auto"
}
```

Demo 配置仍使用与真实系统一致的同源 API 路径：

```json
{
  "appMode": "demo",
  "apiBase": "auto",
  "uploadBaseUrl": "auto"
}
```

不使用 `/__demo_api__/v1`。保留 `/api/v1` 可以覆盖现有硬编码文件 URL，避免 Mock 契约和真实契约逐渐分叉。Demo 的 `/api/v1` 请求由 Service Worker 在浏览器内响应；若拦截失效，服务器对 `/api/` 返回 404，而不是转发后端。

### 6.2 启动顺序

必须在创建 Vue 实例和发出第一条业务请求前完成：

```text
读取编译期 buildAppMode
  → 从站点确定位置加载 config.json（no-store）
  → 严格校验 config.appMode
  → 校验 buildAppMode === config.appMode
  → 校验 hostname 与模式组合
  → 校验 apiBase/uploadBaseUrl
  → 校验 sessionAppMode；变化时只清身份键
  → 检查 Service Worker、IndexedDB 和存储能力
  → 调用构建时选定的 app-mode entry
      demo entry: 校验 worker 文件 → 打开/迁移/播种数据库 → await worker.start()
      backend entry: 精确清理本项目遗留的 MSW registration，不注册 mock
  → backend: 初始化真实基础设施
  → 加载首屏 locale
  → 挂载 Vue
```

MSW worker 的注册和激活是异步操作。`worker.start()` 未完成前不能挂载应用，否则首屏请求可能越过 Mock 层。

### 6.3 必须阻止启动的情况

| `buildAppMode` | `config.appMode` | 域名 | 结果 |
|---|---|---|---|
| `backend` | `backend` | 正式、租户、test 或明确允许的本地地址 | 启动 |
| `demo` | `demo` | `demo.podsc.com` | 启动 |
| `demo` | `demo` | `localhost`、`127.0.0.1`、`[::1]`，且 webpack 为 development | 启动，供本机开发 |
| `demo` | `demo` | 编译期 `demoDevHosts` 中的精确 host，且 webpack 为 development | 启动，供明确批准的局域网开发 |
| 任意 | 缺失、未知或与构建模式不同 | 任意 | 阻止启动 |
| `backend` | `backend` | `demo.podsc.com` | 阻止启动 |
| `demo` | `demo` | 非 Demo 公网域名 | 阻止启动 |

禁止使用“私网 IP”“开发机地址”这类模糊规则，也不接受 `*.local`、网段或 hostname 通配。确需从其他设备访问 `dev:demo` 时，由构建参数加入单个精确 host；production 构建忽略该参数。

错误页使用构建内置的八语言最小静态字典，覆盖 `zh-CN`、`zh-TW`、`en-US`、`de-DE`、`ja-JP`、`fr-FR`、`es-ES`、`ko-KR`，不能依赖 API、IndexedDB、异步 locale chunk 或正常 Vue/i18n 启动链。启动器在加载普通首屏 locale 前，先在 `try/catch` 中读取现有 `localStorage.locale`，并使用从正常 i18n 初始化中抽出的同一套纯 locale 匹配函数严格归一到上述白名单；无有效偏好时依次匹配 `navigator.languages`，仍不匹配则回退项目默认语言 `zh-CN`。读取存储本身失败也必须继续显示错误页。页面应显示本地化的错误标题、处理建议，以及错误码、构建模式、运行时模式和当前 host，但不能输出 Token、配置详情或凭据。八种语言、损坏/不可读的本地偏好和未知浏览器语言都必须有启动级测试。

### 6.4 API 地址约束

- Demo 只允许 `apiBase: "auto"` 或值为 `/api/v1` 的同源相对配置；不接受协议相对 URL、绝对 URL、用户信息或非默认端口。
- Demo 禁止绝对 API、上传和 WebSocket 地址。
- Axios 请求拦截器在 Demo 下先用 Axios 的 `getUri(config)`（或经测试的等价逻辑）合并 `baseURL` 和 `url`，再相对 `window.location.origin` 构造标准 URL。同时校验 `origin === window.location.origin` 且 pathname 仅能是 `/api/v1` 或以 `/api/v1/` 开头，防止 `/api/v10`、`//host/path` 等边界绕过；不能直接把相对 `config.baseURL` 当成 `new URL()` 的绝对 base。
- MSW 对未覆盖的 `/api/v1/**` 使用 `onUnhandledRequest: error`，不能 passthrough。
- 静态 JS/CSS/图片由 MSW 的常见资源判断放行，不把静态资源误判为漏 Mock。
- `backend` 模式不得加载 `mockServiceWorker.js` 或注册 Demo worker。

### 6.5 浏览器能力与启动错误码

Demo 不能把基础能力失败留到页面请求阶段。启动器应将下列情况转换为稳定错误码并停止挂载：

| 错误码 | 检查条件 | 用户处理建议 |
|---|---|---|
| `E_DEMO_CONFIG_LOAD` | `config.json` 无法读取或解析 | 刷新；仍失败则联系站点管理员 |
| `E_DEMO_MODE_INVALID` | 模式缺失、非法或构建/运行不一致 | 联系站点管理员 |
| `E_DEMO_HOST_DENIED` | hostname 不在明确允许范围 | 使用正确 Demo 地址 |
| `E_DEMO_API_UNSAFE` | API/上传地址不是允许的同源路径 | 联系站点管理员 |
| `E_DEMO_SW_UNSUPPORTED` | 浏览器没有 Service Worker 能力或不是安全上下文 | 改用受支持浏览器和 HTTPS |
| `E_DEMO_SW_ASSET` | worker 文件或构建元数据缺失 | 强制刷新；管理员重新发布完整制品 |
| `E_DEMO_SW_VERSION` | worker 版本或摘要与当前构建不匹配 | 强制刷新；管理员原子更换完整制品 |
| `E_DEMO_SW_REGISTER` | worker 注册、激活或取得控制权失败 | 关闭隐私插件后重试；仍失败则联系管理员 |
| `E_DEMO_IDB_UNAVAILABLE` | IndexedDB 被禁用或能力探测失败 | 允许站点存储或更换浏览器 |
| `E_DEMO_IDB_BLOCKED` | 旧标签页阻止升级/删除并超过 10 秒 | 关闭其他 Demo 标签页后重试 |
| `E_DEMO_IDB_OPEN` | 数据库打开异常终止 | 清除该站点数据后重试 |
| `E_DEMO_MIGRATION` | schema/seed 迁移事务失败 | 选择重置；不得继续使用半迁移数据 |
| `E_DEMO_SEED` | 首次种子事务失败 | 重试或清除站点数据 |
| `E_DEMO_QUOTA` | `QuotaExceededError` 或写入配额不足 | 释放浏览器存储后重试 |

worker 文件在构建时记录 `msw` 包版本和 SHA-256，启动时以 `cache: "no-store"` 读取并核对；不依赖控制台 warning 判断版本兼容。IndexedDB 能力探测必须包含真实的临时写入/删除事务，而不只判断 `window.indexedDB` 是否存在。

### 6.6 本地开发的同源状态隔离

`dev:demo` 固定使用与 backend 开发服务不同的端口（建议 `46944`），正常 backend 开发继续使用现有端口。端口隔离使 localStorage、IndexedDB 和 Service Worker 天然分源，是第一道措施。

Demo dev server 还必须有与 backend 不同的网络配置：

- 完全不注册 `/api` 和 `/emqx` proxy，未被 MSW 拦截的请求应在 dev server 本地失败。
- `allowedHosts` 默认只允许 `localhost`、`127.0.0.1`、`[::1]`；局域网联调时仅加入构建参数中的精确 host，不沿用现有 `allowedHosts: "all"`。
- 自动化测试直接请求 `dev:demo` 的 `/api/health`、`/emqx/test`，必须证明没有代理到任何后端。

同时增加 `localStorage.sessionAppMode`：

1. 启动时读取上次模式。
2. 若与当前模式不同，只删除 `token`、`user`、`company_info`、`company_branding`、`userRole` 及 Demo 场景键。
3. 保留 locale、主题、字号、列偏好等非身份数据。
4. 写入当前模式后再继续启动。

backend 启动时只允许注销满足以下全部条件的 registration：

- scope 等于本应用当前 base URL；
- active/installing/waiting worker 的 `scriptURL` 等于本项目解析后的 worker URL；
- worker 注册 URL 使用固定查询标识，例如 `mockServiceWorker.js?app=podsc-demo`，因此不会与同源其他 worker 混淆。

禁止调用 `getRegistrations().forEach(unregister)` 删除同源其他应用的 Service Worker。

### 6.7 从现有部署平滑升级

现有 `config.json` 没有 `appMode`。为了不让新版本上线时全部站点白屏，按以下顺序迁移：

1. 先更新部署脚本，使 test/prod 生成 `appMode: "backend"`，旧前端会忽略该字段。
2. 验证所有目标站点能返回带 `appMode` 的 `config.json`。
3. 再发布启用严格校验的新前端。
4. 最后开放 Demo 构建和 Demo 部署目标。

新模式逻辑上线后，缺少 `appMode` 必须失败，不长期保留静默默认值。

## 7. Demo 会话、权限与业务场景

### 7.1 四个入口是业务场景，不是权限角色

公开入口固定为：

| 场景 | 公司契约 | 主要展示 |
|---|---|---|
| 厂家 | `company_type=MF` | 公司树、设备流转、型号、静音舱和监控 |
| 渠道 | `company_type=CP` | 下级客户、已分配资产、客户静音舱概览 |
| 办公 | `company_type=EU`、`pod_usage=internal` | 办公位置、内部预约、静音舱使用状态 |
| 租赁 | `company_type=EU`、`pod_usage=rental` | 公共租赁、预约使用记录、占用和运营看板 |

每个场景使用一名合成演示用户。`role` 字段可以表达“该公司的演示管理员”，但不能因此自动获得全部管理权；授权仍由 `permissions`、`writable_companies` 和可见公司范围决定。

P0 权限采用最小白名单：

| 能力 | 公开场景决策 |
|---|---|
| `dashboard.view`、`company.view`、`pod.view`、`meeting.view` | 按各场景的可见范围授予 |
| `pod.receive` | 仅授予需要演示位置/预约写操作的场景，并限定 `writable_companies` |
| `pod.control` | 仅授予明确包含低风险模拟控制脚本的场景，同时限制 Schema 和资源范围 |
| `company.member.manage`、`pod.maintain`、`pod.transfer` | P0 默认不授予；避免暴露用户管理、删除位置、运维和转移操作 |
| `platform.*`、`file.*`、`firmware.*`、`audit.*`、MQTT/系统调试能力 | 公开 Demo 不授予 |

公开 Demo 默认不提供平台根管理员入口，避免暴露大量调试/运维页面并显著扩大 Mock 范围。四个场景的 permission/scope 快照已经固化到种子和 fixture，并由侧边栏、路由、操作按钮及浏览器 API 契约测试共同验证。

### 7.2 公司树和范围

建议种子树：

```text
演示厂家（MF）
└── 演示渠道（CP）
    ├── 演示办公客户（EU, internal）
    └── 演示租赁客户（EU, rental）
```

Mock 层依据当前用户的公司、permission code、可见公司和可写公司过滤数据。不要用“厂家天然能写所有下级”之类的角色推断替代正式权限规则。

### 7.3 会话兼容

现有 Router 和权限工具读取 `localStorage`，因此 Demo 会话应兼容：

- `token`：本地不透明标识，例如 `demo-session:<随机值>`；不伪装成可验证 JWT。
- `user`：包含现有代码需要的 `user_id/uuid`、`company_id`、`company_type`、`pod_usage`、`permissions`、`writable_companies` 等字段。
- `company_info`、`company_branding`：按当前场景写入合成配置。

MSW 从 Authorization header 和 Demo 会话表解析当前身份。切换场景时先销毁实时订阅、清理旧会话缓存，再写入新场景并导航到 Dashboard。

### 7.4 多标签页采用“一浏览器同一场景”

本方案保留 `localStorage` 会话，以满足刷新后继续演示，因此明确采用“一浏览器、同一 origin、同一当前场景”，不承诺不同标签保持不同身份。

- `BroadcastChannel('podsc-demo-session')` 广播 `SCENARIO_CHANGED`、`SESSION_CLEARED` 和 `DATABASE_RESET`。
- 场景切换先写入新会话，再广播；其他标签收到后停止实时服务并整页刷新。
- 不支持 BroadcastChannel 时，以 `storage` 事件监听带随机 nonce 的 Demo session revision 键。
- 所有标签共享同一个 IndexedDB；写操作提交后可广播 `DATA_CHANGED`，相关页面按需刷新。
- 若未来要求每标签独立身份，需要把身份迁至 `sessionStorage`，并重新设计共享 IndexedDB 的权限并发；不在首期范围内。

### 7.5 CP 公司类型独立迁移

该迁移必须先于 Demo 种子实施，并单独提交、测试和发布：

1. 与后端确认滚动发布期间是否仍可能返回 `AG/DS`；当前目标契约为 `PF/MF/BR/CP/EU`。
2. 读取兼容期通过唯一 normalize 函数把 `AG`、`DS`、`CP` 映射为 `CP`，禁止页面各自转换。
3. 新建/编辑请求只允许提交后端现行值 `CP`，不再产生 `AG/DS`。
4. 历史响应中的 `AG/DS` 统一显示为“渠道合作方”，同时保留原始值用于诊断日志，不能把未知值静默改为 `EU`。
5. 更新 `permission.js`、`Companies.vue`、`CompanyDetail.vue`、`UserProfile.vue` 及搜索确认的其他消费者。
6. 同步八个 locale 的公司类型文案、表单选项、fixture 和权限/公司类型契约测试。
7. 兼容映射的移除时间由后端确认所有环境不再返回旧值后另行决定，不与 Demo 首次发布绑定。

## 8. 本地数据设计

### 8.1 存储选择

- IndexedDB 保存公司、用户、位置、型号、主机、节点、静音舱、预约、遥测和事件。
- 建议使用小型 `idb` Promise 封装，避免在大量 handler 中直接维护 `IDBRequest` 回调。
- `localStorage` 只保存兼容会话、当前场景/session revision 和少量 UI 偏好。
- `schemaVersion`、`seedVersion`、初始化状态和最近一次完整迁移记录放在 IndexedDB `metadata` store，与业务数据事务保持一致。
- 数据库名使用独立命名空间，例如 `podsc-demo`，不读取其他站点或模式的数据。

### 8.2 版本与初始化

区分两个版本：

- `schemaVersion`：IndexedDB object store/index 结构版本。
- `seedVersion`：演示业务数据版本。

首次访问时在单个初始化事务中导入不可变种子。新版本若能安全升级则迁移；无法兼容时提示用户确认重置，不在后台悄悄丢弃其演示操作。

数据库连接必须实现：

- `versionchange`：立即关闭旧连接并提示/刷新，不能继续持有阻塞升级的连接。
- `blocked`：广播关闭请求并显示明确状态；10 秒仍未解除则以 `E_DEMO_IDB_BLOCKED` 停止启动或重置。
- `terminated`/打开失败：以 `E_DEMO_IDB_OPEN` 停止，禁止回退到只存在一半的数据。
- `QuotaExceededError`：转为 `E_DEMO_QUOTA`，不把失败写入当成成功。
- 初始化/迁移：业务 store 与 metadata 成功后才在同一事务中标记完成；事务失败自动回滚。
- 浏览器可能在存储压力下清理站点数据；`navigator.storage.persist()` 只做 best-effort 请求，不作为数据不丢失的保证。数据库被浏览器清理后应安全重新播种。

种子要求：

- 主键、UUID 和关联关系稳定且唯一。
- 所有外键关系完整，删除/转移等行为遵循真实业务约束。
- 图片、Logo 和示例文件均为可公开分发的合成资源，随 Demo 制品同源发布。
- 日期在首次初始化时围绕当前日期生成，避免演示几年后全部记录过期。
- 遥测使用固定随机种子和有限波动范围，保证可复现且数值合理。

### 8.3 重置策略

默认不在每次刷新时重置，因为这会让“本地可增删改”和用户验证刷新持久化失去意义。

“重置演示数据”执行顺序：

1. 二次确认。
2. 停止 Demo 实时服务并关闭数据库连接。
3. 删除 `podsc-demo` IndexedDB。
4. 只删除 `token`、`user`、`company_info`、`company_branding` 和 Demo 专属键。
5. 保留 locale、主题、字号和无关 UI 偏好。
6. 重新导入种子并回到场景选择页。

删除数据库若触发 `blocked`，沿用上述广播、10 秒超时和错误码；不能无限等待，也不能在删除未完成时重新播种。

## 9. API 与实时数据模拟

### 9.1 MSW 使用原则

`msw` 是 Demo 发布包的运行时依赖，worker 文件只复制到 Demo 制品。`demo.podsc.com` 固定部署在域名根路径，`mockServiceWorker.js` 也放在根路径，使 worker scope 覆盖整个站点。

Demo 站必须使用 HTTPS；本地开发允许浏览器认可的 localhost 安全上下文。

`worker.start()` 必须显式使用根路径 worker URL、`scope: "/"`、`updateViaCache: "none"` 和严格的未处理请求策略，并且入口必须等待 `worker.start()` 返回的 Promise 完成后再挂载 Vue。当前锁定的 MSW 2.15 已弃用显式 `waitUntilReady` 选项，不能继续传入该选项制造浏览器告警；等待启动 Promise 本身就是本项目的首屏竞态屏障。`updateViaCache` 只控制 worker 脚本更新时是否查询 HTTP cache，不代替 Nginx 缓存头和发布后的 worker 版本验证。

Handlers 按现有资源模块分组，并返回与真实 API 一致的：

- URL、HTTP 方法和状态码。
- 请求字段和校验错误。
- 响应包裹、分页、排序和筛选语义。
- 权限拒绝、资源不存在和冲突错误。

Mock 不应只实现永远成功的 happy path。至少为 P0 表单提供必填校验、重复/冲突和无权限响应，才能验证真实页面的错误处理。

### 9.2 功能覆盖与发布边界

| 优先级 | 范围 | 行为 |
|---|---|---|
| P0 | 场景选择、当前用户、Dashboard、公司范围、位置、Pod 及其 Host/Node 拓扑、预约、基础监控、经批准的位置/预约/低风险控制操作、切换和重置 | 公开发布前必须完整可演示 |
| P1 | 额外编辑、公司树专用接口、趋势/告警、预约配置、仪表板配置管理/编辑页、审计摘要 | 按已冻结的演示脚本补充，不能因页面存在就自动进入 P0；Dashboard 首屏读取有效配置仍属于 P0 |
| P2 | OTA、固件/文件上传、设备注册、凭据、MQTT 管理、系统调试、API Key、平台文档 | 不授予公开 Demo 权限或明确禁用 |

低风险设备控制可在本地“模拟执行”，同时显示“模拟操作”提示并更新本地状态。P0 的控制 Schema 只暴露已批准的安全动作；界面上出现的每个控件都必须有完整 handler 和状态回写，不能依赖点击后 403。OTA、凭据、固件和真实文件操作不得伪装成已在设备上完成。

### 9.3 P0 请求与交互契约清单

下表是公开发布前必须固化为 fixture 和测试的最低清单。路径均相对于 `/api/v1`；fixture 路径均相对于 `tests/fixtures/demo/`。当前 P0 fixture 已按后端 `origin/dev@f7dca24d` 的 Schema 固化，Owner 责任角色为 `frontend-demo-maintainers`，状态“已自动化”表示 fixture、权限/scope 断言和浏览器 API 测试已经进入仓库，不表示真实部署环境已经验收。`tests/fixtures/demo/manifest.json` 保存逐文件 SHA-256，`npm run verify:demo-contracts` 阻止 fixture 漂移；更新命令为 `npm run generate:demo-contracts`。fixture 使用合成值，不能从页面猜字段或复制未脱敏响应。

| ID | 页面/操作 | 方法与路径 | Fixture 实际路径 | 权限与 scope | 必测错误 | IndexedDB | 契约测试 | Owner 责任角色 | 状态 | 契约来源/版本 |
|---|---|---|---|---|---|---|---|---|---|---|
| `P0-LOGIN-01` | 打开登录/场景页时加载公开品牌 | `GET /company-dashboard-config/public` | `public/public-login-config.response.json` | public；按当前入口解析 Demo 品牌 | 404 时回退默认 Demo 品牌；非法 query 422 | `metadata/branding`（只读种子） | `public branding contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/company-dashboard-config.js` + 后端 Schema@f7dca24 |
| `P0-SESSION-01` | 选择厂家/渠道/办公/租赁 | 无 HTTP；调用 Demo session service | `session/current-{scenario}.json` | 根据场景装载 permission、visible/writable company | 未知场景本地拒绝 | `users` + localStorage 身份键 | `scenario session contract` | `frontend-demo-maintainers` | 已自动化 | `permission.js` + 后端 auth user Schema@f7dca24 |
| `P0-USER-01` | 登录后取得当前用户 | `GET /users/me` | `users/current-{scenario}.response.json` | authenticated；仅当前合成用户 | 401（缺失/无效 Demo token） | `users` 读 | `current user contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/user.js` + 后端 Schema@f7dca24 |
| `P0-DASH-01` | Dashboard 首次加载、手动刷新和 60 秒轮询 | `GET /dashboard/summary?start_date=...&end_date=...` | `dashboard/summary.response.json` | `dashboard.view`；只聚合 allowed companies，Demo 不包含未分配平台库存 | 401、403、422 | `pods/telemetry/bookings` 读 | `dashboard summary and polling contract` | `frontend-demo-maintainers` | 已自动化 | `src/views/Dashboard.vue` + `src/api/dashboard.js` + `backend@app/api/dashboard.py@f7dca24` |
| `P0-DASH-02` | DashboardRuntime 首屏加载有效看板配置 | `GET /dashboard/config/effective` | `dashboard/effective-config.response.json` | `dashboard.view`；按当前公司/用户解析，只返回允许的模块 | 401、403；404/405/501 的兼容回退另按下文约束测试 | `dashboard_configs` 读 | `dashboard effective config contract` | `frontend-demo-maintainers` | 已自动化 | `src/views/DashboardRuntime.vue` + `src/api/dashboard.js` + `backend@app/api/dashboard.py@f7dca24` |
| `P0-DASH-03` | DashboardRuntime 按有效配置加载图表数据及刷新 | `POST /dashboard/chart-data/query` | `dashboard/chart-query.request.json`；`dashboard/chart-query.response.json` | `dashboard.view`；限制当前配置中的 module、资源 UUID 和 allowed companies | 401、403、422；单个查询失败的稳定结果 | `pods/telemetry/bookings` 读 | `dashboard batch chart query contract` | `frontend-demo-maintainers` | 已自动化 | `src/views/DashboardRuntime.vue` + `src/api/dashboard.js` + `backend@app/api/dashboard.py@f7dca24` |
| `P0-DASH-CONFIG-01` | 厂家/渠道查看只读公司看板配置 | `GET /company-dashboard-config`；`GET /company-dashboard-config/:companyId` | `dashboard-configs/list-page.response.json`；`dashboard-configs/detail.response.json` | `company.view`；只返回 allowed companies，Demo 不开放新建、编辑或停用 | 401、403、404、422 | `companies` 读和确定性配置投影 | `dashboard config visible route contract` | `frontend-demo-maintainers` | 已自动化 | `src/views/company-dashboard-config/` + `src/api/company-dashboard-config.js` + 后端 Schema@f7dca24 |
| `P0-COMPANY-01` | 公司分页列表 | `GET /companies` | `companies/list-page.response.json` | `company.view`；visible company set | 403；非法分页 422 | `companies` 读 | `company list contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/companies.js` + 后端 Schema@f7dca24 |
| `P0-COMPANY-02` | 公司详情 | `GET /companies/:id` | `companies/detail-{type}.response.json` | `company.view`；目标必须可见 | 403、404 | `companies` 读 | `company detail contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/companies.js` + 后端 Schema@f7dca24 |
| `P0-LOCATION-01` | 位置分页/筛选 | `GET /locations/search` | `locations/list-page.response.json` | `company.view`；当前可见公司 | 403、422 | `locations` 读 | `location list contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/locations.js` + 后端 Schema@f7dca24 |
| `P0-LOCATION-02` | 位置详情 | `GET /locations/:id` | `locations/detail.response.json` | `company.view`；目标必须可见 | 403、404 | `locations` 读 | `location detail contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/locations.js` + 后端 Schema@f7dca24 |
| `P0-LOCATION-03` | 新增/编辑位置 | `POST /locations`；`PUT /locations/:id` | `locations/create.request.json`、`create.response.json`；`update.request.json`、`update.response.json` | 当前前端能力为 `pod.receive`，并校验 writable company | 422、403、404、409 | `locations` 写 | `location write contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/locations.js` + 后端 Schema@f7dca24 |
| `P0-DISTRICT-01` | 位置/Pods 表单省市区 | `GET /districts/provinces`；`GET /districts/cities`；`GET /districts/districts` | `districts/provinces.response.json`；`cities.response.json`；`districts.response.json` | authenticated；只读字典 | query 缺失/非法 422 | `districts` 读 | `district lookup contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/districts.js` + 后端 Schema@f7dca24 |
| `P0-POD-01` | Pods 页面分页/筛选 | `GET /pods` | `pods/list-page.response.json` | `pod.view`；按可见/资源关系过滤 | 403、422 | `pods` 读 | `pod list scope contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/pods.js` + 后端 Schema@f7dca24 |
| `P0-POD-02` | Pod 详情 | `GET /pods/:id` | `pods/detail.response.json` | `pod.view`；资源必须可见 | 403、404 | `pods/hosts/nodes` 读 | `pod detail contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/pods.js` + 后端 Schema@f7dca24 |
| `P0-POD-03` | Pod 状态/历史 | `GET /pods/:id/status`；`GET /pods/:id/records` | `pods/status.response.json`；`records-page.response.json` | `pod.view`；资源必须可见 | 403、404、422 | `pod_status/telemetry` 读 | `pod telemetry contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/pods.js` + 后端 Schema@f7dca24 |
| `P0-POD-04` | 控制面板定义 | `GET /pods/:id/control-schema`；`GET /pods/:id/control-state` | `pods/control-schema.response.json`；`control-state.response.json` | `pod.control` 且资源允许控制 | 403、404 | `pod_controls` 读 | `pod control read contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/pods.js` + 后端 Schema@f7dca24 |
| `P0-POD-05` | 低风险模拟控制 | P0 只允许已批准的 `POST /pods/:id/status/command`；若 Schema 暴露属性/组件操作，则同步纳入 `POST /control`、`POST /widgets/operate` | `pods/command.request.json`；`command.response.json` | `pod.control`；目标具有资源级 `pod.control` | 422、403、404、409 | `pod_status/commands` 写 | `pod approved controls contract` | `frontend-demo-maintainers` | 已自动化 | `PodControlPanel.vue` + `src/api/pods.js` + `backend@f7dca24` |
| `P0-POD-06` | Pods 初始化加载型号选项 | `GET /pod-models?page=1&page_size=200` | `pod-models/options-page.response.json` | 当前后端为允许角色 + allowed company scope；不得扩大可见范围 | 403、422 | `pod_models` 读 | `pod model options contract` | `frontend-demo-maintainers` | 已自动化 | `Pods.vue#loadOptions` + `src/api/pods.js` + `backend@f7dca24` |
| `P0-POD-07` | Pods 初始化加载 Host 选项 | `GET /hosts?page=1&page_size=200` | `hosts/options-page.response.json` | `pod.view`；按 allowed companies 过滤，不含未分配库存 | 403、422 | `hosts` 读 | `pod host options contract` | `frontend-demo-maintainers` | 已自动化 | `Pods.vue#loadOptions` + `src/api/pods.js` + `backend@f7dca24` |
| `P0-TOPOLOGY-01` | Pod 内显示 Host/Node 拓扑 | 无额外 HTTP；当前 `PodDetail.vue` 从 `GET /pods/:id` 的 `nodes`/关联字段读取 | 复用 `pods/detail.response.json` | `pod.view`；只返回与目标 Pod 关联的 Host/Node | 越权关联数据必须被裁剪 | `pods/hosts/nodes/bindings` 读 | `embedded topology scope contract` | `frontend-demo-maintainers` | 已自动化 | `src/views/PodDetail.vue` + `backend@app/api/pods.py@f7dca24` |
| `P0-BOOKING-01` | 预约分页/筛选 | `GET /pod-bookings` | `bookings/list-page.response.json` | `meeting.view`；当前公司/可见 Pod | 403、422 | `bookings` 读 | `booking list contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |
| `P0-BOOKING-02` | 可预约 Pod | `GET /pod-booking-configs/bookable-pods` | `bookings/bookable-pods.response.json` | `meeting.view`；当前公司和时间窗 | 403、422 | `pods/booking_configs/bookings` 读 | `bookable pods contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |
| `P0-BOOKING-03` | 创建预约 | `POST /pod-bookings` | `bookings/create.request.json`；`create.response.json` | 当前页面写能力为 `pod.receive`；目标 Pod 可写 | 422、403、409（时段冲突/幂等） | `bookings` 写 | `booking create contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |
| `P0-BOOKING-04` | 预约详情 | `GET /pod-bookings/:uuid` | `bookings/detail.response.json` | `meeting.view`；记录必须可见 | 403、404 | `bookings` 读 | `booking detail contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |
| `P0-BOOKING-05` | 编辑/取消预约 | `PATCH /pod-bookings/:uuid`；`POST /pod-bookings/:uuid/cancel` | `bookings/update.request.json`、`update.response.json`；`cancel.response.json` | 当前页面写能力为 `pod.receive`；记录可写 | 422、403、404、409 | `bookings` 写 | `booking mutation contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |
| `P0-BOOKING-06` | 详情中的投递/变更记录 | `GET /pod-bookings/:uuid/logs`；`GET /pod-bookings/:uuid/deliveries` | `bookings/logs.response.json`；`deliveries.response.json` | `meeting.view`；记录必须可见 | 403、404 | `booking_logs/deliveries` 读 | `booking history contract` | `frontend-demo-maintainers` | 已自动化 | `src/api/podBookings.js` + 后端 Schema@f7dca24 |

补充约束：

- `Login.vue` 当前在 `created()` 中立即调用公开品牌接口，因此 `P0-LOGIN-01` 必须先于角色选择器可用，不能等登录后才启动 handler。
- Demo 场景选择应复用“写入 token → 请求 `/users/me` → 落地当前用户→跳转”的共享登录后流程，不另写一套只在 Demo 生效的用户结构。
- 当前 `Pods.vue.created()` 会并发执行列表、选项和省份加载，`loadOptions()` 又无条件请求 `/pod-models`、`/hosts`、`/companies`。本方案选择把前两项加入 P0（`P0-POD-06/07`），不通过修改现有页面延迟请求来规避 Mock 覆盖。
- Dashboard 路由实际加载 `DashboardRuntime.vue`，其 `extends Dashboard.vue`；Vue 合并父子生命周期后，首屏会请求 `/dashboard/summary`、`/dashboard/config/effective`，并根据默认有效配置请求 `/dashboard/chart-data/query`。三者分别由 `P0-DASH-01/02/03` 覆盖，有效配置 fixture 必须至少包含一个受支持且会发起查询的模块，浏览器契约测试必须实际观察到三类请求。
- `fetchEffectiveDashboardConfig()` 在 effective config 返回 404、405 或 501 时会兼容回退到 `GET /company-dashboard-config?page=1&page_size=100`。正常 P0 路径要求 `P0-DASH-02` 返回 200；配置中心本身由 `P0-DASH-CONFIG-01` 覆盖，因此该回退也会落入同一个受 scope 约束的列表 handler。若契约测试刻意覆盖回退状态，仍须断言精确请求和结果。`/companies/tree` 当前仍没有 P0 消费者，暂列 P1。
- `PodDetail.vue` 当前从 `/pods/:id` 响应直接取得 Node/文件关联，所以 P0 不虚构 `/hosts/:id/nodes` 的页面调用；若后续页面真正切换到独立资源接口，必须同步更新此表和浏览器轨迹。
- GET 项的 fixture 是响应样本；POST/PUT/PATCH 项必须分别保存请求和成功响应 fixture，并为表中错误状态保存稳定错误 fixture 或 Schema 断言。
- fixture 中的 Logo、头像、图片和示例文件只能引用打包后的同源 `/demo-assets/`资源或明确的合成 data URL；不得出现真实 `/uploads`、客户 CDN 或外部图床 URL。
- Host/Node 独立列表路由当前要求 `platform.device.inventory`。公开厂家场景不得为了展示而获得平台专属权限；P0 只通过授权 Pod 的资源关系展示拓扑。若产品坚持开放独立列表，必须先完成正式权限模型变更。
- 表中的当前写能力来自现有页面代码，可能不是长期目标。若后端契约调整 permission code，正式页面和 Demo 必须同时修改。
- 每一行均已绑定实际 fixture 路径、Owner 责任角色和后端契约版本；Node fixture 测试校验清单哈希与核心字段，`browser-tests/demo-api-contract.spec.js` 校验权限、scope、错误状态、持久化写入和隐式请求图。以后新增 P0 接口也必须同时更新三者。
- P0 清单最终以四个场景的真实浏览器网络轨迹为准：轨迹中每条 `/api/v1/**` 都必须映射到本表，本表中没有消费者的 handler 应删除或明确降级为 P1。

### 9.4 契约维护

- 为每个 P0 handler 建立对应资源模块的契约测试。
- 优先从后端 OpenAPI/Schema 或稳定 fixture 生成/校验响应，不手工发明字段。
- 建立 handler coverage 清单：演示脚本涉及的每条 API 都有明确负责人和测试。
- 后端契约变化时，前端资源模块、Demo handler、种子和测试在同一变更中更新。

### 9.5 实时服务

不建议全局替换 `window.WebSocket`。应给现有实时消费者提供保持调用契约的门面：

- `backend` 实现复用现有 Host/Pod WebSocket 逻辑。
- `demo` 实现维护相同的 `connect/disconnect/isConnected` 和 callback 语义。
- 遥测、在线、占用、命令确认使用可停止的 scheduler 生成。
- 页面销毁、切换场景、退出和重置时必须清理 timer 与订阅。
- 调试 MQTT stream 不进入公开 Demo 权限集，因此无需为了展示而模拟完整 broker。

## 10. 构建方案

### 10.1 命令

目标脚本：

```bash
npm run dev              # development + backend，保持当前默认行为
npm run dev:demo         # development + demo，固定独立端口 46944，无 API/EMQX proxy
npm run dev:demo:lan     # development + demo，自动检测局域网 IPv4，固定使用独立端口 46945
npm run build            # production + backend，继续输出 dist/
npm run build:backend    # production + backend，等价于 build，输出 dist/
npm run build:demo       # production + demo
```

推荐使用 webpack 原生 `--env appMode=...`，它跨 Windows/Linux，不需要依赖 shell 环境变量语法：

```text
webpack --mode production --env appMode=backend
webpack --mode production --env appMode=demo
```

webpack 配置必须校验 `env.appMode`，并通过 `DefinePlugin` 注入只读构建常量。

`dev:demo` 不能只是 `--port 46944`的别名；webpack 必须根据 `appMode` 生成不同的 `devServer.proxy`、`allowedHosts` 和 app-mode entry。自动化构建测试应直接读取最终 webpack config，断言 Demo 模式不存在 proxy 目标。

`dev:demo:lan` 仅用于可信局域网内的开发演示。它继续复用同一组 Demo handler、IndexedDB 种子、权限与接口契约，但通过 Axios/fetch 的页面内适配器处理 `/api/v1`，不注册 Service Worker，因此其他电脑可以直接打开脚本输出的 `http://<LAN-IP>:46945/`。独立端口避免覆盖本机 80 端口上的其他站点。该传输方式只允许 development 构建；`build:demo` 强制使用 Service Worker，正式 `https://demo.podsc.com` 的纯静态部署、安全边界和 Nginx 规则保持不变。若默认网卡或端口不合适，可通过 `DEMO_LAN_HOST`、`DEMO_LAN_PORT` 显式覆盖。

### 10.2 输出与兼容决策

选择“默认构建保持现状，Demo 使用单独根目录”，不把默认制品迁到 `dist/backend/`：

```text
dist/
├── index.html                 # backend，兼容当前 CI/deploy.sh/Nginx
├── config.json
├── build-info.json
└── assets/css/js...

dist-demo/
├── index.html                 # demo
├── config.json
├── build-info.json
├── mockServiceWorker.js
├── demo-assets/
└── assets/css/js...
```

`npm run build` 和 `build:backend` 保持 webpack 当前 `dist/` 输出及 `output.clean` 语义，所以现有 `scripts/deploy.sh`、CI 和静态服务器消费者在第一阶段不需要改目录。`build:demo` 只清理 `dist-demo/`，两种构建互不删除。实施时把 `dist-demo/` 加入 `.gitignore`。

Demo 需要独立的 HTML 生成路径（独立 template 或 `HtmlWebpackPlugin` 参数分支）：移除现有 Google Fonts `preconnect/preload/noscript` 和内联 `onload` 属性，但不改变 backend 构建。否则 Demo CSP 会拦截当前模板中的外部字体和内联事件处理器。

`build-info.json` 至少包含：

```json
{
  "appMode": "demo",
  "commit": "<git-commit>",
  "dirty": false,
  "version": "<package-version>",
  "builtAt": "<UTC ISO-8601>",
  "contractBackendCommit": "<backend-commit>",
  "demoSchemaVersion": 2,
  "demoSeedVersion": 5,
  "mswVersion": "<package-version>",
  "mockWorkerSha256": "<sha256>",
  "configSha256": "<sha256>"
}
```

它用于发布追踪，不是安全凭据。`dirty` 由 `git status --porcelain` 生成；本地脏工作区可以构建用于验证，但 test/prod/demo 发布任务只接受受控 CI 在干净 checkout 生成的 `dirty: false` 制品。`configSha256` 在目标环境的 `config.json` 最终生成后计算；更改 config 后必须重新生成元数据和制品校验结果。构建过程不得写入部署主机、Token 或其他 secret。

### 10.3 制品隔离验收

- `backend` 制品不得包含 `mockServiceWorker.js`、Demo 种子、场景用户或 Demo 专属图片。
- `demo` 制品不得包含正式 API 主机、staging 主机、真实账号或测试密码。
- Demo HTML 不加载 Google Fonts 等第三方资源，使用本地或系统字体。
- 两种制品的 `config.json.appMode` 和 `build-info.json.appMode` 必须一致。
- 种子数据扫描只允许预先批准的虚构域名/邮箱/电话段和公开资源；白名单固化在 `config/demo-data-policy.json`，`npm run audit:demo-data` 产生不回显原始敏感值的审计结果，CI 保存 `demo-data-audit.json` 作为制品证据。

## 11. 部署方案

### 11.1 部署目标与制品映射

实现采用显式分离的发布入口，避免 Demo 发布逻辑改变现有 backend 发布行为：`scripts/deploy.sh test|prod` 继续只处理 backend，`scripts/deploy-demo.sh` 只处理 Demo。两个入口都从未提交的 `.deploy.local` 读取目标配置，不允许运维通过制品目录猜测模式：

| 部署目标 | 允许制品 | 运行时模式 |
|---|---|---|
| `test` | `dist/` | `backend` |
| `prod` | `dist/` | `backend` |
| `demo` | `dist-demo/` | `demo` |

`npm run build` 继续生成 backend 制品，减少现有 CI 和运维迁移风险。Demo 必须显式执行 `npm run build:demo`。

Demo 发布前可独立执行 `npm run verify:demo-artifact` 校验本地 `dist-demo/`；部署脚本会在上传前自动执行相同校验。`npm run smoke:demo -- https://demo.example.com` 用于对已经切换的实际 HTTPS 域名执行在线 HTTP smoke。可直接落地的静态站点基线位于 `nginx.demo.example.conf`，其中证书路径和真实域名仍必须由部署环境提供。

部署脚本流程：

1. 根据目标选择允许的 app mode 和输出目录。
2. 在干净 CI checkout 构建或接收已签收制品。
3. 离线读取 `build-info.json`，校验模式、批准的 commit、`dirty: false`、worker 摘要和禁止内容。
4. 生成目标相关的 `apiBase/uploadBaseUrl`，但 `appMode` 必须取自并匹配制品，不能由自由文本覆盖；随后更新并校验 `configSha256`。
5. 上传到 `releases/<release-id>/`，检查文件完整性，但不覆盖 `current`；禁止继续对线上 `current/` 直接 `rsync --delete`。
6. 原子切换 `current` 到新版本。
7. 通过实际域名执行在线 HTTP 和浏览器 smoke test，验证 CSP、worker、静态资源、API 404 和启动结果。
8. 在线检查失败则自动把 `current` 切回上一版本，再对回滚后的域名执行最小健康检查。

`releases/`、临时链接和 `current` 必须在同一文件系统，使切换是原子操作。发布前记录上一个实际 target；只有在线 smoke 通过后才可清理旧版本，且至少保留当前版和上一个已验证版本。回滚脚本不能依赖“目录名排序后的前一个”这类推测。

Demo、test、prod 使用不同部署凭据；凭据只放在 SSH Agent、独立私钥或 CI Secret，不提交仓库。

### 11.2 Demo Nginx 基线

Demo 域名只托管静态文件，不配置上游：

```nginx
# 放在 nginx.conf 的 http {} 中。只有文件名带 8 位构建 hash 的资源才长期缓存；
# index/config/build-info/worker 不存储，其他非 hash 文件要求重新验证。
map $uri $podsc_demo_cache_control {
    default "no-cache";
    "~^/(?:index\.html|config\.json|build-info\.json|mockServiceWorker\.js)$" "no-store";
    "~^/(?:js|css|assets)/.+\.[0-9a-fA-F]{8}\.(?:js|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|eot|ttf|otf)$" "public, max-age=31536000, immutable";
}

server {
    listen 443 ssl;
    server_name demo.podsc.com;
    root /var/www/podsc-demo/current;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cache-Control $podsc_demo_cache_control always;

    location = /api     { return 404; }
    location ^~ /api/     { return 404; }
    location = /uploads { return 404; }
    location ^~ /uploads/ { return 404; }
    location = /emqx    { return 404; }
    location ^~ /emqx/    { return 404; }

    location = /mockServiceWorker.js {
        try_files $uri =404;
    }

    location ~* ^/(index\.html|config\.json|build-info\.json)$ {
        try_files $uri =404;
    }

    # 构建资源不存在时必须返回真实 404，不能回退为 index.html。
    location ~* ^/(?:js|css|assets|demo-assets)/ {
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

实际部署还需补齐项目统一 TLS 证书配置，并在 `http {}` 中加载标准 `mime.types`，确保 `mockServiceWorker.js` 以 JavaScript MIME 类型返回。现有 Vue/样式是否仍需要 `'unsafe-inline'` 应在浏览器验收后再收紧。不要为了省事加入 `https:`、`wss:` 或通配 host。HSTS 属于整个 `podsc.com` 域的统一决策，不在单个 Demo server block 中擅自添加 `includeSubDomains`。

### 11.3 缓存与 Service Worker

- `index.html`、`config.json`、`build-info.json`、`mockServiceWorker.js` 使用 `Cache-Control: no-store`。
- 带 content hash 的 JS/CSS/图片使用长期 immutable 缓存。
- `/js/`、`/css/`、`/assets/` 和 `/demo-assets/` 下不存在的资源必须返回 404，不能由 SPA fallback 返回 `index.html`；构建资源目录不参与页面路由回退。
- Demo worker 必须从同源 HTTPS 提供，scope 覆盖 `/`。
- worker 位于根目录时默认 scope 已是 `/`，不需要额外的 `Service-Worker-Allowed`。注册选项仍显式写入 `scope: "/"` 和 `updateViaCache: "none"`。缓存策略由 `http` 级 `map` 和 server 级单一 `add_header` 完成；子 location 不新增 `add_header`，因此不会触发 Nginx 的 header 继承陷阱而丢失安全头。
- 发布后验证 worker 已更新，且旧 worker 不会把新页面连接到旧 handler。
- 在线 smoke 同时断言控制文件是 `no-store`、实际 hash 静态文件是 `immutable`、worker MIME 正确，不只检查 HTTP 200。
- 若未来 Demo 改为子路径部署，必须单独评审 worker URL、scope、`Service-Worker-Allowed` 和 webpack publicPath；本方案默认根域根路径。

## 12. 实施顺序

### 阶段 0：契约与演示脚本冻结

1. 确认四个公开场景、每个场景的 3–5 条核心演示路径。
2. 冻结四个场景的最小 permission/scope 快照和浏览器支持矩阵。
3. 在当前 backend 模式下用真实浏览器记录每条演示路径的 API/WebSocket 轨迹，并与第 9.3 节逐项对齐。
4. 把第 9.3 节每一行绑定到实际 fixture、permission/scope 断言、Owner、后端契约版本和测试文件。
5. 决定厂家场景的 Host/Node 展示边界，不授予平台专属权限作为临时捷径。

### 阶段 0A：公司类型独立迁移

1. 按第 7.5 节确认后端兼容窗口和读写规则。
2. 完成 `AG/DS/CP` 单一 normalize、表单写入收敛和历史展示。
3. 更新受影响页面、八套语言和契约测试，独立发布验证。
4. 迁移稳定后，Demo 种子才能使用 `CP`。

### 阶段 1：模式与构建基础设施

1. 扩展 `AppConfig`，严格读取 `appMode`，并对 `config.json` 使用 no-store。
2. 新增 app-mode 常量、集中校验和不依赖 API/异步 locale 的八语言启动错误页。
3. 增加独立端口的 `dev:demo` 以及 `build:backend/build:demo`，保留 `dev/build` 的现有输出兼容；Demo dev server 不带 API/EMQX proxy 且不允许任意 Host。
4. 保持 backend 输出 `dist/`，增加 Demo 的 `dist-demo/`、模式化 runtime config、独立 Demo HTML 和带 dirty/worker/config 摘要的 `build-info.json`。
5. 先升级部署脚本和现有站点配置，再启用严格启动校验。

### 阶段 2：Demo 最小闭环

1. 安装并初始化 MSW；worker 只进入 Demo 制品。
2. 建立 IndexedDB metadata/schema、种子导入、session、跨标签同步、scope 和有超时的 reset。
3. Demo entry 注册/提供场景选择能力；Login 通过统一模式服务呈现 `DemoRolePicker`，backend 依赖图不引入该组件。
4. 严格按第 9.3 节完成公开品牌、current-user、Dashboard 三个实际首屏接口（summary、effective config、chart-data query）、只读公司看板配置和核心列表 P0 handlers。
5. 增加常驻 Demo 标识、切换场景和重置入口，补齐八种语言。

### 阶段 3：可操作流程与实时

1. 完成预约和经过批准的编辑操作，补齐失败/校验分支。
2. 将现有实时入口收敛到 backend/demo 门面。
3. 加入确定性遥测、占用变化和模拟命令确认。
4. 控制 Schema 只返回已批准动作；无 `pod.control` 的场景不展示控制页签，也不发出 control-schema/state 请求。
5. 对未支持/危险功能按权限隐藏或明确禁用。

### 阶段 4：网络隔离与发布自动化

1. Demo 构建移除外部字体和其他非必要外链。
2. 增加 Demo Nginx API 404、CSP 和 worker 缓存配置。
3. 部署脚本加入目标—制品模式映射、commit、dirty、worker 摘要和禁止内容检查。
4. 完成“离线检查 → 原子切换 → 在线 smoke → 失败回滚”的发布流程和记录。

当前仓库实现对应关系：

- `scripts/verify-demo-artifact.mjs`：离线校验 mode、commit、dirty、config/worker 摘要和禁止网络目标。
- `nginx.demo.example.conf`：静态站点、CSP、服务路径 404、控制文件 no-store、hash 资源 immutable 和静态资源真实 404。
- `scripts/smoke-demo-release.mjs`：通过实际 HTTPS 域名验证安全头、缓存、worker MIME、hash 资源和服务路径隔离。
- `scripts/deploy-demo.sh`：上传到 `releases/<release-id>/`，原子切换 `current`，在线检查失败时回滚到发布前记录的精确 target。

这些文件完成代码侧发布自动化，不等同于实际环境验收。只有配置真实 Demo 域名、TLS、独立凭据并完成第 13.3 节及浏览器矩阵后，才能把本方案升格为“实施基线”。

仓库内阶段 0–4 均已完成：P0 fixture 与哈希清单、CP 收敛、双入口构建、IndexedDB/MSW 闭环、可写预约/位置、模拟实时、网络拒绝、数据审计、离线验签和原子发布脚本均有自动化覆盖。尚未关闭的内容只允许是需要真实基础设施的验收项，不能再以此为由在代码中保留宽松回退或待实现分支。

## 13. 测试与验收

### 13.1 自动化测试

- app mode：合法值、缺失值、构建/运行不一致和 host 组合全部覆盖。
- host：production 仅允许 `demo.podsc.com`；development 默认仅允许 `localhost/127.0.0.1/[::1]`，额外 host 必须精确声明。
- config：Demo 拒绝绝对 API/上传地址；backend 保持现有 auto/跨域能力。
- build：`build` 仍输出 `dist/`，`build:demo` 输出 `dist-demo/`；backend 无 Demo worker/种子，Demo 无后端 host/Google Fonts/内联事件；发布拒绝 dirty 制品。
- dev server：`dev:demo` 无 `/api` 和 `/emqx` proxy，Host 不在精确白名单时拒绝；backend dev 保留现有联调代理。
- session：四个场景生成兼容用户结构，模式切换只清身份键；场景切换会同步其他标签。
- service worker：不支持、资源缺失、摘要/版本错误、注册失败和错误 scope 均返回稳定启动错误码；backend 只清理精确匹配的本项目 worker。
- permission：菜单、命名路由、按钮和 scope 与 permission code 一致。
- company type：旧 `AG/DS` 读取归一为 `CP`，新写入只发 `CP`，未知类型 fail-closed/显式显示。
- database：首次导入、升级、刷新持久化、显式重置、metadata 一致性、blocked/versionchange/terminated/超时/配额和关联完整性。
- handlers：分页、筛选、详情、写入、422/403/404/409 等关键契约。
- dashboard：通过实际 `DashboardRuntime` 路由验证首屏命中 summary、effective config 和 chart-data query；effective config 的 404/405/501 回退测试必须成对覆盖兼容列表请求。
- network：未匹配 `/api/v1/**` 失败，不 passthrough；四场景浏览器轨迹与 P0 清单双向一致。
- realtime：连接、断开、切换页面/场景、重置后没有重复 timer。
- i18n：新增可见文案在八种 locale 中存在；正常 i18n 启动前的错误页可独立按本地偏好/浏览器语言显示八语言文案，非法偏好稳定回退 `zh-CN`。

至少新增：

```text
tests/app-mode-contract.test.mjs
tests/demo-session-contract.test.mjs
tests/demo-seed-integrity.test.mjs
tests/demo-api-contract.test.mjs
tests/demo-build-isolation.test.mjs
tests/company-type-contract.test.mjs
playwright.config.js
browser-tests/demo-startup.spec.js
browser-tests/demo-network-isolation.spec.js
browser-tests/demo-scenarios.spec.js
```

Service Worker 和 CSP 需要真实浏览器验证。仓库已提供 `playwright.config.js`、`browser-tests/demo-startup.spec.js`、`browser-tests/demo-network-isolation.spec.js`、`browser-tests/demo-scenarios.spec.js` 以及 `npm run test:browser`，覆盖 worker 启动、Dashboard 实际请求、HTTP/WebSocket 边界、四场景和权限；Chromium 项目额外覆盖多标签同步与数据库重置。`.gitea/workflows/demo-quality.yml` 已把三引擎安装、浏览器矩阵、种子数据审计、双制品构建和 Demo 离线校验组成单一质量门禁，并保存审计报告、`build-info.json`、Playwright report 和失败 trace；运维仍需为仓库配置受控 Linux Runner。Playwright Firefox/WebKit 在多标签 Service Worker 场景可能错误地将 `navigator.serviceWorker.controller` 报为 `null`，触发 MSW 的重载保护，所以这两个项目跳过该条用例，发布前必须用真实 Firefox 和 Safari 补做多标签验收。Playwright 的 WebKit 覆盖不等于真实 Safari 已验证。Node 级 handler 测试不能代替真实 Service Worker、CSP、IndexedDB 和多标签行为测试。

### 13.2 功能验收

逐一验证厂家、渠道、办公、租赁：

- 进入后只看到该场景允许的菜单、路由和数据范围。
- Dashboard、公司/位置、Pod/Host/Node、预约和监控数据关系一致。
- 经过批准的写操作成功后，列表、详情和统计同步变化。
- 刷新后修改仍存在；主动重置后恢复标准数据。
- 模拟实时数据合理变化，离开页面后停止无用订阅。
- 所有模拟操作都有一致标识，不让用户误以为连接真实设备。

### 13.3 部署验收

- `config.json.appMode`、`build-info.json.appMode` 和编译期模式一致。
- `build-info.json.dirty` 为 false，commit 等于批准版本，worker SHA-256 与实际文件一致。
- `demo.podsc.com/mockServiceWorker.js` 返回正确 JavaScript MIME 和 `no-store`，scope 及 `updateViaCache` 正确。
- `index.html`、`config.json`、`build-info.json` 为 `no-store`；从实际 HTML 解析到的 hash JS/CSS/资源返回 `immutable`。
- `/js/missing.deadbeef.js`、`/css/missing.deadbeef.css`、`/assets/missing.deadbeef.svg` 和 `/demo-assets/missing.png` 等不存在的静态资源返回 HTTP 404，响应不是 `index.html` 或 `text/html`；上述构建资源目录不允许 SPA fallback。
- `/api`、`/api/health`、`/uploads`、`/uploads/test`、`/emqx`、`/emqx/test` 在服务器侧均返回 404。
- 浏览器 Network 中没有 `api.podsc.com`、`test.podsc.com`、MQTT、真实 WebSocket 或 Google Fonts 请求。
- 错误模式配置会在业务请求前显示部署错误页。
- 直接刷新任意 hash 路由正常；HTML 实际引用的静态 chunk 全部加载成功，另外构造的不存在 chunk 按上一项返回真实 404。
- 清空站点数据后可重新初始化并完成四场景 smoke test。
- 模拟 Service Worker/IndexedDB 不可用、worker 摘要不匹配和 quota 错误时，显示对应启动错误页而不是白屏。
- backend 站反向验证：不注册 MSW，不显示 Demo 控件，真实 HTTP/WS 正常。

## 14. 风险与明确不采用的方案

### 14.1 风险控制

| 风险 | 控制方式 |
|---|---|
| Demo 误连真实后端 | 编译/运行双校验、Axios URL 守卫、MSW 未匹配失败、CSP、Nginx API 404、无上游 |
| 本地 Demo 绕过 MSW 命中开发后端 | `dev:demo` 不配置 API/EMQX proxy，精确 Host 白名单，端到端断言 404 |
| 正式包携带 Demo 数据 | 编译期裁剪、独立输出、制品扫描和 CI 契约测试 |
| 公开制品混入真实客户数据 | 种子数据允许值扫描、人工复核和制品证据留存 |
| 两套业务代码分叉 | 页面和 `src/api` 共享，只替换数据、会话和实时基础设施 |
| Mock 与真实 API 漂移 | 同路径、同资源模块、契约 fixture/OpenAPI 校验、同变更更新 |
| Wiki 概念与实施文档漂移 | 第 1.3 节记录差异决议，方案落定后同步回写 Wiki |
| 演示权限失真 | 使用 permission code、scope 和 `writable_companies`，不按角色名猜测 |
| 演示数据过期或关系错误 | 相对日期生成、固定 UUID、种子关系测试和 `seedVersion` |
| worker 更新或 scope 错误 | 根路径部署、HTTPS、no-store、`updateViaCache: "none"`、显式 scope 和浏览器 smoke test |
| 重置误删用户偏好 | 删除独立 IndexedDB 与精确会话键，禁止 `localStorage.clear()` |
| 本地 Demo/Backend 串场 | 独立开发端口、`sessionAppMode`、精确身份清理和项目 worker 精确注销 |
| 多标签身份互相覆盖 | 明确“一浏览器同一场景”，BroadcastChannel + storage fallback 同步刷新 |
| IndexedDB 半迁移或永久阻塞 | metadata 同事务、versionchange 主动关闭、blocked 超时、稳定错误码 |

### 14.2 不采用的方案

| 方案 | 不采用原因 |
|---|---|
| 复制一份前端仓库 | 很快产生页面、权限、API 和修复双线漂移 |
| 只按 `demo.podsc.com` 判断 | 域名/代理/预览环境易误判，也无法验证制品是否正确 |
| 用 `NODE_ENV=demo` | webpack 只理解 development/production/none，会破坏优化语义 |
| 使用 `/__demo_api__/v1` | 偏离真实 API 路径，且现有文件 URL/资源模块存在 `/api/v1` 假设 |
| Demo 直接连接 staging | 不再是零后端，每访客不独立，且存在数据、容量和隐私风险 |
| 所有请求静默 passthrough | 漏 Mock 时可能访问真实服务，违反 Demo 的核心边界 |
| 全局 monkey-patch `fetch/WebSocket` | 难维护、容易破坏第三方代码和正式模式；应使用明确适配层 |
| 每次刷新自动重置 | 无法演示本地持久化，用户编辑后刷新即丢失；保留显式重置即可 |
| 公共 Demo 暴露平台管理员 | 扩大 Mock 和运维功能范围，且与厂家/渠道/办公/租赁目标不符 |

## 15. 参考资料

- [后端 Wiki—Home](http://192.168.1.88:3000/wf2/iot_server_backend/wiki/Home) 与 [后端 Wiki—客户端 Demo](http://192.168.1.88:3000/wf2/iot_server_backend/wiki/%E5%AE%A2%E6%88%B7%E7%AB%AFDemo)：定义纯客户端 SPA、四场景入口、合成种子、MSW、浏览器存储、假实时和零后端边界。
- [前端基础架构](frontend-architecture.md)：资源 API、能力判断、Base/Shared 组件和依赖方向。
- [前端独立部署](部署-前端独立部署.md)：运行时 `config.json`、publicPath、SPA fallback 与缓存基线。
- [部署凭据轮换与验证](deployment-security.md)：SSH Key、CI Secret 和本地部署配置边界。
- [MSW Browser integration](https://mswjs.io/docs/integrations/browser)：worker 文件、异步启动及挂载前等待。
- [MSW `worker.start()`](https://mswjs.io/docs/api/setup-worker/start)：worker URL/scope、未处理请求策略和 ready 行为。
- [MDN Service Worker registration](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register)：HTTPS、安全上下文和 scope 约束。
- [MDN `updateViaCache`](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/updateViaCache)：worker 更新时的 HTTP cache 使用策略。
- [MDN CSP `connect-src`](https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)：脚本网络连接限制。
- [Nginx `add_header`](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header)：变量响应头与 location 继承规则。
- [webpack CLI environment options](https://webpack.js.org/api/cli/#environment-options)：跨平台 `--env` 参数。
- [`idb` 项目](https://github.com/jakearchibald/idb)：Promise 风格 IndexedDB 封装与升级/删除能力。

代码侧发布入口、示例配置、质量门禁、P0 fixture 和[前端独立部署](部署-前端独立部署.md)已经同步；仍需配置受控 Runner 与部署 secrets，并在发布流水线中调用 `scripts/deploy-demo.sh` 以保存线上 smoke 和回滚证据。第 1.1 节真实环境门槛全部关闭后，本文件才能从“实施候选稿”更新为“实施基线”。
