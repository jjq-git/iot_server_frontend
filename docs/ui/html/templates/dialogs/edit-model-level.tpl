<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 编辑各层级更新说明——硬件版本 hw_desc（PUT 该 model_code/hw_version 各行一致）、字典 od_desc（该 od_ver 组各行一致）、软件复用 firmwares.notes（与 sw_ver 1:1）。见 hn_models.target.md 分层更新说明。 -->
<dialog class="modal modal--wide" id="edit-model-level-dialog" aria-labelledby="edit-model-level-title">
  <form method="dialog" data-edit-level-form>
    <header class="modal__header">
      <div><h2 id="edit-model-level-title" data-level-title>编辑说明</h2><p data-level-sub>—</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field" data-level-odver-field hidden><span>OD 版本（最初版本）</span><input name="od_ver" class="mono" data-level-odver placeholder="如 V1"></label>
      <div class="form-field" data-level-od-field hidden><label>OD 文件（od.json）</label><span class="picker-field"><input data-level-od-name placeholder="未选择 od.json" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-od-file">重新上传 od.json</button></span></div>
      <div class="form-field" data-level-fw-field hidden><label>固件文件</label><span class="picker-field"><input data-level-fw-name placeholder="未选择固件" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-firmware">重新上传固件</button></span></div>
      <div class="form-field" data-level-ui-field hidden><label>UI 文件（ui.json，仅主机产品）</label><span class="picker-field"><input data-level-ui-name placeholder="未选择 ui.json" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-ui-json">重新上传 ui.json</button></span></div>
      <label class="form-field" data-level-status-field hidden><span>状态</span><select name="status" data-level-status><option value="draft">草稿（骨架/待补固件）</option><option value="active">活跃（可被引用）</option><option value="frozen">停用（仅存量运行）</option></select></label>
      <label class="form-field form-field--full" data-level-desc-field><span data-level-desc-label>更新说明</span><textarea name="level_desc" class="form-textarea" data-level-desc rows="4" placeholder="填写本层级的更新说明"></textarea></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
