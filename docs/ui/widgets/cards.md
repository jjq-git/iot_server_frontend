# Card 布局规范

> 最后更新：2026-09-02

本规范用于后台系统设置、公司信息和设备详情等需要分组展示内容的页面。实际页面结构以 [HTML 可交互 Demo](../html/README.md) 为准。

## 1. 基本原则

- 内容区不使用 12 栏栅格；采用「固定侧栏导航 + 内容区」两段结构，内容区内部再用两列栅格排布 Card。
- 同一张 Card 只承载一个明确职责，不把无关配置放在一起。
- Card 用于区分业务分组，不为每一小段文字或每一个字段增加 Card。
- 同一行 Card 顶部对齐，间距统一为 `24px`。
- 窄屏下所有 Card 改为单列并按业务顺序纵向排列。
- 保存以 panel / 表单整体为单位提交，不为每张 Card 单设保存按钮。

## 2. 布局模型

以 `/mycompany`（`company-profile.tpl`）为基准：

- 外层 `.company-profile__layout` 是两列 grid，`grid-template-columns: 220px minmax(0, 1fr)`：左侧固定 `220px` 的分类导航（`.company-area-nav`），右侧是内容区（`.company-panel`）。这不是 12 栏栅格，侧栏宽度固定。
- 内容区里的 Card 用 `.company-settings-grid` 排布：`grid-template-columns: repeat(2, minmax(0, 1fr))`，`gap: 24px`。每张 Card 要么占 1 列，要么用 `.company-settings-card--wide`（`grid-column: 1 / -1`）跨满整行。
- 只有「占 1 列」和「跨满整行」两种宽度，没有 `4 + 8`、`4 + 4 + 4` 等比例组合。若一行内容装不下，先检查信息分组是否合理，而不是引入新的栅格变体。

## 3. Card 结构

每张 Card（`.company-settings-card`）按以下顺序组织：

1. Header（`.company-settings-card__header`）：语义图标、标题和一句简短说明。
2. Body（`.company-settings-card__body`）：字段、状态或主要内容。

Card **不设** per-card Footer，也没有每卡一个的保存按钮。保存是 panel 级操作：`.company-panel__heading` 里放一个保存图标按钮（`type="submit"`），按整个 panel / 表单一次性提交。Header 与 Body 之间用分隔线或稳定留白区分，不同时使用重阴影、深色边框和大面积背景色。Card 标题不能代替页面标题。

## 4. 尺寸与样式

- Card 间距：`24px`（`.company-settings-grid` 的 `gap`）。
- Card 内边距：实际约 `16px` —— Header 用 `--space-3` / `--space-4`（纵向约 8px、横向约 16px），Body 用 `--space-4`（约 16px）；同一页面必须一致。
- Card 背景：白色或主题对应的表面色。
- Card 边框：`1px` 中性浅色边框。
- Card 不使用左侧品牌色边框或强调条，层级通过标题、间距和内容结构表达。
- Card 圆角：`0`；全局使用直角，不为单张 Card 单独恢复圆角。
- 默认不使用明显投影；需要区分层级时优先使用背景、边框和留白。
- 标题、正文和辅助说明沿用全局字号，不为了塞入更多字段单独缩小。

## 5. 内容与操作

- 一个 panel 内的多张设置 Card 由 panel 级的保存按钮统一提交，不做每卡独立保存。
- 保存按钮放在 `.company-panel__heading` 右侧；「充值」等 panel 级辅助操作也放在 heading 区域。
- 开关用于立即能理解的二元状态；存在依赖或风险时，应补充说明并由保存按钮统一提交。
- 字段较多的分组用 `.company-settings-card--wide` 跨满整行，不在半宽 Card 内硬塞复杂表单。
- 危险操作应使用跨满整行的独立 Card（`--wide`），明确影响范围，并提供二次确认。

## 6. 响应式规则

- 桌面端内容区用两列 `.company-settings-grid` 排布，`--wide` Card 跨满整行。
- 中等宽度下两列保持，`.company-profile__layout` 的侧栏收窄（`220px → 190px`）。
- 窄屏下 `.company-profile__layout` 与 `.company-settings-grid` 均塌成单列，侧栏导航转为横向滚动，字段由多列改为单列。
- 响应式变化只调整布局，不缩小字体、按钮点击区域或表单控件高度。
- 具体断点复用前端项目的全局断点变量，不在页面组件中重复写死。

## 7. 与列表页的区别

标准列表页仍使用一个主 Card，筛选、表格、空态和分页保持在同一个容器内，详见[列表页规范](lists.md)。只有内容本身存在多个独立职责时，才使用本规范的多 Card 布局。
