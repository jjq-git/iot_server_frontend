# 项目说明

> 最后更新:2026-08-11

## 目录

- [项目说明](#项目说明)
- [架构规则](#架构规则)
- [技术栈](#技术栈)
- [开发与构建](#开发与构建)
- [API 基础地址(重要)](#api-基础地址重要)
- [修改规则](#修改规则)
- [输出要求](#输出要求)
- [对话要求](#对话要求)
- [部署规则](#部署规则)

---

- **主体**:IoT 设备/终端管理后台(`ito_admin_vue2`),用于管理公司、宿主机、节点、单元(units,旧称 Pod)、型号、文件、审计日志等
- **网站语言版本**:已支持 8 种语言(zh-CN / zh-TW / en-US / de-DE / ja-JP / fr-FR / es-ES / ko-KR),vue-i18n 8.x 实例在 [src/locales/index.js](src/locales/index.js)。新增页面/文案**必须**用 `$t('xxx.yyy')` 走 i18n key,禁止中文硬编码(包括 router meta.title / toast / confirm / 模板内文案)。详见 [docs/i18n-接入指南.md](docs/i18n-接入指南.md)
- **后端服务**:独立 Python 后端(FastAPI),默认 `http://localhost:8000/api/v1`,通过 `public/config.json` 的 `apiBase` 字段在运行时切换(无需重新构建);不再写死 localhost 端口

## 架构规则

- **页面入口**:[src/main.js](src/main.js) — 注册 BootstrapVue 插件、挂载根实例、按需引入图标;启动期 `applyThemeASAP()` 防深色模式闪白
- **路由**:[src/router/index.js](src/router/index.js) — 全部使用 `() => import(...)` 懒加载,新增页面必须遵循同样的懒加载方式。`meta.title / description / section` 存 i18n key(如 `'route.dashboard.title'`),不要直接写中文,`beforeEach` 翻译后写 `document.title`,消费方(AppBreadcrumb / DocPage)自己 `$t()`
- **布局**:仅有 [src/layouts/AdminLayout.vue](src/layouts/AdminLayout.vue) 一个,登录页等独立页面不走该布局
- **视图**:[src/views/](src/views/) — 一个业务模块对应一个 `.vue` 文件或子目录(如 [company-templates/](src/views/company-templates/))。新增 OD 远程诊断页 [src/views/OdManager.vue](src/views/OdManager.vue),路由 `/devices/od-manager`,仅 platform_admin/admin/maintainer 可见
- **组件**:[src/components/](src/components/) — 跨页面复用的组件放这里;基础壳子组件放 [src/components/base/](src/components/base/)。主题切换组件 [src/components/ThemeToggle.vue](src/components/ThemeToggle.vue)
- **API 层**:[src/api/](src/api/) — 一个资源一个文件(`hosts.js`、`units.js`、`unit_models.js`、`od.js` 等;旧 `pods.js` 仍兼容保留),所有请求必须经过 [src/api/http.js](src/api/http.js) 的 axios 实例,不允许直接 `import axios`
- **主题层**:纯逻辑 [src/utils/dark-theme.js](src/utils/dark-theme.js)(localStorage + 跨 tab 同步)、样式 [src/assets/styles/dark-theme.scss](src/assets/styles/dark-theme.scss)(CSS 变量 + Bootstrap 暗色映射,仅 `[data-theme="dark"]` 生效)。**新页面如需深色样式优先复用现有 CSS 变量,不要新建独立暗色 SCSS**
- **字号层(全局字体大小切换)**:三档 `small / medium / large`,**默认 medium**。纯逻辑 [src/utils/font-size.js](src/utils/font-size.js)(localStorage + 跨 tab 同步,写 `<html data-font-size>` 与 `html { font-size }`),UI 是顶栏的 [src/components/FontSizeToggle.vue](src/components/FontSizeToggle.vue)(`Aa` 按钮循环切换)。缩放靠 **postcss-pxtorem**([postcss.config.js](postcss.config.js))在构建期把所有 `font-size: Npx` 转成 rem(`rootValue: 16`,只转 font-size,媒体查询断点保持 px),因此**样式里照常写 px 即可自动跟随档位,不要为字号切换写任何特殊逻辑,更不要在运行时注入 px 覆盖样式**(历史上这么做过,导致只有部分元素跟随)。压紧 Bootstrap 默认字号的后台排版基准(body 14px / `.btn` 13px / `h1~h5` 等)统一放在 [src/assets/styles/base.scss](src/assets/styles/base.scss),后续 components/pages 可正常覆盖。**两类例外需手动处理**:① 模板内联 `style="font-size:..."` 不过 PostCSS,改用 class;② ECharts 等 canvas 文字不受 CSS 影响,须用 `getFontScale()` 换算字号,并监听 `<html>` 的 `data-font-size` 变化重算(参考 [src/views/Dashboard.vue](src/views/Dashboard.vue) 的 `chartFont()` + `rootAttrObserver`、[src/views/debug/SensorHistory.vue](src/views/debug/SensorHistory.vue))
- **服务层**:[src/services/ui/](src/services/ui/) — UI 相关服务(toast 等),跨页面共享
- **复用逻辑**:[src/mixins/](src/mixins/) — Vue mixin 形式提供
- **静态资源**:[src/assets/](src/assets/) 编译进 bundle;[public/](public/) 原样拷贝(含 `config.json` 等运行时配置)
- **数据表格统一用 `<base-table>`**:凡是**数据列表/主表格**一律用全局组件 `<base-table>`([src/components/base/BaseTable.vue](src/components/base/BaseTable.vue),已在 [src/main.js](src/main.js) 全局注册,无需局部 import),**不要**直接写原生 `<b-table>`。`<base-table>` 已封装 striped/hover/responsive(默认 true)、空态、加载态、三态排序表头、错误重试 alert 等,并统一了 `.base-table-wrapper` 外层样式。注意 **props 差异**:加载态用 `:loading`(**不是** `:busy`);空态用 `:empty-text` + `show-empty`;`#cell(...)`/`#table-busy`/`#head()` 等所有 slot 均透传照常可用;结束标签必须是 `</base-table>`(历史上多次把 `<b-table>` 改成 `<base-table>` 却漏改结束标签导致 `has no matching end tag` 编译报错)。**例外(保持原样、不要改成 base-table)**:BaseTable 组件自身内部的 `<b-table>`;`<b-table-simple>` 手写行的键值/详情表(结构不同,非数据列表)
- **表格操作列(统一约定)**:`base-table` / `b-table` 的操作列一律 `class:'actions-cell', thClass:'actions-cell'`(**两个都要给,只给 class 会导致表头不对齐**)。全局样式([src/assets/styles/base.scss](src/assets/styles/base.scss) `.actions-cell`)已统一为**居右对齐 + 列宽按内容自适应**(`width:1%` + `white-space:nowrap` 收缩到一行按钮的自然宽度,表头 th 同步居右)——**不要再给操作列写 `thStyle.width/minWidth` 固定宽**(会覆盖自适应又变宽),也不要逐列写 `text-center/text-right`。列可见性 ⚏ 表头容器 `.column-visibility-header`(全局 admin-polish.scss 已 `justify-content:flex-end` 居右),**不要在页面 scoped 里重复定义它**(历史上 Pods/AuditLogs/Locations 各自 scoped 覆盖过,已清理)。单个按钮用 `class="action-icon action-icon--text"`;若需强制**单行不换行**,把按钮包进 `<div class="action-cell action-cell--nowrap">`(全局 helper,portal 到 body 的弹窗内同样生效)。**不要**改 `.actions-cell` 的对齐或给单个弹窗加特例 class

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 2.6.14(已 EOL,本项目仍维持) |
| UI 库 | BootstrapVue 2.23 + Bootstrap 4.6(**注意:不是 ElementUI,README 旧文档有误**) |
| 路由 | vue-router 3.6(hash/history 见 router/index.js) |
| HTTP | axios 1.6 + 自封装拦截器([src/api/http.js](src/api/http.js)) |
| 构建 | Webpack 5 + webpack-dev-server 4(**自定义 [webpack.config.js](webpack.config.js),非 vue-cli**) |
| 转译 | Babel 7 + @babel/preset-env |
| 样式 | SCSS(sass-loader)+ PostCSS + autoprefixer + postcss-pxtorem(字号 px→rem,支撑全局字体大小切换) |
| Lint | ESLint 8 + eslint-config-standard + eslint-plugin-vue;样式用 stylelint(`npm run lint:style`) |
| 包管理 | npm(国内网络环境推荐 `--registry=https://registry.npmmirror.com`);**装依赖需加 `--legacy-peer-deps`**——仓库现有 `stylelint-config-standard-scss@17` 与 `stylelint@16` 存在 peer 冲突 |

## 开发与构建

```bash
# 安装依赖(国内推荐使用 npmmirror)
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器(随机端口,自动开浏览器)
npm run dev

# 启动开发服务器(固定 0.0.0.0:46943,不开浏览器,适合远程/WSL 调试)
npm run dev:fixed

# 生产构建,产物输出到 dist/
npm run build

# Lint
npm run lint
```

构建产物的 `publicPath`:生产环境为 `/iot/`(在 [src/main.js](src/main.js) 顶部通过 `__webpack_public_path__` 指定),开发环境为 `/`。

## API 基础地址(重要)

[src/api/http.js](src/api/http.js) 中的 `getApiBaseURL` 优先级:
1. **按 hostname 自动切换**(最高):映射表 `apiHosts` 中的部署域名 → 对应后端
2. **`public/config.json` 中的 `apiBase`**:运行时加载,无需重新构建。**localhost / 127.0.0.1 走这一层**(2026-04 调整,不再写死端口)
3. **默认回退**:`http://localhost:8000/api/v1`

新增部署环境(非本机)时,**优先在 `apiHosts` 中加映射**;本机切端口只需改 `public/config.json` 的 `apiBase`。

## 首次登录强制改密(后端权威)

- 后端 `must_change_password` / `E2013` 是权威策略，前端不得通过构建变量关闭，否则会形成「页面显示已登录但业务接口全部 401」的假登录状态。
- [src/views/Login.vue](src/views/Login.vue) 在登录响应 `must_change_password=true` 时直接跳 `/user/profile?force_change_password=1`；[src/api/http.js](src/api/http.js) 收到后端 `E2013` 时保留 token 并引导改密；[src/views/UserProfile.vue](src/views/UserProfile.vue) 根据 query 自动打开改密对话框。
- 普通 token 失效的 401 仍清理登录缓存并跳回登录页，不得与 `E2013` 混用。

## 修改规则

- 修改前必须先给出计划
- **新增或修改要考虑全面,具备全局思维**:改动前先梳理受影响的调用方/引用处/关联逻辑,评估对其他页面、组件、API、样式、i18n 等的连带影响,避免"改了一点却导致别处出问题";必要时同步更新所有相关联的地方
- 不要修改无关文件
- 优先复用已有代码(尤其是 [src/api/](src/api/)、[src/components/](src/components/)、[src/mixins/](src/mixins/))
- 新增请求必须复用 [src/api/http.js](src/api/http.js) 的 axios 实例,不要新建独立 axios
- 新增页面必须在 [src/router/index.js](src/router/index.js) 中以懒加载方式注册,`meta.title` 用 i18n key 不要中文硬编码
- 新增 UI 文案/toast/confirm 必须走 `$t('xxx.yyy')` i18n key,8 种语言(zh-CN / zh-TW / en-US / de-DE / ja-JP / fr-FR / es-ES / ko-KR)同步补译;不要中文硬编码模板/script 字符串
- **`$t()` 不要写在 `data()` / `created()` / `mounted()` 里**:这些位置只执行一次,切换语言后文案不会更新(必须刷新页面才变)。表格 `fields`/下拉 `options`/校验 `rules` 等**一律放 `computed`**;带 `visible` 状态的「列可见性」列定义不能直接改 computed(会丢用户的列显隐设置),改用 [src/mixins/localizedColumns.js](src/mixins/localizedColumns.js)——在 methods 里实现 `buildXxxColumns()`,组件上声明 `localizedColumns: { xxxColumns: 'buildXxxColumns' }`,mixin 会在 locale 变化时重建并迁移 visible 状态。**例外**:会被接口数据覆盖的可写状态、以及会提交给后端的表单值(如 Locations 的 `createForm.country`、UserDetail 的 `companyOptions` 占位数据),保持一次性求值,不要改成响应式
- BootstrapVue 组件按需引入(参照 [src/main.js](src/main.js) 已注册的 Plugin),避免全量 `BootstrapVue` 引入
- 不要把 ElementUI 引入本项目(技术栈选型已是 BootstrapVue)

## 输出要求

- 用中文回答
- 代码必须完整可编译
- 引用文件用 `[文件名](相对路径)` 或 `[文件名:行号](相对路径#L行号)` 链接格式
- 不主动创建 `*.md` 文档(项目根目录已堆积大量历史文档,新增需用户明确要求)

## 对话要求

- 你是资深前端工程师,用中文回答,先出计划再改代码
- 需要判断是否是**项目的需求**,如果是需要提醒用户,是否要增加到文档中
- 涉及后端契约(字段、路径)变化时,先核对 [src/api/](src/api/) 中现有定义,再询问用户

## 后端契约陷阱(易被误判为 bug,勿轻改)

- **型号列表 `属性数量` 列**:`GET /unit-models` 列表接口每行返回的 `attributes` 是**单元素汇总数组**,真实属性个数放在 `attributes[0].attr_value` 里,**不是** `attributes.length`(`.length` 恒为 1)。消费点在 [src/views/PodModels.vue](src/views/PodModels.vue) 的 `#cell(attributes)` 模板。看到 `attributes[0].attr_value` 别当成 bug 改成 `.length`——那样所有行会变成 1。(型号**详情**页 `/unit-models/{id}/attributes` 才返回完整属性数组,那里用 `attributes.length` 是对的)

## 部署规则

- 部署脚本:[scripts/deploy.sh](../scripts/deploy.sh)，支持 `test` / `prod` 参数并始终重新构建。
- 复制 [.deploy.example](../.deploy.example) 为 `.deploy.local`，在本机填写目标地址、目录和可选 SSH key 路径。
- `.deploy.local` 不入库；认证仅使用 SSH agent 或私钥，不接受脚本内密码。
- 部署前务必本地 `npm run build` 通过；若涉及 nginx 配置变更，参考 [nginx.example.conf](../nginx.example.conf)
- 运行时配置(后端地址、上传地址)通过 `dist/config.json` 调整,无需重新构建
