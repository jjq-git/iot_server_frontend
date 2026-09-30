# LVGL JSON UI 功能需求与转换规范

> 适用性说明（2026-09-11）：本文中的 Schema、Widget、样式、Subject、Action 和代码生成领域要求仍可参考；涉及 IoT Build URL、WASM 在线预览、Build 关联、发布、回滚和设备 Report 的内容已失效。跨项目实施以[最新后端改造说明](../../../iot_server_backend/docs/业务/LVGL-IoT平台-设备UI跨项目实施与分工.md)为准。

> 文档状态：LVGL UI JSON 建模、网页渲染和 LVGL 固件源码生成的统一需求基线。
>
> 主实现范围：`38_index/lvgl-designer/` 的 Schema、编辑器、网页预览、编译核心和代码生成器。
>
> 产品目标：LVGL 9.5.0；9.3/9.4 仅用于存量工程迁移和兼容验证。
>
> 最后校对：2026-09-10。
>
> 前端阅读说明：本文用于理解设备 UI 的领域语义和技术边界，不是 `iot_server_frontend`
> 的 API 实施说明。前端正式开发以 IoT 后端冻结的 OpenAPI、字段示例、权限和状态机为准。

## 1. 目标与范围

本系统解决：

1. **LVGL → JSON**：用结构化 JSON 描述受支持的 LVGL 页面、控件、样式、资源、状态和事件。
2. **JSON → 网页渲染**：网页读取 JSON，在浏览器中显示并编辑对应界面。
3. **JSON → LVGL 固件源码**：构建工具在开发或编译阶段读取同一份 JSON，生成供设备固件编译使用的 LVGL C/H 和资源源文件。

核心原则：

- JSON 是唯一 UI 事实源；
- 网页渲染和 LVGL 代码生成使用相同 Schema、Widget Registry 和规范化 IR；
- 网页渲染结果、生成的 C/H、WASM 和资源文件都是派生物，不能反向成为编辑源；
- JSON 不直接下发设备，设备也不在运行时解析 JSON；
- 不维护两套相互独立的“网页 UI 模型”和“设备 UI 模型”；
- 所有输入必须先校验，再渲染或生成代码。

本文不包含：

- IoT 平台项目管理、客户绑定、权限和审批；
- 固件发布、OTA、设备部署、应用回执和回滚；
- MQTT、CANopen、数据库字段或设备业务协议；
- 将任意现有 LVGL C 代码自动反向解析为 JSON。

“LVGL → JSON”表示**用 JSON 建模 LVGL 语义**，不是对任意 C 源码进行逆向转换。

## 2. 总体架构

~~~mermaid
flowchart LR
    A[LVGL UI 语义] --> B[JSON Schema 与 Widget Registry]
    B --> C[UiProject JSON]
    C --> D[结构与语义校验]
    D --> E[规范化 IR]
    E --> F[网页渲染器]
    E --> G[LVGL 9.5 C Generator]
    F --> H[浏览器预览与编辑]
    G --> I[供固件编译的 C/H、资源与构建说明]
    H --> C
~~~

数据流要求：

1. 编辑器创建或修改 UiProject JSON。
2. Schema 校验 JSON 结构，语义校验器检查引用和属性。
3. compiler-core 将有效 JSON 规范化为纯 IR。
4. 网页渲染器消费 IR，构造浏览器中的 LVGL 预览。
5. C Generator 在开发机或 CI 构建环境消费同一 IR，生成供固件编译的 LVGL 9.5.0 源码。
6. 网页编辑操作最终写回 JSON，而不是修改生成代码。

compiler-core 不依赖网页渲染器或代码生成器；网页渲染器和代码生成器之间也不能互相调用。

## 3. LVGL → JSON 建模

### 3.1 核心对象

| 对象 | 职责 |
| --- | --- |
| UiProject | 页面、Widget Tree、Theme、资源、Subject 和 Action 引用 |
| DisplayProfile | 逻辑分辨率、形状、色彩格式、可视区和安装旋转 |
| ControllerProfile | 外壳、屏幕视口和物理输入配置 |
| BuildTarget | 锁定 UiProject、Display、Controller、固件能力和 LVGL 精确版本 |

UiProject 是 UI 内容的事实源。Profile 和 BuildTarget 只提供渲染、校验和生成所需的目标参数，不能保存另一份页面或控件树。

### 3.2 UiProject 内容

JSON 至少能够描述：

- 工程元数据和 Schema 版本；
- Screen 列表和根 Widget；
- Widget 类型、父子关系、顺序和稳定 ID；
- 坐标、尺寸、对齐、Flex 和 Grid；
- LVGL Part、State、Selector、Named Style 和 Local Style；
- Theme Token、字体、图片、图标和文案资源；
- Event、Action、Subject 和 Binding；
- Display、Controller、Theme 和 BuildTarget 引用。

第一阶段必须完整覆盖：

- Object/Container；
- Label、Button、Image；
- Switch、Slider、Arc、Bar。

后续覆盖：

- Dropdown、Checkbox、Textarea、Keyboard；
- Tabview、List、Roller。

### 3.3 标识符

| 字段 | 用途 | 规则 |
| --- | --- | --- |
| id | JSON 内稳定引用 | 不因显示名称或导出名称改变 |
| displayName | 编辑器显示 | 可以使用中文 |
| codeName | 生成 C 符号 | 必须满足 C 标识符约束 |

业务 ID 不应被 C 命名规则限制。只有需要导出为 C 符号的对象才需要 codeName；缺失时可在规范化阶段确定性生成。

### 3.4 属性和 Registry

每种 Widget 必须在唯一 Widget Registry 中声明：

- JSON 类型名称；
- 支持的属性、类型、默认值、范围和枚举；
- 支持的 Part、State、Selector 和布局能力；
- 网页渲染映射；
- LVGL C API 映射；
- 需要启用的 LV_USE_*；
- 不支持或仅特定版本支持的能力。

网页渲染和 C Generator 不得各自复制一套属性定义。新增 Widget 或属性时，必须同时补齐 Schema、Registry、网页渲染、C 生成和测试。

### 3.5 Event、Action 和 Subject

- **Event** 是 LVGL 控件事件，例如 clicked、value_changed；
- **Action** 是事件触发的结构化操作；
- **Subject** 是可观察或可写的 UI 状态；
- **Binding** 描述 Subject 与 Widget 属性之间的关系。

JSON 保存稳定语义和强类型参数，不保存任意 C 函数体。内置能力可以包含页面导航、Subject 设置、切换和增减；其他 Action 通过受控 Registry 扩展。

### 3.6 JSON 约束

- JSON 必须带 Schema 版本；
- 引用必须可解析，ID 和 codeName 在各自作用域内唯一；
- Theme Token 必须存在且类型匹配；
- 属性类型、范围、枚举和 Selector 必须合法；
- 普通工程禁止 C/C++、JavaScript、Shell、SQL 和任意动态代码；
- 禁止 cPatch 等绕过 Schema 的源码字段；
- 未知字段不能静默忽略；
- v1 → v2 的有损迁移项必须明确提示并由用户确认。

## 4. JSON → 网页渲染

### 4.1 渲染目标

网页必须根据 JSON/IR 显示与目标 LVGL 语义一致的界面，用于设计、预览和交互验证。

目标链路：

~~~text
UiProject JSON
  → validate
  → normalize IR
  → PreviewProgram
  → LVGL WebAssembly Runtime
  → Browser Canvas
~~~

LVGL 9.5 主链不生成或解析 XML。

### 4.2 渲染要求

- Screen、Widget Tree、层级和顺序与 JSON 一致；
- 坐标、尺寸、对齐、Flex、Grid、裁切和旋转一致；
- Part、State、Selector、Theme 和 Local Style 一致；
- 字体、图片、颜色格式和透明度有明确转换规则；
- Event、Action、Subject 和 Binding 可以在浏览器中模拟；
- DisplayProfile 决定逻辑分辨率、色彩格式和可视区；
- ControllerProfile 决定外壳、viewport 和输入映射；
- 鼠标或触摸预览使用 LVGL 逻辑坐标；
- 不支持的属性必须产生诊断，不能静默丢弃。

网页预览是 JSON 的一种渲染结果，不是另一套页面实现。不得为了让预览“看起来正确”而加入无法生成到 LVGL C 的专用样式或行为。

### 4.3 编辑要求

编辑器对界面的修改必须转换为结构化 JSON 操作：

- 新建、删除、移动和复制 Widget；
- 修改属性、布局、样式、资源和文本；
- 设置 Event、Action、Subject 和 Binding；
- 撤销、重做和历史恢复；
- 导入、导出和版本迁移。

编辑器不能直接修改 WASM 内存状态后丢失变更。每次有效操作都必须能落回 JSON，并再次通过校验和渲染。

### 4.4 更新策略

实现可以根据变更范围选择：

- 属性热更新；
- Widget 子树重建；
- Screen 重建；
- 整个工程重载。

无论采用哪种策略，更新后的渲染结果必须等价于重新加载当前 JSON。性能优化不能改变 JSON 的解释结果。

## 5. JSON → LVGL 固件源码

### 5.1 生成链

该链路运行在开发机或 CI 构建环境。生成的 C/H 和资源需要继续参与固件编译；JSON、C/H 源文件都不是由设备在运行时下载并解释的 UI 包。

~~~text
UiProject JSON
  → Schema/语义校验
  → resolveRefs
  → eliminateDefaults
  → assignNames
  → normalized IR
  → LVGL 9.5 emitter
  → C/H + assets + REQUIREMENTS + manifest
~~~

产品目标固定为 LVGL 9.5.0。BuildTarget.lvglVersion 是生成版本权威，不能使用 9.5、^9.5.0 等模糊版本，也不能从 UiProject 中猜测。

### 5.2 生成物

生成结果至少包括：

- ui.c 和 ui.h；
- Screen、Style、Subject 和 Action 文件；
- 字体、图片等资源声明或转换产物；
- REQUIREMENTS.txt；
- build-manifest.json；
- 对应 esp-idf、cmake 或 bare 目标的集成文件。

manifest 应记录：

- Schema、生成器和 LVGL 精确版本；
- UiProject、Display、Controller 和 BuildTarget revision；
- 分辨率、色彩格式及所需 LV_USE_*；
- 字体和图片哈希；
- 未实现 Action 和所有阻断性诊断。

### 5.3 代码生成规则

- 相同 JSON、Profile 和生成器版本必须得到确定性结果；
- 字符串、资源名和 C 符号必须正确转义；
- C API 只能来自与 LVGL 9.5.0 对账后的 Registry；
- 生成文件必须能够安全覆盖；
- 人工实现的 Action 文件采用独立文件或 write-if-absent，不能被覆盖；
- 16 位色彩格式必须明确区分 RGB565 与 RGB565_SWAPPED；
- 未实现 Action、未知属性、版本错配或资源缺失必须阻断正式导出；
- 生成成功只表示文件已形成，不代表目标工具链已经编译通过。

## 6. 网页渲染与代码生成一致性

网页渲染器和 C Generator 必须对同一 IR 作相同解释：

| JSON/IR 能力 | 网页渲染 | LVGL 代码 |
| --- | --- | --- |
| Screen/Widget Tree | 创建对应运行时对象 | 生成 lv_obj 创建代码 |
| 属性 | 调用运行时 setter | 生成对应 LVGL setter |
| Style/Selector | 应用 LVGL 样式语义 | 生成 style 和 selector 代码 |
| Layout | 使用相同布局参数 | 生成 Flex/Grid/Align 调用 |
| Event | 注册预览事件 | 生成事件回调注册 |
| Subject/Binding | 使用模拟或编辑态状态 | 生成 Observer/Binding 代码 |
| Asset | 加载浏览器资源 | 生成或引用设备资源 |

一致性由以下机制保证：

1. Schema 定义合法输入。
2. Widget Registry 定义属性和 API 映射。
3. compiler-core 只生成一份规范化 IR。
4. Preview 和 Generator 分别消费同一 IR。
5. 同一 fixture 同时执行网页预览和 C golden 测试。

禁止：

- Preview 直接读取并解释一套私有 JSON 字段；
- Generator 对同一字段采用不同默认值；
- 在网页 CSS 中补偿生成端不存在的布局规则；
- 从网页 DOM 或 Canvas 状态反向生成 C；
- 从生成后的 C/H 恢复或继续编辑工程。

## 7. 校验与错误处理

校验分为：

| 层级 | 检查内容 |
| --- | --- |
| 结构校验 | JSON Schema、必填字段、类型和未知字段 |
| 语义校验 | 引用、唯一性、Theme、Selector、Action 参数 |
| 目标校验 | LVGL 版本、色彩格式、Widget 能力和 Profile 兼容性 |
| 信任校验 | 任意代码、危险路径和越界扩展 |

诊断至少包含：

- 稳定错误码；
- JSON path 或对象 ID；
- 严重级别：error 或 warning；
- 中文说明；
- 可执行的修复建议。

error 必须阻断渲染或代码生成中不安全、不确定的部分。warning 可以继续，但必须在编辑器和导出结果中可见。任何不支持能力都不得静默降级。

## 8. 验收要求

### 8.1 JSON

- valid、invalid 和 migration fixtures 完整；
- JSON 可导入、编辑、导出并保持语义不变；
- Schema、运行时类型和生成的 JSON Schema 不漂移；
- ID、引用、Theme、Action、Binding 和 Profile 校验有自动化测试；
- 任意代码和 cPatch 被阻断。

### 8.2 网页渲染

- P0 Widget 的结构、属性、样式、布局、事件和 Binding 全部可渲染；
- P1 Widget 至少通过已声明能力的渲染测试；
- 不同分辨率、旋转、裁切和色彩格式有固定样例；
- 编辑操作能稳定写回 JSON，并支持撤销/重做；
- 重载 JSON 与增量更新结果一致；
- 不支持能力显示明确中文错误。

### 8.3 LVGL 代码

- P0 Widget 通过 C golden 测试；
- LVGL 9.5.0 符号与真实头文件对账；
- 生成代码通过 host gcc、ARM/ESP-IDF 目标编译；
- 资源、版本、能力和未实现 Action 写入 manifest；
- 重复生成结果一致，且不覆盖人工 Action 实现。

### 8.4 两个输出一致

同一组 JSON fixture 必须同时验证：

1. 网页渲染截图；
2. 网页交互状态；
3. C/H golden；
4. simulator 截图和交互。

关键控件的尺寸、位置、颜色、字体、状态、事件和 Binding 必须一致。允许的像素差异需要明确阈值，不能只凭人工观察判定。

## 9. 当前实现状态

截至 2026-09-10，以下内容已在 `38_index` 工作区实现并完成针对性本地验证；迁入内容仍需形成正式提交并通过首次干净环境 CI，不能将“本地完成”描述为“已发布上线”。

| 能力 | 当前事实 | 剩余工作 |
| --- | --- | --- |
| 源码接管 | Designer 完整源码已迁入 `38_index/lvgl-designer/`，来源记录和平台构建脚本已建立 | 正式提交迁入基线并观察首次 CI |
| Schema v2 | `ProjectSnapshotV2` 已接管文件、IndexedDB、云工程和版本历史；v1 只用于旧文件迁移和尚未原生化的编辑态适配 | 继续迁移画布/Inspector 原生模型，解除 Theme Token、icons 等兼容限制 |
| FastAPI 工程校验 | v2 结构、语义、引用、复杂度和信任校验已经接入，工程版本冲突、恢复和 owner 隔离已有测试 | 冻结对外版本化契约 |
| compiler-core | 已抽离纯 normalize 和 IR | 持续补齐 Widget Registry 能力 |
| LVGL 9.5 PreviewProgram | WASM、基础 Widget、事件和多种 Color Format 的浏览器冒烟已通过 | 补齐发布 WASM、资源和完整能力矩阵 |
| LVGL 9.5 C emitter | 初版、静态测试和 golden 测试已通过 | 完成 host、ARM/ESP-IDF 工具链编译门禁 |
| Profile/BuildTarget | Display、Controller、Input、Firmware Profile 与 BuildTarget 已有 owner 隔离、不可变 revision API 和跨引用校验 | 接入 Designer 管理界面；独立 Theme revision 仍需完善 |
| Build/BuildArtifact | 不可变输入、状态机、审计、确定性 ZIP、manifest、diagnostics、SHA-256、可信 worker 和持久队列租约已实现 | 补齐图片/字体二进制物料、WASM 预览和真实固件编译 |
| 设备一致性 | 尚未形成产品闭环 | 完成 86 屏 simulator、ESP-IDF、真机截图和交互对拍 |
| IoT 平台集成 | 责任边界和最小交换字段已有草案 | 冻结服务间认证、OpenAPI、manifest、幂等和发布/回滚契约 |

当前按以下顺序推进：

1. 将 `38_index` 当前迁入和新增实现正式提交，并通过干净环境 CI。
2. 补齐图片、字体、发布 WASM 以及 host/ARM/ESP-IDF 编译门禁。
3. 冻结 Build manifest、状态机、服务间认证和 IoT 交换契约。
4. 完成 86 屏 simulator 与真实设备一致性验证。
5. IoT 后端完成型号、固件、UI Build、OTA、回执和回滚关联，并向前端发布稳定 OpenAPI。
6. `iot_server_frontend` 在收到完整交接包后开始正式业务开发。

## 10. 相关文档

- [LVGL JSON UI 可视化系统：需求与实施方案](../../../38_index/docs/LVGL-UI-需求与实施方案.md)
- [LVGL Web Designer 架构](../../../38_index/lvgl-designer/docs/ARCHITECTURE.md)
- [UI Schema v2](../../../38_index/lvgl-designer/docs/ui-schema.md)
- [LVGL 代码生成器](../../../38_index/lvgl-designer/docs/lvgl-generator.md)
- [预览架构](../../../38_index/lvgl-designer/docs/preview-architecture.md)
- [工程 Schema 与 Widget 描述表](../../../38_index/lvgl-designer/docs/design/01-工程Schema与Widget描述表.md)
- [代码生成器设计](../../../38_index/lvgl-designer/docs/design/03-代码生成器.md)
