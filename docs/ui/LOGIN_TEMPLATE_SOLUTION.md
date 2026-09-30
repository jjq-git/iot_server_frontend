# 公司定制登录页现行方案

> 最后更新：2026-09-11

公司登录品牌和可选定制页面统一来自后端 `company_dashboard_config`。该资源每公司最多一行，不再使用多模板类型、版本、提交审核、发布或回滚流程。

## 登录入口与公司识别

- 默认入口：`/login`。
- 公司入口：`/login/:companySlug`。
- 前端通过 `buildLoginTemplateLookup` 生成查询参数：优先使用路由中的 `company_slug`；没有 slug 时使用当前 hostname 作为 `domain`。
- 公共配置加载失败、公司不存在或定制页面无有效登录表单时，回退平台默认登录页，不阻断登录。
- 登录仍统一调用认证 API；公司入口只提供租户识别和视觉配置，不创建另一套认证逻辑。

## 后端接口

公开读取：

```http
GET /api/v1/company-dashboard-config/public?company_slug=<slug>
GET /api/v1/company-dashboard-config/public?domain=<hostname>
```

两种查询至少提供一个选择参数。公开响应只包含可公开的公司标识、品牌字段以及启用的定制页面：

```json
{
  "company": {
    "company_name": "示例公司",
    "subdomain": "example",
    "company_slug": "example"
  },
  "branding": {
    "primary_color": "#0A58CA",
    "font_family": "Inter",
    "logo_file_id": 123,
    "logo_url": "/api/v1/upload/<file-uuid>"
  },
  "templates": [
    {
      "type": "custom_page",
      "enabled": true,
      "html": "<form>...</form>",
      "css": ".login {...}",
      "js": null
    }
  ]
}
```

`templates` 是公开响应中的兼容展示容器，不对应多行模板或版本生命周期；当前数据库事实源只有一行 `company_dashboard_config`。

管理接口：

- `GET /api/v1/company-dashboard-config`
- `GET /api/v1/company-dashboard-config/{company_id}`
- `PUT /api/v1/company-dashboard-config/{company_id}`
- `DELETE /api/v1/company-dashboard-config/{company_id}`（软停用）
- `GET /api/v1/company-dashboard-config/{company_id}/preview`
- `GET /api/v1/company-dashboard-config/dashboard-modules`
- `GET /api/v1/company-dashboard-config/branding`

只有平台管理员可写；公司用户只能读取自己公司的配置。旧 `/api/v1/company/templates` 和 `/api/v1/company-templates` 接口已删除。

## 前端实现

- API 资源：`src/api/company-dashboard-config.js`。
- 管理页面：`src/views/company-dashboard-config/`。
- 规范路由：`/org/company-dashboard-config`、`/new`、`/:companyId`、`/:companyId/edit`。
- 旧 `/org/company-templates*` 仅保留前端重定向以兼容书签，不发起旧 API 请求。
- 登录页从公开接口读取 `branding` 和第一项启用的定制页面；`config_json.panels` 由仪表盘消费。
- Logo 上传使用统一文件接口返回的数据库 `id` 写入 `config_json.branding.logo_file_id`，URL 只作为服务端派生展示值。

## 安全与回退

- HTML 通过 DOMPurify 清洗，禁止脚本、内联样式、iframe、对象和原生表单提交属性。
- CSS 通过 `sanitizeTemplateCss` 校验后再注入。
- 定制 HTML 必须且只能有一个登录表单，并包含账号和密码输入；否则清空定制内容并回退默认页。
- 浏览器不执行配置中的任意 JavaScript；登录提交由 Vue 事件接管并调用统一认证服务。
- 后端写入时还会执行 HTML/CSS/JavaScript 安全校验，形成双层防护。

## 验收清单

1. `/login` 无公司配置时显示默认页面。
2. `/login/:companySlug` 和自定义域名能读取同一公司公开配置。
3. 品牌颜色、字体和公开 Logo 正常生效。
4. 无效或危险 HTML/CSS 不执行，且可安全回退默认登录页。
5. 管理页只使用 `company_dashboard_config` 的布尔 `is_active`、`config_json` 和定制内容字段。
6. 公司用户无法修改配置；平台管理员可新增、更新、停用并预览。
7. 前后端测试、lint、stylelint 和 production build 通过。

数据表与字段的权威说明见后端 [company_dashboard_config.md](../../../iot_server_backend/docs/数据模型/company_dashboard_config.md)。
