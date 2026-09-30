# 前端全面优化 — Follow-up 清单

> 已归档，仅保留历史记录；其中凭据值已脱敏。

> 2026-05-09 全面体检后已完成的优化与剩余 follow-up。
>
> 跨 3 轮持续优化完成 P0/P1/P2/P3 可独立修复的几乎全部，剩下的是**需要外部协调或长期重构**的项。

## 目录

- [本次已完成（参考）](#本次已完成参考)
- [P0 安全 — 需外部协调](#p0-安全--需外部协调)
- [P2 平台扩展 — 已建基础设施待接入](#p2-平台扩展--已建基础设施待接入)
- [P3 架构层 — 长期重构](#p3-架构层--长期重构)
- [一些 Agent 发现但本次未动的小事](#一些-agent-发现但本次未动的小事)

---

## 本次已完成（参考）

> 跨 3 轮会话完成。R1 = 第一轮，R2 = 第二轮，R3 = 第三轮（机械接入剩余 view）。

| 类别 | 项目 |
|------|------|
| **P0 安全 (R1)** | 删 `public/dev-token.html`；Login 测试账号块加 `process.env.NODE_ENV` 守卫 |
| **P1 性能 (R1)** | i18n 8 语言改动态加载（main.js 1.18 MiB → 223 KiB，−956 KiB）；Google Fonts 异步化 |
| **P1 后端耦合 (R1)** | 中文权限 key → `MENU_KEY.*` 英文常量；90+ 处错误消费统一走 `error.userMessage`；HostNodeBinding 中文 includes 待后端配合改错误码 |
| **P2 平台 (R1)** | router meta.roles 客户端校验；401 拦截器清干净 user/company_info；html lang 启动同步；Sidebar 折叠态 aria-label/title；BaseFormGroup 加 `required` prop；formatDate util 抽出 |
| **P2 工程 (R1)** | ESLint --fix（97 处全清，0 warning）；BasePasswordInput 抽组件 |
| **P3 打磨 (R1)** | 生产 console 剥离；Pods.vue created 并发化；Dashboard/Charts 千分位；暗色硬编码 hex → CSS var；PodDetail/AuditLogs 死代码清理 |
| **基础设施 (R1)** | listQuerySync mixin / debounce util |
| **P2 列表页 URL query 持久化 (R2)** | Hosts/Nodes/Pods/AuditLogs 4 页 URL query 同步 + 搜索框 300ms debounce + 浏览器后退/前进支持 |
| **P2 表单必填 (R2)** | BaseFormGroup `required` 在 7 view 53 处接入（创建/编辑/绑定弹窗的业务必填字段） |
| **P2 错误态 (R2)** | BaseTable `loadError` prop + `@retry` event；Hosts.vue 接入示例 |
| **P2 unsaved guard (R2)** | unsavedGuard mixin（beforeRouteLeave + beforeunload），HnModels/PodModels/Companies 编辑表单接入 |
| **P2 i18n 日期 (R2)** | formatDate 替换 10 处 'zh-CN' 硬编码（AiAnalysis/ApiKeys/FirmwareManager/LangPackManager/OtaConsole/Charts/company-templates 等） |
| **a11y 收尾 (R2)** | 16 个 view 主标题 `<h4>` → `<h1 class="h4">`；AdminLayout 加 skip-link + `<main id="main">`；muted/hint 颜色对比度达 WCAG AA |
| **细节 (R2)** | Login.vue 残留 console.log 删除；PodControlPanel 错误聚合分支改 error.userMessage |
| **P2 列表页 URL query (R3)** | 再加 7 view: Locations/FileManager/Users/Companies/debug/{SerialLogs,EmcyLogs,SensorHistory} |
| **P2 required (R3)** | 再加 6 view 13 处: HostDetail/LocationDetail/Pods/ApiKeys/FirmwareManager/Products |
| **P2 BaseTable loadError (R3)** | 接入 16 个列表/历史页 (Nodes/Pods/AuditLogs/Locations/FileManager/Users/Companies/HnModels/PodModels/Products + debug 5 + mqtt_server 4) |
| **P2 unsavedGuard (R3)** | 再加 7 view: TemplateEditor/UserDetail/HostDetail/NodeDetail/PodDetail/LocationDetail (复合 dirty 判定) |
| **P2 formatDate (R3)** | 25 处 toLocaleString 全部替换 (HostDetail/NodeDetail/PodDetail/UserDetail/CompanyDetail/LocationDetail/HostNodeBinding/SystemMonitor/OdManager/mqtt_server 等) |
| **a11y label-for (R3)** | 55 处 base-form-group 加 label-for + 内层 input id (Hosts 8/Nodes 8/Companies 12/Users 7/Pods 5/LocationDetail 10) |
| **工程 (R3)** | console.log 45 处全清, 保留 console.warn/error；Login 测试 log 删 |
| **P3 基础设施 (R3)** | listPage mixin (page/loading/refreshList) + optionLoader util (companies/hosts 5min 缓存) |
| **🚨 安全发现 (R3)** | HostDetail.vue 旧 checkBackendStatus 方法曾泄露 EMQX broker 凭证（已从当前版本脱敏）；git 历史仍需清理并在 EMQX 后台轮换 (P0) |

---

## P0 安全 — 需外部协调

### 0. 🚨 EMQX broker 测试账号 git 历史泄露（必须立即轮换）

**R3 新发现**。[src/views/HostDetail.vue](../src/views/HostDetail.vue) 旧 `checkBackendStatus` 方法直接 `console.log` 出 EMQX broker 凭证：

凭据值已从当前文档删除；不得在仓库中再次记录账号或密码。

任何打开 DevTools 点过 HostDetail "检查后端推送" 按钮的用户都见过该凭证。**R3 已删除代码块**，但仍在 git 历史中：
- frontend submodule commit `1b468ca / b8d1dfb / 251de86` 含明文密码

**必做步骤**：
1. **EMQX 后台**（http://39.107.77.94:18084）登录后**删除或重置** `pods_tester` 账号密码（即使内部仓库也要做，凭证已落 git history）
2. 仓库公开前用 `git filter-repo --replace-text` 把历史提交中的明文替换为占位
3. 同步更新 [credentials.md](/home/rie/CHEN/credentials.md) 记录（如果该账号在用）

### 1. 部署脚本明文 SSH 密码（必须立即处理）

**文件**：旧部署脚本（当前版本已移除）

旧脚本曾包含明文 SSH 密码和具体主机信息。当前版本已删除这些值并改为 SSH key 部署，但历史仍需清洗、相关凭据仍需轮换。

**步骤**：
1. 在对应服务器轮换所有受影响账号的密码/密钥
2. 改成 ssh-key：本机 `ssh-copy-id` + 脚本里改 `scp -i ~/.ssh/xxx.key`
3. 删除脚本中的密码变量
4. **git 历史清理**：`git filter-repo --replace-text` 或 BFG 把这两个密码替换成占位符；force-push；通知所有 clone 该仓库的人 force-rebase
5. 同步更新 [credentials.md](/home/rie/CHEN/credentials.md) 记录

### 2. 公司自定义登录页 HTML/CSS/JS 注入（架构性）

**文件**：[Login.vue:215-256](../src/views/Login.vue) `injectCustomTemplate` 用 `container.innerHTML = template.html` + `document.head.appendChild(<style>...)` + `new Function('form','submit', template.js)()`。

任何创建模板的厂家账号能在所有共享域名（`pods.dengtec.com`）的登录页注入木马。

**步骤**：
1. 后端引 `bleach` 或类似库，对模板 html/css 做白名单 sanitize（保存时清洗，不要前端运行时清洗）
2. 前端去掉 `new Function()` 路径，模板只允许声明式（HTML + CSS），不允许任意 JS
3. nginx 加 `Content-Security-Policy: script-src 'self'; frame-ancestors 'none'`
4. 限制只有特定角色（platform_admin）能审批模板上线

**协调**：要后端先支持模板 sanitize 才能前端去掉 new Function。

### 3. WebSocket JWT 走 URL query（敏感日志泄露）

**文件**：[src/api/debug/mqtt_stream.js:48](../src/api/debug/mqtt_stream.js)

JWT 落到 nginx access_log + 浏览器 history。运维看 log 即拿 token。

**步骤**：
1. 后端加 `POST /api/v1/ws/ticket` 端点，返回 30s TTL 的一次性 ticket
2. 前端 WS 连接前先取 ticket，URL 用 ticket 而非 JWT
3. nginx 配置 `/ws` 路径 `access_log off`

**协调**：要后端先做 ticket 端点。

### 4. HostNodeBinding 中文 includes 改错误码（不紧迫但脆弱）

**文件**：[src/views/HostNodeBinding.vue:523-534](../src/views/HostNodeBinding.vue) 4 处 `errorMsg.includes('绑定关系重复'...)`

后端文案微调前端立挂。

**步骤**（要后端配合）：
1. 后端 [errors.py](../../backend/app/core/errors.py) 加 `BINDING_DUPLICATE / NODE_ALREADY_BOUND / BINDING_MISSING / HOST_OR_NODE_MISSING / CAN_NODE_ID_TAKEN / NODE_MODEL_MISMATCH` 6 个 ErrorCode（建议 E40xx 段），同步 `_DEFAULTS` 中文兜底
2. [hn_binding_service.py](../../backend/app/services/hn_binding_service.py) 7 处 `HTTPException(detail="...")` 改 `raise APIError(ErrorCode.XXX, detail_data={...})`
3. 前端 8 个 locale json 在 `errors.<code>` 命名空间补译文
4. 前端 view 改 `code === 'BINDING_DUPLICATE'` 等枚举判断 + fallback `error.userMessage`

---

## P2 剩余工作（基础设施已建，待批量接入到其他 view）

> R2 已把 4 个核心列表页（Hosts/Nodes/Pods/AuditLogs）和 3 个核心编辑页（HnModels/PodModels/Companies）接入。剩下其他 view 是**机械重复工作**，按时间安排。

### 1. URL query 持久化 — 其他列表页待接入

**已建 + 已接入**：[src/mixins/listQuerySync.js](../src/mixins/listQuerySync.js) + Hosts/Nodes/Pods/AuditLogs 已用手写版（嵌套 query 对象）

**待接入**：其他列表页（按重要性）：
- [Locations.vue](../src/views/Locations.vue)、[FileManager.vue](../src/views/FileManager.vue)、[Users.vue](../src/views/Users.vue)、[Companies.vue](../src/views/Companies.vue) 列表区（不是创建弹窗）
- [debug/SerialLogs.vue](../src/views/debug/SerialLogs.vue)、[debug/EmcyLogs.vue](../src/views/debug/EmcyLogs.vue)、[debug/SensorHistory.vue](../src/views/debug/SensorHistory.vue) 历史数据查询页

参考 Hosts.vue 的接入模式（`URL_QUERY_FIELDS` 常量 + `_restoreFromUrl` + `_syncToUrl` + `onSearchInput debounce`）。

### 2. BaseFormGroup `required` — 其他表单待接入

**已建 + 已接入 53 处**：BaseFormGroup `required` prop + 7 个核心 view 接入。

**待接入**：剩下的 view 创建/编辑弹窗（约 70 处）：
- [Locations.vue](../src/views/Locations.vue)（用 `b-form-group` 不是 `base-form-group`，需先改组件）
- [debug/Devices.vue](../src/views/debug/Devices.vue) 等调试页若有表单
- 其他次要 view 的创建表单

### 3. formatDate — 剩余调用点

**已建 + 已接入 10 处**：utils/format.js + 主要 view 接入。

**待接入**：grep `toLocaleString\|toLocaleDateString\|toLocaleTimeString` 看其余调用点（不传 locale 的）：
- [Pods.vue](../src/views/Pods.vue)、[Hosts.vue](../src/views/Hosts.vue)、[LocationDetail.vue](../src/views/LocationDetail.vue)、[CompanyDetail.vue](../src/views/CompanyDetail.vue) 等仍有不传 locale 的调用点

### 4. 列表页 inline 错误态 + 重试 — 其他列表页待接入

**已建 + 已接入**：BaseTable `loadError` prop + `@retry` event + Hosts.vue 接入示例。

**待接入**：其他列表页 catch 分支也写 `this.loadError = err.userMessage` + 模板加 `:load-error="loadError" @retry="fetchData"`。

### 5. unsaved changes — 其他编辑页待接入

**已建 + 已接入**：unsavedGuard mixin + HnModels/PodModels/Companies 接入。

**待接入**：其他编辑表单：
- [TemplateEditor.vue](../src/views/company-templates/TemplateEditor.vue)（公司登录页模板编辑器，丢草稿代价高）
- [UserDetail.vue](../src/views/UserDetail.vue) 编辑表单
- [HostDetail.vue](../src/views/HostDetail.vue) 编辑表单

---

## P3 架构层 — 长期重构

> 这些是几天到几周的工作量，不适合单次会话搞。

### 1. 超长 view 拆分（Top 10）

| 文件 | 行 | 建议拆分 |
|------|----|---------|
| [HnModels.vue](../src/views/HnModels.vue) | 3010 | 列表表格 / 编辑弹窗 / 复制弹窗 / 详情抽屉 4 个子组件 |
| [FileManager.vue](../src/views/FileManager.vue) | 2219 | 文件列表 / 上传弹窗 / 关联管理 |
| [PodModels.vue](../src/views/PodModels.vue) | 1791 | 同 HnModels 思路 |
| [Products.vue](../src/views/display/Products.vue) | 1623 | |
| [PodDetail.vue](../src/views/PodDetail.vue) | 1594 | 状态卡片 / 日志面板 / 命令下发 |
| [HostDetail.vue](../src/views/HostDetail.vue) | 1401 | |
| [Companies.vue](../src/views/Companies.vue) | 1380 | |
| [Locations.vue](../src/views/Locations.vue) | 1173 | |
| [Pods.vue](../src/views/Pods.vue) | 1084 | |
| [Nodes.vue](../src/views/Nodes.vue) | 1061 | |

### 2. 重复代码抽取

- 21+ view 各自维护 `page/pageSize/total/loading/loadList` —— 抽 `mixins/listPage.js`
- 12+ view 重复 `fetchCompanies/fetchHosts({ page:1, page_size:100 })` —— 抽 `utils/optionLoader.js` 或者引入 store 缓存
- `localStorage.getItem('user')` JSON.parse 13 处零散 —— 用现成的 `getCurrentUser()` 但很多文件没复用

### 3. 状态管理

无 Vuex/Pinia，跨页状态散在 `localStorage` 59 处。建议引 Pinia 把 `auth/user/locale/companyInfo` 抽出 store。

### 4. 测试基础设施（0 个测试）

`find src -name "*.test.*" -o -name "*.spec.*"` → 0 文件，package.json 无 jest/vitest。建议引 vitest + @vue/test-utils v1（兼容 Vue2），核心组件先有冒烟测试。

### 5. BootstrapVue CSS 全量引入（−200 KB 潜力）

[main.js:155-156](../src/main.js) `import 'bootstrap-vue/dist/bootstrap-vue.css'` 全量。改成单组件 SCSS 引入约能减 200 KB CSS。

### 6. RTL 准备（远期）

123 处硬编码 `left:`/`right:`，未来上阿语/希伯来需要改 logical properties。当前无需做。

---

## 一些 Agent 发现但本次未动的小事

- [Login.vue:163](../src/views/Login.vue) 残留 `console.log` —— **R2 已删**
- [public/index.html](../public/index.html) Google Fonts URL `wght@300;400;500;600:700` 中的 `:700` 疑似拼错，应为 `;700`（保守边界未改）
- [HostDetail.vue](../src/views/HostDetail.vue) 也有 `testWebSocketConnection / simulateStatusUpdate / checkBackendStatus` 函数，看似活的，要不要清要看用户实际调试需求
- 全项目无 `<h1>` —— **R2 已改 16 个 view** 主标题为 `<h1 class="h4">`，剩余次要 view 标题层级仍是 h4 起步
- 全项目无 `$tc()` 复数处理。英语 "1 user / 5 users" 都是直拼字符串
- 122 个 `<base-form-group>` 只 14 个绑了 `label-for=` —— 屏幕阅读器/键盘用户痛点（仍待批量加）
- muted/hint 颜色对比度 —— **R2 已达 WCAG AA**
- skip-link 缺失 —— **R2 已加** `AdminLayout.vue`

---

## 维护者备注

下次进入这个项目优化时优先级：

1. **P0-1 SSH 密码轮换** — 不修就是定时炸弹
2. **P2 mixin/util 批量接入** — 基础设施已建，4 个核心列表页接入是 1-2 小时活
3. **P2 错误态 + unsaved changes** — UX 大改善
4. **P3-1 拆 HnModels / FileManager** — 单文件 3000+ 行已经无法 review

P0-2/3/4 都要后端配合，建议跟 backend 维护者一起定 sprint。
