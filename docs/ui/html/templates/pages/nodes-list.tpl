<!-- 控制器·节点（/devices/node）。数据源 nodes + hn_bindings（绑定主机/槽位/路由）+ hn_models（型号/固件）。一行 = 一个 CANopen 从节点。字段以 nodes.target.md 目标态为准。 -->
<!-- Handoff: 列表 GET /api/v1/nodes（join hn_bindings 取绑定主机 host_id / node_pos / route_device_id、hn_models 取型号/固件、companies 取厂家）。节点无独立 host_status，在线态经所属主机聚合（pod_status）。运维只在节点级做备注 + OTA；吊销/刷新是主机级（见主机页）。 -->
<section class="content-card" aria-labelledby="nodes-title">
  <header class="content-card__header">
    <div>
      <h2 id="nodes-title">节点</h2>
      <p>CANopen 从节点。经所属主机聚合上报，可按主机筛选。设备自动注册，此处只查看与运维。</p>
    </div>
    <button class="button button--secondary button--icon-only" type="button" data-action="refresh-nodes" aria-label="刷新" title="刷新">
      <svg class="app-icon app-icon--line"><use href="icons.svg#icon-arrow-clockwise"></use></svg>
    </button>
  </header>

  <form class="filter-bar" data-node-filter>
    <label class="search-field">
      <span class="sr-only">搜索节点</span>
      <svg class="app-icon app-icon--fill"><use href="icons.svg#icon-search"></use></svg>
      <input type="search" placeholder="搜索序列号、MAC 或型号" data-node-search>
    </label>
    <label class="select-field">
      <span class="sr-only">绑定主机</span>
      <select data-node-host>
        <option value="">全部主机</option>
        <option value="HS-26090001">HS-26090001</option>
        <option value="HS-26090002">HS-26090002</option>
        <option value="__unbound">未绑定</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
    <label class="select-field">
      <span class="sr-only">状态</span>
      <select data-node-status>
        <option value="">全部状态</option>
        <option value="online">在线</option>
        <option value="offline">离线</option>
        <option value="unbound">未绑定</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
  </form>

  <div class="table-scroll">
    <table class="device-table" data-sortable-table>
      <colgroup><col class="device-table__code-column"><col><col><col><col><col><col><col></colgroup>
      <thead><tr>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按序列号排序"><span>序列号</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按型号排序"><span>型号</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按固件排序"><span>固件</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按绑定主机排序"><span>绑定主机</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按槽位排序"><span>槽位 / 路由</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" class="device-client-col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户排序"><span>客户</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按状态排序"><span>状态</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th class="table-actions">操作</th>
      </tr></thead>
      <tbody>
        <tr data-node-row data-serial="ND-26090101" data-mac="84:F7:03:11:20:01" data-code="WF2D-7800" data-model="风扇灯光雷达节点" data-sw="1.0.0" data-host="HS-26090001" data-pos="Slot-1" data-route="2" data-can="2" data-company="静音仓厂家 A" data-status="online" data-search="nd-26090101 84:f7:03:11:20:01 wf2d-7800 风扇灯光雷达节点 hs-26090001">
          <td><span class="device-code"><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">ND-26090101</strong></span></td>
          <td><span class="device-model">风扇灯光雷达节点</span><span class="device-model__code mono">WF2D-7800</span></td>
          <td class="mono">v1.0.0</td>
          <td class="mono">HS-26090001</td>
          <td><span class="device-slot">Slot-1</span><span class="device-route mono">路由 2</span></td>
          <td class="device-client-col">静音仓厂家 A</td>
          <td><span class="status status--online">在线</span></td>
          <td class="table-actions"><span class="device-actions" data-node-actions></span></td>
        </tr>
        <tr data-node-row data-serial="ND-26090102" data-mac="84:F7:03:11:20:02" data-code="WF2D-7810" data-model="环境传感节点" data-sw="1.0.0" data-host="HS-26090001" data-pos="Slot-2" data-route="3" data-can="3" data-company="静音仓厂家 A" data-status="offline" data-search="nd-26090102 84:f7:03:11:20:02 wf2d-7810 环境传感节点 hs-26090001">
          <td><span class="device-code"><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">ND-26090102</strong></span></td>
          <td><span class="device-model">环境传感节点</span><span class="device-model__code mono">WF2D-7810</span></td>
          <td class="mono">v1.0.0</td>
          <td class="mono">HS-26090001</td>
          <td><span class="device-slot">Slot-2</span><span class="device-route mono">路由 3</span></td>
          <td class="device-client-col">静音仓厂家 A</td>
          <td><span class="status status--offline">离线</span></td>
          <td class="table-actions"><span class="device-actions" data-node-actions></span></td>
        </tr>
        <tr data-node-row data-serial="ND-26090201" data-mac="84:F7:03:11:20:03" data-code="WF2D-7800" data-model="风扇灯光雷达节点" data-sw="1.0.0" data-host="HS-26090002" data-pos="Slot-1" data-route="2" data-can="2" data-company="静音仓厂家 A" data-status="offline" data-search="nd-26090201 84:f7:03:11:20:03 wf2d-7800 风扇灯光雷达节点 hs-26090002">
          <td><span class="device-code"><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">ND-26090201</strong></span></td>
          <td><span class="device-model">风扇灯光雷达节点</span><span class="device-model__code mono">WF2D-7800</span></td>
          <td class="mono">v1.0.0</td>
          <td class="mono">HS-26090002</td>
          <td><span class="device-slot">Slot-1</span><span class="device-route mono">路由 2</span></td>
          <td class="device-client-col">静音仓厂家 A</td>
          <td><span class="status status--offline">离线</span></td>
          <td class="table-actions"><span class="device-actions" data-node-actions></span></td>
        </tr>
        <tr data-node-row data-serial="ND-26090301" data-mac="84:F7:03:11:20:04" data-code="WF2D-7810" data-model="环境传感节点" data-sw="0.0.1" data-host="" data-pos="—" data-route="" data-can="" data-company="静音仓厂家 B" data-status="unbound" data-search="nd-26090301 84:f7:03:11:20:04 wf2d-7810 环境传感节点 未绑定">
          <td><span class="device-code"><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-node"></use></svg><strong class="mono">ND-26090301</strong></span></td>
          <td><span class="device-model">环境传感节点</span><span class="device-model__code mono">WF2D-7810</span></td>
          <td class="mono">v0.0.1</td>
          <td class="device-muted">未绑定</td>
          <td class="device-muted">—</td>
          <td class="device-client-col">静音仓厂家 B</td>
          <td><span class="status status--offline">未绑定</span></td>
          <td class="table-actions"><span class="device-actions" data-node-actions></span></td>
        </tr>
        <tr data-node-empty hidden><td colspan="8" class="table-empty">没有匹配的节点。</td></tr>
      </tbody>
    </table>
  </div>
</section>
