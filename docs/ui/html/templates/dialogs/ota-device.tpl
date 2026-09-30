<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 触发 OTA——把设备 hosts/nodes.hn_model_id 升到同型号同硬件下的新精确版本行(新 sw_ver / od_ver)。目标版本来自该 (model_code, hw_version) 下 status=active 的软件版本；下发经 ota_tasks。主机、节点共用。 -->
<dialog class="modal modal--wide" id="ota-device-dialog" aria-labelledby="ota-device-title">
  <form method="dialog" data-ota-form>
    <header class="modal__header">
      <div><h2 id="ota-device-title">触发 OTA</h2><p data-ota-title>—</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <div class="form-field form-field--full"><span>当前版本</span><p class="ota-current mono" data-ota-current>—</p></div>
      <label class="form-field form-field--full"><span>目标固件版本（sw_ver，同型号同硬件下的活跃版本）</span><select name="target" data-ota-target><option value="1.2.0">v1.2.0（最新）</option><option value="1.1.0">v1.1.0</option><option value="1.0.0">v1.0.0</option></select></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">下发升级</button></footer>
  </form>
</dialog>
