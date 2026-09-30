<!-- 控制器·主机（/devices/host）。数据源 hosts + host_status + hn_bindings。一行 = 一台主机（CANopen 主站 / MQTT 网关）。点行内联展开：该主机 hn_bindings 绑定的节点。字段以 hosts.target.md 目标态为准。 -->
<!-- Handoff: 列表 GET /api/v1/hosts（join host_status 取在线/last_seen、hn_models 取型号/固件、companies 取厂家、hn_bindings 取绑定节点数）。设备走工厂预登记 + 一机一密自动注册，此后台只查看 + 运维（备注 / 吊销凭据 / OTA / 刷新），不手工新增。 -->
<!-- Handoff: data-nodes 是该主机绑定节点的示例数据（hn_bindings：node_pos / route_device_id / physical_can_node_id + 节点型号/固件/在线），供 Demo 展开渲染；生产由 GET /api/v1/hosts/{id}/nodes 返回。 -->
<section class="content-card" aria-labelledby="hosts-title">
  <header class="content-card__header">
    <div>
      <h2 id="hosts-title">主机</h2>
      <p>CANopen 主站 / MQTT 网关。点主机行展开它绑定的节点。设备自动注册，此处只查看与运维。</p>
    </div>
    <button class="button button--secondary button--icon-only" type="button" data-action="refresh-hosts" aria-label="刷新在线状态" title="刷新在线状态">
      <svg class="app-icon app-icon--line"><use href="icons.svg#icon-arrow-clockwise"></use></svg>
    </button>
  </header>

  <form class="filter-bar" data-host-filter>
    <label class="search-field">
      <span class="sr-only">搜索主机</span>
      <svg class="app-icon app-icon--fill"><use href="icons.svg#icon-search"></use></svg>
      <input type="search" placeholder="搜索序列号、MAC 或型号" data-host-search>
    </label>
    <label class="select-field">
      <span class="sr-only">客户</span>
      <select data-host-company>
        <option value="">全部客户</option>
        <option value="静音仓厂家 A">静音仓厂家 A</option>
        <option value="静音仓厂家 B">静音仓厂家 B</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
    <label class="select-field">
      <span class="sr-only">状态</span>
      <select data-host-status>
        <option value="">全部状态</option>
        <option value="online">在线</option>
        <option value="offline">离线</option>
        <option value="revoked">已吊销</option>
      </select>
      <svg class="app-icon app-icon--fill select-field__icon"><use href="icons.svg#icon-chevron-down"></use></svg>
    </label>
  </form>

  <div class="table-scroll">
    <table class="device-table" data-sortable-table>
      <colgroup><col class="device-table__code-column"><col><col><col><col><col><col><col></colgroup>
      <thead><tr>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按序列号排序"><span>序列号</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按 MAC 排序"><span>MAC 地址</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按型号排序"><span>型号</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按固件排序"><span>固件</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" class="device-client-col" aria-sort="none"><button class="table-sort" type="button" aria-label="按客户排序"><span>客户</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按节点数排序"><span>节点</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th scope="col" aria-sort="none"><button class="table-sort" type="button" aria-label="按状态排序"><span>状态</span><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-sort"></use></svg></button></th>
        <th class="table-actions">操作</th>
      </tr></thead>
      <tbody>
        <tr data-host-row data-serial="HS-26090001" data-mac="AA:BB:03:11:00:01" data-code="WF2D-0050" data-model="CHEN 旋钮屏控制产品" data-sw="1.2.0" data-od="V1" data-company="静音仓厂家 A" data-status="online" data-last-seen="刚刚" data-revoked="false" data-search="hs-26090001 aa:bb:03:11:00:01 wf2d-0050 chen 旋钮屏控制产品" data-nodes='[{"pos":"Slot-1","route":2,"can":2,"serial":"ND-26090101","code":"WF2D-7800","model":"风扇灯光雷达节点","sw":"1.0.0","online":true},{"pos":"Slot-2","route":3,"can":3,"serial":"ND-26090102","code":"WF2D-7810","model":"环境传感节点","sw":"1.0.0","online":false}]'>
          <td><span class="device-code"><svg class="app-icon app-icon--line device-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><strong class="mono">HS-26090001</strong></span></td>
          <td class="mono">AA:BB:03:11:00:01</td>
          <td><span class="device-model">CHEN 旋钮屏控制产品</span><span class="device-model__code mono">WF2D-0050</span></td>
          <td class="mono">v1.2.0</td>
          <td class="device-client-col">静音仓厂家 A</td>
          <td><span class="device-node-count"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-link-45deg"></use></svg>2</span></td>
          <td><span class="status status--online">在线</span><span class="device-seen">刚刚</span></td>
          <td class="table-actions"><span class="device-actions" data-host-actions></span></td>
        </tr>
        <tr data-host-row data-serial="HS-26090002" data-mac="AA:BB:03:11:00:02" data-code="WF2D-0050" data-model="CHEN 旋钮屏控制产品" data-sw="1.0.0" data-od="V1" data-company="静音仓厂家 A" data-status="offline" data-last-seen="2 小时前" data-revoked="false" data-search="hs-26090002 aa:bb:03:11:00:02 wf2d-0050 chen 旋钮屏控制产品" data-nodes='[{"pos":"Slot-1","route":2,"can":2,"serial":"ND-26090201","code":"WF2D-7800","model":"风扇灯光雷达节点","sw":"1.0.0","online":false}]'>
          <td><span class="device-code"><svg class="app-icon app-icon--line device-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><strong class="mono">HS-26090002</strong></span></td>
          <td class="mono">AA:BB:03:11:00:02</td>
          <td><span class="device-model">CHEN 旋钮屏控制产品</span><span class="device-model__code mono">WF2D-0050</span></td>
          <td class="mono">v1.0.0</td>
          <td class="device-client-col">静音仓厂家 A</td>
          <td><span class="device-node-count"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-link-45deg"></use></svg>1</span></td>
          <td><span class="status status--offline">离线</span><span class="device-seen">2 小时前</span></td>
          <td class="table-actions"><span class="device-actions" data-host-actions></span></td>
        </tr>
        <tr data-host-row data-serial="HS-26090003" data-mac="AA:BB:03:11:00:03" data-code="WF2D-0060" data-model="CHEN 双旋钮控制产品" data-sw="0.0.1" data-od="V1" data-company="静音仓厂家 B" data-status="revoked" data-last-seen="已吊销" data-revoked="true" data-search="hs-26090003 aa:bb:03:11:00:03 wf2d-0060 chen 双旋钮控制产品" data-nodes='[]'>
          <td><span class="device-code"><svg class="app-icon app-icon--line device-expand-chevron" aria-hidden="true"><use href="icons.svg#icon-chevron-right"></use></svg><svg class="app-icon app-icon--line device-code__icon" aria-hidden="true"><use href="icons.svg#icon-controller-host"></use></svg><strong class="mono">HS-26090003</strong></span></td>
          <td class="mono">AA:BB:03:11:00:03</td>
          <td><span class="device-model">CHEN 双旋钮控制产品</span><span class="device-model__code mono">WF2D-0060</span></td>
          <td class="mono">v0.0.1</td>
          <td class="device-client-col">静音仓厂家 B</td>
          <td><span class="device-node-count device-node-count--zero">0</span></td>
          <td><span class="status status--offline">已吊销</span></td>
          <td class="table-actions"><span class="device-actions" data-host-actions></span></td>
        </tr>
        <tr data-host-empty hidden><td colspan="8" class="table-empty">没有匹配的主机。</td></tr>
      </tbody>
    </table>
  </div>
</section>
