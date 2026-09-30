# i18n 翻译外包工作说明书 (SOW)

> 最后更新:2026-05-09
>
> 文档类型:Statement of Work,翻译外包甲方需求与验收依据
>
> 适用项目:iot_server 前端 (`ito_admin_vue2`,Vue 2 + BootstrapVue)

---

## 目录

- [项目状态更新(2026-05)](#项目状态更新2026-05)
- [一、项目背景](#一项目背景)
- [二、范围](#二范围)
- [三、目标语言](#三目标语言)
- [四、交付物](#四交付物)
- [五、质量要求](#五质量要求)
- [六、流程与里程碑](#六流程与里程碑)
- [七、预算参考](#七预算参考)
- [八、术语对照表](#八术语对照表)
- [九、命名规范与样板示范](#九命名规范与样板示范)
- [十、交付时间表(模板)](#十交付时间表模板)
- [十一、付款方式](#十一付款方式)
- [十二、验收与售后](#十二验收与售后)
- [十三、双方联系人](#十三双方联系人)

---

## 项目状态更新(2026-05)

> 本 SOW 起草时(2026-04-29)前端文案尚为"全量中文硬编码",但截至 2026-05-09(commit `6e51a1f`)甲方内部已**自行完成主干 i18n 改造**,实际范围与本 SOW 第一稿描述存在差异:
>
> - **8 种语言 locale JSON 已建立**(`zh-CN` / `zh-TW` / `en-US` / `de-DE` / `ja-JP` / `fr-FR` / `es-ES` / `ko-KR`),结构一致(每份约 4600 行)
> - **已 i18n 化**:[src/router/index.js](../src/router/index.js) 全部路由 meta(49 个 title + 18 个 docMeta + 5 个 section)、[src/services/ui/confirm.js](../src/services/ui/confirm.js) 默认按钮、[src/api/http.js](../src/api/http.js) 401 / 必改密 toast、[src/components/AppBreadcrumb.vue](../src/components/AppBreadcrumb.vue) / [DocPage.vue](../src/views/DocPage.vue) / [Sidebar.vue](../src/components/Sidebar.vue)、[src/views/Login.vue](../src/views/Login.vue)
> - **未 i18n 化(待外包补)**:60+ 个业务 view 内部的表单 label / 表格列头 / 模块内 toast / 校验文案;非中文语言里的 `route.*` 等 namespace 当前**直接写中文占位**,需要翻译公司逐 key 覆盖
>
> **对外包工作的影响**:
> - 第一阶段"抽离 + zh-CN 母版整理" 已部分完成,翻译公司可直接基于现有 `zh-CN.json`(60+ namespace、约 5000 条 key)对照同结构的其它 7 份 JSON 翻译,**无需再做代码扫描和占位回填**
> - 真实工作量从 SOW 第一稿估计的"21000 字 + 70 个 .vue 改造"调整为"现有 8 份 JSON 中非中文条目的内容覆盖 + 业务 view 内部的二次抽离"
> - 报价与里程碑请按调整后的范围重谈
>
> 下文保留原始 SOW 完整内容作为历史参考与术语 / 验收依据。

---

## 一、项目背景

`iot_server_backend` 是一套面向静音仓(Office Pods)厂家与海外经销商的设备管理后台,基于 Vue 2 + BootstrapVue 实现,功能涵盖公司多租户、主机/节点/单元管理、型号库、文件管理、审计日志、配网与 OTA 升级等。SOW 起草时所有 UI 文案均以**简体中文硬编码**(2026-05 起主干已 i18n 化,详见上方"项目状态更新"),无法满足海外厂家(英语、潜在的日/韩/欧语言)的部署需求。

为了支持产品出海与品牌定制(白标),前端已完成 i18n 框架接入(`vue-i18n` + `src/locales/`),并以 `src/views/Login.vue` 作为**完整改造样板**。本 SOW 面向翻译公司,委托完成"全量文案抽离 → 中文母版整理 → 多语种翻译 → 回填代码 → 联调验证"五个阶段的工作。

---

## 二、范围

### 包含

| 路径 | 说明 |
|------|------|
| `src/views/**/*.vue` | 所有业务视图(约 60+ 个 .vue) |
| `src/components/**/*.vue` | 所有跨页面复用组件 |
| `src/layouts/**/*.vue` | 主布局 `AdminLayout.vue` 等 |
| `src/mixins/**/*.js` | mixin 中的提示/校验文案 |
| `src/services/ui/**/*.js` | toast / dialog 相关默认文案 |
| `src/api/http.js` | axios 拦截器中的错误兜底文案(如"网络错误") |
| `src/router/index.js` | 路由 `meta.title` 字段 |

### 不包含

- `console.log` / `console.warn` 等调试日志(保留中文,便于排查)
- 代码注释(`//`、`/* */`)
- URL、字段名、API 路径(如 `company_id`、`/api/v1/hosts`)
- 后端返回的业务数据本身(由后端国际化方案处理,本 SOW 不覆盖)
- `public/config.json`、构建脚本、deploy 脚本中的文案
- 错误码 → 文案映射(已存放在 `src/locales/*.json` 的 `errors` 段,翻译公司需保持现有 key 命名)

### 数据估算

| 指标 | 数值 | 测量方法 |
|------|------|----------|
| 中文字数 | 约 21000 字 | `grep -roh '[一-龥]\+' src/views src/components src/layouts \| awk '{n+=length($0)} END {print n/3}'` |
| 预计 i18n key 数 | 800–1500 条 | 按"一段独立文案=一个 key"估算 |
| 涉及 .vue 文件 | 约 70 个 | `find src -name '*.vue' \| wc -l` |
| 涉及 .js 文件 | 约 10 个 | mixins / services / http.js / router |

---

## 三、目标语言

### 第一阶段(P0,必做)

| 语言代码 | 语言 | 备注 |
|----------|------|------|
| `zh-CN` | 简体中文 | 母版语,从代码抽出 |
| `en-US` | 英文(美式) | 海外通用,先行交付 |

### 第二阶段(P1,按订单驱动追加)

| 语言代码 | 语言 | 触发条件 |
|----------|------|----------|
| `zh-TW` | 繁体中文 | 港澳台经销商接入 |
| `ja-JP` | 日语 | 日本市场订单 |
| `ko-KR` | 韩语 | 韩国市场订单 |
| `de-DE` | 德语 | 德语区订单 |
| `fr-FR` | 法语 | 法语区订单 |
| `es-ES` | 西班牙语(欧版) | 西语区订单 |

报价时按 `[单价/字 × N 种语言]` 阶梯报,P1 不要求一次到位,但**抽离与回填只做一次**,新增语种只翻译 JSON。

---

## 四、交付物

| # | 交付物 | 验收要点 |
|---|--------|----------|
| D1 | `src/locales/zh-CN.json`(完整) | 与代码中 key 一对一,无遗漏、无多余 |
| D2 | `src/locales/en-US.json`(完整) | 与 zh-CN.json 结构一致,所有 key 都有翻译 |
| D3 | 修改后的 `.vue` / `.js` 文件 | 模板文本与字符串属性已替换为 `$t('...')`;script 中改为 `this.$t('...')` |
| D4 | 翻译说明文档 `docs/i18n-翻译说明.md` | 术语对照表使用情况、特殊处理、待法务/品牌确认的条目清单 |
| D5 | 抽离工具或脚本(可选) | 若使用了自动抽取脚本,提交脚本与使用说明,便于后续增量维护 |
| D6 | 联调测试报告 | 切换 locale 后逐页截图(每页 zh/en 各一张,关键弹窗各一张) |

所有代码以 git patch 或独立分支(`feature/i18n-full`)形式提交,**不要直接合并 main 分支**,由甲方 review 后合并到 `dev`。

---

## 五、质量要求

1. **术语统一**:严格按 [术语对照表](#八术语对照表) 翻译,无歧义术语保持单一译法。
2. **风格简洁**:
   - 按钮文案 ≤ 3 个单词(`Sign in` / `Save` / `Add Host`,不要 `Submit your form`)
   - 标题用名词短语,操作用动词起头(`Add Host`,不是 `Host Adding`)
3. **占位符有价值**:
   - `请输入邮箱` → `you@company.com`(给示例,不是 `Please enter email`)
   - `请输入主机名` → `e.g. host-bj-01`
4. **错误提示友好**:不暴露 traceback、字段名、SQL,改用业务语义。
5. **复数与变量插值**:涉及数量的文案用 vue-i18n 的 `{count}` 插值与 `pluralization`,不要手工拼字符串。
6. **大小写**:英文遵循 **Sentence case**(只首字母大写,如 `Add new host`),按钮可用 **Title Case**(`Add New Host`),全文统一一种风格。
7. **必须母语者校对**:机翻(Google / DeepL / GPT 直出)不接受;成稿前必须由英语母语者过一遍,术语错误、惯用语不自然均按 bug 处理。
8. **不破坏 HTML 结构**:回填时严格只改纯文本节点和字符串属性值,不增删 DOM 标签、不改 class/style。已在 `src/views/Login.vue` 给出样板示范。

---

## 六、流程与里程碑

| 阶段 | 工作内容 | 工期 | 责任方 |
|------|----------|------|--------|
| 1. 抽离 | 扫描所有 .vue/.js,把硬编码中文挑出来,按命名规范生成 `zh-CN.json` 草稿,同时把代码中替换为 `$t('key')` 占位 | 2–3 天 | 翻译公司 |
| 2. 中文复核 | 甲方校对 `zh-CN.json` key 命名和文案是否合理,确认终稿 | 1 天 | 甲方 |
| 3. 翻译 | 翻译公司根据终稿 `zh-CN.json` 翻译成 `en-US.json` 等;同时补充术语对照表 | 5–7 天 / 语种 | 翻译公司 |
| 4. 回填 | 翻译公司将抽离阶段的占位 `$t('key')` 在所有 .vue/.js 中确认无遗漏,提交 PR | 1–2 天 | 翻译公司 |
| 5. 联调测试 | 切换 locale 跑全功能,截图归档,标记 bug | 1–2 天 | 双方 |

总工期(含 en-US):**约 12–16 个工作日**。

---

## 七、预算参考

| 项目 | 单价 | 估算 | 小计 |
|------|------|------|------|
| 抽离 + 回填工时(只做一次) | 800–1200 元/人天 × 4–5 天 | — | ¥3,500 – ¥6,000 |
| 中文母版整理 | 含在抽离阶段 | — | — |
| en-US 翻译 + 母语校对 | ¥2.5–3.0 元/字 | 21000 字 | ¥52,500 – ¥63,000 |
| **首语种总计(en-US)** | — | — | **¥56,000 – ¥69,000** |
| 后续每追加一个语种 | ¥2.0–4.0 元/字(无需再抽离) | 21000 字 | ¥42,000 – ¥84,000 |

> 注:以上为参考价位。实际报价请翻译公司根据自身资源结构提供 BOQ(分项报价单)。甲方接受按 [抽离/翻译/回填] 三段式分别报价。

---

## 八、术语对照表

> 这是项目最关键的部分,翻译公司须遵守。如发现遗漏,请提交补充清单由甲方确认后纳入。

| 中文 | English | 说明 |
|------|---------|------|
| 公司 | Company | 多租户主体 |
| 厂家 | Manufacturer | 我们直接客户(静音仓制造商) |
| 经销商 | Dealer / Distributor | 厂家下游 |
| 主机 | Host | 控制器物理机(ESP32-P4 + C6) |
| 节点 | Node | CAN 总线下挂的设备(C3) |
| 单元 | Unit | 静音仓单个仓位(旧称 Pod,2026-04 起统一改 Unit) |
| 单元型号 | Unit Model | 静音仓型号 |
| 主机型号 | Host Model | 控制器型号(HN Model = Host Node Model) |
| 主机型号属性 | HN Model Attribute | 控制器型号的可控参数(LED、风扇等) |
| 主机-节点绑定 | HN Binding | 主机和节点的关联关系 |
| 仪表盘 | Dashboard | — |
| 审计日志 | Audit Log | — |
| 文件管理 | File Manager | — |
| 公司模板 | Company Template | 自定义登录页/品牌包 |
| 行政区划 | Region / Administrative Division | 省/市/区/县 |
| 角色 | Role | RBAC 角色 |
| 权限 | Permission | RBAC 权限点 |
| 数据范围 | Data Scope | 行级权限(本公司/全部) |
| 一机一密 | Per-device Credential | 设备身份方案(每台主机独立密钥) |
| 配网 | Provisioning | 设备首次联网(BLE 或 SmartConfig) |
| OTA 升级 | OTA Update / Firmware Update | — |
| 在线 / 离线 | Online / Offline | 设备状态 |
| 上线 / 下线 | Connected / Disconnected | 事件动词 |
| 静音仓 | (品牌词,**不翻**) | Manufacturer's product brand,如出现可音译 "Quiet Pod" 但默认保留中文或品牌名 |
| 厂家 A / 厂家 B | Manufacturer A / Manufacturer B | 测试样例不翻 |
| 录入 | Add / Register | 视上下文,新增表单用 Add,设备首次入库用 Register |
| 解绑 | Unbind | 主机-节点关系断开 |

> 翻译公司可在交付物 D4 中补充。

---

## 九、命名规范与样板示范

### Key 命名规范

- 全部小写 + 下划线,层级用 `.` 分隔
- 按业务模块组织顶级 namespace:`auth`、`host`、`unit`、`company`、`audit`、`common`、`nav`、`errors` 等
- 同一模块内,按 `[页面/弹窗].[元素类型].[名称]` 三级展开,例如:
  - `host.list.column.name` (主机列表第 X 列表头)
  - `host.detail.btn.delete` (主机详情删除按钮)
  - `host.create.placeholder.host_name` (创建主机表单的输入框 placeholder)
  - `host.toast.create_success` (创建成功的 toast)
- 跨页面共用文案放 `common.*`(如 `common.save` / `common.cancel`)

### 样板文件

参考 [`src/views/Login.vue`](../src/views/Login.vue) 与 [`src/locales/zh-CN.json`](../src/locales/zh-CN.json) 中 `auth.login_page.*` 段:已完成完整改造,翻译公司可直接对照学习。

样板覆盖:

- 模板纯文本节点 → `{{ $t('key') }}`
- 字符串属性 → `:placeholder="$t('key')"` / `:label="$t('key')"`
- 带变量插值 → `$t('key', { slug })`
- script 中 toast/校验文案 → `this.$t('key')`
- 错误兜底 → `error.message || this.$t('key')`

样板不动:HTML 结构、`class`、`<style>` 段、注释。

---

## 十、交付时间表(模板)

> 翻译公司请按以下表格填写实际日期,作为合同附件。

| 里程碑 | 计划日期 | 实际日期 | 责任方 | 备注 |
|--------|----------|----------|--------|------|
| 合同签署、kick-off 会议 | T+0 | | 双方 | |
| D1/D3 抽离草稿提交 | T+3 | | 翻译公司 | zh-CN.json + 占位 PR |
| 甲方中文复核反馈 | T+4 | | 甲方 | |
| zh-CN 终稿冻结 | T+5 | | 双方 | |
| en-US 翻译初稿 | T+10 | | 翻译公司 | |
| en-US 母语校对完成 | T+12 | | 翻译公司 | |
| 回填 PR 提交 | T+13 | | 翻译公司 | |
| 联调测试 | T+15 | | 双方 | |
| 验收交付 | T+16 | | 双方 | |

---

## 十一、付款方式

参照行业惯例 30% / 40% / 30% 三阶段:

| 阶段 | 比例 | 触发条件 |
|------|------|----------|
| 预付款 | 30% | 合同签署后 7 个工作日内 |
| 中期款 | 40% | D1 + D3(抽离 + 占位 PR)通过甲方复核 |
| 尾款 | 30% | D2 + D4 + D6 验收通过 |

发票:增值税专用发票或普票(双方约定)。
币种:人民币,境外结算另议。

---

## 十二、验收与售后

### 验收标准

1. **完整性**:`grep -roh '[一-龥]' src/views src/components src/layouts` 在预期非翻译范围(注释、log)外不应再有中文字符
2. **结构一致**:`zh-CN.json` 与 `en-US.json` key 集合完全一致,可用 `diff <(jq -r 'paths(scalars) | join(".")' zh-CN.json | sort) <(jq -r 'paths(scalars) | join(".")' en-US.json | sort)` 验证
3. **构建通过**:`npm run build` 无 missing key 警告(开发环境警告允许,生产已被 `silentTranslationWarn` 抑制,但联调期需要把它打开核对)
4. **回归无样式偏差**:每页 zh/en 截图对比,布局位置、按钮宽度无明显错位
5. **lint 通过**:`npm run lint` 不引入新 error

### 售后

交付后 **30 个自然日**内,翻译公司负责修复:

- 漏译、错译
- key 命名不规范导致的冲突
- 因翻译过长导致 UI 错位的文案重写(布局问题不在售后范围,但可付费追加 UI 适配)

30 天后追加修改按工时计费。

---

## 十三、双方联系人

| 角色 | 单位 | 联系人 | 邮箱/电话 |
|------|------|--------|-----------|
| 项目经理(甲方) | (待填) | (待填) | (待填) |
| 技术对接(甲方) | (待填) | (待填) | (待填) |
| 项目经理(乙方) | (待填) | (待填) | (待填) |
| 翻译负责人(乙方) | (待填) | (待填) | (待填) |

---

## 附录 A:i18n 框架快速参考

- vue-i18n 2.x(随 Vue 2 项目)
- 入口:`src/locales/index.js`
- 切换语言函数:`setLocale(locale)`,会同步写入 `localStorage` 与 `<html lang>`
- 模板用法:`{{ $t('key') }}` / `:placeholder="$t('key')"`
- script 用法:`this.$t('key', { var: value })`
- 占位符语法:`"company_slug_label": "公司标识：{slug}"` → `$t('...', { slug: 'foo' })`
- 复数:`@:` 引用、`|` 分割,如 `"items": "no items | one item | {count} items"`,vue-i18n 文档自查

## 附录 B:开发自检命令

```bash
# 抽离阶段:统计仍有多少中文未抽
grep -rohE '[一-龥]+' src/views src/components src/layouts \
  --include='*.vue' --include='*.js' \
  | wc -l

# 校验两份 JSON key 完全一致(需要 jq)
diff <(jq -r 'paths(scalars) | join(".")' src/locales/zh-CN.json | sort) \
     <(jq -r 'paths(scalars) | join(".")' src/locales/en-US.json | sort)

# 构建
npm run build

# Lint
npm run lint
```
