<!-- client（客户 = 下级公司）：/client 下级公司管理。数据源 companies，视角为"本公司的下级"。 -->
<!-- Handoff: GET /api/v1/companies 按 token company scope 过滤（本公司下级）；company_code 只读、后端 CO-XXXXXX 生成；国家/地址由 location_id→locations 派生；domain/slogan 为 2026-09-08 目标新增字段。字段权威见 companies.md 目标态。 -->
<!-- Handoff: "联系人"列 = companies.contact_person（公司联系人，可含电话/邮箱），与"公司管理员用户"是两个概念；管理员用户（users role=admin）在新建客户时随即创建，之后在该客户「人员」页维护。 -->
<section class="content-card" aria-labelledby="client-title">
  <header class="content-card__header">
    <div>
      <h2 id="client-title">客户</h2>
      <p>管理本公司的客户。</p>
    </div>
    <button class="button button--secondary button--icon-only" type="button" data-action="open-create-client-dialog" aria-label="新建客户" title="新建客户">
      <svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg>
    </button>
  </header>

  <form class="filter-bar" data-client-filter>
    <label class="search-field">
      <span class="sr-only">搜索客户</span>
      <svg class="app-icon app-icon--fill"><use href="icons.svg#icon-search"></use></svg>
      <input type="search" placeholder="搜索客户名称、编码或联系人" data-client-search>
    </label>
    <label class="select-field">
      <span class="sr-only">客户类型</span>
      <select data-client-role>
        <option value="">全部类型</option>
        <option value="manufacturer">静音仓厂家</option>
        <option value="brand">品牌方</option>
        <option value="channel">渠道 / 分销</option>
        <option value="enduser">最终用户</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
    <label class="select-field">
      <span class="sr-only">状态</span>
      <select data-client-status>
        <option value="">全部状态</option>
        <option value="active" selected>正常</option>
        <option value="inactive">停用</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
  </form>

  <div class="table-scroll">
    <table data-sortable-table>
      <thead><tr>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户名称排序"><span>客户名称</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户编码排序"><span>客户编码</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户类型排序"><span>客户类型</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按联系人排序"><span>联系人</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按地点排序"><span>地点</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按状态排序"><span>状态</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" data-sort-type="date" aria-label="按创建时间排序"><span>创建时间</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th class="table-actions">操作</th>
      </tr></thead>
      <tbody>
        <tr data-client-row data-role="manufacturer" data-status="active" data-search="静音仓厂家 a co-7k2m9p 王勇 wangyong@shenchi.com" data-code="CO-7K2M9P" data-name="深驰静音科技有限公司" data-short-name="静音仓厂家 A" data-roles="静音仓厂家" data-contact="王勇" data-contact-phone="138 0000 1111" data-contact-email="wangyong@shenchi.com" data-location="上海市 · 徐汇区" data-domain="https://pods.dengtec.com/shenchi" data-created="2026-01-18" data-admins="王勇|wangyong@shenchi.com;李明|liming@shenchi.com" data-client-count="8" data-pod-model-count="5" data-pod-count="42">
          <td><strong>静音仓厂家 A</strong><span class="cell-sub">深驰静音科技有限公司</span></td>
          <td class="mono">CO-7K2M9P</td>
          <td><span class="client-roles"><span class="type-badge">静音仓厂家</span></span></td>
          <td>王勇<span class="cell-sub">138 0000 1111</span></td>
          <td>上海市 · 徐汇区</td>
          <td><span class="status status--online">正常</span></td>
          <td><time datetime="2026-01-18">2026-01-18</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-client" title="编辑客户" aria-label="编辑 静音仓厂家 A"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
          </td>
        </tr>
        <tr data-client-row data-role="brand" data-status="active" data-search="品牌方 b co-3qx8rt 刘倩 liuqian@yuexiang.com" data-code="CO-3QX8RT" data-name="悦享品牌管理有限公司" data-short-name="品牌方 B" data-roles="品牌方" data-contact="刘倩" data-contact-phone="139 0000 2222" data-contact-email="liuqian@yuexiang.com" data-location="深圳市 · 南山区" data-domain="https://brandb.dengtec.com" data-created="2026-03-06" data-admins="刘倩|liuqian@yuexiang.com" data-client-count="3" data-pod-model-count="2" data-pod-count="15">
          <td><strong>品牌方 B</strong><span class="cell-sub">悦享品牌管理有限公司</span></td>
          <td class="mono">CO-3QX8RT</td>
          <td><span class="client-roles"><span class="type-badge">品牌方</span></span></td>
          <td>刘倩<span class="cell-sub">139 0000 2222</span></td>
          <td>深圳市 · 南山区</td>
          <td><span class="status status--online">正常</span></td>
          <td><time datetime="2026-03-06">2026-03-06</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-client" title="编辑客户" aria-label="编辑 品牌方 B"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
          </td>
        </tr>
        <tr data-client-row data-role="channel" data-status="active" data-search="渠道商 c co-9f5h2n 赵磊 zhaolei@tonglian.com" data-code="CO-9F5H2N" data-name="通联渠道服务有限公司" data-short-name="渠道商 C" data-roles="渠道 / 分销" data-contact="赵磊" data-contact-phone="137 0000 3333" data-contact-email="zhaolei@tonglian.com" data-location="北京市 · 朝阳区" data-domain="https://pods.dengtec.com/tonglian" data-created="2026-04-11" data-admins="赵磊|zhaolei@tonglian.com" data-client-count="12" data-pod-model-count="1" data-pod-count="6">
          <td><strong>渠道商 C</strong><span class="cell-sub">通联渠道服务有限公司</span></td>
          <td class="mono">CO-9F5H2N</td>
          <td><span class="client-roles"><span class="type-badge">渠道 / 分销</span></span></td>
          <td>赵磊<span class="cell-sub">137 0000 3333</span></td>
          <td>北京市 · 朝阳区</td>
          <td><span class="status status--online">正常</span></td>
          <td><time datetime="2026-04-11">2026-04-11</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-client" title="编辑客户" aria-label="编辑 渠道商 C"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
          </td>
        </tr>
        <tr data-client-row data-role="enduser" data-status="inactive" data-search="最终客户 d co-k7p4w2 孙敏 sunmin@xihu.com" data-code="CO-K7P4W2" data-name="西湖会议服务中心" data-short-name="最终客户 D" data-roles="最终用户" data-contact="孙敏" data-contact-phone="136 0000 4444" data-contact-email="sunmin@xihu.com" data-location="杭州市 · 西湖区" data-domain="—" data-created="2026-05-22" data-admins="" data-client-count="0" data-pod-model-count="1" data-pod-count="2">
          <td><strong>最终客户 D</strong><span class="cell-sub">西湖会议服务中心</span></td>
          <td class="mono">CO-K7P4W2</td>
          <td><span class="client-roles"><span class="type-badge">最终用户</span></span></td>
          <td>孙敏<span class="cell-sub">136 0000 4444</span></td>
          <td>杭州市 · 西湖区</td>
          <td><span class="status status--offline">停用</span></td>
          <td><time datetime="2026-05-22">2026-05-22</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-client" title="编辑客户" aria-label="编辑 最终客户 D"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
          </td>
        </tr>
        <tr data-client-empty hidden data-sort-ignore><td colspan="8">没有符合条件的客户</td></tr>
      </tbody>
    </table>
  </div>

  <footer class="content-card__footer content-card__footer--end">
    <nav class="pagination" aria-label="分页"><button type="button" disabled aria-label="上一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-left"></use></svg></button><button class="is-current" type="button" aria-current="page">1</button><button type="button" disabled aria-label="下一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg></button></nav>
  </footer>
</section>
