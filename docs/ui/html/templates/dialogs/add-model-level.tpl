<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 增加各层级=建骨架(draft)，只填版本号+备注——硬件版本(hw_version + 可选首个 od_ver + hw_desc)、字典(od_ver + od_desc)、软件(sw_ver + status + firmwares.notes)。文件（od.json / 固件 / ui.json）一律在对应「编辑」里上传，不在创建时传。见 hn_models.target.md 手工分层创建。 -->
<dialog class="modal modal--wide" id="add-model-level-dialog" aria-labelledby="add-model-level-title">
  <form method="dialog" data-add-level-form>
    <header class="modal__header">
      <div><h2 id="add-model-level-title" data-add-level-title>增加</h2><p data-add-level-sub>—</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span data-add-level-ver-label>版本号</span><input name="version" class="mono" data-add-level-ver placeholder="如 V1.0.0" required></label>
      <label class="form-field" data-add-level-odver-field hidden><span>OD 版本号（可选，顺带建首个字典）</span><input name="od_ver" class="mono" data-add-level-odver placeholder="如 V1"></label>
      <label class="form-field" data-add-level-status-field hidden><span>状态</span><select name="status" data-add-level-status><option value="draft">草稿（骨架/待补固件）</option><option value="active">活跃（可被引用）</option><option value="frozen">停用（仅存量运行）</option></select></label>
      <label class="form-field form-field--full"><span data-add-level-desc-label>说明</span><textarea name="desc" class="form-textarea" data-add-level-desc rows="3" placeholder="选填"></textarea></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">增加</button></footer>
  </form>
</dialog>
