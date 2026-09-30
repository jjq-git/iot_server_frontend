<!-- 控制器·型号目录（/devices/model）。数据源 hn_models：一行型号 = 一个 model_code。点行内联展开：型号 → 硬件版本 → OD → 软件版本(↔固件)。字段以 hn_models.target.md 目标态为准。 -->
<!-- Handoff: 主列表走 GET /api/v1/hn-model-catalog/hardware-lines；展开逐层 /revisions（OD）/versions（软件）。状态 draft/active/frozen，draft=待补固件骨架。废弃字段不出现。 -->
<!-- Handoff: data-hw 是该型号的层级示例数据（硬件版本→OD→软件版本），供 Demo 展开渲染；生产由接口逐层返回。 -->
<section class="content-card" aria-labelledby="models-title">
  <header class="content-card__header">
    <div>
      <h2 id="models-title">型号</h2>
      <p>管理主机与节点的型号目录。点型号行展开硬件版本 / OD / 软件版本。</p>
    </div>
    <button class="button button--secondary button--icon-only" type="button" data-action="open-create-model-dialog" aria-label="新建型号" title="新建型号">
      <svg class="app-icon app-icon--line"><use href="icons.svg#icon-product-model-add"></use></svg>
    </button>
  </header>

  <form class="filter-bar" data-model-filter>
    <label class="search-field">
      <span class="sr-only">搜索型号</span>
      <svg class="app-icon app-icon--fill"><use href="icons.svg#icon-search"></use></svg>
      <input type="search" placeholder="搜索编号、料号或名称" data-model-search>
    </label>
    <label class="select-field">
      <span class="sr-only">类型</span>
      <select data-model-kind>
        <option value="">全部类型</option>
        <option value="product">主机</option>
        <option value="node">节点</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
    <label class="select-field">
      <span class="sr-only">状态</span>
      <select data-model-status>
        <option value="">全部状态</option>
        <option value="draft">草稿</option>
        <option value="active">活跃</option>
        <option value="frozen">冻结</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
  </form>

  <div class="table-scroll">
    <table class="model-table" data-sortable-table>
      <colgroup><col class="model-table__avatar-column"><col class="model-table__code-column"><col><col><col><col class="model-table__desc-column"><col><col></colgroup>
      <thead><tr>
        <th></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按编号排序"><span>编号</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按类型排序"><span>类型</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" class="model-client-col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户排序"><span>客户</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按型号名称排序"><span>型号名称</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th>描述</th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" data-sort-type="date" aria-label="按创建日期排序"><span>创建日期</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th class="table-actions">操作</th>
      </tr></thead>
      <tbody>
        <tr data-model-row data-kind="product" data-status="active" data-search="p-0050 wf2p-0050 chen 旋钮屏控制产品 主机" data-code="P-0050" data-part="WF2D-0050" data-name="CHEN 旋钮屏控制产品" data-desc="CHEN 旋钮屏静音仓控制产品" data-vendor="0x44454E47" data-product-code="0x50000050" data-company="静音仓厂家 A" data-created="2026-08-20" data-avatar="未上传" data-url="—" data-hw='[{"hw":"V1.0.0","ods":[{"od":"V1","sws":[{"sw":"1.0.0","fw":"P-0050_V1.0.0_1.0.0.bin","status":"frozen"},{"sw":"1.2.0","fw":"P-0050_V1.0.0_1.2.0.bin","status":"active"}]}]}]'>
          <td><span class="model-avatar-cell" data-model-avatar tabindex="0" aria-label="P-0050 型号图片"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><span class="model-avatar-cell__zoom" aria-hidden="true"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-controller-host"></use></svg></span></span></td>
          <td><span class="model-code-cell"><svg class="app-icon app-icon--line model-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><strong class="mono">P-0050</strong></span></td>
          <td>主机</td>
          <td class="model-client-col">静音仓厂家 A</td>
          <td>CHEN 旋钮屏控制产品</td>
          <td><span class="model-desc-cell" title="CHEN 旋钮屏静音仓控制产品">CHEN 旋钮屏静音仓控制产品</span></td>
          <td><time datetime="2026-08-20">2026-08-20</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-controller-model" title="编辑展示信息" aria-label="编辑 P-0050"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
            <button class="icon-button table-action-button" type="button" data-action="add-hw-version" data-code="P-0050" title="增加硬件版本" aria-label="为 P-0050 增加硬件版本"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg></button>
          </td>
        </tr>
        <tr data-model-row data-kind="node" data-status="active" data-search="n-7800 wf2d-7800 风扇灯光雷达节点 node 节点" data-code="N-7800" data-part="WF2D-7800" data-name="风扇灯光雷达节点" data-desc="风扇、灯光与雷达控制节点" data-vendor="0x44454E47" data-product-code="0x4E007800" data-company="平台通用" data-created="2026-07-15" data-avatar="未上传" data-url="—" data-hw='[{"hw":"V1.0.0","ods":[{"od":"V1","sws":[{"sw":"1.0.0","fw":"N-7800_V1.0.0_1.0.0.bin","status":"active"}]}]}]'>
          <td><span class="model-avatar-cell" data-model-avatar tabindex="0" aria-label="N-7800 型号图片"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><span class="model-avatar-cell__zoom" aria-hidden="true"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-controller-node"></use></svg></span></span></td>
          <td><span class="model-code-cell"><svg class="app-icon app-icon--line model-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">N-7800</strong></span></td>
          <td>节点</td>
          <td class="model-client-col">通用</td>
          <td>风扇灯光雷达节点</td>
          <td><span class="model-desc-cell" title="风扇、灯光与雷达控制节点">风扇、灯光与雷达控制节点</span></td>
          <td><time datetime="2026-07-15">2026-07-15</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-controller-model" title="编辑展示信息" aria-label="编辑 N-7800"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
            <button class="icon-button table-action-button" type="button" data-action="add-hw-version" data-code="N-7800" title="增加硬件版本" aria-label="为 N-7800 增加硬件版本"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg></button>
          </td>
        </tr>
        <tr data-model-row data-kind="node" data-status="frozen" data-search="n-7810 wf2d-7810 环境传感节点 node 节点" data-code="N-7810" data-part="WF2D-7810" data-name="环境传感节点" data-desc="温湿度与空气质量传感节点" data-vendor="0x44454E47" data-product-code="0x4E007810" data-company="平台通用" data-created="2026-05-30" data-avatar="未上传" data-url="—" data-hw='[{"hw":"V1.0.0","ods":[{"od":"V1","sws":[{"sw":"1.0.0","fw":"N-7810_V1.0.0_1.0.0.bin","status":"frozen"}]}]},{"hw":"V2.0.0","ods":[{"od":"V1","sws":[{"sw":"1.0.0","fw":"N-7810_V2.0.0_1.0.0.bin","status":"frozen"}]}]}]'>
          <td><span class="model-avatar-cell" data-model-avatar tabindex="0" aria-label="N-7810 型号图片"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><span class="model-avatar-cell__zoom" aria-hidden="true"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-controller-node"></use></svg></span></span></td>
          <td><span class="model-code-cell"><svg class="app-icon app-icon--line model-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">N-7810</strong></span></td>
          <td>节点</td>
          <td class="model-client-col">通用</td>
          <td>环境传感节点</td>
          <td><span class="model-desc-cell" title="温湿度与空气质量传感节点">温湿度与空气质量传感节点</span></td>
          <td><time datetime="2026-05-30">2026-05-30</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-controller-model" title="编辑展示信息" aria-label="编辑 N-7810"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
            <button class="icon-button table-action-button" type="button" data-action="add-hw-version" data-code="N-7810" title="增加硬件版本" aria-label="为 N-7810 增加硬件版本"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg></button>
          </td>
        </tr>
        <tr data-model-row data-kind="product" data-status="draft" data-search="p-0060 wf2p-0060 chen 双旋钮控制产品 主机 草稿" data-code="P-0060" data-part="WF2D-0060" data-name="CHEN 双旋钮控制产品" data-desc="待补固件的型号骨架" data-vendor="0x44454E47" data-product-code="0x50000060" data-company="静音仓厂家 A" data-created="2026-09-09" data-avatar="未上传" data-url="—" data-hw='[{"hw":"V1.0.0","ods":[]}]'>
          <td><span class="model-avatar-cell" data-model-avatar tabindex="0" aria-label="P-0060 型号图片"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><span class="model-avatar-cell__zoom" aria-hidden="true"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-controller-host"></use></svg></span></span></td>
          <td><span class="model-code-cell"><svg class="app-icon app-icon--line model-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><strong class="mono">P-0060</strong></span></td>
          <td>主机</td>
          <td class="model-client-col">静音仓厂家 A</td>
          <td>CHEN 双旋钮控制产品</td>
          <td><span class="model-desc-cell" title="待补固件的型号骨架">待补固件的型号骨架</span></td>
          <td><time datetime="2026-09-09">2026-09-09</time></td>
          <td class="table-actions">
            <button class="icon-button table-action-button" type="button" data-action="edit-controller-model" title="编辑展示信息" aria-label="编辑 P-0060"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-pencil"></use></svg></button>
            <button class="icon-button table-action-button" type="button" data-action="add-hw-version" data-code="P-0060" title="增加硬件版本" aria-label="为 P-0060 增加硬件版本"><svg class="app-icon app-icon--line"><use href="icons.svg#icon-plus"></use></svg></button>
          </td>
        </tr>
        <tr data-model-empty hidden data-sort-ignore><td colspan="8">没有符合条件的型号</td></tr>
      </tbody>
    </table>
  </div>

  <footer class="content-card__footer content-card__footer--end">
    <nav class="pagination" aria-label="分页"><button type="button" disabled aria-label="上一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-left"></use></svg></button><button class="is-current" type="button" aria-current="page">1</button><button type="button" disabled aria-label="下一页"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg></button></nav>
  </footer>
</section>
