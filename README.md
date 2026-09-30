# IOT Admin (Vue2 + BootstrapVue)

说明：本项目为 Vue2 + BootstrapVue 的后台管理模板，风格参考 Sneat。

技术栈：Vue 2.6.14 + BootstrapVue 2.23 + Bootstrap 4.6（**注意：不是 ElementUI**），构建为自定义 Webpack 5（非 vue-cli）。

## 目录

- [开发](#开发)
- [构建](#构建)
- [环境变量与运行时配置](#环境变量与运行时配置)
- [后端 API](#后端-api)
- [更多资料](#更多资料)

## 开发

```bash
# 安装依赖（国内推荐使用 npmmirror 镜像，速度更快）
npm install --registry=https://registry.npmmirror.com

# 启动开发服务器（固定 0.0.0.0:8080，自动打开浏览器）
npm run dev

# 启动开发服务器（固定 0.0.0.0:46943，不开浏览器，适合远程/WSL 调试）
npm run dev:fixed
```

本地联调约定为：后端 `http://127.0.0.1:8000`，前端 `http://127.0.0.1:8080`。请勿让两个服务使用同一端口。

推荐从后端仓库使用统一启动脚本，它会检查目录、依赖、端口和后端健康状态：

```powershell
cd F:\dengtec\iot_server_backend
.\scripts\start_all.ps1 -Background

# 查看状态 / 停止服务
.\scripts\start_all.ps1 -Status
.\scripts\start_all.ps1 -Stop
```

## 构建

```bash
npm run build
```

## 环境变量与运行时配置

- 默认 API 基址为同源 `/api/v1`：开发环境由 webpack 代理到后端，生产环境由 Nginx 代理，因此使用 `localhost`、局域网 IP 或正式域名打开前端时行为一致。
- **运行时配置**：部署后可通过 `public/config.json`（构建产物为 `dist/config.json`）的 `apiBase` 显式指定远程后端；修改后无需重新构建，刷新页面即可生效。
- **开发代理目标**：通过 `.env.development` 的 `VUE_APP_DEV_API_TARGET` 设置，默认 `http://127.0.0.1:8000`。该配置只决定开发服务器的反向代理目标，浏览器仍请求同源的 `/api/v1`。
- `uploadBaseUrl` 默认使用 `auto`，会从 `apiBase` 推导；仅当上传资源由另一域名单独托管时才需要显式配置。
- WebSocket 地址同样从 `apiBase` 推导，不再维护独立的 hostname/端口映射。

## 后端 API

- 浏览器默认请求地址：`/api/v1`（同源代理）
- 本地后端监听地址：`http://127.0.0.1:8000/api/v1`
- HTTP 客户端：[src/api/http.js](src/api/http.js)（axios 单例 + JWT 请求拦截 + 401 自动跳登录）
- 资源拆分：每个资源在 [src/api/](src/api/) 下一个文件（`hosts.js`、`hnModels.js`、`products.js` ...），统一复用同一个 axios 实例

## 更多资料

- 项目内部约定：[.claude/CLAUDE.md](.claude/CLAUDE.md)
- 架构图与目录说明：[.claude/architecture.md](.claude/architecture.md)
- 编码风格：[.claude/coding-style.md](.claude/coding-style.md)
- OD 远程诊断页面：新增 `/devices/od-manager`（OD 远程诊断，仅 platform_admin / admin / maintainer 可见，其他角色侧栏不展示），调用规范见 [docs/OD-诊断-前端调用.md](docs/OD-诊断-前端调用.md)
- 主题切换：已接入深色/浅色主题切换（[src/utils/dark-theme.js](src/utils/dark-theme.js)、[src/components/ThemeToggle.vue](src/components/ThemeToggle.vue)），跨标签页同步、防闪白
- 多语言：vue-i18n 已接入 8 种语言（zh-CN / zh-TW / en-US / de-DE / ja-JP / fr-FR / es-ES / ko-KR），LanguageSwitcher 挂顶栏，路由 `meta.title` / 通用确认对话框 / 401 toast 等已 i18n 化，详见 [docs/i18n-接入指南.md](docs/i18n-接入指南.md)
- 登录页测试账号浮窗：扩展为 3 厂家 × 2 账号，方便研发与演示快速切换

---

最后更新：2026-05-09
