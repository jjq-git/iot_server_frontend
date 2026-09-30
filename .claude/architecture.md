# 前端架构说明

> 最后更新:2026-04-29

## 目录

- [总体架构](#总体架构)
- [目录结构](#目录结构)
- [核心模块](#核心模块)
- [数据流](#数据流)
- [API 调用规范](#api-调用规范)
- [路由与页面注册](#路由与页面注册)
- [构建与部署](#构建与部署)

---

## 总体架构

```
浏览器 ─┬─> public/index.html → main.js → 挂载 #app
        │                          │
        │                          ├─ Vue Router(懒加载所有 view)
        │                          ├─ BootstrapVue 插件按需注册
        │                          └─ axios 实例(src/api/http.js)
        │                                  │
        │                                  └─→ 后端 FastAPI(默认 8000/api/v1)
        │
        └─ public/config.json (运行时读取,可热切 apiBase)
```

- **单页应用**(SPA),无 SSR
- **状态管理**:无 Vuex/Pinia,直接用组件本地状态 + localStorage(`token` / `user_info`)
- **运行时配置**:`public/config.json` 在页面加载时被 `loadRuntimeConfig()` 读取,设置 `window.__API_BASE__`,后续 axios 请求拦截器从中读 baseURL

## 目录结构

```
frontend/
├── public/
│   ├── index.html        # SPA 容器
│   ├── config.json       # 运行时配置(apiBase / uploadBaseUrl)
│   └── favicon.{ico,svg}
├── src/
│   ├── main.js           # 入口,注册插件、挂载根实例
│   ├── App.vue           # 根组件
│   ├── router/index.js   # 路由表(全部懒加载)
│   ├── layouts/
│   │   └── AdminLayout.vue       # 唯一的后台框架(侧边栏+顶栏+主区)
│   ├── views/            # 页面级组件,一个业务模块对应一个或一组 .vue
│   │   ├── Login.vue
│   │   ├── Dashboard.vue
│   │   ├── Hosts.vue / HostDetail.vue
│   │   ├── Nodes.vue / NodeDetail.vue
│   │   ├── Pods.vue / PodDetail.vue   # 旧名,逐步迁移到 units
│   │   ├── PodModels.vue
│   │   ├── HnModels.vue
│   │   ├── Companies.vue / CompanyDetail.vue
│   │   ├── Locations.vue / LocationDetail.vue
│   │   ├── FileManager.vue
│   │   ├── UserProfile.vue
│   │   ├── SystemMonitor.vue
│   │   ├── AuditLogs.vue
│   │   ├── DataModelDoc.vue / DocPage.vue   # 文档浏览页
│   │   ├── company-templates/    # 公司模板编辑器子目录
│   │   └── display/              # 展示道具子模块
│   ├── components/       # 跨页面复用组件
│   │   ├── Sidebar.vue / Topbar.vue / AppBreadcrumb.vue
│   │   ├── ChangeLogDialog.vue / ColumnVisibility.vue
│   │   ├── PodControlPanel.vue
│   │   └── base/                 # 基础壳子组件(BaseFormGroup 等)
│   ├── api/              # 资源化的 API 模块,一资源一文件
│   │   ├── http.js               # axios 实例(必须经过)
│   │   ├── companies.js / hosts.js / nodes.js / pods.js / podModels.js
│   │   ├── hnModels.js / hnBindings.js
│   │   ├── locations.js / regions.js / districts.js
│   │   ├── files.js / products.js / user.js / audit.js
│   │   ├── company-templates.js
│   │   └── index.js              # 汇总导出
│   ├── services/ui/      # UI 服务(toast 等)
│   ├── mixins/           # 跨组件复用逻辑(分页/筛选等)
│   ├── assets/           # 编译进 bundle 的静态资源(图片/SCSS)
│   └── utils/            # 工具函数(permission、format 等)
├── docs/                 # 项目级文档(2026-04 新建,已剔除旧的 src/model/docs)
├── webpack.config.js     # 自定义 Webpack 5 配置(非 vue-cli)
├── babel.config.js
├── postcss.config.js
├── scripts/deploy.sh / .deploy.example
└── package.json
```

## 核心模块

| 模块 | 文件 | 职责 |
|------|------|------|
| 入口 | [src/main.js](../src/main.js) | 注册 BootstrapVue 插件、加载 config.json、挂载根 |
| HTTP | [src/api/http.js](../src/api/http.js) | axios 实例 + 请求/响应拦截器 + token 注入 + 401 跳登录 |
| 路由 | [src/router/index.js](../src/router/index.js) | 全部页面懒加载(`() => import(...)`) + 路由守卫(token 校验) |
| 布局 | [src/layouts/AdminLayout.vue](../src/layouts/AdminLayout.vue) | 侧边栏 + 顶栏 + `<router-view>` |
| 权限 | [src/utils/permission.js](../src/utils/permission.js) | 角色/公司类型权限判断函数 |

## 数据流

```
view (Pods.vue)
    └─→ import { listPods } from '@/api/pods'
                    └─→ http.get('/units')      ← src/api/pods.js
                            └─→ http.js 拦截器:
                                ├─ baseURL = getApiBaseURL()      // config.json or 默认
                                ├─ Authorization = `Bearer ${token}`
                                └─ axios → 后端 FastAPI
                            ←─ 响应拦截器:401 → 跳 /login
    ←─ Promise<data>
```

## API 调用规范

1. **不允许在组件里直接 `import axios`**,必须通过 `src/api/http.js` 暴露的 `http` 实例
2. **每个后端资源对应一个文件**(`src/api/<resource>.js`),导出 `listX` / `getX` / `createX` / `updateX` / `deleteX` 等命名函数
3. **路径不带 `/api/v1` 前缀**,baseURL 已经包含
4. **Token 自动注入**,业务代码不需要手动加 Authorization 头
5. **后端字段对照**:看 [backend/docs/数据模型/](../../backend/docs/数据模型/)

## 路由与页面注册

新增页面必须遵循:

```js
// src/router/index.js
{
  path: '/new-page',
  component: () => import('@/views/NewPage.vue'),  // 懒加载,不要直接 import
  meta: { requiresAuth: true, title: 'route.new_page.title' }  // i18n key,不要中文硬编码
}
```

并在 8 个 [src/locales/*.json](../src/locales/) 同步补 `route.new_page.title` 翻译;`beforeEach` 翻译后写 `document.title`。

如果是后台页(走 AdminLayout),挂在 `/admin` 子路由下;独立页(登录页等)直接挂 root。

## 构建与部署

| 命令 | 用途 |
|------|------|
| `npm run dev` | 开发服务器,随机端口,自动开浏览器 |
| `npm run dev:fixed` | 固定 0.0.0.0:46943,不开浏览器(WSL/远程开发) |
| `npm run build` | 生产构建,产物 `dist/`(publicPath = `/iot/`) |
| `npm run lint` | ESLint 校验 |
| `bash scripts/deploy.sh test` | 使用本机 `.deploy.local` 部署到测试环境 |
| `bash scripts/deploy.sh prod` | 使用本机 `.deploy.local` 部署到生产环境 |

部署后 nginx 把 `/iot/` 映射到 dist/;后端地址通过 dist 下的 `config.json` 调整,无需重新构建。
