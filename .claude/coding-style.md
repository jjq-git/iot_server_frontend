# 前端代码风格

> 最后更新:2026-04-29
> 主旨:保持风格一致,降低新页面与旧页面的认知差异。

## 目录

- [通用](#通用)
- [Vue 单文件组件](#vue-单文件组件)
- [JavaScript](#javascript)
- [API 模块](#api-模块)
- [路由](#路由)
- [BootstrapVue](#bootstrapvue)
- [样式](#样式)
- [国际化与文案](#国际化与文案)
- [禁止事项](#禁止事项)

---

## 通用

- **缩进**:2 空格(ESLint standard)
- **引号**:JS 用单引号,模板属性用双引号
- **分号**:不用分号(standard 规则)
- **行尾**:LF
- **文件命名**:
  - 视图组件:PascalCase(`PodDetail.vue`)
  - 通用组件:PascalCase(`AppBreadcrumb.vue`)
  - 工具/API 模块:camelCase(`hnModels.js`)
  - 单 Vue 文件 ≤500 行,超出拆子组件

## Vue 单文件组件

模板顺序固定:

```vue
<template>
  <!-- ... -->
</template>

<script>
// 1. import
// 2. export default { name, components, mixins, props, data, computed, watch, created, mounted, methods }
</script>

<style scoped lang="scss">
/* 局部样式必须 scoped;全局样式放 src/assets/scss/ */
</style>
```

- `<script>` 段优先 Options API(项目已有大量旧代码用 Options),不混用 Composition API
- `data()` 必须返回对象,数据结构在 data 里就声明完整,避免后续 `this.$set`
- 计算属性放 `computed`,**不要在 methods 里写无参 getter**
- 副作用(API 调用)放在 `created` / `mounted` 或事件回调,不放 `computed`
- props 必须声明类型与 `default`(对象用工厂函数)

## JavaScript

- 函数声明优先 `const` + 箭头函数,导出多个用具名导出
- 异步用 `async/await`,**不嵌 .then 链**
- 错误处理:API 调用统一在调用处 `try/catch` 配合 toast 提示;不用全局 unhandledrejection 兜底
- 解构 / 模板字符串 / 展开运算符随意用(Babel 已转译)
- **禁止 `var`**,全部 `let` / `const`

## API 模块

每个 `src/api/<resource>.js` 标准结构:

```js
import http from './http'

export const listFoos = (params) => http.get('/foos', { params })
export const getFoo = (id) => http.get(`/foos/${id}`)
export const createFoo = (payload) => http.post('/foos', payload)
export const updateFoo = (id, payload) => http.put(`/foos/${id}`, payload)
export const deleteFoo = (id) => http.delete(`/foos/${id}`)
```

约定:
- 函数名:`listX` / `getX` / `createX` / `updateX` / `deleteX` / 业务动词(`enableX`、`bindX`)
- 路径不带 `/api/v1`(baseURL 已包含)
- 不在 API 模块里做错误提示,把响应原样返回给调用方
- 文件存在则复用,不新建重复模块

## 路由

```js
// src/router/index.js
{
  path: '/units',
  name: 'Units',
  component: () => import('@/views/Pods.vue'),  // 懒加载
  meta: {
    requiresAuth: true,
    title: 'route.units.title',  // i18n key,不要中文硬编码
    icon: 'box',
    roles: ['platform_admin', 'company_admin']  // 可选,菜单/守卫用
  }
}
```

- 全部懒加载,**禁止直接 `import` 视图**
- `meta.title` 必填,**存 i18n key**(如 `'route.units.title'`),不要中文硬编码;同步补 8 个 locale json
- `beforeEach` 翻译后再写 `document.title`,面包屑/DocPage 等消费方自己 `$t()`
- 守卫在 router/index.js 集中,不在组件里写跳转逻辑

## BootstrapVue

- **按需引入**,在 main.js 里逐个 `Vue.use(XxxPlugin)`,**不要 `Vue.use(BootstrapVue)`** 全量
- 表单组件优先用 `<b-form-group>` 包裹,自动处理 label 和校验状态
- 表格用 `<b-table>` + `:fields` 配置,不要自己写 `<table>`
- 模态框用 `<b-modal>` + `v-model`,不要 `this.$bvModal.show()` 命令式调用(可读性差)
- 颜色 variant 走 Bootstrap 主题(primary/success/danger/warning/info),不要自定义内联色

## 样式

- 局部样式必须 `<style scoped lang="scss">`
- 全局样式集中在 `src/assets/scss/`,按模块拆文件
- 颜色/间距优先用 Bootstrap 变量(`$primary`、`$spacer`),不要硬编码 `#xxx` `12px`
- 禁止用 `!important`(除非覆盖第三方样式且无其他办法)
- 不要在 `.vue` 模板里写大段内联 style,抽到 `<style>` 段

## 国际化与文案

- **已支持 8 种语言**:zh-CN / zh-TW / en-US / de-DE / ja-JP / fr-FR / es-ES / ko-KR(vue-i18n 8.x,实例在 [src/locales/index.js](../src/locales/index.js))
- **新增文案必须用 i18n key**,禁止中文硬编码:模板内 `{{ $t('xxx.yyy') }}`、script 里 `this.$t('xxx.yyy')`、router meta `title: 'route.xxx.title'`、toast/confirm 全部走 i18n
- 新增 key 时**8 个 locale json 全部同步**(`src/locales/{zh-CN,zh-TW,en-US,de-DE,ja-JP,fr-FR,es-ES,ko-KR}.json`),缺一个会回退显示 raw key
- 错误提示文案:友好 + 不暴露后端栈信息;后端 APIError code 走 `errors.<code>` 命名空间(详见 [api/http.js](../src/api/http.js) 拦截器)
- 实施细节与开发约定见 [docs/i18n-接入指南.md](../docs/i18n-接入指南.md)

## 禁止事项

- ❌ 直接 `import axios`(必须用 `@/api/http`)
- ❌ 全量 `Vue.use(BootstrapVue)`(打包体积爆炸)
- ❌ 引入 ElementUI / Ant Design Vue 等其他 UI 库
- ❌ 在 .vue 文件里写非 scoped 的 `<style>`(污染全局)
- ❌ 在 computed 里发起 API 请求
- ❌ 用 `var`、用 `function` 关键字(组件 methods 内除外)
- ❌ 直接修改 props
- ❌ 在 view 里写 SQL/拼接后端 URL,所有后端调用走 api 模块
- ❌ 提交 `dist/`、`node_modules/` 到 git
