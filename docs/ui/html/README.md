# HTML UI Demo

> 最后更新：2026-09-04

本目录保存可通过 VS Code Go Live / Live Server 浏览的交互原型，用于确认页面的信息结构、视觉规范、响应式和基本交互。原型不连接真实 API，也不替代 Vue 生产实现。

## 必读文档

创建或修改页面前，必须阅读并同时遵守：

1. [前端代码架构](frontend-architecture.md)：入口、模板目录、CSS/JavaScript 职责、文件放置和数据契约。
2. [样式规范](style-guide.md)：设计变量、页面布局、列表、表单、弹窗、图标、响应式和可访问性。
3. 对应业务的[数据库模型文档](../../../../iot_server_backend/docs/数据模型/README.md)：页面展示、查询和写入字段的权威定义。

列表页面还必须遵守[列表页规范](../widgets/lists.md)。公司类型与菜单权限见 [../README.md](../README.md)。

## 新页面强制规则

- 页面必须按[前端代码架构](frontend-architecture.md)放入规定目录，不得把完整业务页面、弹窗、样式和交互堆进一个入口文件。
- 页面必须复用[样式规范](style-guide.md)规定的 tokens、基础控件、页面结构和图标，不得为单页另建一套视觉规则。
- 页面内容只能展示或操作数据库模型文档已经定义的业务字段；不得根据界面文案临时创造字段，也不得用含义相近的字段代替。
- 数据库文档同时记录“当前字段”和“目标字段”时，新页面一律以**目标字段、目标枚举、目标关系和目标生命周期**为准。
- 目标字段尚未进入 Backend API 时，原型仍按目标字段设计，并使用 `<!-- Handoff: ... -->` 记录实现缺口；不得为了适配旧 API 把页面退回旧字段。
- 数据库字段名、API 缺口和实现备注只写在代码注释或文档中，不得作为提示文字、Badge 或状态展示给最终用户。
- 完成页面后必须检查文件归属、字段映射、浅色/深色主题、窄屏、键盘焦点、空态、错误态及危险操作确认。

## 浏览方式

1. 在 VS Code 中打开 `docs/ui/html/index.html`。
2. 执行 **Open with Live Server** / **Go Live**。
3. 从 Demo 首页进入后台标准布局或登录页。
4. 不建议使用 `file://` 直接打开；浏览器可能阻止 HTML partial 和外部 SVG Sprite。

## 页面入口

- [`index.html`](index.html)：Demo 页面目录。
- [`admin.html`](admin.html)：完整后台布局。查询参数 `company` 支持 `platform`、`manufacturer`、`business`、`enduser`，`role` 支持 `admin`、`operator`、`data_entry`、`viewer`。
- [`login.html`](login.html)：登录页原型。

示例：

```text
admin.html?company=manufacturer&role=operator
```

顶部“菜单视图”和“用户权限”切换器仅供 Demo 审核，不属于正式产品导航。
