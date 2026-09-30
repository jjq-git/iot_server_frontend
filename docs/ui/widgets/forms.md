# 表单与弹窗规范

> 最后更新：2026-09-09

后台所有**弹窗（创建 / 编辑 / 查看）与表单控件**的统一样式与结构。实际以 [HTML Demo](../html/README.md) 为准；本文是"新增表单时照抄哪些 class"的清单，避免每个页面各写一套、反复返工。设计变量见 [tokens.css](../html/assets/css/tokens.css)，图标见 [icons.md](icons.md)，列表见 [lists.md](lists.md)。

基准示例：管理员「编辑用户」（表单）与「查看用户」（详情），新表单一律对齐这两个。

## 1. 弹窗（Modal）结构

用原生 `<dialog class="modal">`，`method="dialog"` 表单包裹，固定三段：

```html
<dialog class="modal modal--wide" id="xxx-dialog" aria-labelledby="xxx-title">
  <form method="dialog" data-xxx-form>
    <header class="modal__header">
      <div><h2 id="xxx-title">标题</h2><p>一句话说明。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭">…icon-x…</button>
    </header>
    <div class="modal__body form-grid">…字段…</div>
    <footer class="modal__footer">
      <button class="button button--secondary" value="cancel" formnovalidate>取消</button>
      <button class="button button--primary" value="confirm">主操作动词</button>
    </footer>
  </form>
</dialog>
```

- `modal--wide` 用于双列表单；窄内容不加。
- Header 只放标题 + 一句说明 + 关闭；不放业务字段。
- Footer：取消（`button--secondary` + `formnovalidate`）在左、主操作（`button--primary` 明确动词）在右。纯查看弹窗只留一个「关闭」，它用 `button--primary` 但仍是 `value="cancel"`（是关闭不是提交）。
- 关闭 / 取消一律 `value="cancel"`，主操作 `value="confirm"`；`formnovalidate` 在编辑 / 创建弹窗的关闭 / 取消上加，纯查看弹窗（无必填）可省。
- **焦点**：`showModal()` 打开时浏览器自动聚焦第一个可聚焦元素（关闭按钮）。鼠标 / 程序化聚焦**不显示**浏览器默认蓝框（`base.css` 已全局 `:focus:not(:focus-visible) { outline:none }`），键盘 Tab 仍显示品牌 focus 环。页面不要给关闭按钮单独写 `outline`。

## 2. 表单栅格

- `modal__body form-grid`：桌面**两列**，窄屏回落单列。
- 每个字段一个 `.form-field`；跨整行用 `.form-field--full`。
- 分节标题用 `.form-section`（含可选 `<small>` 说明），自身已 `grid-column:1/-1` 自动占整行、上边框分隔（不必再叠 `.form-field--full`）；首个分节不显示上边框。当前客户弹窗未使用它，是 defined-but-unused 的备用 helper。

```html
<label class="form-field"><span>字段名</span><input name="x" required></label>
<p class="form-section">分节标题<small>可选说明</small></p>
```

## 3. 输入控件

| 控件 | class / 写法 | 说明 |
| --- | --- | --- |
| 文本 / 邮箱 / 电话 | `.form-field > input` | 高度 `40px`，`required` 表必填 |
| 下拉 | `.form-field > select` | 高度 `40px` |
| 开关（布尔） | `.form-switch` + `input[role="switch"]`（见下方两种形态） | 用于"启用账号""首次登录改密"等即时布尔 |
| 密码 | `.form-password` + `.form-password__toggle`（`icon-eye`/`icon-eye-slash`） | 眼睛按钮切换明文；确认密码仅前端校验，不进 payload |
| 选择器（弹窗选值） | `.picker-field`（只读 input + `button--sm`） | 如地点：只读显示 + "选择地点"按钮 |
| 前缀输入组 | `.domain-field`（见 §5） | 如登录入口 |

- 控件默认高 `40px`，点击目标 ≥ `40×40px`。
- 只读 / 系统生成字段显示为只读，不伪装成可编辑。

**开关（`.form-switch`）两种形态**：

- **compact**（`.form-switch--compact`）：高 `40px`，单行；`input` 包在 `<label class="form-switch__toggle">` 里，右侧 `.form-switch__control`。用于客户 / 管理员 / 用户编辑弹窗的「账号状态」——账号状态开关一律用 compact。
- **plain**（无 `--compact`）：高 `48px`，`input` 为 `.form-switch` 的直接子元素，左侧「标题 + `<small>` 说明」两行。用于 create-company-user 的「启用账号 / 首次登录修改密码」。

```html
<span class="form-switch form-switch--compact"><span><strong>启用账号</strong></span>
  <label class="form-switch__toggle"><input name="is_active" type="checkbox" role="switch" value="true">
    <span class="form-switch__control" aria-hidden="true"></span></label></span>
```

## 4. 复选框与单选（选中色）

- 原生复选框 / 单选的**选中色统一用品牌实底 `#067a7a`**：`accent-color: var(--color-brand-solid)`。全局已对 `input[type="checkbox"]:not([role="switch"])` 设置，页面**不要**再自定义颜色。
- 多选一组用 `.role-checks`（`<fieldset>` + `<legend>` + 若干 `.role-check`）；`.role-check` 是行内 `label + checkbox + span`，自动换行。
- 组内互斥 / 选项裁剪等逻辑走 JS（`data-*` 挂点），样式不变。

```html
<fieldset class="form-field form-field--full role-checks">
  <legend>客户类型</legend>
  <label class="role-check"><input type="checkbox" name="role" value="…"><span>选项</span></label>
</fieldset>
```

## 4.1 多选下拉（`.multi-select`）

选项多、要占单列时用多选下拉（客户「公司类型」，见 create-client / edit-client）。触发条显示选中摘要，点击展开浮层复选面板：

```html
<div class="multi-select" data-client-roles>
  <button type="button" class="multi-select__trigger" data-multi-select-trigger aria-expanded="false">
    <span class="multi-select__summary" data-multi-select-summary>请选择</span>
    <svg class="app-icon app-icon--fill multi-select__caret"><use href="icons.svg#icon-chevron-down"></use></svg>
  </button>
  <div class="multi-select__panel" hidden>
    <label class="role-check"><input type="checkbox" name="role" value="…"><span>选项</span></label>
  </div>
</div>
<small class="form-help" data-client-roles-note>已选择：静音仓厂家、分销</small>
```

- 触发条 `.multi-select__trigger`：`.multi-select__summary`（选中项文字摘要）+ `.multi-select__caret`（下拉箭头）。
- 浮层 `.multi-select__panel` 内放若干 `.role-check` 行；`[hidden]` 时折叠（CSS `.multi-select__panel[hidden]{display:none}`）。
- 字段下方同级 `<small class="form-help" data-client-roles-note>` 显示选中备注（如「已选择：静音仓厂家、分销」）。
- JS（`data-client-roles` / `data-multi-select-trigger`）负责开合、写摘要 / 备注、组内互斥；点面板外自动收起。

## 4.2 多记录切换 tab（`.admin-tabs`）

一个弹窗要在同类多条记录间切换编辑时用 tab 栏（edit-client-admin：一个公司多个管理员）：

```html
<div class="admin-tabs" data-admin-tabs role="tablist" aria-label="管理员"></div>
```

- 容器空写，JS 按记录数据生成每条一个 `.admin-tab`，末尾追加一个 `.admin-tab--add`（`icon-plus` 图标按钮，非「＋ 增加」文字）。
- 当前记录 tab 加 `.admin-tab.is-active`；点 `.admin-tab--add` 进入新增模式（此时登录邮箱可编辑，其余记录邮箱只读）。

## 5. 前缀输入组（domain 等）

固定前缀 + 可编辑段 + 可选操作按钮，用 `.domain-field`：

```html
<div class="form-field form-field--full">
  <label for="x-domain">登录入口</label>
  <span class="domain-field">
    <span class="domain-field__prefix">https://pods.dengtec.com/</span>
    <input id="x-domain" name="domain_subpath" placeholder="创建时可选填">
    <button class="button button--secondary button--icon-only" type="button" data-action="check-domain" aria-label="检查是否可用" title="检查是否可用"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-search"></use></svg></button>
  </span>
  <small class="form-help">补充说明。</small>
</div>
```

## 6. 按钮

沿用 [style-guide §6](../html/style-guide.md)：

- **主操作**（提交 / 保存 / 创建）：`button button--primary`（品牌实底），必须带明确动词文案。
- **次要**（取消 / 测试 / 前往…）：`button button--secondary`；小尺寸加 `button--sm`。
- **纯图标入口**（列表新增、卡片保存等）：`button button--secondary button--icon-only` + 线性图标 —— **不用** `button--primary` 做纯图标（实底反相只出现在带文字主操作上）。

## 7. 查看 / 详情弹窗（分节键值表）

只读详情**不用表单控件、不用扁平两列表**，用分节键值表 `.user-detail-table`（对齐管理员「查看用户」）：

```html
<table class="user-detail-table">
  <colgroup><col class="user-detail-table__label"><col><col class="user-detail-table__label"><col></colgroup>
  <tbody>
    <tr class="user-detail-table__section"><th colspan="4"><span>…icon…分节标题</span></th></tr>
    <tr><th scope="row">字段</th><td>值</td><th scope="row">字段</th><td>值</td></tr>
  </tbody>
</table>
```

- 每个 `__section` 行 = 图标 + 分节标题（如用户详情的「账号资料」「个人偏好」「登录与安全」，见 user-profile-fields.tpl；客户详情的「客户资料」，见 view-client.tpl）。
- 四列 = 两组"标签 + 值"，每字段天然占半宽；长值可 `colspan`。
- 顶部可加 `.model-detail-heading`（头像 + 标题 + 编码 `cell-sub mono` + 状态徽标）。其中标题 + 编码纵向排列时套 `.client-detail-heading__titles`（h2 公司简称 + `.cell-sub.mono` 编码 上下堆叠，右侧另放 `.status` 徽标，见 view-client）。
- 只读详情**不展示** 内部 ID / UUID / 密码哈希 / 原始变更日志。

**概况统计块 `.client-stats`**：详情弹窗除键值表外，末尾可再接一个 2×N 概况块（`grid`）。每格 `.client-stat` = `.client-stat__label` + `.client-stat__value`（大号数字）；非数字值（如管理员名）用 `.client-stat__value--text`；格内可放 `.button--sm`（如「编辑」/「增加管理员」）。view-client 用它显示 客户数 / 管理员 / 静音仓型号 / 静音仓。

```html
<div class="client-stats" aria-label="客户概况">
  <div class="client-stat"><span class="client-stat__label">客户数</span><strong class="client-stat__value">—</strong></div>
  <div class="client-stat"><span class="client-stat__label">管理员</span><span class="client-stat__value client-stat__value--text">—</span><button class="button button--secondary button--sm" type="button">编辑</button></div>
</div>
```

- 详情下钻 `.detail-drilldown` / `.detail-drilldown__item`（图标 + 文案 + 右侧 chevron `.detail-drilldown__arrow`）是已定义但当前未使用的备用样式——view-client 已改用上面的 `.client-stats`；保留 `.detail-drilldown` 作为可选模式。

## 8. 徽标与状态

- 类型 / 分类徽标：`.type-badge`（中性底 + 边框，不用状态色装饰）；多个用 `.client-roles` 包裹。
- 运行 / 账号状态：`.status` + `.status--online`（正常）/ `.status--offline`（停用）；状态必须有明确文字，不只靠颜色。
- 单元格副文本用 `.cell-sub`（主值下方灰色小字，如全称 / 邮箱）。

## 9. 校验与提交

- 必填用 `required`；跨字段 / 服务端冲突放表单顶部统一错误区。
- Demo 提交只 toast 提示「尚未提交服务器」，不做真实写入。
- 字段名、API 缺口、"待后端实现"只写在 `<!-- Handoff: … -->` 注释，**不**作为面向用户的可见文案。
