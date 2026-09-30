# 样式架构与主题系统

> 最后更新:2026-09-15

## 目录

- [文件分工](#文件分工)
- [使用规范(写 .vue 样式时必读)](#使用规范写-vue-样式时必读)
- [新增颜色流程](#新增颜色流程)
- [可用 CSS 变量速查](#可用-css-变量速查)
- [hex → CSS 变量映射表](#hex--css-变量映射表)
- [现有 `--tt-*` 兼容层](#现有---tt--兼容层)

---

## 文件分工

| 文件 | 内容 | 是否输出 CSS |
|------|------|----------|
| [_tokens.scss](./_tokens.scss) | 设计令牌:**SCSS 变量**形式定义所有颜色/阴影/间距/圆角,浅+深两套 | 否(纯 SCSS 模块,只供 _theme-vars 引用) |
| [_theme-vars.scss](./_theme-vars.scss) | 把 SCSS 变量映射到 **CSS 变量**,浅色写在 `:root`,深色写在 `[data-theme="dark"]` | 是(`:root` + 深色块) |
| [dark-theme.scss](./dark-theme.scss) | 旧 `--tt-*` 兼容层 + Bootstrap 暗色映射 + 主题切换组件自身样式(`.tt-fab` 等) | 是 |
| [base.scss](./base.scss) / [layout.scss](./layout.scss) / [components.scss](./components.scss) / [pages.scss](./pages.scss) | 基础样式/布局/页面通用 | 是 |
| [bootstrap-overrides.scss](./bootstrap-overrides.scss) / [bootstrap-theme.scss](./bootstrap-theme.scss) / [element-overrides.scss](./element-overrides.scss) | 第三方 UI 覆盖 | 是 |
| [index.scss](./index.scss) | 入口,**第一行就 `@use "theme-vars"`** | 是 |

引入链:[main.js](../../main.js) → [index.scss](./index.scss) → [_theme-vars.scss](./_theme-vars.scss) → [_tokens.scss](./_tokens.scss)。

`_tokens.scss` 是设计值的唯一来源，`_theme-vars.scss` 是 CSS 变量的唯一输出入口。旧变量名只允许在 `_theme-vars.scss` 中作为指向语义变量的兼容别名存在，不得维护第二套颜色值。

---

## 使用规范(写 .vue 样式时必读)

写 .vue / .scss 时:

1. **优先 `var(--color-xxx)`**——任何颜色都从 [可用 CSS 变量速查](#可用-css-变量速查) 选;
2. **不要写 hex** 字面量(`#fff`/`#067a7a` 等),哪怕只是 `border: 1px solid #ccc;`;
3. **不要写 `rgb()` / `rgba()`**,纯白/纯黑/透明可用 `transparent`、`#fff`(仅当真正"反白文字"时,优先 `var(--color-text-inverse)`);
4. 阴影只用 `var(--shadow-xs|sm|md|lg|pop|card|inset|focus-*)`;
5. 滚动条只用 `var(--color-scrollbar-thumb)` / `var(--color-scrollbar-track)`;
6. **不要在 .vue 里写 `[data-theme="dark"] .xx { ... }`**——颜色全部走 CSS 变量,主题切换自动生效;
7. 临时不知道用哪个变量时,先在 [hex → CSS 变量映射表](#hex--css-变量映射表) 查现有 hex 对应的语义变量。

---

## 新增颜色流程

所有新颜色必须沿这条链扩展,**禁止在 .vue 直接写新 hex**:

1. 在 [_tokens.scss](./_tokens.scss) 加 SCSS 变量,**浅+深各一对**:
   ```scss
   $color-bg-special-light: #abcdef;
   $color-bg-special-dark:  #112233;
   ```
2. 在 [_theme-vars.scss](./_theme-vars.scss) 暴露 CSS 变量,在 `:root` 与 `[data-theme="dark"]` 各加一行:
   ```scss
   :root           { --color-bg-special: #{$color-bg-special-light}; }
   [data-theme="dark"] { --color-bg-special: #{$color-bg-special-dark}; }
   ```
3. .vue / 子 SCSS 内部 `background: var(--color-bg-special);` 即可。

---

## 可用 CSS 变量速查

### 背景
| 变量 | 浅色 | 用途 |
|------|------|------|
| `--color-bg-page` | #f5f7fa | 页面整体背景 |
| `--color-bg-card` | #ffffff | 卡片白底 |
| `--color-bg-hover` | #f5f9ff | 通用 hover |
| `--color-bg-thead` | #fafafa | 表头底色 |
| `--color-bg-disabled` | #f5f5f5 | 禁用底色 |
| `--color-bg-code` | #f6f8fa | 代码块底 |
| `--color-bg-input` | #ffffff | 输入框底 |
| `--color-bg-topbar` | #ffffff | 顶栏底 |
| `--color-bg-subtle` | #f8f9fa | 次级面板/BS gray-100 |
| `--color-bg-muted` | #e9ecef | BS gray-200(分隔/灰条) |
| `--color-bg-soft` | #f0f2f5 | 软灰背景 |

### 文字
| 变量 | 浅色 | 用途 |
|------|------|------|
| `--color-text` / `--color-text-primary` | #303133 | 主文字 |
| `--color-text-secondary` | #606266 | 次级文字 |
| `--color-text-muted` | #909399 | 辅助/灰文字 |
| `--color-text-hint` | #a0a0a0 | 占位/提示 |
| `--color-text-label` | #424242 | 表单 label |
| `--color-text-disabled` | #c0c4cc | 禁用文字 |
| `--color-text-code` | #d6336c | 代码字色 |
| `--color-text-strong` | #212529 | 强调正文 |
| `--color-text-inverse` | #ffffff | 反白(深底文字) |

### 边框
| 变量 | 浅色 | 用途 |
|------|------|------|
| `--color-border` | #dcdfe6 | 主边框 |
| `--color-border-light` | #f0f0f0 | 极浅分隔 |
| `--color-border-input` | #d1d1d1 | 输入框边框 |
| `--color-border-strong` | #d9d9d9 | 较深边框 |
| `--color-border-divider` | #ebeef5 | Element 分隔 |
| `--color-border-bs` | #dee2e6 | BS 边框 |
| `--color-border-form` | #ced4da | BS form 边框 |
| `--color-border-focus` | #0078d4 | 聚焦边色 |

### 尺寸、排版与交互

共享组件不得分别维护自己的基础密度和交互节奏，应从以下全局令牌取值：

| 令牌族 | 用途 |
|------|------|
| `--space-xs` ～ `--space-2xl` | 组件间距、内边距和页面区块间距 |
| `--font-size-*` / `--line-height-*` | 正文、控件、辅助文字、标题和行高 |
| `--control-height-*` | 表单控件、菜单控件及触控控件高度 |
| `--icon-size-*` / `--icon-button-size` | 图标和图标按钮尺寸 |
| `--shadow-card` / `--shadow-overlay` / `--shadow-focus-*` | 内容面、浮层及聚焦反馈 |
| `--motion-duration-*` / `--motion-ease-*` | hover、展开和页面外壳动效 |
| `--z-*` | 普通抬升、控件、粘性区、浮层和消息层级 |

优先修改语义令牌来调整一类组件。特殊业务图形可以使用尺寸令牌，但需要保持局部作用域，不能反向覆盖 Base 组件。

### 圆角

圆角分为“语义令牌”和“尺寸令牌”。共享组件优先使用语义令牌，只有插图、代码块等特殊视觉元素才使用尺寸令牌。所有令牌在 `_tokens.scss` 定义并由 `_theme-vars.scss` 暴露。

| 令牌 | 默认值 | 用途 |
|------|------|------|
| `--radius-control` | `0` | 按钮、输入框、选择器、分页和导航操作 |
| `--radius-surface` | `0` | 卡片、面板、表格容器和内容区块 |
| `--radius-overlay` | `0` | 弹框、下拉菜单、气泡和提示层 |
| `--radius-status` | `0` | Badge、状态标签和胶囊式状态容器 |
| `--radius-track` | `0` | 进度条和轨道 |
| `--radius-avatar` | `0` | 用户头像和品牌头像容器 |
| `--radius-circle` / `--radius-pill` | `50%` / `999px` | 必须保持圆形或胶囊形的特殊元素 |
| `--radius-xs` ～ `--radius-xl` | `2px` ～ `12px` | 有明确尺寸需求的特殊视觉元素 |

修改某一类组件的全局圆角时，只调整 `_tokens.scss` 中对应的 `$radius-*` 语义映射；页面样式不得重新写死圆角值。

### 品牌 / 强调
| 变量 | 浅色 | 用途 |
|------|------|------|
| `--color-brand` | #067a7a | 品牌主色(青绿) |
| `--color-brand-hover` | #0a9a9a | 品牌 hover |
| `--color-brand-dark` | #065f5f | 品牌深 |
| `--color-brand-soft` | #edf7f6 | 品牌淡底 |
| `--color-brand-tint` | #e6f7f7 | 品牌浅染 |
| `--color-brand-bg` | #ebf1f1 | 品牌底色 |
| `--color-brand-disabled` | #5facac | 品牌禁用 |
| `--color-accent` | #0078d4 | MS Fluent 蓝 |
| `--color-accent-hover` | #106ebe | accent hover |
| `--color-accent-bg` | #eff6fc | accent 浅底 |
| `--color-accent-blue` | #409eff | Element primary |
| `--color-bs-primary` | #0d6efd | BS primary |
| `--color-bs-primary-hover` | #0b5ed7 | |
| `--color-bs-info` | #11cdef | BS info |

### 状态(success/warning/error/info)
| 变量 | 浅色 | 用途 |
|------|------|------|
| `--color-success` | #67c23a | 成功(Element) |
| `--color-success-strong` | #13a10e | 成功(深) |
| `--color-success-bg` | #f0f9eb | 成功底 |
| `--color-success-bg-strong` | #dff6dd | 成功底(强) |
| `--color-success-text` | #0e700e | 成功文字 |
| `--color-success-bdr` | #9ee09b | 成功边 |
| `--color-warning` | #e6a23c | 警告(Element) |
| `--color-warning-strong` | #ffc107 | 警告(BS) |
| `--color-warning-bg` | #fdf6ec | 警告底 |
| `--color-warning-bg-strong` | #fff1cc | 警告底(强) |
| `--color-warning-text` | #8a6914 | 警告文字 |
| `--color-warning-bdr` | #f5d58a | 警告边 |
| `--color-error` | #f56c6c | 错误(Element) |
| `--color-error-strong` | #dc3545 | 错误(BS) |
| `--color-error-bg` | #fef0f0 | 错误底 |
| `--color-error-bg-strong` | #fde7e9 | 错误底(强) |
| `--color-error-text` | #b10e1c | 错误文字 |
| `--color-error-bdr` | #f5b0b5 | 错误边 |
| `--color-info` | #5dade2 | 信息蓝 |
| `--color-info-bg` | #ecf5ff | 信息底 |

### 阴影
| 变量 | 浅色 |
|------|------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(15,23,42,0.10)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` |
| `--shadow-pop` | `0 8px 24px rgba(0,0,0,0.15)` |
| `--shadow-card` | `0 2px 4px rgba(0,0,0,0.04)` |
| `--shadow-inset` | inset 软阴影 |
| `--shadow-focus-brand` | 品牌色聚焦光圈 |
| `--shadow-focus-blue` | 蓝色聚焦光圈 |
| `--shadow-focus-bs` | BS primary 聚焦光圈 |

### 滚动条
- `--color-scrollbar-thumb`
- `--color-scrollbar-track`

---

## hex → CSS 变量映射表

P2/P3 替换时按下表查找。**没列出的低频颜色**(出现 1~2 次)按场景归到最近语义,
列在右侧"备注"。如果同一 hex 在不同场景含义不一致,优先用最高频用法,其它语义
保留为别名(可在 _tokens.scss 中加一对 SCSS 变量,然后在 _theme-vars.scss 暴露
独立 CSS 变量)。

### 高频(>=10 次)

| Hex | 出现次数 | 替换为 | 场景 |
|-----|---------|--------|------|
| `#067a7a` | 66 | `var(--color-brand)` | 品牌主色 |
| `#fff` / `#ffffff` | 60 + 11 | `var(--color-bg-card)` 或 `var(--color-text-inverse)` | 卡片底/反白文字,看上下文 |
| `#909399` | 47 | `var(--color-text-muted)` | 辅助文字 |
| `#f8f9fa` / `#F8F9FA` | 37 + 3 | `var(--color-bg-subtle)` | BS gray-100 次级面板 |
| `#e9ecef` / `#E9ECEF` | 34 + 3 | `var(--color-bg-muted)` | BS gray-200 |
| `#f5f7fa` | 30 | `var(--color-bg-page)` | 页面背景 |
| `#495057` | 26 | `var(--color-text-secondary)` | BS gray-700 ≈ 次级文字 |
| `#303133` | 26 | `var(--color-text-primary)` | 主文字(Element) |
| `#606266` | 23 | `var(--color-text-secondary)` | 次级文字(Element) |
| `#67C23A` / `#67c23a` | 18 + 2 | `var(--color-success)` | 成功(Element) |
| `#ebeef5` / `#EBEEF5` | 17 + 4 | `var(--color-border-divider)` | Element 分隔 |
| `#F56C6C` / `#f56c6c` | 15 + 2 | `var(--color-error)` | 错误(Element) |
| `#409EFF` / `#409eff` | 14 + 7 | `var(--color-accent-blue)` | Element primary |
| `#E6A23C` / `#e6a23c` | 13 + 1 | `var(--color-warning)` | 警告(Element) |
| `#dee2e6` | 11 | `var(--color-border-bs)` | BS 边框 |
| `#667eea` | 11 | `var(--color-purple-667eea)`(渐变保留) | 渐变背景紫 |
| `#0a9a9a` | 11 | `var(--color-brand-hover)` | 品牌 hover |
| `#6c757d` | 10 | `var(--color-text-secondary)` 或 `var(--color-text-strong)`,看是文字还是边框 | BS gray-600 |

### 中频(3~9 次)

| Hex | 出现次数 | 替换为 | 场景 |
|-----|---------|--------|------|
| `#eee` | 8 | `var(--color-border-light)` 或 `var(--color-bg-muted)`,看用途 | sidebar bg / 边框 |
| `#2d3748` | 8 | `var(--color-text-strong)` 或 `var(--color-text-secondary)` 自定别名 | tailwind 灰 |
| `#dc3545` | 7 | `var(--color-error-strong)` | BS danger |
| `#764ba2` | 7 | 渐变保留 hex | 渐变紫 |
| `#0d6efd` | 7 | `var(--color-bs-primary)` | BS primary |
| `#ced4da` | 6 | `var(--color-border-form)` | BS form 边框 |
| `#fafafa` | 5 | `var(--color-bg-thead)` | 表头底 |
| `#d9d9d9` | 5 | `var(--color-border-strong)` | 较深边框 |
| `#c0c4cc` | 5 | `var(--color-text-disabled)` | 禁用文字 |
| `#adb5bd` | 5 | `var(--color-border-bs)` 或自定 | BS gray-500 |
| `#718096` | 5 | `var(--color-text-secondary)` | chakra 灰 |
| `#f0f2f5` | 4 | `var(--color-bg-soft)` | 软灰 |
| `#243444` | 4 | 自定别名 / `var(--color-text-strong)` | 深蓝灰文字 |
| `#dcdfe6` | 3 | `var(--color-border)` | 主边框 |
| `#212529` | 3 | `var(--color-text-strong)` | 强调正文 |
| `#f5f5f5` | 3 | `var(--color-bg-disabled)` | 禁用底 |
| `#fafbfc`/`#fbfcfd`/`#f4f6f9` | 各 1~2 | `var(--color-bg-subtle)` 或 `var(--color-bg-page)` | 极浅灰底 |

### 低频/非中性色 (<= 2 次)

低频色按以下规则:

- **状态色变体**(`#85ce61`/`#f78c8c` 等):若是 Element 状态色族,映射到 `var(--color-success|warning|error)`;
- **特定语义色**(警告底 `#fff5f5` / 信息底 `#f5f9ff` / 成功 `#d1e7dd` 等):映射到对应 `--color-{state}-bg|text|bdr`;
- **极少出现的渐变 / 装饰色**(`#f093fb`/`#4facfe`/`#fee140`/`#11998e` 等):**保留 hex**(渐变背景里的连续色不强求 token 化);
- **暗色模式色板已被 _tokens.scss 收录**(`#1e1e1e`/`#2d2d2d`/`#3c3c3c`...):它们出现在 .vue 里通常是写死的暗色 hover/border,P2/P3 直接换成 `var(--color-bg-card|input|hover|...)` 即可。

### 特殊 rgba 映射

| rgba | 出现 | 替换为 |
|------|-----|--------|
| `rgba(0, 0, 0, 0.08)` | 14 | `var(--shadow-md)` 或 `var(--shadow-card)` 内部已含 |
| `rgba(255, 255, 255, 0.25)` | 13 | hover 高亮叠层,保留(白色叠加无 token 化必要) |
| `rgba(0, 0, 0, 0.15)` | 11 | `var(--shadow-pop)` 内部已含 |
| `rgba(6,122,122,0.1)` 等品牌透明 | 8+ | 用 `--color-brand` 配 `color-mix(in srgb, var(--color-brand) 10%, transparent)` |
| `rgba(75, 160, 232, 0.25)` | 1+ | `var(--shadow-focus-blue)` |
| `rgba(13, 110, 253, 0.2)` | 2 | `var(--shadow-focus-bs)` |
| `rgba(0, 123, 255, 0.5)` 等 | 各 1 | 用现 `--shadow-focus-*` 或就地保留 |

> P2/P3 替换 rgba 时优先看是不是某个阴影/聚焦光圈;否则用 CSS `color-mix()` 把
> 透明度从语义变量派生(modern browser 普及,允许直接用)。

---

## 现有 `--tt-*` 兼容层

[dark-theme.scss](./dark-theme.scss) 顶部把所有 `--tt-*` alias 到新 `--color-*`,
让 P2/P3 期间还在用 `var(--tt-*)` 的 .vue **不会立即坏掉**。

P2/P3 替换原则:

| 旧 | 新 |
|---|---|
| `var(--tt-bg)` | `var(--color-bg-page)` |
| `var(--tt-bg-card)` | `var(--color-bg-card)` |
| `var(--tt-bg-hover)` | `var(--color-bg-hover)` |
| `var(--tt-bg-thead)` | `var(--color-bg-thead)` |
| `var(--tt-bg-disabled)` | `var(--color-bg-disabled)` |
| `var(--tt-bg-input)` | `var(--color-bg-input)` |
| `var(--tt-bg-topbar)` | `var(--color-bg-topbar)` |
| `var(--tt-bg-code)` | `var(--color-bg-code)` |
| `var(--tt-text)` | `var(--color-text)` |
| `var(--tt-text-sec)` | `var(--color-text-secondary)` |
| `var(--tt-text-hint)` | `var(--color-text-hint)` |
| `var(--tt-text-label)` | `var(--color-text-label)` |
| `var(--tt-text-code)` | `var(--color-text-code)` |
| `var(--tt-border)` | `var(--color-border)` |
| `var(--tt-border-light)` | `var(--color-border-light)` |
| `var(--tt-border-input)` | `var(--color-border-input)` |
| `var(--tt-border-focus)` | `var(--color-border-focus)` |
| `var(--tt-accent)` | `var(--color-accent)` |
| `var(--tt-accent-hover)` | `var(--color-accent-hover)` |
| `var(--tt-accent-bg)` | `var(--color-accent-bg)` |
| `var(--tt-success)` | `var(--color-success-strong)` |
| `var(--tt-green-bg)` | `var(--color-success-bg-strong)` |
| `var(--tt-green-text)` | `var(--color-success-text)` |
| `var(--tt-green-bdr)` | `var(--color-success-bdr)` |
| `var(--tt-red-bg)` | `var(--color-error-bg-strong)` |
| `var(--tt-red-text)` | `var(--color-error-text)` |
| `var(--tt-red-bdr)` | `var(--color-error-bdr)` |
| `var(--tt-warn-bg)` | `var(--color-warning-bg-strong)` |
| `var(--tt-warn-text)` | `var(--color-warning-text)` |
| `var(--tt-warn-bdr)` | `var(--color-warning-bdr)` |
| `var(--tt-shadow)` | `var(--shadow-card)` |
| `var(--tt-shadow-md)` | `var(--shadow-md)` |
| `var(--tt-shadow-pop)` | `var(--shadow-lg)` |
| `var(--tt-scrollbar-thumb)` | `var(--color-scrollbar-thumb)` |
| `var(--tt-scrollbar-track)` | `var(--color-scrollbar-track)` |

兼容层会一直保留到 P3 结束;**P4 阶段确认全部 .vue 不再引用 `--tt-*` 后,
再删除**。

---

## stylelint 用法(P4 产出)

仓库根目录 [.stylelintrc.json](../../../.stylelintrc.json) 配置了样式 lint。

```bash
# 检查所有 .vue / .scss / .css 文件
npm run lint:style

# 自动修复(注:hex/named color 这类 warning 不会被 --fix 改写)
npm run lint:style:fix
```

**两条自定义规则**(都是 `severity: warning`,**不阻塞 build**):

| 规则 | 报警条件 | 例外目录 |
|------|----------|----------|
| `color-no-hex` | 出现 `#fff` / `#067a7a` 等 hex 字面量 | `_tokens.scss` / `_theme-vars.scss` / `dark-theme.scss` / `_bootstrap-theme.scss` |
| `color-named` | 出现 `white` / `black` 等 CSS 命名色 | 同上,且 `inside-function` 内忽略 |

例外目录是因为它们本身就是**色板/主题定义层**,必须直接写 hex。其它任何文件
(.vue / pages.scss / components.scss 等)都应走 `var(--color-xxx)`,详见
[使用规范](#使用规范写-vue-样式时必读)。

构建流程**不会**调 stylelint,也不会因为 hex/named color warning 失败。
开发者需要自查时手动跑 `npm run lint:style`。

---

## BootstrapVue 主题对接策略(P4 产出)

[_bootstrap-theme.scss](./_bootstrap-theme.scss) 实现了 BootstrapVue 在深色
模式下的视觉对接。本节解释**为什么选保守对接,而非重写 BS SCSS 变量**。

### 两种可选方案对比

| 方案 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| 方案 A:重写 BS SCSS 变量 | 在 `@import "bootstrap"` 之前 `$body-bg`、`$card-bg` 等覆盖为深色 | 一处改动覆盖所有组件 | 触发 BS **整个 SCSS 重编译**;Bootstrap 4.6 的间距/断点/阴影 mixin 都依赖 `$body-bg` 链路,改一个变量可能引发**几十处布局微调**;且无法实现"运行时切深浅" |
| 方案 B(本项目采用):**保守 utility class 覆盖** | 不动 BS 编译产物,只在 `[data-theme="dark"]` 下覆盖 utility class / 组件 class 的颜色相关属性 | 浅色完全保持 BS 原状(0 风险);切深浅纯属 CSS 变量层面,无需重编译;新增覆盖点很轻量 | 需要逐个补深色 override(本项目已覆盖 16 类常用组件) |

### _bootstrap-theme.scss 的覆盖范围

只在 `[data-theme="dark"]` 选择器下生效,共 16 组覆盖:

1. body / utility class:`.bg-white` / `.bg-light` / `.text-dark` / `.text-muted` / `.border*`
2. 卡片:`.card` / `.card-header` / `.card-footer`
3. 表格:`.table` / `.b-table`(含 `thead` / `tbody` / `table-hover` / `table-striped`)
4. 表单:`.form-control` / `.custom-select` / `.input-group-text`(含 focus/disabled/placeholder)
5. 按钮:`.btn-light` / `.btn-outline-light`
6. dropdown:`.dropdown-menu` / `.dropdown-item` / `.dropdown-divider`
7. modal / popover / toast / tooltip
8. nav-tabs:`.nav-tabs` 及 `.nav-link.active`
9. 分页:`.pagination .page-link`
10. alert / breadcrumb / hr
11. code / pre / kbd
12. webkit 滚动条

所有颜色都引用 [_theme-vars.scss](./_theme-vars.scss) 的 CSS 变量
(`--color-bg-card` / `--color-text` / `--color-border-light` 等),
**与 [.vue 内部颜色规范完全一致**。

> **不要** 在 .vue 里再写 `[data-theme="dark"] .form-control { ... }` —— 这里
> 已经全局接管。如果某个 BS 组件深色下样式不对,先回到 _bootstrap-theme.scss
> 补/改,而不是在 .vue 里 patch。
