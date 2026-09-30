<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: all product icons must reference symbols in icons.svg. Do not mix external icon packs or add one-off inline SVG paths; active states change foreground color/weight without inverted icon backgrounds. -->
<div class="app-shell">
  <div data-include="templates/sidebar.tpl"></div>
  <div class="sidebar-backdrop" data-action="close-sidebar" aria-hidden="true"></div>

  <div class="workspace">
    <div data-include="templates/topbar.tpl"></div>
    <main class="content" id="main-content">
      <div data-page-view="home" data-page-title="首页" data-page-icon="house-door" data-page-icon-style="line" hidden><div data-include="templates/pages/home.tpl"></div></div>
      <div data-page-view="hosts" data-page-title="主机" data-page-icon="controller-host" data-page-icon-style="line" data-page-parent="控制器" data-page-parent-href="#controllers">
        <div data-include="templates/pages/hosts-list.tpl"></div>
      </div>
      <div data-page-view="client" data-page-title="客户" data-page-icon="customer-company-users" data-page-icon-style="mixed" hidden><div data-include="templates/pages/client-list.tpl"></div></div>
      <div data-page-view="users" data-page-title="用户" data-page-icon="person" data-page-icon-style="fill" data-page-parent="客户" data-page-parent-href="#customers" hidden><div data-include="templates/pages/users-list.tpl"></div></div>
      <div data-page-view="devices-model" data-page-title="型号" data-page-icon="product-model" data-page-icon-style="line" data-page-parent="控制器" data-page-parent-href="#controllers" hidden><div data-include="templates/pages/controller-models-list.tpl"></div></div>
      <div data-page-view="nodes" data-page-title="节点" data-page-icon="controller-node" data-page-icon-style="line" data-page-parent="控制器" data-page-parent-href="#controllers" hidden><div data-include="templates/pages/nodes-list.tpl"></div></div>
      <div data-page-view="pod-models" data-page-title="静音仓型号" data-page-icon="product-model" data-page-icon-style="line" data-page-parent="静音仓" data-page-parent-href="#pods" hidden><div data-include="templates/pages/pod-models-list.tpl"></div></div>
      <div data-page-view="pod-list" data-page-title="静音仓列表" data-page-icon="soundproof-pod" data-page-icon-style="line" data-page-parent="静音仓" data-page-parent-href="#pods" hidden><div data-include="templates/pages/pods-list.tpl"></div></div>
      <!-- Handoff: company page title comes from company_name; its page icon is the fill variant of icons.svg#icon-building. -->
      <div data-page-view="company" data-page-title="德恩基平台公司" data-page-title-source="company" data-page-icon="building" data-page-icon-style="fill" hidden>
        <div data-include="templates/pages/company-profile.tpl"></div>
      </div>
      <div data-page-view="personal" data-page-title="个人中心" data-page-icon="person" data-page-icon-style="fill" hidden>
        <div data-include="templates/pages/personal-profile.tpl"></div>
      </div>
    </main>
  </div>
</div>

<div data-include="templates/dialogs/create-client.tpl"></div>
<div data-include="templates/dialogs/edit-client.tpl"></div>
<div data-include="templates/dialogs/view-client.tpl"></div>
<div data-include="templates/dialogs/edit-client-admin.tpl"></div>
<div data-include="templates/dialogs/create-host.tpl"></div>
<div data-include="templates/dialogs/device-remark.tpl"></div>
<div data-include="templates/dialogs/ota-device.tpl"></div>
<div data-include="templates/dialogs/create-controller-model.tpl"></div>
<div data-include="templates/dialogs/edit-controller-model.tpl"></div>
<div data-include="templates/dialogs/edit-model-level.tpl"></div>
<div data-include="templates/dialogs/add-model-level.tpl"></div>
<div data-include="templates/dialogs/create-company-user.tpl"></div>
<div data-include="templates/dialogs/view-company-user.tpl"></div>
<div data-include="templates/dialogs/edit-company-user.tpl"></div>
<div data-include="templates/dialogs/change-personal-password.tpl"></div>
<div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
