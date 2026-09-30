<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<dialog class="modal" id="create-host-dialog" aria-labelledby="create-host-title">
  <form method="dialog">
    <header class="modal__header">
      <div><h2 id="create-host-title">新增主机</h2><p>录入主机基础信息，保存后再绑定节点。</p></div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span>主机名称</span><input name="name" placeholder="例如：展厅主机 02" required></label>
      <label class="form-field"><span>序列号</span><input name="serial" placeholder="扫描或输入序列号" required></label>
      <label class="form-field form-field--full"><span>型号</span><select name="model" required><option value="">请选择型号</option><option>HN-T10</option><option>HN-S8</option></select></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
