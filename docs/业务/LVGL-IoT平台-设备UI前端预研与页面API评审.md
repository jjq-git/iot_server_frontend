# LVGL-IoT 平台设备 UI 前端预研与页面/API 评审

> 状态：后端契约已合并到 `dev`；阶段 3/4 软件版本 UI 页面、API、错误码和资源安全预览已完成，进入联调验收
>
> 最新事实源：[后端《LVGL IoT 平台设备 UI：前端、后端与 38_index 改造说明》](../../../iot_server_backend/docs/业务/LVGL-IoT平台-设备UI跨项目实施与分工.md)
>
> 评审范围：`iot_server_frontend`、`iot_server_backend`、`38_index`
>
> 更新日期：2026-09-11

## 1. 当前结论

前端已经停止旧的 Build/Artifact/WASM 在线预览方向，并完成旧实现退场。后续唯一目标链路为：

1. `38_index` 在本地完成 UI 设计和校验，导出冻结版本的 `WebUiDocumentV1` JSON 与资源包；
2. IoT 后端按 HN 型号四层目录，把 UI 文档保存到软件版本的 `ui_json` 字段，并负责鉴权、校验、并发控制和审计；
3. IoT 前端只通过 IoT 后端读取 UI 文档和受控资源；
4. 前端使用白名单 JavaScript Renderer 安全渲染，不执行文档中的任意代码。

38_index 已冻结 `WebUiDocumentV1` Schema、能力矩阵、资源协议和 golden fixtures，前端已据此完成校验、规范化、本地运行时和 P0 Renderer。后端提交 `0006b0fd` 已通过 PR #161 合并到 `dev`（合并提交 `f61a1610`），软件版本 UI CRUD、权限、ETag、文件关联和错误码均可供前端正式接入。

## 2. 已废弃的旧方向

以下设计和实现不再作为兼容路径保留：

- `/devices/device-ui` Device UI 工作台；
- `/ui-previews` 和 `/admin/ui-previews` WASM 预览库；
- `src/api/deviceUi.js` 的 Target、Capability、Build Binding、发布、回滚和设备 Report API；
- `src/api/ui_previews.js` 的 ZIP 上传、替换、分配和 iframe 预览 API；
- `device_ui.*`、`UI_PREVIEW_*` 权限及路由映射；
- 型号、固件和主机详情中的旧工作台跳转；
- 浏览器直连 `38_index`、获取 Build/Artifact/Preview URL 或保存其 Service Bearer；
- WASM、iframe、源码 ZIP、launch token 和运行时跨项目依赖。

旧文档中的“发布关联”“回滚关联”“设备 UI Report”均不迁移到新页面。若未来确实需要类似能力，必须按新模型重新立项和冻结契约。

## 3. 本轮前端调整

阶段 0 已执行：

- 删除旧 Device UI 工作台页面、API、错误服务、样式和契约测试；
- 删除旧 UI Preview 管理页面、API、路由、侧栏入口、可用性探测和契约测试；
- 删除型号、固件、主机页面中的旧上下文入口；
- 删除旧权限常量与路由能力映射；
- 删除八种 locale 中的 `device_ui`、`ui_previews`、`ui_previews_admin` 文案；
- 增加退场契约测试，防止旧文件、路由、权限和文案回流；
- 保留与业务无关的分页、错误处理、请求取消、可访问性和基础组件能力，供新页面复用。

阶段 2 已执行：

- 固化 38_index 的 Schema v1 和 `capabilities.v1.json` 原始快照及校验哈希；
- 同步 minimal、P0 Widgets、resource、invalid fixtures 和 golden manifest；
- 使用 JSON Schema 与能力矩阵完成双层校验，返回稳定的 `path + code` 诊断；
- 实现规范化 IR、Theme token、Named/Local Style、Subject 和 Binding 解析；
- 实现 `screen.*`、`subject.*` 白名单本地 Action 运行时；
- 实现 obj、label、button、switch、slider、arc、bar 固定 Vue Widget Registry；
- 增加危险内容、复杂度、canonical SHA-256、invalid fixture、运行时和八语种测试。

## 4. 新页面入口评审

新入口应归属 HN 型号四层目录中的“软件版本详情”，而不是独立的 Device UI 工作台：

```text
HN 型号
└─ 硬件版本
   └─ OD 版本
      └─ 软件版本
         └─ 设备 UI
```

后端 API 契约冻结后，软件版本详情页建议提供：

- UI 文档元数据：Schema 版本、来源工程/Revision、生成器版本、SHA-256、更新时间和校验状态；
- JSON 上传或替换；
- JSON 下载；
- 删除 UI；
- 安全预览；
- 校验错误定位；
- 并发冲突提示与重新加载。

Node 型号应显示“不适用”，且不提供上传按钮。第一阶段不在 IoT 前端重做 Designer，编辑仍在本地 `38_index` 完成。

页面是否可见、哪些动作可用，必须由后端冻结后的能力标识控制。前端不得通过角色名称推导权限。

## 5. Renderer 安全边界

Renderer 只解释冻结 Schema 中的声明式数据。第一阶段必须坚持：

- 禁止 `v-html`；
- 禁止 `eval`、`new Function` 和动态脚本；
- 禁止 iframe 和 WASM 运行包；
- 禁止执行 JSON 中携带的 JavaScript、HTML 或表达式；
- Widget、属性、事件、Action 和 Subject 全部使用白名单映射；
- 未知类型显示明确的不支持占位，不静默降级成可执行内容；
- URL、图片、字体和图标只接受后端授权且符合协议/类型/大小限制的资源；
- 渲染数量、树深度、文本长度、资源大小和事件频率必须有上限；
- Renderer 错误不得破坏软件版本详情页的其他业务区域。

第一阶段的具体 Widget、布局、样式、事件和 Action 支持矩阵，以三方冻结的 Renderer Matrix 为准。

按最新改造说明，第一阶段目标范围为 Object/Container、Label、Button、Switch、Slider、Arc、Bar、Screen 切换、Named/Local Style、基础 Flex/Grid/Align、基础 Subject、Binding 和本地内置 Action。38_index 的资源元数据协议已经冻结；Image、Font、Icon 仍需等待 IoT 后端文件关联和授权下载 API 后再进入正式验收。

## 6. API 评审门槛

前端正式开发前，后端至少需要冻结以下内容：

| 类别 | 必须冻结的内容 |
| --- | --- |
| 定位 | 软件版本主键、四层目录关系、详情接口中 UI 摘要的位置 |
| 读取 | `ui_json` 返回结构、空值语义、Schema/生成器版本字段 |
| 写入 | 上传/替换方法、Content-Type、最大体积、幂等语义 |
| 删除 | 删除方法、无 UI 时的返回、审计要求 |
| 并发 | ETag 或等价版本号、`If-Match` 规则、冲突错误码 |
| 资源 | 文件关系、下载/预览授权、URL 有效期、MIME 与哈希 |
| 校验 | 后端 Schema 校验、语义校验、错误路径和错误码 |
| 权限 | 查看、上传/替换、下载、删除的能力 key |
| 错误 | HTTP 状态、稳定业务码、可本地化参数和重试建议 |

所有调用继续通过 `src/api/http.js` 和专用资源模块发起。视图和 Renderer 不直接导入 axios，不直接访问 `38_index` 或对象存储。

## 7. 38_index 交付门槛

`38_index` 已于 2026-09-11 交付并冻结：

- 冻结并带版本号的 `WebUiDocumentV1` JSON Schema；
- UI JSON、资源清单、文件哈希和生成器版本的导出规则；
- 屏幕规格、坐标、布局、字体、图片和图标引用规则；
- Event、Action、Subject 的枚举与参数定义；
- Renderer 支持矩阵；
- 边界值和不支持能力说明；
- 覆盖正常、异常、兼容和资源场景的 golden fixtures。

前端契约快照位于 `src/services/webUi/contracts/`，共享 fixtures 位于 `tests/fixtures/web-ui-v1/`。两份 valid golden 的 canonical SHA-256 和 resource fixture 均已通过前端测试。后续不得单独修改快照；契约变更必须先由 38_index 发布兼容修订或新 Schema 版本。

## 8. 前端实施顺序

1. 阶段 0：删除旧链路和旧业务语义，已完成；
2. 阶段 1：38_index Schema、Renderer Matrix、限制与 golden fixtures，以及后端 API、权限和 ETag 均已冻结；
3. 阶段 2：基于 fixtures 实现纯解析/校验层和安全组件映射，已完成；
4. 阶段 3：在 HN 四层版本目录中接入软件版本 UI 元数据、上传、下载、清空和预览，已完成；
5. 阶段 4：八语种文案、权限、ETag 并发冲突、错误定位和资源授权下载已完成前端实现，进入真实环境联调；
6. 阶段 5：三方联合验收并上线。

## 9. 前端验收门槛

- 仓库中不存在旧 Device UI、UI Preview、WASM、iframe、Build Binding 业务入口；
- 新 API 只存在于 `src/api/` 资源模块并通过 `src/api/http.js` 调用；
- Renderer 对未知 Widget、Action、Subject 和非法资源默认拒绝；
- 页面可见性和动作权限使用统一 capability helper；
- 所有新增可见文案同步到八种 locale；
- golden fixtures 在前后端与 `38_index` 三方使用同一版本；
- 上传、替换、并发冲突、删除、资源失效和渲染异常均有测试；
- `npm run lint`、`npm run lint:style`、`npm test`、`npm run build` 通过。

## 10. 当前联调项

前端已无开发等待项。下一步使用部署到联调环境的后端 `dev` 完成：

1. Product 软件版本的首次上传、带 ETag 替换和清空；
2. Node 软件版本“不适用”只读状态；
3. 412 并发冲突、428 缺少前置条件、409 已使用版本不可变和 422 校验错误定位；
4. 带 Image/Font/Icon 的资源预上传、SHA-256 关联和授权下载；
5. 八语种页面、不同公司 scope 和只读/管理权限账号验收。

联调期间继续保持旧入口下线；发现契约差异时以已冻结的后端 OpenAPI、38_index Schema 和三方 fixtures 为准，不恢复临时兼容字段。

前端资源预览会先核对授权下载文件的 `byte_size` 和 SHA-256，仅把校验通过后生成的 `blob:` URL 交给 Renderer；校验失败或下载失败的资源不会渲染。FastAPI `detail.code` 中的稳定错误码也已接入全局八语种错误翻译。

联合验收发现的文件管理 SVG 上传阻塞已解除：文件选择器、扩展名校验和图片类型推断均接受 `.svg`，上传时继续向 `/api/v1/files/upload` 提交 `file_type=image`。后端 `dev` 已将 `.svg + image/svg+xml` 纳入该接口白名单，资源成功链路可使用 `resource-icon.json + logo.svg` 验证。
