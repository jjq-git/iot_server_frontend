# 前端基础架构

> 最后更新：2026-09-03

依赖方向固定为 `views -> shared/mixins -> base/services -> styles/tokens`。底层不得读取路由业务、
API 字段或角色名称。新增页面从资源 API、能力判断、Base 组件和 UI 服务四处开始。

## 公共组件契约

| 组件 | 稳定输入 | 稳定事件 / 插槽 | 允许透传 |
| --- | --- | --- | --- |
| `BaseButton` | `variant/size/disabled/loading` | 原生点击事件、默认插槽 | aria、type、block 等按钮属性 |
| `BaseCard` | `header/headerBgVariant/headerTextVariant` | default/header/footer | Bootstrap 卡片结构属性 |
| `BaseInput` | `value/type/placeholder/state/disabled/trim/clearable` | input/change/clear/focus/blur | 原生 input 属性 |
| `BaseFormGroup` | `label/labelFor/description/state/feedback/required` | default/label | 表单组布局属性 |
| `BaseTable` | `items/fields/busy/empty/error/pagination` | Bootstrap 表格 scoped slots、retry/page | 排序与响应式表格属性 |
| `BaseModal` | `value/id/title/busy/size/footer` | input/show/hidden/ok 与 modal slots | aria 与对话框布局属性 |

Base 组件只做无业务语义的交互和视觉。带页面标题、查询区、批量操作等组合放在
`components/shared/`。不得根据 route、API 字段或角色改变 Base 行为。

标准资源列表使用 `components/shared/ListPageCard.vue` 组合 Filter、Table 和 Footer；它统一结果范围、
列表密度与响应式布局，页面只提供筛选字段、表格列、分页控件和业务事件。页面标题由 Topbar 和
全局面包屑呈现，列表容器不再根据 route 自动重复标题。行内最多保留两个高频
`BaseActionButton`，其余动作进入统一的 `action-overflow-menu`；控制台、图表等非资源列表使用
`PageSectionCard.filter-card`，不伪装成分页列表。

## 唯一入口与例外

- 业务页面使用 `BaseButton/BaseCard/BaseInput/BaseFormGroup/BaseTable/BaseModal`；直接
  `b-button/b-card/b-form-input/b-form-group/b-table/b-modal` 仅允许在 Base 实现内部、BootstrapVue
  无等价封装的布局控件，或 [architecture-allowlist.json](../scripts/architecture-allowlist.json) 记录的迁移存量。
- 提示使用 `this.$uiToast`，确认使用 `this.$uiConfirm`，错误文案使用
  `getErrorMessage(error, translatedFallback)`，异步提交可使用 `runUiTask`。
- 权限只使用 [permission.js](../src/utils/permission.js) 的能力函数；页面不得解释角色字符串。
- 通用抽象需要至少三个稳定使用者；无人使用的预备 mixin 不保留。

当前列表样板为 MQTT 的客户端、订阅和主题页，三者复用
[`createListPageMixin`](../src/mixins/listPage.js)，由它管理查询参数、URL 同步、分页、
loading/empty/error 与重试生命周期；资源请求函数仍由各页面从 `src/api/` 注入。

大页面按业务职责拆分：容器页保留资源请求、权限和流程编排，业务分区组件只通过 props/events
收发数据，页面视觉放在独立的 `styles/pages/` 文件。`HnModels`、`FileManager`、`PodModels` 和
`company-dashboard-config/DashboardConfigs` 已采用此边界；其中 `FileManager` 的统计与文件列表分别由独立组件承载。
`large-page-boundaries.test.mjs` 会阻止 API 下沉到展示组件或重新加入大段内联页面样式。

### 第三方控件白名单

暂时允许直接使用 BootstrapVue 的网格与布局、alert、overlay、spinner、dropdown、tabs、
datepicker、file、checkbox、radio、textarea 和 input-group。这些控件尚无稳定的等价 Base 契约；
一旦出现三个以上一致用法，再提炼为业务无关组件。按钮、卡片、输入框、表单组、表格和弹窗
不在白名单内，架构检查会阻止业务代码直接使用。

公共调用的最小示例见 [PublicUiPatterns.vue](examples/PublicUiPatterns.vue)。

## 样式分层

加载顺序为 token/主题映射、foundation、Base 组件、业务页面。主题颜色唯一命名空间是
`--color-*`；图表数据色也要先命名。页面 scoped 样式只描述业务布局，不覆盖公共控件内部。
新增硬编码主题色和无说明 `!important` 会被架构检查拒绝。

## 新页面清单

1. 在 `src/api/<resource>.js` 通过 `http.js` 描述资源。
2. 在 `permission.js` 登记命名路由能力，所有可见文案补齐八种语言。
3. 组合 Base/shared 组件；通过公共 toast、confirm、error 和图标入口交互。
4. 同时检查浅色/深色、loading/empty/error、键盘与 aria 状态。
5. 运行 `npm test`、lint、stylelint 和 production build。
